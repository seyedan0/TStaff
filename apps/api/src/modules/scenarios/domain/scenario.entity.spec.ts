import { describe, it, expect } from "vitest";
import { Scenario } from "./scenario.entity.js";
import {
  StaleScenarioRevisionError,
  InvalidScenarioStatusTransitionError,
} from "./scenarios-errors.js";

describe("Scenario Entity (Pure Domain)", () => {
  it("creates a new scenario with DRAFT status and version 1", () => {
    const scenario = Scenario.create({
      id: "sc-1",
      researchCaseId: "case-1",
      title: "سناریوی ارتقای علمی",
      summary: "چکیده تفصیلی سناریو",
      content: "متن کامل سناریوی ارائه‌شده",
    });

    expect(scenario.id).toBe("sc-1");
    expect(scenario.researchCaseId).toBe("case-1");
    expect(scenario.status).toBe("DRAFT");
    expect(scenario.version).toBe(1);
  });

  it("updates scenario and increments version with CAS check", () => {
    const scenario = Scenario.create({
      id: "sc-1",
      researchCaseId: "case-1",
      title: "عنوان اولیه",
      summary: "چکیده اولیه",
      content: "متن اولیه",
    });

    const updated = scenario.update({ title: "عنوان به‌روزشده" }, 1);
    expect(updated.title).toBe("عنوان به‌روزشده");
    expect(updated.version).toBe(2);
    // Immutability check
    expect(scenario.title).toBe("عنوان اولیه");
    expect(scenario.version).toBe(1);
  });

  it("throws StaleScenarioRevisionError when updating with mismatched version", () => {
    const scenario = Scenario.create({
      id: "sc-1",
      researchCaseId: "case-1",
      title: "عنوان",
      summary: "چکیده",
      content: "متن",
    });

    expect(() => scenario.update({ title: "جدید" }, 99)).toThrow(
      StaleScenarioRevisionError,
    );
  });

  it("submits for review and transitions to UNDER_REVIEW", () => {
    const scenario = Scenario.create({
      id: "sc-1",
      researchCaseId: "case-1",
      title: "عنوان",
      summary: "چکیده",
      content: "متن",
    });

    const underReview = scenario.submitForReview(1);
    expect(underReview.status).toBe("UNDER_REVIEW");
    expect(underReview.version).toBe(2);
  });

  it("approves scenario to APPROVED_INTERNAL (internal scenario bank)", () => {
    const scenario = Scenario.create({
      id: "sc-1",
      researchCaseId: "case-1",
      title: "عنوان",
      summary: "چکیده",
      content: "متن",
    });

    const underReview = scenario.submitForReview(1);
    const approved = underReview.approveInternal(2);
    expect(approved.status).toBe("APPROVED_INTERNAL");
    expect(approved.version).toBe(3);
  });

  it("prevents direct update of APPROVED_INTERNAL scenario", () => {
    const scenario = Scenario.create({
      id: "sc-1",
      researchCaseId: "case-1",
      title: "عنوان",
      summary: "چکیده",
      content: "متن",
    });

    const underReview = scenario.submitForReview(1);
    const approved = underReview.approveInternal(2);
    expect(() => approved.update({ title: "تغییر غیرمجاز" }, 3)).toThrow(
      InvalidScenarioStatusTransitionError,
    );
  });
});

