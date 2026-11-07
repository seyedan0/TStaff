import { PrismaService } from "@tstaff/database";
import type { SessionCleanerPort } from "./expired-sessions.cleanup.js";
import type { OutboxPurgerPort } from "./outbox-purge.cleanup.js";

export class PrismaMaintenanceAdapter
  implements SessionCleanerPort, OutboxPurgerPort
{
  constructor(private readonly prisma: PrismaService) {}

  async deleteExpiredSessions(now: Date): Promise<number> {
    const res = await this.prisma.userSession.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    return res.count;
  }

  async deleteProcessedEventsOlderThan(cutoff: Date): Promise<number> {
    const res = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: "PROCESSED",
        processedAt: { lt: cutoff },
      },
    });
    return res.count;
  }
}

