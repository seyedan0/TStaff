import { PrismaService } from "@tstaff/database";
import type {
  OutboxRecord,
  OutboxRepositoryPort,
} from "./outbox-processor.js";

export class PrismaOutboxRepository implements OutboxRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPendingEvents(limit: number): Promise<OutboxRecord[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: {
        status: "PENDING",
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      payload: r.payload,
      status: r.status as "PENDING" | "PROCESSED" | "FAILED",
      retryCount: r.retryCount,
      createdAt: r.createdAt,
      processedAt: r.processedAt,
    }));
  }

  async markProcessed(id: string, processedAt: Date): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "PROCESSED",
        processedAt,
      },
    });
  }

  async recordFailure(
    id: string,
    retryCount: number,
    failedPermanently: boolean,
  ): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: failedPermanently ? "FAILED" : "PENDING",
        retryCount,
      },
    });
  }
}

