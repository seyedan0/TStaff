import { describe, it, expect } from "vitest";
import { StageSubmission } from "./stage-submission.entity.js";
import {
  StaleRevisionError,
  InvalidSubmissionStateError,
} from "./reviews-errors.js";

describe("StageSubmission Entity (Pure Domain)", () => {
  it("creates a new stage submission with default SUBMITTED status and version 1", () => {
    const sub = StageSubmission.create({
      id: "sub-1",
      stageInstanceId: "stage-1",
      authorId: "user-1",
      content: "گزارش تفصیلی تبیین مسئله و تحلیل علل",
    });

    expect(sub.id).toBe("sub-1");
    expect(sub.stageInstanceId).toBe("stage-1");
    expect(sub.authorId).toBe("user-1");
    expect(sub.version).toBe(1);
    expect(sub.status).toBe("SUBMITTED");
  });

  it("approves submission when expectedVersion matches", () => {
    const sub = StageSubmission.create({
      id: "sub-1",
      stageInstanceId: "stage-1",
      authorId: "user-1",
      content: "گزارش تفصیلی",
    });

    const approved = sub.approve(1);
    expect(approved.status).toBe("APPROVED");
    expect(approved.version).toBe(2);
    // Immutability check
    expect(sub.status).toBe("SUBMITTED");
    expect(sub.version).toBe(1);
  });

  it("throws StaleRevisionError when expectedVersion does not match", () => {
    const sub = StageSubmission.create({
      id: "sub-1",
      stageInstanceId: "stage-1",
      authorId: "user-1",
      content: "گزارش تفصیلی",
    });

    expect(() => sub.approve(2)).toThrow(StaleRevisionError);
  });

  it("requests revision and allows submitting new revision with incremented version", () => {
    const sub = StageSubmission.create({
      id: "sub-1",
      stageInstanceId: "stage-1",
      authorId: "user-1",
      content: "گزارش نسخه ۱",
    });

    const revisionRequired = sub.requestRevision(1);
    expect(revisionRequired.status).toBe("REVISION_REQUIRED");
    expect(revisionRequired.version).toBe(2);

    // BR-15: Submitting revision creates a new version
    const revision2 = revisionRequired.submitRevision(
      "گزارش نسخه ۲ اصلاح‌شده بر اساس نظرات داور",
      "user-1",
    );
    expect(revision2.version).toBe(3);
    expect(revision2.status).toBe("SUBMITTED");
  });

  it("throws InvalidSubmissionStateError if trying to approve already approved submission", () => {
    const sub = StageSubmission.create({
      id: "sub-1",
      stageInstanceId: "stage-1",
      authorId: "user-1",
      content: "گزارش تفصیلی",
    });

    const approved = sub.approve(1);
    expect(() => approved.approve(2)).toThrow(InvalidSubmissionStateError);
  });
});
