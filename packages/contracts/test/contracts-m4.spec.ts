import { describe, it, expect } from "vitest";
import {
  CreateStageSubmissionDtoSchema,
  SubmitReviewDecisionDtoSchema,
  CreateScenarioDtoSchema,
  UpdateScenarioDtoSchema,
  SubmitScenarioDtoSchema,
  ReviewScenarioDtoSchema,
  ScenarioBankQuerySchema,
  SubmissionStatusSchema,
  ScenarioStatusSchema,
} from "../src/index.js";

describe("Contracts M4: Scientific Review, Stage Submissions & Scenarios", () => {
  describe("SubmissionStatusSchema", () => {
    it("validates all allowed submission statuses", () => {
      expect(SubmissionStatusSchema.safeParse("SUBMITTED").success).toBe(true);
      expect(SubmissionStatusSchema.safeParse("APPROVED").success).toBe(true);
      expect(SubmissionStatusSchema.safeParse("REJECTED").success).toBe(true);
      expect(SubmissionStatusSchema.safeParse("REVISION_REQUIRED").success).toBe(true);
      expect(SubmissionStatusSchema.safeParse("INVALID").success).toBe(false);
    });
  });

  describe("CreateStageSubmissionDtoSchema (FR-016, FR-019, AT-05, AT-07)", () => {
    it("validates a valid stage report submission", () => {
      const valid = {
        content: "این گزارش تفصیلی تبیین مسئله و تحلیل علّی پدیده مورد نظر است.",
        expectedVersion: 1,
      };
      const result = CreateStageSubmissionDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when content is too short or expectedVersion is non-positive", () => {
      const invalid = {
        content: "کوتاه",
        expectedVersion: 0,
      };
      const result = CreateStageSubmissionDtoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("SubmitReviewDecisionDtoSchema (D-02, D-03, FR-057, AT-29)", () => {
    it("validates a valid review decision with CAS expectedVersion and idempotencyKey", () => {
      const valid = {
        decision: "APPROVED",
        reason: "گزارش ارائه‌شده از کفایت علمی و منطق علّی کامل برخوردار است.",
        expectedVersion: 1,
        idempotencyKey: "idem-rev-1234567890",
      };
      const result = SubmitReviewDecisionDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("validates CHANGES_REQUESTED decision", () => {
      const valid = {
        decision: "CHANGES_REQUESTED",
        reason: "بخش تجویز نیازمند شفاف‌سازی متغیرهای مداخله‌گر است.",
        expectedVersion: 2,
        idempotencyKey: "idem-rev-9876543210",
      };
      const result = SubmitReviewDecisionDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails if reason is too short or idempotencyKey is missing or too short", () => {
      const invalid = {
        decision: "APPROVED",
        reason: "خوب",
        expectedVersion: 1,
        idempotencyKey: "short",
      };
      const result = SubmitReviewDecisionDtoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("ScenarioStatusSchema", () => {
    it("validates all scenario statuses", () => {
      expect(ScenarioStatusSchema.safeParse("DRAFT").success).toBe(true);
      expect(ScenarioStatusSchema.safeParse("UNDER_REVIEW").success).toBe(true);
      expect(ScenarioStatusSchema.safeParse("APPROVED_INTERNAL").success).toBe(true);
      expect(ScenarioStatusSchema.safeParse("ARCHIVED").success).toBe(true);
      expect(ScenarioStatusSchema.safeParse("PUBLIC").success).toBe(false); // MVP boundary: no public
    });
  });

  describe("CreateScenarioDtoSchema (FR-021, AT-08)", () => {
    it("validates a complete scenario input", () => {
      const valid = {
        title: "سناریوی ارتقای بهره‌وری آموزشی",
        summary: "چکیده تفصیلی سناریوی اقدام راهبردی جهت حل مسئله شناسایی‌شده در جامعه مخاطب.",
        content: "متن کامل سناریو شامل مدل‌های اقدام، توالی رویدادها، متغیرهای کنترلی و سازوکار ارزیابی اثربخشی.",
      };
      const result = CreateScenarioDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when fields are missing or below minimum length", () => {
      const invalid = {
        title: "ab",
        summary: "کوتاه",
        content: "کوتاه",
      };
      const result = CreateScenarioDtoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateScenarioDtoSchema", () => {
    it("validates partial scenario update with expectedVersion", () => {
      const valid = {
        title: "عنوان اصلاح‌شده سناریو",
        expectedVersion: 1,
      };
      const result = UpdateScenarioDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when expectedVersion is missing", () => {
      const invalid = {
        title: "عنوان بدون نسخه",
      };
      const result = UpdateScenarioDtoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("SubmitScenarioDtoSchema", () => {
    it("validates positive expectedVersion", () => {
      expect(SubmitScenarioDtoSchema.safeParse({ expectedVersion: 1 }).success).toBe(true);
      expect(SubmitScenarioDtoSchema.safeParse({ expectedVersion: 0 }).success).toBe(false);
      expect(SubmitScenarioDtoSchema.safeParse({ expectedVersion: -1 }).success).toBe(false);
    });
  });

  describe("ReviewScenarioDtoSchema (FR-040, AT-16)", () => {
    it("validates scenario review with CAS and idempotencyKey", () => {
      const valid = {
        decision: "APPROVED",
        reason: "سناریو قابلیت ثبت در بانک داخلی سناریوها را دارد.",
        expectedVersion: 1,
        idempotencyKey: "scenario-rev-key-101",
      };
      const result = ReviewScenarioDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("ScenarioBankQuerySchema (Internal bank query)", () => {
    it("applies default pagination limit of 20", () => {
      const result = ScenarioBankQuerySchema.parse({});
      expect(result.limit).toBe(20);
    });

    it("coerces string limit to number within 1-100", () => {
      const result = ScenarioBankQuerySchema.parse({ limit: "50", query: "آموزش" });
      expect(result.limit).toBe(50);
      expect(result.query).toBe("آموزش");
    });
  });
});

