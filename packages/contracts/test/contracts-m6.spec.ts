import { describe, it, expect } from "vitest";
import {
  OutboxStatusSchema,
  OutboxEventTypeSchema,
  NotificationEventPayloadSchema,
  AuditEventPayloadSchema,
  ArchivalSnapshotEventPayloadSchema,
  StageDeadlineCheckPayloadSchema,
  CreateOutboxEventDtoSchema,
  OutboxEventDtoSchema,
} from "../src/index.js";

describe("Milestone 6 Contracts Validation (Outbox & Worker Events)", () => {
  describe("Outbox Status & Event Types", () => {
    it("should accept valid outbox statuses", () => {
      expect(OutboxStatusSchema.parse("PENDING")).toBe("PENDING");
      expect(OutboxStatusSchema.parse("PROCESSED")).toBe("PROCESSED");
      expect(OutboxStatusSchema.parse("FAILED")).toBe("FAILED");
      expect(() => OutboxStatusSchema.parse("UNKNOWN")).toThrow();
    });

    it("should accept registered outbox event types", () => {
      expect(OutboxEventTypeSchema.parse("NOTIFICATION_EVENT")).toBe(
        "NOTIFICATION_EVENT",
      );
      expect(OutboxEventTypeSchema.parse("AUDIT_EVENT")).toBe("AUDIT_EVENT");
      expect(OutboxEventTypeSchema.parse("ARCHIVAL_SNAPSHOT_EVENT")).toBe(
        "ARCHIVAL_SNAPSHOT_EVENT",
      );
      expect(OutboxEventTypeSchema.parse("STAGE_DEADLINE_CHECK")).toBe(
        "STAGE_DEADLINE_CHECK",
      );
      expect(() => OutboxEventTypeSchema.parse("INVALID_EVENT")).toThrow();
    });
  });

  describe("Outbox Event Payloads", () => {
    it("should parse notification event payload with critical flag default", () => {
      const payload = NotificationEventPayloadSchema.parse({
        userId: "11111111-1111-1111-1111-111111111111",
        type: "SUPERVISOR_ASSIGNED",
        title: "مدیر علمی جدید منتسب شد",
        body: "مدیر علمی برای هدایت پرونده شما تعیین شد.",
      });
      expect(payload.isCritical).toBe(false);
      expect(payload.userId).toBe("11111111-1111-1111-1111-111111111111");

      const critical = NotificationEventPayloadSchema.parse({
        userId: "11111111-1111-1111-1111-111111111111",
        type: "USER_SUSPENDED",
        title: "تعلیق حساب کاربری",
        body: "حساب کاربری شما معلق شد.",
        isCritical: true,
      });
      expect(critical.isCritical).toBe(true);
    });

    it("should parse audit event payload", () => {
      const payload = AuditEventPayloadSchema.parse({
        aggregateType: "ResearchCase",
        aggregateId: "case-01",
        action: "STAGE_ROLLED_BACK",
        actorId: "22222222-2222-2222-2222-222222222222",
        payload: { reason: "بازبینی فرضیات" },
      });
      expect(payload.action).toBe("STAGE_ROLLED_BACK");
      expect(payload.aggregateType).toBe("ResearchCase");
    });

    it("should parse archival snapshot event payload", () => {
      const payload = ArchivalSnapshotEventPayloadSchema.parse({
        jobId: "33333333-3333-3333-3333-333333333333",
        targetType: "RESEARCH_CASE",
        targetId: "44444444-4444-4444-4444-444444444444",
      });
      expect(payload.targetType).toBe("RESEARCH_CASE");
      expect(payload.jobId).toBe("33333333-3333-3333-3333-333333333333");
    });

    it("should parse stage deadline check payload with default threshold", () => {
      const payload = StageDeadlineCheckPayloadSchema.parse({
        checkTimestamp: new Date().toISOString(),
      });
      expect(payload.thresholdDays).toBe(45);
    });
  });

  describe("Outbox Event DTOs", () => {
    it("should parse full OutboxEventDto", () => {
      const dto = OutboxEventDtoSchema.parse({
        id: "55555555-5555-5555-5555-555555555555",
        eventType: "NOTIFICATION_EVENT",
        payload: { some: "data" },
        status: "PENDING",
        retryCount: 0,
        createdAt: new Date().toISOString(),
      });
      expect(dto.status).toBe("PENDING");
      expect(dto.retryCount).toBe(0);
    });

    it("should parse CreateOutboxEventDto", () => {
      const dto = CreateOutboxEventDtoSchema.parse({
        eventType: "NOTIFICATION_EVENT",
        payload: { userId: "user-1", message: "hello" },
      });
      expect(dto.eventType).toBe("NOTIFICATION_EVENT");
    });
  });
});

