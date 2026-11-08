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
import {
  PrerequisiteStageReviewRequiredError,
  ScenarioPrerequisiteNotMetError,
} from "../../research/domain/research-errors.js";
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
    await this.researchService.assertOwnerCanEditStage(caseId, "SCENARIO", authorId);
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
    actorId: string,
    dto: UpdateScenarioDto,
  ): Promise<Scenario> {
    const scenario = await this.getScenarioById(id);
    await this.researchService.assertOwnerCanEditStage(scenario.researchCaseId, "SCENARIO", actorId);
    const updated = scenario.update(dto, dto.expectedVersion);
    await this.scenarioRepo.saveWithVersionCheck(updated, dto.expectedVersion);
    return updated;
  }

  async submitScenarioForReview(
    id: string,
    actorId: string,
    expectedVersion: number,
  ): Promise<Scenario> {
    const scenario = await this.getScenarioById(id);
    await this.researchService.assertOwnerCanEditStage(scenario.researchCaseId, "SCENARIO", actorId);
    await this.researchService.assertPrerequisitesApprovedForScenario(scenario.researchCaseId);
    const underReview = scenario.submitForReview(expectedVersion);
    await this.scenarioRepo.saveWithVersionCheck(underReview, expectedVersion);
    try {
      await this.researchService.submitScenarioForReview(scenario.researchCaseId, actorId);
    } catch (error) {
      const restoredDraft = underReview.requestChanges(underReview.version);
      await this.scenarioRepo.saveWithVersionCheck(restoredDraft, underReview.version);
      throw error;
    }
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
    const scenario = await this.getScenarioById(id);

    const isAuthorized = await this.researchService.isSupervisorAssignedToCase(scenario.researchCaseId, reviewerId);
    if (!isAuthorized) {
      throw new UnauthorizedSupervisorError(
        reviewerId,
        scenario.researchCaseId,
      );
    }

    // Authenticate and authorize before looking up idempotency data (AT-31).
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

    const researchCase = await this.researchService.getCase(scenario.researchCaseId);
    await this.researchService.reviewDecision(scenario.researchCaseId, "SCENARIO", reviewerId, {
      decision: dto.decision === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED",
      expectedVersion: dto.caseVersion,
      notes: dto.reason,
    });

    await this.scenarioRepo.saveWithVersionCheck(updated, dto.expectedVersion);

    // Record immutable decision history after both versions have been accepted.
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
    const scenarios = await this.scenarioRepo.findInternalBank(query);
    const visible: Scenario[] = [];
    for (const scenario of scenarios) {
      try {
        await this.researchService.assertPrerequisitesApprovedForScenario(scenario.researchCaseId);
        visible.push(scenario);
      } catch (error) {
        if (!(error instanceof PrerequisiteStageReviewRequiredError) && !(error instanceof ScenarioPrerequisiteNotMetError)) throw error;
      }
    }
    return visible;
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

  async getPendingForSupervisor(supervisorId: string) {
    const users = await this.assignmentsService.getUsersForSupervisor(supervisorId);
    const interns = users.filter((user) => user.stage === "INTERN");
    const internById = new Map(interns.map((user) => [user.id, user.fullName]));
    const cases = (await this.researchService.listCases()).filter((item) => internById.has(item.researcherId ?? ""));
    const pending = [];
    for (const researchCase of cases) {
      for (const scenario of await this.scenarioRepo.findByCaseId(researchCase.id)) {
        if (scenario.status === "UNDER_REVIEW") pending.push({ ...scenario.toJSON(), caseId: researchCase.id, caseVersion: researchCase.version, caseCode: researchCase.code, caseTitle: researchCase.title, internName: internById.get(researchCase.researcherId ?? "") ?? "کارورز" });
      }
    }
    return pending;
  }
}

