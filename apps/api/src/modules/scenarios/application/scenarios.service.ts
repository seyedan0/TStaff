import { Injectable, Inject } from "@nestjs/common";
import type {
  CreateScenarioDto,
  UpdateScenarioDto,
  ReviewScenarioDto,
  ScenarioBankQuery,
} from "@tstaff/contracts";
import { Scenario } from "../domain/scenario.entity.js";
import {
  ScenarioNotFoundError,
  UnauthorizedSupervisorError,
  ScenariosDomainError,
} from "../domain/scenarios-errors.js";
import { ResearchService } from "../../research/application/research.service.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import type { ScenarioRepositoryPort } from "./ports/scenario.repository.port.js";

export const SCENARIO_REPOSITORY = Symbol("SCENARIO_REPOSITORY");

@Injectable()
export class ScenariosService {
  constructor(
    @Inject(SCENARIO_REPOSITORY)
    private readonly scenarioRepo: ScenarioRepositoryPort,
    @Inject(ResearchService)
    private readonly researchService: ResearchService,
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService,
  ) {}

  /**
   * Rule FR-021 / AT-08:
   * Create scenario draft for a research case once prescription stage is approved.
   * Asserts that prerequisite stages are approved and none are in REVIEW_REQUIRED (D-05, AT-33).
   */
  async createScenario(
    caseId: string,
    authorId: string,
    dto: CreateScenarioDto,
  ): Promise<Scenario> {
    await this.researchService.assertPrerequisitesApprovedForScenario(caseId);

    const scenario = Scenario.create({
      id: crypto.randomUUID(),
      researchCaseId: caseId,
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
    });

    await this.scenarioRepo.create(scenario);
    return scenario;
  }

  async updateScenario(
    id: string,
    dto: UpdateScenarioDto,
  ): Promise<Scenario> {
    const scenario = await this.getScenarioById(id);
    const updated = scenario.update(dto, dto.expectedVersion);
    await this.scenarioRepo.saveWithVersionCheck(updated, dto.expectedVersion);
    return updated;
  }

  async submitScenarioForReview(
    id: string,
    expectedVersion: number,
  ): Promise<Scenario> {
    const scenario = await this.getScenarioById(id);
    const underReview = scenario.submitForReview(expectedVersion);
    await this.scenarioRepo.saveWithVersionCheck(underReview, expectedVersion);
    return underReview;
  }

  /**
   * Rule FR-040 / AT-16 & D-05 / AT-33:
   * Scientific Review of Scenario:
   * If any prerequisite stage is in REVIEW_REQUIRED, publication to APPROVED_INTERNAL is strictly blocked.
   */
  async reviewScenario(
    id: string,
    reviewerId: string,
    dto: ReviewScenarioDto,
  ): Promise<Scenario> {
    // 1. Idempotency check: if decision already recorded with idempotencyKey, return it
    const existingDecision =
      await this.scenarioRepo.findDecisionByIdempotencyKey(dto.idempotencyKey);
    if (existingDecision) {
      if (existingDecision.scenarioId !== id) {
        throw new ScenariosDomainError(
          "کلید یکتایی (idempotencyKey) قبلاً برای داوری دیگری استفاده شده است",
          "CONFLICT",
        );
      }
      return this.getScenarioById(id);
    }

    const scenario = await this.getScenarioById(id);

    const isAuthorized = await this.assignmentsService.isAuthorizedSupervisor(
      scenario.researchCaseId,
      reviewerId,
    );
    if (!isAuthorized) {
      throw new UnauthorizedSupervisorError(
        reviewerId,
        scenario.researchCaseId,
      );
    }

    // Rule D-05 / FR-061 / AT-33:
    // Assert prerequisite stages are valid and none are in REVIEW_REQUIRED
    await this.researchService.assertPrerequisitesApprovedForScenario(
      scenario.researchCaseId,
    );

    let updated: Scenario;
    if (dto.decision === "APPROVED") {
      updated = scenario.approveInternal(dto.expectedVersion);
    } else {
      updated = scenario.requestChanges(dto.expectedVersion);
    }

    await this.scenarioRepo.saveWithVersionCheck(updated, dto.expectedVersion);

    // Record decision audit trail
    await this.scenarioRepo.saveDecision({
      id: crypto.randomUUID(),
      scenarioId: id,
      reviewerId,
      decision: dto.decision,
      expectedVersion: dto.expectedVersion,
      actualVersion: scenario.version,
      reason: dto.reason,
      idempotencyKey: dto.idempotencyKey,
      decidedAt: new Date(),
    });

    return updated;
  }

  /**
   * Rule FR-023 / AT-16:
   * Query internal scenario bank (strictly internal for authorized users).
   */
  async getInternalBank(query?: ScenarioBankQuery): Promise<Scenario[]> {
    return this.scenarioRepo.findInternalBank(query);
  }

  async getScenarioById(id: string): Promise<Scenario> {
    const scenario = await this.scenarioRepo.findById(id);
    if (!scenario) {
      throw new ScenarioNotFoundError(id);
    }
    return scenario;
  }

  async getScenariosByCaseId(caseId: string): Promise<Scenario[]> {
    return this.scenarioRepo.findByCaseId(caseId);
  }
}

