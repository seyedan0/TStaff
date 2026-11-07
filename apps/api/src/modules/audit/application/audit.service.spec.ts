import { describe, it, expect, beforeEach } from "vitest";
import { AuditService } from "./audit.service.js";
import { AuditEvent } from "../domain/audit-event.entity.js";
import { AuditEventNotFoundError } from "../domain/audit-errors.js";
import type { AuditRepositoryPort } from "./ports/audit.repository.port.js";
import type { AuditQueryFilter } from "@tstaff/contracts";

class InMemoryAuditRepository implements AuditRepositoryPort {
  private events: AuditEvent[] = [];

  async save(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }

  async findById(id: string): Promise<AuditEvent | null> {
    return this.events.find((e) => e.id === id) || null;
  }

  async findMany(filter: AuditQueryFilter): Promise<AuditEvent[]> {
    let result = [...this.events];
    if (filter.aggregateType) {
      result = result.filter((e) => e.aggregateType === filter.aggregateType);
    }
    if (filter.aggregateId) {
      result = result.filter((e) => e.aggregateId === filter.aggregateId);
    }
    if (filter.actorId) {
      result = result.filter((e) => e.actorId === filter.actorId);
    }
    if (filter.action) {
      result = result.filter((e) => e.action === filter.action);
    }
    return result.slice(0, filter.limit || 50);
  }
}

describe("AuditService & Immutable Audit Trail (D-04, FR-060, AT-31)", () => {
  let repo: InMemoryAuditRepository;
  let service: AuditService;

  beforeEach(() => {
    repo = new InMemoryAuditRepository();
    service = new AuditService(repo);
  });

  it("records an audit event persistently with actor and payload", async () => {
    const event = await service.recordEvent({
      aggregateType: "ResearchCase",
      aggregateId: "case-01",
      action: "STAGE_ROLLED_BACK",
      actorId: "00000000-0000-0000-0000-000000000001",
      payload: { reason: "نیاز به بررسی مجدد" },
    });

    expect(event.id).toBeDefined();
    expect(event.aggregateType).toBe("ResearchCase");
    expect(event.action).toBe("STAGE_ROLLED_BACK");
    expect(event.createdAt).toBeInstanceOf(Date);

    const fetched = await service.getEventById(event.id);
    expect(fetched.aggregateId).toBe("case-01");
  });

  it("throws AuditEventNotFoundError when looking up non-existent event", async () => {
    await expect(service.getEventById("non-existent")).rejects.toThrow(
      AuditEventNotFoundError,
    );
  });

  it("filters audit events by aggregate and action", async () => {
    await service.recordEvent({
      aggregateType: "User",
      aggregateId: "user-01",
      action: "USER_SUSPENDED",
    });
    await service.recordEvent({
      aggregateType: "ResearchCase",
      aggregateId: "case-02",
      action: "STAGE_ADVANCED",
    });

    const userEvents = await service.queryEvents({ aggregateType: "User" });
    expect(userEvents).toHaveLength(1);
    expect(userEvents[0]?.action).toBe("USER_SUSPENDED");

    const caseEvents = await service.queryEvents({
      aggregateType: "ResearchCase",
    });
    expect(caseEvents).toHaveLength(1);
    expect(caseEvents[0]?.action).toBe("STAGE_ADVANCED");
  });
});

