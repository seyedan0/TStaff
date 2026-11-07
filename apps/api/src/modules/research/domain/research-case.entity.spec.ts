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

  it("enforces optimistic concurrency (CAS) on stage advancement and increments version (D-02, AT-29)", () => {
    const rCase = ResearchCase.create({
      id: "case-1",
      title: "عنوان",
      code: "RC-01",
      subject: "موضوع",
    });

    // Advancing with mismatched expectedVersion fails with StaleRevisionError
    expect(() => rCase.advanceStage(999)).toThrow(StaleRevisionError);

    // Advancing with matching expectedVersion (1) succeeds and increments version to 2
    const advanced = rCase.advanceStage(1);
    expect(advanced.version).toBe(2);
    expect(advanced.status).toBe("EXPLANATION_STAGE");
    expect(advanced.getStage("SOURCES")?.status).toBe("APPROVED");
    expect(advanced.getStage("EXPLANATION")?.status).toBe("IN_PROGRESS");

    // Trying to advance again with old version 1 fails
    expect(() => advanced.advanceStage(1)).toThrow(StaleRevisionError);
  });

  it("performs rollback and cascades downstream stages to REVIEW_REQUIRED while preserving history (D-05, AT-33)", () => {
    const rCase = ResearchCase.create({
      id: "case-1",
      title: "عنوان",
      code: "RC-01",
      subject: "موضوع",
    });

    // Advance to EXPLANATION (v2)
    const v2 = rCase.advanceStage(1);
    // Approve EXPLANATION by supervisor (v3) (FR-018)
    const v3Approved = v2.applyReviewDecision("EXPLANATION", "APPROVED", 2);
    // Advance to PRESCRIPTION (v4)
    const v4 = v3Approved.advanceStage(3);

    expect(v4.status).toBe("PRESCRIPTION_STAGE");
    expect(v4.getStage("SOURCES")?.status).toBe("APPROVED");
    expect(v4.getStage("EXPLANATION")?.status).toBe("APPROVED");
    expect(v4.getStage("PRESCRIPTION")?.status).toBe("IN_PROGRESS");

    // Rollback to SOURCES (due to new interviews needed)
    const rolledBack = v4.rollbackStage(
      "SOURCES",
      "نیاز به داده‌های میدانی جدید",
      4,
    );

    expect(rolledBack.version).toBe(5);
    expect(rolledBack.status).toBe("SOURCES_STAGE");
    expect(rolledBack.getStage("SOURCES")?.status).toBe("IN_PROGRESS");

    // Downstream stages must cascade to REVIEW_REQUIRED (D-05, FR-061, AT-33)
    expect(rolledBack.getStage("EXPLANATION")?.status).toBe("REVIEW_REQUIRED");
    expect(rolledBack.getStage("PRESCRIPTION")?.status).toBe("REVIEW_REQUIRED");

    // Forward rollback jump is blocked (cannot rollback to future stage)
    expect(() =>
      rolledBack.rollbackStage("PRESCRIPTION", "پرش غیرمجاز", 5)
    ).toThrow(InvalidStageTransitionError);
  });

  it("applies scientific evaluation decision with CAS version check (D-02, D-03, AT-29)", () => {
    const rCase = ResearchCase.create({
      id: "case-1",
      title: "عنوان",
      code: "RC-01",
      subject: "موضوع",
    });

    // Mismatched expectedVersion
    expect(() => rCase.applyReviewDecision("SOURCES", "APPROVED", 99)).toThrow(
      StaleRevisionError,
    );

    // Matching expectedVersion (1) succeeds and increments version to 2
    const reviewed = rCase.applyReviewDecision("SOURCES", "APPROVED", 1);
    expect(reviewed.version).toBe(2);
    expect(reviewed.getStage("SOURCES")?.status).toBe("APPROVED");
  });
});
