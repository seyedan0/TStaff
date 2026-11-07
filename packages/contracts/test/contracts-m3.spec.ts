import { describe, it, expect } from "vitest";
import {
  CreateResearchCaseDtoSchema,
  AssignSupervisorDtoSchema,
  CreateResourceDtoSchema,
  CreateInterviewDtoSchema,
  CreateInterviewReportDtoSchema,
  AdvanceStageDtoSchema,
  RollbackStageDtoSchema,
  ReviewDecisionDtoSchema,
} from "../src/index.js";

describe("Contracts M3: Research, Assignments & Resources", () => {
  describe("CreateResearchCaseDtoSchema", () => {
    it("validates a valid research case input", () => {
      const valid = {
        title: "بررسی الگوی نخبگانی",
        code: "RC-2026-001",
        subject: "علوم اجتماعی",
      };
      const result = CreateResearchCaseDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("fails when code or title is empty", () => {
      const invalid = {
        title: "",
        code: "",
        subject: "موضوع",
      };
      const result = CreateResearchCaseDtoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("AssignSupervisorDtoSchema (D-02)", () => {
    it("validates supervisor assignment for MAIN_SUPERVISOR and COLLABORATOR_SUPERVISOR", () => {
      const validMain = {
        userId: "11111111-1111-1111-1111-111111111111",
        role: "MAIN_SUPERVISOR",
      };
      const result = AssignSupervisorDtoSchema.safeParse(validMain);
      expect(result.success).toBe(true);

      const validCollab = {
        userId: "22222222-2222-2222-2222-222222222222",
        role: "COLLABORATOR_SUPERVISOR",
      };
      expect(AssignSupervisorDtoSchema.safeParse(validCollab).success).toBe(
        true,
      );
    });

    it("rejects invalid role for supervisor assignment", () => {
      const invalid = {
        userId: "11111111-1111-1111-1111-111111111111",
        role: "PRIMARY_RESEARCHER", // only supervisors allowed in this DTO
      };
      const result = AssignSupervisorDtoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateResourceDtoSchema", () => {
    it("validates INDIVIDUAL, ORGANIZATION, LITERATURE, and DATASET types", () => {
      const types = [
        "INDIVIDUAL",
        "ORGANIZATION",
        "LITERATURE",
        "DATASET",
      ] as const;
      for (const type of types) {
        const res = CreateResourceDtoSchema.safeParse({
          type,
          title: `عنوان منبع ${type}`,
          description: "توضیحات منبع",
          contactInfo: "09121234567",
        });
        expect(res.success).toBe(true);
      }
    });

    it("fails for unrecognized resource type", () => {
      const result = CreateResourceDtoSchema.safeParse({
        type: "WEBSITE",
        title: "سایت",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CreateInterviewDtoSchema (D-01 / D-07 / AT-28)", () => {
    it("validates interview with integer age", () => {
      const valid = {
        intervieweeName: "دکتر علوی",
        intervieweeAge: 45,
        conductedAt: "2026-05-10T10:00:00.000Z",
      };
      const result = CreateInterviewDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects float age, negative age, or zero age (Rule D-01 / AT-28)", () => {
      expect(
        CreateInterviewDtoSchema.safeParse({
          intervieweeName: "دکتر علوی",
          intervieweeAge: 45.5,
          conductedAt: "2026-05-10T10:00:00.000Z",
        }).success,
      ).toBe(false);

      expect(
        CreateInterviewDtoSchema.safeParse({
          intervieweeName: "دکتر علوی",
          intervieweeAge: -10,
          conductedAt: "2026-05-10T10:00:00.000Z",
        }).success,
      ).toBe(false);

      expect(
        CreateInterviewDtoSchema.safeParse({
          intervieweeName: "دکتر علوی",
          intervieweeAge: 0,
          conductedAt: "2026-05-10T10:00:00.000Z",
        }).success,
      ).toBe(false);
    });
  });

  describe("CreateInterviewReportDtoSchema", () => {
    it("validates interview report content and key points", () => {
      const valid = {
        title: "گزارش مصاحبه تفصیلی",
        content: "متن کامل تحلیل و یافته‌های مصاحبه...",
      };
      expect(CreateInterviewReportDtoSchema.safeParse(valid).success).toBe(
        true,
      );
    });
  });

  describe("Stage Concurrency & Rollback DTOs (D-02, D-03, D-05, AT-29, AT-33)", () => {
    it("AdvanceStageDtoSchema requires positive integer expectedVersion", () => {
      expect(
        AdvanceStageDtoSchema.safeParse({ expectedVersion: 1 }).success,
      ).toBe(true);
      expect(
        AdvanceStageDtoSchema.safeParse({ expectedVersion: 0 }).success,
      ).toBe(false);
      expect(AdvanceStageDtoSchema.safeParse({}).success).toBe(false);
    });

    it("RollbackStageDtoSchema requires targetStage, reason and expectedVersion (D-05)", () => {
      const valid = {
        targetStage: "SOURCES",
        reason: "نیاز به تکمیل مصاحبه‌های میدانی تکمیلی",
        expectedVersion: 2,
      };
      expect(RollbackStageDtoSchema.safeParse(valid).success).toBe(true);

      const invalidStage = {
        targetStage: "UNKNOWN_STAGE",
        reason: "دلیل نامشخص",
        expectedVersion: 2,
      };
      expect(RollbackStageDtoSchema.safeParse(invalidStage).success).toBe(
        false,
      );
    });

    it("ReviewDecisionDtoSchema requires expectedVersion and valid decision", () => {
      const valid = {
        decision: "APPROVED",
        notes: "مرحله منابع با موفقیت تایید شد",
        expectedVersion: 2,
      };
      expect(ReviewDecisionDtoSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        decision: "MAYBE",
        expectedVersion: 2,
      };
      expect(ReviewDecisionDtoSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
