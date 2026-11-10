import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { AuditEvent } from "../domain/audit-event.entity.js";
import type { AuditRepositoryPort } from "../application/ports/audit.repository.port.js";
import type { AuditQueryFilter } from "@tstaff/contracts";
import type { Prisma } from "@tstaff/database";

@Injectable()
export class PrismaAuditRepository implements AuditRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(event: AuditEvent): Promise<void> {
    await this.prisma.auditEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        action: event.action,
        actorId: event.actorId ?? null,
        ipAddress: event.ipAddress ?? null,
        payload: (event.payload as Prisma.InputJsonValue) ?? undefined,
        createdAt: event.createdAt,
      },
      update: {
        // Audit events are strictly append-only and immutable; no-op update
      },
    });
  }

  async findById(id: string): Promise<AuditEvent | null> {
    const row = await this.prisma.auditEvent.findUnique({
      where: { id },
    });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findMany(filter: AuditQueryFilter): Promise<AuditEvent[]> {
    const where: Prisma.AuditEventWhereInput = {};
    if (filter.aggregateType) where.aggregateType = filter.aggregateType;
    if (filter.aggregateId) where.aggregateId = filter.aggregateId;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.action) where.action = filter.action;
    if (filter.q?.trim()) {
      const q = filter.q.trim();
      where.OR = [
        { action: { contains: q, mode: "insensitive" } },
        { aggregateType: { contains: q, mode: "insensitive" } },
        { aggregateId: { contains: q, mode: "insensitive" } },
        { actorId: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await this.prisma.auditEvent.findMany({
      where,
      take: filter.limit || 50,
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(row: {
    id: string;
    aggregateType: string;
    aggregateId: string;
    action: string;
    actorId: string | null;
    ipAddress: string | null;
    payload: unknown;
    createdAt: Date;
  }): AuditEvent {
    return AuditEvent.reconstitute({
      id: row.id,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      action: row.action,
      actorId: row.actorId,
      ipAddress: row.ipAddress,
      payload: (row.payload as Record<string, unknown>) || undefined,
      createdAt: row.createdAt,
    });
  }
}
