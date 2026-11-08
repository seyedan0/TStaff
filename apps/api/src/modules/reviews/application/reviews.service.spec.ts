import { describe, it, expect, beforeEach, vi } from "vitest";
import { ReviewsService } from "./reviews.service.js";
import { StageSubmission } from "../domain/stage-submission.entity.js";
import { ReviewDecision } from "../domain/review-decision.entity.js";
import {
  StaleRevisionError,
  SubmissionNotFoundError,
  UnauthorizedSupervisorError,
} from "../domain/reviews-errors.js";
import type { ReviewRepositoryPort } from "./ports/review.repository.port.js";
import type { ResearchService } from "../../research/application/research.service.js";
import type { AssignmentsService } from "../../assignments/application/assignments.service.js";

describe("ReviewsService (Unit / Domain Application)", () => {
  let reviewsService: ReviewsService;
  let mockReviewRepo: ReviewRepositoryPort;
  let mockResearchService: Partial<ResearchService>;
  let mockAssignmentsService: Partial<AssignmentsService>;
  let mockFileService: { assertReadyForUse: ReturnType<typeof vi.fn> };
  let currentCaseVersion: number;
  let currentStageStatus: "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "REVISION_REQUESTED";

  const stageId = "stage-explanation-1";
  const caseId = "case-uuid-1";
  const authorId = "researcher-user-1";
  const supervisorId1 = "supervisor-main-1";
  const supervisorId2 = "supervisor-collab-2";
  const unauthorizedUserId = "unauthorized-user-99";

  beforeEach(() => {
    const submissions: StageSubmission[] = [];
    const decisions: ReviewDecision[] = [];
    currentCaseVersion = 1;
    currentStageStatus = "IN_PROGRESS";

    mockReviewRepo = {
      saveSubmission: vi.fn(async (sub: StageSubmission) => {
        submissions.push(sub);
      }),
      findSubmissionById: vi.fn(async (id: string) => {
        return submissions.find((s) => s.id === id) ?? null;
      }),
      findSubmissionsByStageInstanceId: vi.fn(async (sId: string) => {
        return submissions.filter((s) => s.stageInstanceId === sId);
      }),
      saveDecision: vi.fn(async (decision: ReviewDecision) => {
        decisions.push(decision);
      }),
      findDecisionByIdempotencyKey: vi.fn(async (key: string) => {
        return decisions.find((d) => d.idempotencyKey === key) ?? null;
      }),
      findDecisionsBySubmissionId: vi.fn(async (subId: string) => {
        return decisions.filter((d) => d.stageSubmissionId === subId);
      }),
      updateSubmissionWithVersionCheck: vi.fn(
        async (sub: StageSubmission, expectedVersion: number) => {
          const idx = submissions.findIndex((s) => s.id === sub.id);
          if (idx === -1 || submissions[idx]!.version !== expectedVersion) {
            throw new StaleRevisionError(
              submissions[idx]?.version ?? 0,
              expectedVersion,
            );
          }
          submissions[idx] = sub;
        },
      ),
    };

    mockResearchService = {
      getStageInstance: vi.fn(async (sId: string) => {
        return {
          id: sId,
          researchCaseId: caseId,
          stageType: "EXPLANATION" as const,
          status: currentStageStatus,
          version: 1,
        };
      }),
      getCase: vi.fn(async () => ({ id: caseId, researcherId: authorId, version: currentCaseVersion } as any)),
      submitStageForReview: vi.fn(async (_case: string, _stage: string, _author: string, expectedVersion: number) => {
        if (expectedVersion !== currentCaseVersion) throw new StaleRevisionError(currentCaseVersion, expectedVersion);
        currentCaseVersion += 1;
        currentStageStatus = "SUBMITTED";
        return {} as any;
      }),
      isSupervisorAssignedToCase: vi.fn(async (_case: string, userId: string) => userId === supervisorId1 || userId === supervisorId2),
      reviewDecision: vi.fn(async (_case: string, _stage: string, _user: string, dto: { expectedVersion: number; decision: string }) => {
        if (dto.expectedVersion !== currentCaseVersion || currentStageStatus !== "SUBMITTED") throw new StaleRevisionError(currentCaseVersion, dto.expectedVersion);
        currentCaseVersion += 1;
        currentStageStatus = dto.decision === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED";
        return {} as any;
      }),
      isSourcesStageComplete: vi.fn(async () => true),
    };

    mockAssignmentsService = {};
    mockFileService = { assertReadyForUse: vi.fn(async () => {}) };

    reviewsService = new ReviewsService(
      mockReviewRepo,
      mockResearchService as ResearchService,
      mockAssignmentsService as AssignmentsService,
      mockFileService as any,
    );
  });

  it("submits stage report and marks the case stage as awaiting review", async () => {
    const submission = await reviewsService.submitStageReport(
      stageId,
      authorId,
      {
        content: "گزارش تفصیلی تبیین مسئله و روابط علّی میان متغیرها.",
        fileId: "00000000-0000-4000-8000-000000000001",
        expectedVersion: 1,
      },
    );

    expect(submission.id).toBeDefined();
    expect(submission.stageInstanceId).toBe(stageId);
    expect(submission.authorId).toBe(authorId);
    expect(submission.version).toBe(1);
    expect(submission.status).toBe("SUBMITTED");
    expect(mockResearchService.submitStageForReview).toHaveBeenCalledWith(caseId, "EXPLANATION", authorId, 1);
    expect(mockResearchService.getCase).toHaveBeenCalledWith(caseId);
  });

  it("allows authorized supervisor to approve submission and updates stage to APPROVED (D-02, FR-057)", async () => {
    const submission = await reviewsService.submitStageReport(
      stageId,
      authorId,
      {
        content: "گزارش مرحله تبیین برای داوری",
        fileId: "00000000-0000-4000-8000-000000000001",
        expectedVersion: 1,
      },
    );

    const result = await reviewsService.submitReviewDecision(
      submission.id,
      supervisorId1,
      {
        decision: "APPROVED",
        reason: "گزارش کاملاً منطبق بر متدولوژی و معتبر است.",
        expectedVersion: 1,
        caseVersion: 2,
        idempotencyKey: "idem-key-decision-001",
      },
    );

    expect(result.submission.status).toBe("APPROVED");
    expect(result.decision.decision).toBe("APPROVED");
    expect(result.decision.reviewerId).toBe(supervisorId1);
    expect(mockResearchService.reviewDecision).toHaveBeenCalled();
  });

  it("Rule AT-29 & CAS: When two supervisors act concurrently, first commits and second throws StaleRevisionError (409)", async () => {
    const submission = await reviewsService.submitStageReport(
      stageId,
      authorId,
      {
        content: "گزارش تبیین در معرض رقابت داوری",
        fileId: "00000000-0000-4000-8000-000000000001",
        expectedVersion: 1,
      },
    );

    // Supervisor 1 (Main) commits decision first
    const result1 = await reviewsService.submitReviewDecision(
      submission.id,
      supervisorId1,
      {
        decision: "APPROVED",
        reason: "تأیید توسط مدیر علمی اصلی",
        expectedVersion: 1,
        caseVersion: 2,
        idempotencyKey: "idem-supervisor-1",
      },
    );
    expect(result1.submission.status).toBe("APPROVED");

    // Supervisor 2 (Collaborator) attempts decision with stale version 1
    await expect(
      reviewsService.submitReviewDecision(submission.id, supervisorId2, {
        decision: "CHANGES_REQUESTED",
        reason: "درخواست اصلاح توسط مدیر همکار",
        expectedVersion: 1,
        caseVersion: 2,
        idempotencyKey: "idem-supervisor-2",
      }),
    ).rejects.toThrow(StaleRevisionError);
  });

  it("enforces idempotency: repeating the same request with idempotencyKey returns existing decision", async () => {
    const submission = await reviewsService.submitStageReport(
      stageId,
      authorId,
      {
        content: "گزارش تبیین",
        fileId: "00000000-0000-4000-8000-000000000001",
        expectedVersion: 1,
      },
    );

    const first = await reviewsService.submitReviewDecision(
      submission.id,
      supervisorId1,
      {
        decision: "APPROVED",
        reason: "تأیید",
        expectedVersion: 1,
        caseVersion: 2,
        idempotencyKey: "idem-repeatable-key-123",
      },
    );

    const second = await reviewsService.submitReviewDecision(
      submission.id,
      supervisorId1,
      {
        decision: "APPROVED",
        reason: "تأیید",
        expectedVersion: 1,
        caseVersion: 2,
        idempotencyKey: "idem-repeatable-key-123",
      },
    );

    expect(second.decision.id).toBe(first.decision.id);
  });

  it("rejects unauthorized user attempting to review (D-02, Negative Authorization)", async () => {
    const submission = await reviewsService.submitStageReport(
      stageId,
      authorId,
      {
        content: "گزارش مرحله تبیین",
        fileId: "00000000-0000-4000-8000-000000000001",
        expectedVersion: 1,
      },
    );

    await expect(
      reviewsService.submitReviewDecision(submission.id, unauthorizedUserId, {
        decision: "APPROVED",
        reason: "تلاش غیرمجاز",
        expectedVersion: 1,
        caseVersion: 2,
        idempotencyKey: "unauth-key-1",
      }),
    ).rejects.toThrow(UnauthorizedSupervisorError);
  });

  it("handles CHANGES_REQUESTED and updates stage to REVISION_REQUESTED", async () => {
    const submission = await reviewsService.submitStageReport(
      stageId,
      authorId,
      {
        content: "گزارش نیازمند اصلاح",
        fileId: "00000000-0000-4000-8000-000000000001",
        expectedVersion: 1,
      },
    );

    const result = await reviewsService.submitReviewDecision(
      submission.id,
      supervisorId2,
      {
        decision: "CHANGES_REQUESTED",
        reason: "ارجاعات کافی نیست و بخش تجربی ضعیف است.",
        expectedVersion: 1,
        caseVersion: 2,
        idempotencyKey: "revision-req-key-01",
      },
    );

    expect(result.submission.status).toBe("REVISION_REQUIRED");
    expect(mockResearchService.reviewDecision).toHaveBeenCalled();
  });
});
