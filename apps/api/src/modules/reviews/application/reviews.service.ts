import { Injectable, Inject } from "@nestjs/common";
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
  ) {}

  async submitStageReport(
    stageInstanceId: string,
    authorId: string,
    dto: CreateStageSubmissionDto,
  ): Promise<StageSubmission> {
    const stage = await this.researchService.getStageInstance(stageInstanceId);

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
      version: nextVersion,
    });

    await this.reviewRepo.saveSubmission(submission);

    // If stage was in PENDING, REVISION_REQUESTED, or REVIEW_REQUIRED, set to IN_PROGRESS (D-05, AT-33)
    if (
      stage.status === "PENDING" ||
      stage.status === "REVISION_REQUESTED" ||
      stage.status === "REVIEW_REQUIRED"
    ) {
      await this.researchService.updateStageStatus(stage.id, "IN_PROGRESS");
    }

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
    // 1. Idempotency check: if decision already recorded with idempotencyKey, return it
    const existingDecision =
      await this.reviewRepo.findDecisionByIdempotencyKey(dto.idempotencyKey);
    if (existingDecision) {
      if (existingDecision.stageSubmissionId !== submissionId) {
        throw new ReviewsDomainError(
          "کلید یکتایی (idempotencyKey) قبلاً برای داوری گزارش دیگری استفاده شده است",
          "CONFLICT",
        );
      }
      const existingSubmission =
        await this.reviewRepo.findSubmissionById(submissionId);
      if (existingSubmission) {
        return {
          submission: existingSubmission,
          decision: existingDecision,
        };
      }
    }

    // 2. Load submission
    const submission = await this.reviewRepo.findSubmissionById(submissionId);
    if (!submission) {
      throw new SubmissionNotFoundError(submissionId);
    }

    // 3. Load stage instance and check supervisor authority
    const stage = await this.researchService.getStageInstance(
      submission.stageInstanceId,
    );
    const isAuthorized = await this.assignmentsService.isAuthorizedSupervisor(
      stage.researchCaseId,
      reviewerId,
    );

    if (!isAuthorized) {
      throw new UnauthorizedSupervisorError(reviewerId, stage.researchCaseId);
    }

    // 4. Apply decision using CAS
    let updatedSubmission: StageSubmission;
    if (dto.decision === "APPROVED") {
      updatedSubmission = submission.approve(dto.expectedVersion);
    } else {
      updatedSubmission = submission.requestRevision(dto.expectedVersion);
    }

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

    // 7. Update research stage status accordingly
    if (dto.decision === "APPROVED") {
      await this.researchService.updateStageStatus(stage.id, "APPROVED");
    } else {
      await this.researchService.updateStageStatus(
        stage.id,
        "REVISION_REQUESTED",
      );
    }

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
}

