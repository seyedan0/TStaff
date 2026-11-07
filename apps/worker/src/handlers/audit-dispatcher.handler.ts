import { AuditEventPayloadSchema } from "@tstaff/contracts";
import type { OutboxEventHandler } from "./handler.interface.js";

export interface AuditWriterPort {
  createAuditEvent(data: {
    aggregateType: string;
    aggregateId: string;
    action: string;
    actorId?: string | undefined;
    ipAddress?: string | undefined;
    payload?: unknown;
  }): Promise<void>;
}

export class AuditDispatcherHandler implements OutboxEventHandler {
  public readonly eventType = "AUDIT_EVENT";

  constructor(private readonly writer: AuditWriterPort) {}

  async handle(payload: unknown, _eventId: string): Promise<void> {
    const validated = AuditEventPayloadSchema.parse(payload);

    await this.writer.createAuditEvent({
      aggregateType: validated.aggregateType,
      aggregateId: validated.aggregateId,
      action: validated.action,
      actorId: validated.actorId,
      ipAddress: validated.ipAddress,
      payload: validated.payload,
    });
  }
}

