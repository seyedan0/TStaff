import { Injectable, Inject } from "@nestjs/common";
import type {
  CreateResearchCaseDto,
  RollbackStageDto,
  ReviewDecisionDto,
  StageType,
} from "@tstaff/contracts";
import { ResearchCase } from "../domain/research-case.entity.js";
import {
  ResearchCaseNotFoundError,
  UnauthorizedSupervisorError,
} from "../domain/research-errors.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import { ResourcesService } from "../../resources/application/resources.service.js";
import type { ResearchRepositoryPort } from "./ports/research.repository.port.js";

export const RESEARCH_REPOSITORY = Symbol("RESEARCH_REPOSITORY");

@Injectable()
export class ResearchService {
  constructor(
    @Inject(RESEARCH_REPOSITORY)
    private readonly researchRepo: ResearchRepositoryPort,
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService,
    @Inject(ResourcesService)
    private readonly resourcesService: ResourcesService,
  ) {}

  async createCase(dto: CreateResearchCaseDto): Promise<ResearchCase> {
    const rCase = ResearchCase.create({
      id: crypto.randomUUID(),
      title: dto.title,
      code: dto.code,
      subject: dto.subject,
    });

    await this.researchRepo.create(rCase);
    return rCase;
  }

  async getCase(id: string): Promise<ResearchCase> {
    const rCase = await this.researchRepo.findById(id);
    if (!rCase) {
      throw new ResearchCaseNotFoundError(id);
    }
    return rCase;
  }

  async advanceStage(
    id: string,
    expectedVersion: number,
  ): Promise<ResearchCase> {
    const rCase = await this.getCase(id);

    // Rule D-07 / FR-058 / AT-30:
    // If currently in SOURCES stage, verify that each resource has 1 interview and 1 report
    const activeStage = rCase.stages.find((s) => s.status === "IN_PROGRESS");
    if (activeStage && activeStage.stageType === "SOURCES") {
      await this.resourcesService.assertSourcesStageCompleteness(id);
    }

    const updated = rCase.advanceStage(expectedVersion);
    await this.researchRepo.saveWithVersionCheck(updated, expectedVersion);
    return updated;
  }

  async rollbackStage(
    id: string,
    dto: RollbackStageDto,
  ): Promise<ResearchCase> {
    const rCase = await this.getCase(id);

    const updated = rCase.rollbackStage(
      dto.targetStage,
      dto.reason,
      dto.expectedVersion,
    );

    await this.researchRepo.saveWithVersionCheck(updated, dto.expectedVersion);
    return updated;
  }

  /**
   * Rule D-02 & D-03 / AT-29:
   * Supervisor Evaluation Decision with CAS Concurrency Check
   */
  async reviewDecision(
    id: string,
    stageType: StageType,
    supervisorUserId: string,
    dto: ReviewDecisionDto,
  ): Promise<ResearchCase> {
    const isAuthorized = await this.assignmentsService.isAuthorizedSupervisor(
      id,
      supervisorUserId,
    );

    if (!isAuthorized) {
      throw new UnauthorizedSupervisorError(supervisorUserId, id);
    }

    const rCase = await this.getCase(id);
    const updated = rCase.applyReviewDecision(
      stageType,
      dto.decision,
      dto.expectedVersion,
    );

    await this.researchRepo.saveWithVersionCheck(updated, dto.expectedVersion);
    return updated;
  }

  async listCases(): Promise<ResearchCase[]> {
    return this.researchRepo.findAll();
  }
}
