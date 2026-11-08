import { describe, it, expect } from "vitest";
import {
  IntegerAgeSchema,
  ProblemDetailsSchema,
  ReviewDecisionRequestSchema,
  HealthResponseSchema,
  CreateApplicantDtoSchema,
  ReviewApplicantDecisionDtoSchema,
  LoginDtoSchema,
  PromoteToInternDtoSchema,
  RequestStudyEvaluationDtoSchema,
  CreateLibraryDocumentDtoSchema,
  PublishLibraryDocumentVersionDtoSchema,
} from "./index.js";

describe("Contracts & Validation Schemas (M1 & M2 Baseline)", () => {
  describe("Library documents and study evaluation (FR-006, FR-007, AT-35–AT-37)", () => {
    it("accepts an evaluation request with notes only", () => {
      expect(RequestStudyEvaluationDtoSchema.parse({ notes: "مطالعه انجام شد" }))
        .toEqual({ notes: "مطالعه انجام شد" });
    });

    it("does not accept client-asserted completed document names", () => {
      expect(() => RequestStudyEvaluationDtoSchema.parse({
        completedGuidelines: ["عنوان ساختگی"],
      })).toThrow();
    });

    it("validates library version metadata separately from the required-at-publish choice", () => {
      const value = {
        title: "شیوه‌نامه منابع",
        description: "راهنمای مرحله منابع",
        category: "آموزش",
      };
      expect(CreateLibraryDocumentDtoSchema.parse(value)).toEqual(value);
      expect(() => CreateLibraryDocumentDtoSchema.parse({ ...value, required: "true" })).toThrow();
      expect(PublishLibraryDocumentVersionDtoSchema.parse({ isRequired: true })).toEqual({ isRequired: true });
      expect(() => PublishLibraryDocumentVersionDtoSchema.parse({ isRequired: "true" })).toThrow();
    });
  });

  describe("IntegerAgeSchema (D-01 / FR-056)", () => {
    it("accepts valid positive integer ages", () => {
      expect(IntegerAgeSchema.parse(25)).toBe(25);
      expect(IntegerAgeSchema.parse(18)).toBe(18);
      expect(IntegerAgeSchema.parse(60)).toBe(60);
    });

    it("rejects floating-point numbers", () => {
      expect(() => IntegerAgeSchema.parse(25.5)).toThrow();
    });

    it("rejects negative numbers and zero", () => {
      expect(() => IntegerAgeSchema.parse(0)).toThrow();
      expect(() => IntegerAgeSchema.parse(-5)).toThrow();
    });

    it("rejects unrealistic ages over 120", () => {
      expect(() => IntegerAgeSchema.parse(150)).toThrow();
    });
  });

  describe("CreateApplicantDtoSchema (FR-001, FR-056, AT-28)", () => {
    const validApplicant = {
      fullName: "علی محمدی",
      nationalId: "0123456789",
      phoneNumber: "09123456789",
      age: 26,
      provinceId: "123e4567-e89b-12d3-a456-426614174000",
      education: "کارشناسی ارشد",
      fieldOfStudy: "علوم سیاسی",
      initialSupervisorId: "123e4567-e89b-12d3-a456-426614174001",
    };

    it("accepts valid applicant data with integer age", () => {
      expect(CreateApplicantDtoSchema.parse(validApplicant)).toMatchObject(
        validApplicant,
      );
    });

    it("rejects invalid national ID (not 10 digits)", () => {
      expect(() =>
        CreateApplicantDtoSchema.parse({
          ...validApplicant,
          nationalId: "12345",
        }),
      ).toThrow();
    });

    it("rejects invalid phone number", () => {
      expect(() =>
        CreateApplicantDtoSchema.parse({
          ...validApplicant,
          phoneNumber: "02188888888",
        }),
      ).toThrow();
    });

    it("rejects float age", () => {
      expect(() =>
        CreateApplicantDtoSchema.parse({ ...validApplicant, age: 26.5 }),
      ).toThrow();
    });
  });

  describe("ReviewApplicantDecisionDtoSchema (FR-002, AT-01)", () => {
    it("accepts valid approval decision", () => {
      const approval = { decision: "APPROVED" as const };
      expect(ReviewApplicantDecisionDtoSchema.parse(approval)).toMatchObject(
        approval,
      );
    });

    it("accepts valid rejection decision with reason", () => {
      const rejection = {
        decision: "REJECTED" as const,
        reason: "عدم تطابق رشته تحصیلی",
      };
      expect(ReviewApplicantDecisionDtoSchema.parse(rejection)).toMatchObject(
        rejection,
      );
    });
  });

  describe("LoginDtoSchema (Phase 1 Password Auth)", () => {
    it("accepts valid phone and password", () => {
      const credentials = {
        phoneNumber: "09123456789",
        password: "Password123",
      };
      expect(LoginDtoSchema.parse(credentials)).toMatchObject(credentials);
    });

    it("rejects short passwords (< 6 chars)", () => {
      expect(() =>
        LoginDtoSchema.parse({ phoneNumber: "09123456789", password: "123" }),
      ).toThrow();
    });
  });

  describe("PromoteToInternDtoSchema (FR-004, AT-03)", () => {
    it("accepts valid evaluation notes", () => {
      const payload = {
        evaluationNotes: "دوره کارآموزی با موفقیت به پایان رسید",
      };
      expect(PromoteToInternDtoSchema.parse(payload)).toMatchObject(payload);
    });

    it("rejects empty evaluation notes", () => {
      expect(() =>
        PromoteToInternDtoSchema.parse({ evaluationNotes: "" }),
      ).toThrow();
    });
  });

  describe("ProblemDetailsSchema (RFC 7807)", () => {
    it("validates compliant problem details object", () => {
      const problem = {
        type: "https://api.tstaff.ir/problems/stale_revision",
        title: "تعارض نسخه",
        status: 409,
        code: "STALE_REVISION",
        detail: "نسخه مورد نظر تغییر یافته است.",
        traceId: "test-trace-123",
        currentVersion: 3,
      };
      const parsed = ProblemDetailsSchema.parse(problem);
      expect(parsed.code).toBe("STALE_REVISION");
      expect(parsed.status).toBe(409);
      expect(parsed.currentVersion).toBe(3);
    });

    it("rejects status codes outside 400-599", () => {
      const invalid = {
        type: "https://api.tstaff.ir/problems/ok",
        title: "موفق",
        status: 200,
        code: "OK",
        detail: "عملیات موفق بود",
        traceId: "trace-1",
      };
      expect(() => ProblemDetailsSchema.parse(invalid)).toThrow();
    });
  });

  describe("ReviewDecisionRequestSchema (D-02 / D-03 CAS)", () => {
    it("accepts valid decision payload", () => {
      const valid = {
        submissionId: "123e4567-e89b-12d3-a456-426614174000",
        expectedVersion: 2,
        decision: "APPROVED",
        reason: "تأیید شد و با استانداردهای علمی مطابقت دارد",
        idempotencyKey: "idemp-key-12345",
      };
      expect(ReviewDecisionRequestSchema.parse(valid)).toMatchObject(valid);
    });

    it("rejects short reason", () => {
      const shortReason = {
        submissionId: "123e4567-e89b-12d3-a456-426614174000",
        expectedVersion: 1,
        decision: "APPROVED",
        reason: "خوب",
        idempotencyKey: "idemp-key-12345",
      };
      expect(() => ReviewDecisionRequestSchema.parse(shortReason)).toThrow();
    });
  });

  describe("HealthResponseSchema", () => {
    it("validates health response", () => {
      const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: 120,
        version: "0.1.0",
        database: "connected",
      };
      expect(HealthResponseSchema.parse(health)).toMatchObject(health);
    });
  });
});
