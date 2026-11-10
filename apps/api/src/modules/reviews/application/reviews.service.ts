import { Injectable, Inject, Optional } from "@nestjs/common";
import { TRANSACTION_RUNNER, type TransactionRunner } from "../../../platform/transactions/transaction-runner.js";
import { AuditService } from "../../audit/application/audit.service.js";
import type {
  CreateStageSubmissionDto,
  SubmitReviewDecisionDto,
} from "@tstaff/contracts";
import { StageSubmission } from "../domain/stage-submission.entity.js";
import { ReviewDecision } from "../domain/review-decision.entity.js";
import {
  SubmissionNotFoundError,
  UnauthorizedSupervisorError,
  ReviewsDomainError,
} from "../domain/reviews-errors.js";
import { ResearchService } from "../../research/application/research.service.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import type { ReviewRepositoryPort } from "./ports/review.repository.port.js";
import { FilesService } from "../../files/application/files.service.js";

export const REVIEW_REPOSITORY = Symbol("REVIEW_REPOSITORY");

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepo: ReviewRepositoryPort,
    @Inject(ResearchService)
    private readonly researchService: ResearchService,
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService,
    @Inject(FilesService) private readonly files: FilesService,
    @Optional() @Inject(TRANSACTION_RUNNER) private readonly transactions?: TransactionRunner,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  async getFileCaseIds(fileId: string): Promise<string[]> {
    const stages = await this.reviewRepo.findStageIdsByFileId?.(fileId) ?? [];
    return [...new Set(await Promise.all(stages.map(async (id) => (await this.researchService.getStageInstance(id)).researchCaseId)))];
  }

  async submitStageReport(
    stageInstanceId: string,
    authorId: string,
    dto: CreateStageSubmissionDto,
  ): Promise<StageSubmission> {
    const execute = () => this.submitStageReportWithinTransaction(stageInstanceId, authorId, dto);
    return this.transactions ? this.transactions.run(execute) : execute();
  }

  private async submitStageReportWithinTransaction(stageInstanceId: string, authorId: string, dto: CreateStageSubmissionDto): Promise<StageSubmission> {
    const stage = await this.researchService.getStageInstance(stageInstanceId);
    const ownerCase = await this.researchService.getCase(stage.researchCaseId);
    if (ownerCase.researcherId !== authorId) {
      throw new ReviewsDomainError("این پرونده متعلق به کاربر جاری نیست", "FORBIDDEN");
    }
    if (!["IN_PROGRESS", "REVISION_REQUESTED", "REVIEW_REQUIRED"].includes(stage.status)) {
      throw new ReviewsDomainError("این مرحله هنوز برای ثبت یا اصلاح باز نشده است", "STAGE_LOCKED");
    }
    if ((stage.stageType === "EXPLANATION" || stage.stageType === "PRESCRIPTION") && !dto.fileId) {
      throw new ReviewsDomainError("بارگذاری فایل PDF یا DOCX برای این مرحله الزامی است", "FILE_REQUIRED");
    }
    if (dto.fileId) await this.files.assertReadyForUse(dto.fileId, authorId);

    const existingSubmissions =
      await this.reviewRepo.findSubmissionsByStageInstanceId(stageInstanceId);
    const nextVersion =
      existingSubmissions.length > 0
        ? Math.max(...existingSubmissions.map((s) => s.version)) + 1
        : 1;

    const submission = StageSubmission.create({
      id: crypto.randomUUID(),
      stageInstanceId: stage.id,
      authorId,
      content: dto.content,
      ...(dto.fileId !== undefined ? { storedObjectId: dto.fileId } : {}),
      version: nextVersion,
    });

    await this.researchService.submitStageForReview(
      ownerCase.id,
      stage.stageType,
      authorId,
      dto.expectedVersion,
    );
    await this.reviewRepo.saveSubmission(submission);

    return submission;
  }

  /**
   * Rule D-02 & D-03 / FR-057 / AT-29:
   * Main supervisor and Collaborator supervisor have equal authority.
   * Sufficiency of 1 valid decision.
   * CAS optimistic concurrency control: First valid commit wins, second attempt throws 409 StaleRevisionError.
   */
  async submitReviewDecision(
    submissionId: string,
    reviewerId: string,
    dto: SubmitReviewDecisionDto,
  ): Promise<{ submission: StageSubmission; decision: ReviewDecision }> {
    const execute = () => this.submitReviewDecisionWithinTransaction(submissionId, reviewerId, dto);
    return this.transactions ? this.transactions.run(execute) : execute();
  }

  private async submitReviewDecisionWithinTransaction(submissionId: string, reviewerId: string, dto: SubmitReviewDecisionDto): Promise<{ submission: StageSubmission; decision: ReviewDecision }> {
    // Authenticate the reviewer before checking idempotency to avoid leaking another review.
    const submission = await this.reviewRepo.findSubmissionById(submissionId);
    if (!submission) {
      throw new SubmissionNotFoundError(submissionId);
    }

    // 3. Load stage instance and check supervisor authority
    const stage = await this.researchService.getStageInstance(
      submission.stageInstanceId,
    );
    const isAuthorized = await this.researchService.isSupervisorAssignedToCase(
      stage.researchCaseId,
      reviewerId,
    );

    if (!isAuthorized) {
      throw new UnauthorizedSupervisorError(reviewerId, stage.researchCaseId);
    }

    const existingDecision = await this.reviewRepo.findDecisionByIdempotencyKey(dto.idempotencyKey);
    if (existingDecision) {
      if (existingDecision.stageSubmissionId !== submissionId) throw new ReviewsDomainError("کلید یکتایی قبلاً برای داوری گزارش دیگری استفاده شده است", "CONFLICT");
      return { submission, decision: existingDecision };
    }

    // 4. Apply decision using CAS and move the workflow only on scientific approval.
    let updatedSubmission: StageSubmission;
    if (dto.decision === "APPROVED") {
      updatedSubmission = submission.approve(dto.expectedVersion);
    } else {
      updatedSubmission = submission.requestRevision(dto.expectedVersion);
    }

    // Case-level CAS serializes decisions from all assigned supervisors.
    await this.researchService.reviewDecision(
      stage.researchCaseId,
      stage.stageType,
      reviewerId,
      {
        decision: dto.decision === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED",
        expectedVersion: dto.caseVersion,
        notes: dto.reason,
      },
    );

    // 5. Atomic database CAS update (throws StaleRevisionError if version changed concurrently)
    await this.reviewRepo.updateSubmissionWithVersionCheck(
      updatedSubmission,
      dto.expectedVersion,
    );

    // 6. Record immutable ReviewDecision
    const decision = ReviewDecision.create({
      id: crypto.randomUUID(),
      stageSubmissionId: submission.id,
      reviewerId,
      decision: dto.decision,
      expectedVersion: dto.expectedVersion,
      actualVersion: submission.version,
      reason: dto.reason,
      idempotencyKey: dto.idempotencyKey,
    });
    await this.reviewRepo.saveDecision(decision);
    await this.audit?.recordEvent({ aggregateType: "ResearchCase", aggregateId: stage.researchCaseId, action: "STAGE_REVIEWED", actorId: reviewerId, payload: { submissionId, decision: dto.decision, previousVersion: dto.caseVersion, reason: dto.reason } });

    return { submission: updatedSubmission, decision };
  }

  async getSubmissionsForStage(
    stageInstanceId: string,
  ): Promise<StageSubmission[]> {
    return this.reviewRepo.findSubmissionsByStageInstanceId(stageInstanceId);
  }

  async getSubmissionById(id: string): Promise<StageSubmission> {
    const sub = await this.reviewRepo.findSubmissionById(id);
    if (!sub) {
      throw new SubmissionNotFoundError(id);
    }
    return sub;
  }

  async assertCanAccessStage(stageInstanceId: string, userId: string, roles: string[] = []): Promise<void> {
    const stage = await this.researchService.getStageInstance(stageInstanceId);
    if (!(await this.researchService.canUserAccessCase(stage.researchCaseId, userId, roles))) {
      throw new UnauthorizedSupervisorError(userId, stage.researchCaseId);
    }
  }

  async assertCanAccessSubmission(submissionId: string, userId: string, roles: string[] = []): Promise<void> {
    const submission = await this.getSubmissionById(submissionId);
    await this.assertCanAccessStage(submission.stageInstanceId, userId, roles);
  }

  async getPendingReviewWorklist(supervisorId: string) {
    const trainees = await this.assignmentsService.getUsersForSupervisor(supervisorId);
    const traineeIds = new Set(trainees.filter((user) => user.stage === "INTERN").map((user) => user.id));
    const candidates = await this.researchService.listAccessibleCases(supervisorId, ["SCIENTIFIC_SUPERVISOR"]);
    const cases = [];
    for (const item of candidates) if (await this.researchService.isSupervisorAssignedToCase(item.id, supervisorId)) cases.push(item);
    const results: Array<Record<string, unknown>> = [];
    for (const researchCase of cases) {
      for (const stage of researchCase.stages) {
        if (stage.stageType === "SOURCES" && stage.status === "SUBMITTED") {
          if (!(await this.researchService.isSourcesStageComplete(researchCase.id))) continue;
          results.push({ id: `sources:${researchCase.id}`, kind: "SOURCE_STAGE", caseId: researchCase.id, caseCode: researchCase.code, caseTitle: researchCase.title, researcherId: researchCase.researcherId, internName: trainees.find((user) => user.id === researchCase.researcherId)?.fullName ?? "کارورز", stageId: stage.id, stageType: stage.stageType, stageName: "منابع و مصاحبه‌ها", caseVersion: researchCase.version, submittedAt: researchCase.toJSON().updatedAt, summary: "بررسی تکمیل منابع، مصاحبه یکتا و گزارش مکتوب" });
          continue;
        }
        const submissions = await this.reviewRepo.findSubmissionsByStageInstanceId(stage.id);
        const latest = submissions.filter((submission) => submission.status === "SUBMITTED").at(-1);
        if (!latest) continue;
        results.push({ id: latest.id, kind: "SUBMISSION", submissionId: latest.id, caseId: researchCase.id, caseCode: researchCase.code, caseTitle: researchCase.title, researcherId: researchCase.researcherId, internName: trainees.find((user) => user.id === researchCase.researcherId)?.fullName ?? "کارورز", stageId: stage.id, stageType: stage.stageType, stageName: stage.stageType, caseVersion: researchCase.version, version: latest.version, submittedAt: latest.submittedAt.toISOString(), summary: latest.content, storedObjectId: latest.toJSON().storedObjectId });
      }
    }
    return results;
  }
}

