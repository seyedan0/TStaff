import { describe, it, expect } from "vitest";
import { ResearchCase } from "./research-case.entity.js";
import {
  StaleRevisionError,
  InvalidStageTransitionError,
} from "./research-errors.js";

describe("ResearchCase Domain Entity (D-02, D-03, D-05, AT-29, AT-33)", () => {
  it("initializes a research case in DRAFT status with version 1 and 4 stages", () => {
    const rCase = ResearchCase.create({
      id: "case-1",
      title: "تحلیل مشارکت نخبگان",
      code: "RC-01",
      subject: "جامعه‌شناسی",
    });

    expect(rCase.id).toBe("case-1");
    expect(rCase.status).toBe("DRAFT");
    expect(rCase.version).toBe(1);
    expect(rCase.stages).toHaveLength(4);

    const sourcesStage = rCase.getStage("SOURCES");
    expect(sourcesStage).toBeDefined();
    expect(sourcesStage?.status).toBe("IN_PROGRESS");
  });

  it("opens the next stage only on a submitted and approved stage, with case-wide CAS (D-02, AT-29)", () => {
    const rCase = ResearchCase.create({
      id: "case-1",
      title: "عنوان",
      code: "RC-01",
      subject: "موضوع",
    });

    expect(() => rCase.applyReviewDecision("SOURCES", "APPROVED", 1)).toThrow(InvalidStageTransitionError);
    const submitted = rCase.submitStageForReview("SOURCES", 1);
    expect(() => submitted.applyReviewDecision("SOURCES", "APPROVED", 1)).toThrow(StaleRevisionError);
    const approved = submitted.applyReviewDecision("SOURCES", "APPROVED", 2);
    expect(approved.version).toBe(3);
    expect(approved.status).toBe("EXPLANATION_STAGE");
    expect(approved.getStage("SOURCES")?.status).toBe("APPROVED");
    expect(approved.getStage("EXPLANATION")?.status).toBe("IN_PROGRESS");
  });

  it("performs rollback and cascades downstream stages to REVIEW_REQUIRED while preserving history (D-05, AT-33)", () => {
    const rCase = ResearchCase.create({
      id: "case-1",
      title: "عنوان",
      code: "RC-01",
      subject: "موضوع",
    });

    const sourcesSubmitted = rCase.submitStageForReview("SOURCES", 1);
    const sourcesApproved = sourcesSubmitted.applyReviewDecision("SOURCES", "APPROVED", 2);
    const explanationSubmitted = sourcesApproved.submitStageForReview("EXPLANATION", 3);
    const v4 = explanationSubmitted.applyReviewDecision("EXPLANATION", "APPROVED", 4);

    expect(v4.status).toBe("PRESCRIPTION_STAGE");
    expect(v4.getStage("SOURCES")?.status).toBe("APPROVED");
    expect(v4.getStage("EXPLANATION")?.status).toBe("APPROVED");
    expect(v4.getStage("PRESCRIPTION")?.status).toBe("IN_PROGRESS");

    // Rollback to SOURCES (due to new interviews needed)
    const rolledBack = v4.rollbackStage(
      "SOURCES",
      "نیاز به داده‌های میدانی جدید",
      5,
    );

    expect(rolledBack.version).toBe(6);
    expect(rolledBack.status).toBe("SOURCES_STAGE");
    expect(rolledBack.getStage("SOURCES")?.status).toBe("IN_PROGRESS");

    // Downstream stages must cascade to REVIEW_REQUIRED (D-05, FR-061, AT-33)
    expect(rolledBack.getStage("EXPLANATION")?.status).toBe("REVIEW_REQUIRED");
    expect(rolledBack.getStage("PRESCRIPTION")?.status).toBe("REVIEW_REQUIRED");

    // Forward rollback jump is blocked (cannot rollback to future stage)
    expect(() =>
      rolledBack.rollbackStage("PRESCRIPTION", "پرش غیرمجاز", 6)
    ).toThrow(InvalidStageTransitionError);
  });

  it("applies scientific evaluation decision with CAS version check (D-02, D-03, AT-29)", () => {
    const rCase = ResearchCase.create({
      id: "case-1",
      title: "عنوان",
      code: "RC-01",
      subject: "موضوع",
    });

    const submitted = rCase.submitStageForReview("SOURCES", 1);
    expect(() => submitted.applyReviewDecision("SOURCES", "APPROVED", 99)).toThrow(StaleRevisionError);
    const reviewed = submitted.applyReviewDecision("SOURCES", "APPROVED", 2);
    expect(reviewed.version).toBe(3);
    expect(reviewed.getStage("SOURCES")?.status).toBe("APPROVED");
  });
});
