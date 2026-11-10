import { Injectable, Inject, Optional, forwardRef } from "@nestjs/common";
import { OrganizationService } from "../../organization/application/organization.service.js";
import { IdentityService } from "../../identity/application/identity.service.js";
import { TRANSACTION_RUNNER, type TransactionRunner } from "../../../platform/transactions/transaction-runner.js";
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
  InvalidStageTransitionError,
  ScenarioPrerequisiteNotMetError,
  PrerequisiteStageReviewRequiredError,
} from "../domain/research-errors.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import { ResourcesService } from "../../resources/application/resources.service.js";
import { IncompleteSourcesStageError } from "../../resources/domain/resource-errors.js";
import type {
  ResearchRepositoryPort,
  StageInstanceDto,
} from "./ports/research.repository.port.js";

export const RESEARCH_REPOSITORY = Symbol("RESEARCH_REPOSITORY");

@Injectable()
export class ResearchService {
  constructor(
    @Inject(RESEARCH_REPOSITORY)
    private readonly researchRepo: ResearchRepositoryPort,
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService,
    @Inject(forwardRef(() => ResourcesService))
    private readonly resourcesService: ResourcesService,
    @Optional() @Inject(OrganizationService) private readonly organization?: OrganizationService,
    @Optional() @Inject(IdentityService) private readonly identity?: IdentityService,
    @Optional() @Inject(TRANSACTION_RUNNER) private readonly transactions?: TransactionRunner,
  ) {}

  async createCase(dto: CreateResearchCaseDto, actorId?: string): Promise<ResearchCase> {
    const rCase = ResearchCase.create({
      id: crypto.randomUUID(),
      title: dto.title,
      code: dto.code,
      subject: dto.subject,
      ...(dto.researcherId ? { researcherId: dto.researcherId } : {}),
    });

    const save = async () => {
      await this.researchRepo.create(rCase);
      if (actorId) await this.assignmentsService.assignSupervisorToCase(rCase.id, actorId, "MAIN_SUPERVISOR");
    };
    if (this.transactions) await this.transactions.run(save); else await save();
    return rCase;
  }

  async getCase(id: string): Promise<ResearchCase> {
    const rCase = await this.researchRepo.findById(id);
    if (!rCase) {
      throw new ResearchCaseNotFoundError(id);
    }
    return rCase;
  }

  async isSourcesStageComplete(caseId: string): Promise<boolean> {
    try {
      await this.resourcesService.assertSourcesStageCompleteness(caseId);
      return true;
    } catch (error) {
      if (error instanceof IncompleteSourcesStageError) return false;
      throw error;
    }
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

  async submitSourcesForReview(caseId: string, ownerId: string, expectedVersion: number): Promise<ResearchCase> {
    await this.assertOwnerCanEditStage(caseId, "SOURCES", ownerId);
    await this.resourcesService.assertSourcesStageCompleteness(caseId);
    const researchCase = await this.getCase(caseId);
    const updated = researchCase.submitStageForReview("SOURCES", expectedVersion);
    await this.researchRepo.saveWithVersionCheck(updated, expectedVersion);
    return updated;
  }

  async submitStageForReview(caseId: string, stageType: StageType, ownerId: string, expectedVersion: number): Promise<ResearchCase> {
    if (stageType === "SOURCES" || stageType === "SCENARIO") {
      throw new InvalidStageTransitionError(`ارسال مرحله ${stageType} باید از مسیر اختصاصی همان مرحله انجام شود`);
    }
    await this.assertOwnerCanEditStage(caseId, stageType, ownerId);
    const researchCase = await this.getCase(caseId);
    const updated = researchCase.submitStageForReview(stageType, expectedVersion);
    await this.researchRepo.saveWithVersionCheck(updated, expectedVersion);
    return updated;
  }

  async submitScenarioForReview(caseId: string, ownerId: string): Promise<ResearchCase> {
    await this.assertOwnerCanEditStage(caseId, "SCENARIO", ownerId);
    const researchCase = await this.getCase(caseId);
    const updated = researchCase.submitStageForReview("SCENARIO", researchCase.version);
    await this.researchRepo.saveWithVersionCheck(updated, researchCase.version);
    return updated;
  }

  async markStageInProgress(caseId: string, stageType: StageType, ownerId: string): Promise<void> {
    await this.assertOwnerCanEditStage(caseId, stageType, ownerId);
    const researchCase = await this.getCase(caseId);
    const stage = researchCase.getStage(stageType);
    if (stage?.status === "IN_PROGRESS") return;
    const updated = researchCase.reopenStageForEditing(stageType, researchCase.version);
    await this.researchRepo.saveWithVersionCheck(updated, researchCase.version);
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
    const isAuthorized = await this.isSupervisorAssignedToCase(id, supervisorUserId);

    if (!isAuthorized) {
      throw new UnauthorizedSupervisorError(supervisorUserId, id);
    }

    const rCase = await this.getCase(id);
    if (stageType === "SOURCES" && dto.decision === "APPROVED") {
      await this.resourcesService.assertSourcesStageCompleteness(id);
    }
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

  async isSupervisorAssignedToUser(userId: string, supervisorId: string): Promise<boolean> {
    return this.assignmentsService.isSupervisorAssignedToUser(userId, supervisorId);
  }

  async isResearchEligibleUser(userId: string): Promise<boolean> {
    return this.assignmentsService.isIntern(userId);
  }

  async isSupervisorAssignedToCase(caseId: string, supervisorId: string): Promise<boolean> {
    await this.getCase(caseId);
    return this.assignmentsService.isSupervisorAssignedToCase(caseId, supervisorId);
  }

  async assertOwnerCanEditStage(caseId: string, stageType: StageType, userId: string): Promise<void> {
    const researchCase = await this.getCase(caseId);
    if (researchCase.researcherId !== userId) throw new UnauthorizedSupervisorError(userId, caseId);
    const stage = researchCase.getStage(stageType);
    if (!stage || !["IN_PROGRESS", "REVISION_REQUESTED", "REVIEW_REQUIRED"].includes(stage.status)) {
      throw new InvalidStageTransitionError(`مرحله ${stageType} هنوز برای ویرایش باز نشده است`);
    }
  }

  async canUserAccessCase(caseId: string, userId: string, roles: string[] = []): Promise<boolean> {
    const researchCase = await this.getCase(caseId);
    if (researchCase.researcherId === userId) return true;
    if (await this.isSupervisorAssignedToCase(caseId, userId)) return true;
    if (!researchCase.researcherId) return false;
    if (await this.isSupervisorAssignedToUser(researchCase.researcherId, userId)) return true;
    if (this.organization && await this.organization.hasUserGrant(userId, researchCase.researcherId)) return true;
    if (roles.includes("PROVINCIAL_DIRECTOR") && this.organization && this.identity) {
      return this.organization.canAccessProvince(userId, await this.identity.getUserProvinceId(researchCase.researcherId));
    }
    return false;
  }

  async getAssignedUserIds(supervisorId: string): Promise<string[]> {
    const personal = (await this.assignmentsService.getUsersForSupervisor(supervisorId)).map((user) => user.id);
    const caseIds = new Set(await this.assignmentsService.getCaseIdsForSupervisor(supervisorId));
    const caseUsers = (await this.listCases()).filter((item) => caseIds.has(item.id)).map((item) => item.researcherId).filter((id): id is string => !!id);
    return [...new Set([...personal, ...caseUsers])];
  }

  async listAccessibleCases(userId: string, roles: string[] = [], researcherId?: string): Promise<ResearchCase[]> {
    const cases = (await this.listCases()).filter((item) => !researcherId || item.researcherId === researcherId);
    const allowed = await Promise.all(cases.map(async (item) => await this.canUserAccessCase(item.id, userId, roles) ? item : null));
    return allowed.filter((item): item is ResearchCase => item !== null);
  }

  async getStageInstance(stageId: string): Promise<StageInstanceDto> {
    const stage = await this.researchRepo.findStageInstanceById(stageId);
    if (!stage) {
      throw new InvalidStageTransitionError(
        `مرحله پژوهشی با شناسه ${stageId} یافت نشد`,
      );
    }
    return stage;
  }

  /**
   * Rule D-05 / FR-061 / AT-33:
   * Asserts that all prerequisite stages (SOURCES, EXPLANATION, PRESCRIPTION) are APPROVED
   * and none are in REVIEW_REQUIRED.
   */
  async assertPrerequisitesApprovedForScenario(caseId: string): Promise<void> {
    const rCase = await this.getCase(caseId);

    // Check if any stage is in REVIEW_REQUIRED
    const reviewRequiredStage = rCase.stages.find(
      (s) => s.status === "REVIEW_REQUIRED",
    );
    if (reviewRequiredStage) {
      throw new PrerequisiteStageReviewRequiredError(
        reviewRequiredStage.stageType,
      );
    }

    // Stages SOURCES, EXPLANATION, PRESCRIPTION must be APPROVED
    const prerequisiteTypes: StageType[] = [
      "SOURCES",
      "EXPLANATION",
      "PRESCRIPTION",
    ];
    for (const pType of prerequisiteTypes) {
      const stage = rCase.getStage(pType);
      if (!stage || stage.status !== "APPROVED") {
        throw new ScenarioPrerequisiteNotMetError(
          `مراحل پیش‌نیاز (منابع، تبیین و تجویز) باید قبل از ورود یا تأیید سناریو تکمیل و تأیید شده باشند (مرحله ${pType} در وضعیت ${stage?.status ?? "نامشخص"} است)`,
        );
      }
    }
  }
}
