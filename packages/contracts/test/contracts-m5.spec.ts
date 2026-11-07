import { describe, it, expect } from "vitest";
import {
  SuspendUserDtoSchema,
  ReactivateUserDtoSchema,
  CreateConversationDtoSchema,
  SendMessageDtoSchema,
  CreateNotificationDtoSchema,
  NotificationQuerySchema,
  CreateAuditEventDtoSchema,
  AuditQueryFilterSchema,
  CreateArchiveJobDtoSchema,
  ProvincialDirectorMetricsSchema,
  SupervisorWorklistSchema,
  TrackingDirectorBacklogSchema,
  GeneralDirectorSummarySchema,
  UpdateSystemSettingDtoSchema,
} from "../src/index.js";

describe("Milestone 5 Contracts Validation", () => {
  describe("User Suspension & Reactivation (AT-12, BR-18)", () => {
    it("should accept valid suspension reason", () => {
      const parsed = SuspendUserDtoSchema.parse({
        reason: "نقض مکرر انضباط علمی و عدم پاسخگویی",
      });
      expect(parsed.reason).toBe("نقض مکرر انضباط علمی و عدم پاسخگویی");
    });

    it("should reject too short suspension reason", () => {
      expect(() => SuspendUserDtoSchema.parse({ reason: "کم" })).toThrow();
    });

    it("should parse reactivate with or without reason", () => {
      const p1 = ReactivateUserDtoSchema.parse({});
      expect(p1.reason).toBeUndefined();

      const p2 = ReactivateUserDtoSchema.parse({
        reason: "پایان دوره تعلیق و تعهد کتبی",
      });
      expect(p2.reason).toBe("پایان دوره تعلیق و تعهد کتبی");
    });
  });

  describe("Messaging Contracts (1:1 Direct Chat - AT-10, BR-16)", () => {
    it("should accept valid 1:1 conversation creation", () => {
      const parsed = CreateConversationDtoSchema.parse({
        participantId: "11111111-1111-1111-1111-111111111111",
        type: "DIRECT_SUPERVISOR_TRAINEE",
      });
      expect(parsed.participantId).toBe("11111111-1111-1111-1111-111111111111");
      expect(parsed.type).toBe("DIRECT_SUPERVISOR_TRAINEE");
    });

    it("should validate message content length", () => {
      expect(() => SendMessageDtoSchema.parse({ content: "" })).toThrow();
      const valid = SendMessageDtoSchema.parse({
        content: "سلام، گزارش اصلاح‌شده مرحله بارگذاری شد.",
      });
      expect(valid.content).toBe("سلام، گزارش اصلاح‌شده مرحله بارگذاری شد.");
    });
  });

  describe("Notifications & Selective Policy (D-04, AT-31, AT-32, BR-17)", () => {
    it("should parse notification with critical flag", () => {
      const notif = CreateNotificationDtoSchema.parse({
        userId: "22222222-2222-2222-2222-222222222222",
        type: "USER_SUSPENDED",
        title: "حساب کاربری تعلیق شد",
        body: "حساب شما به دلیل تخلف تا اطلاع ثانوی تعلیق شد.",
        isCritical: true,
      });
      expect(notif.isCritical).toBe(true);
    });

    it("should default isCritical to false for non-urgent notifications", () => {
      const notif = CreateNotificationDtoSchema.parse({
        userId: "22222222-2222-2222-2222-222222222222",
        type: "STAGE_SUBMITTED",
        title: "گزارش جدید ثبت شد",
        body: "کارورز گزارش جدیدی برای مرحله ثبت کرد.",
      });
      expect(notif.isCritical).toBe(false);
    });

    it("should parse notification query with defaults", () => {
      const query = NotificationQuerySchema.parse({});
      expect(query.limit).toBe(20);
      expect(query.unreadOnly).toBeUndefined();
    });
  });

  describe("Audit Log Contracts (D-04, AT-25, AT-31)", () => {
    it("should parse valid audit event payload", () => {
      const audit = CreateAuditEventDtoSchema.parse({
        aggregateType: "ResearchCase",
        aggregateId: "case-123",
        action: "STAGE_ROLLED_BACK",
        actorId: "33333333-3333-3333-3333-333333333333",
        payload: { targetStage: "EXPLANATION", reason: "نیاز به بازنگری فرضیات" },
      });
      expect(audit.action).toBe("STAGE_ROLLED_BACK");
      expect(audit.payload).toHaveProperty("targetStage", "EXPLANATION");
    });

    it("should parse audit query filters", () => {
      const filter = AuditQueryFilterSchema.parse({
        aggregateType: "ResearchCase",
        action: "STAGE_ROLLED_BACK",
        limit: 10,
      });
      expect(filter.limit).toBe(10);
      expect(filter.aggregateType).toBe("ResearchCase");
    });
  });

  describe("Archival Contracts (AT-14, AT-27, BR-19)", () => {
    it("should validate archive job target types", () => {
      const validJob = CreateArchiveJobDtoSchema.parse({
        targetType: "RESEARCH_CASE",
        targetId: "44444444-4444-4444-4444-444444444444",
      });
      expect(validJob.targetType).toBe("RESEARCH_CASE");

      expect(() =>
        CreateArchiveJobDtoSchema.parse({
          targetType: "INVALID_TARGET",
          targetId: "44444444-4444-4444-4444-444444444444",
        }),
      ).toThrow();
    });
  });

  describe("Reporting Dashboards (AT-09, AT-11, AT-15, AT-21, AT-24)", () => {
    it("should parse provincial director metrics", () => {
      const metrics = ProvincialDirectorMetricsSchema.parse({
        totalApplicants: 100,
        approvedApplicants: 40,
        totalApprentices: 35,
        totalInterns: 15,
        activeResearchCases: 12,
      });
      expect(metrics.totalApprentices).toBe(35);
      expect(metrics.totalInterns).toBe(15);
    });

    it("should parse supervisor worklist", () => {
      const worklist = SupervisorWorklistSchema.parse({
        supervisorId: "55555555-5555-5555-5555-555555555555",
        pendingStageSubmissions: 2,
        pendingScenarioReviews: 1,
        totalSupervisedCases: 5,
        items: [
          {
            caseId: "66666666-6666-6666-6666-666666666666",
            caseCode: "CASE-001",
            caseSubject: "بررسی آسیب‌های اجتماعی",
            stage: "EXPLANATION",
            pendingItemType: "STAGE_SUBMISSION",
            pendingItemId: "77777777-7777-7777-7777-777777777777",
            submittedAt: new Date().toISOString(),
          },
        ],
      });
      expect(worklist.pendingStageSubmissions).toBe(2);
      expect(worklist.items).toHaveLength(1);
    });

    it("should parse tracking director backlog", () => {
      const backlog = TrackingDirectorBacklogSchema.parse({
        delayedCasesCount: 3,
        reviewRequiredCasesCount: 1,
        unassignedCasesCount: 2,
        backlogItems: [
          {
            caseId: "88888888-8888-8888-8888-888888888888",
            caseCode: "CASE-002",
            subject: "تحلیل الگوهای مصرف",
            currentStage: "SOURCES",
            status: "IN_PROGRESS",
            daysInCurrentStage: 14,
          },
        ],
      });
      expect(backlog.delayedCasesCount).toBe(3);
    });

    it("should parse general director summary", () => {
      const summary = GeneralDirectorSummarySchema.parse({
        totalUsers: 250,
        totalApplicants: 500,
        totalResearchCases: 45,
        casesByStage: {
          PREPARATION: 10,
          SOURCES: 15,
          EXPLANATION: 10,
          PRESCRIPTION: 5,
          SCENARIO: 5,
        },
        completedScenariosCount: 5,
        activeSupervisorsCount: 20,
      });
      expect(summary.totalUsers).toBe(250);
      expect(summary.casesByStage["EXPLANATION"]).toBe(10);
    });
  });

  describe("System Settings (FR-052, AT-34)", () => {
    it("should parse update system setting DTO", () => {
      const setting = UpdateSystemSettingDtoSchema.parse({
        value: "30",
        description: "حداکثر مهلت هر مرحله به روز",
      });
      expect(setting.value).toBe("30");
    });
  });
});

