import { Injectable, Inject } from "@nestjs/common";
import type { CreateAuditEventDto, AuditQueryFilter } from "@tstaff/contracts";
import { AuditEvent } from "../domain/audit-event.entity.js";
import { AuditEventNotFoundError } from "../domain/audit-errors.js";
import type { AuditRepositoryPort } from "./ports/audit.repository.port.js";

export const AUDIT_REPOSITORY = Symbol("AUDIT_REPOSITORY");

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepo: AuditRepositoryPort,
  ) {}

  /**
   * Rule D-04 / FR-060 / AT-31:
   * All events are persistently and immutably recorded in searchable audit log
   */
  async recordEvent(dto: CreateAuditEventDto): Promise<AuditEvent> {
    const event = AuditEvent.create({
      aggregateType: dto.aggregateType,
      aggregateId: dto.aggregateId,
      action: dto.action,
      actorId: dto.actorId,
      ipAddress: dto.ipAddress,
      payload: (dto.payload as Record<string, unknown>) || undefined,
    });

    await this.auditRepo.save(event);
    return event;
  }

  async getEventById(id: string): Promise<AuditEvent> {
    const event = await this.auditRepo.findById(id);
    if (!event) {
      throw new AuditEventNotFoundError(id);
    }
    return event;
  }

  async queryEvents(filter: AuditQueryFilter): Promise<AuditEvent[]> {
    return this.auditRepo.findMany(filter);
  }
}

