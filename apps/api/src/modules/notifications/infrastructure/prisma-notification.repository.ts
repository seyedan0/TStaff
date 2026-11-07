import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { Notification } from "../domain/notification.entity.js";
import type { NotificationRepositoryPort } from "../application/ports/notification.repository.port.js";
import type { NotificationQuery } from "@tstaff/contracts";
import type { Prisma } from "@tstaff/database";

@Injectable()
export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(notification: Notification): Promise<void> {
    await this.prisma.notification.upsert({
      where: { id: notification.id },
      create: {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        isRead: notification.isRead,
        isCritical: notification.isCritical,
        createdAt: notification.createdAt,
      },
      update: {
        isRead: notification.isRead,
      },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findByUserId(
    userId: string,
    filter: NotificationQuery,
  ): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = { userId };
    if (filter.unreadOnly) {
      where.isRead = false;
    }

    const rows = await this.prisma.notification.findMany({
      where,
      take: filter.limit || 20,
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => this.mapToDomain(r));
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  private mapToDomain(row: {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    isCritical: boolean;
    createdAt: Date;
  }): Notification {
    return Notification.reconstitute({
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      body: row.body,
      isRead: row.isRead,
      isCritical: row.isCritical,
      createdAt: row.createdAt,
    });
  }
}
