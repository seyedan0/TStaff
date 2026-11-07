import { describe, it, expect, beforeEach } from "vitest";
import { NotificationsService } from "./notifications.service.js";
import { Notification } from "../domain/notification.entity.js";
import {
  NotificationNotFoundError,
  NotificationForbiddenError,
} from "../domain/notifications-errors.js";
import type { NotificationRepositoryPort } from "./ports/notification.repository.port.js";
import type { NotificationQuery } from "@tstaff/contracts";

class InMemoryNotificationRepository implements NotificationRepositoryPort {
  private notifications = new Map<string, Notification>();

  async save(notification: Notification): Promise<void> {
    this.notifications.set(notification.id, notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) || null;
  }

  async findByUserId(
    userId: string,
    filter: NotificationQuery,
  ): Promise<Notification[]> {
    let list = Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId,
    );
    if (filter.unreadOnly) {
      list = list.filter((n) => !n.isRead);
    }
    return list.slice(0, filter.limit || 20);
  }

  async countUnread(userId: string): Promise<number> {
    return Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId && !n.isRead,
    ).length;
  }
}

describe("NotificationsService & Selective Notification Policy (D-04, FR-060, AT-32, BR-17)", () => {
  let repo: InMemoryNotificationRepository;
  let service: NotificationsService;
  const userA = "11111111-1111-1111-1111-111111111111";
  const userB = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    repo = new InMemoryNotificationRepository();
    service = new NotificationsService(repo);
  });

  it("creates critical notification for urgent events (e.g. account suspension)", async () => {
    const notif = await service.createNotification({
      userId: userA,
      type: "USER_SUSPENDED",
      title: "تعلیق حساب کاربری",
      body: "حساب شما تعلیق گردید.",
      isCritical: true,
    });

    expect(notif.isCritical).toBe(true);
    expect(notif.isRead).toBe(false);

    const unread = await service.getUnreadCount(userA);
    expect(unread.unreadCount).toBe(1);
  });

  it("marks notification as read", async () => {
    const notif = await service.createNotification({
      userId: userA,
      type: "STAGE_SUBMITTED",
      title: "ثبت گزارش جدید",
      body: "گزارش با موفقیت ثبت شد.",
    });

    const updated = await service.markAsRead(notif.id, userA);
    expect(updated.isRead).toBe(true);

    const unread = await service.getUnreadCount(userA);
    expect(unread.unreadCount).toBe(0);
  });

  it("blocks user B from marking user A's notification as read", async () => {
    const notif = await service.createNotification({
      userId: userA,
      type: "STAGE_SUBMITTED",
      title: "گزارش جدید",
      body: "متن گزارش",
    });

    await expect(service.markAsRead(notif.id, userB)).rejects.toThrow(
      NotificationForbiddenError,
    );
  });

  it("throws NotificationNotFoundError when marking non-existent notification", async () => {
    await expect(service.markAsRead("random-id", userA)).rejects.toThrow(
      NotificationNotFoundError,
    );
  });
});

