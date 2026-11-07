import { Injectable, Inject } from "@nestjs/common";
import type {
  CreateNotificationDto,
  NotificationQuery,
} from "@tstaff/contracts";
import { Notification } from "../domain/notification.entity.js";
import {
  NotificationNotFoundError,
  NotificationForbiddenError,
} from "../domain/notifications-errors.js";
import type { NotificationRepositoryPort } from "./ports/notification.repository.port.js";

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  /**
   * Rule D-04 / FR-060 / AT-32 / BR-17:
   * Selective Notification Policy:
   * Only critical events (isCritical: true) are flagged for immediate action/push.
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = Notification.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      isCritical: dto.isCritical ?? false,
    });

    await this.notificationRepo.save(notification);
    return notification;
  }

  async getUserNotifications(
    userId: string,
    query: NotificationQuery,
  ): Promise<Notification[]> {
    return this.notificationRepo.findByUserId(userId, query);
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepo.findById(notificationId);
    if (!notification) {
      throw new NotificationNotFoundError(notificationId);
    }

    if (notification.userId !== userId) {
      throw new NotificationForbiddenError();
    }

    const updated = notification.markAsRead();
    await this.notificationRepo.save(updated);
    return updated;
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationRepo.countUnread(userId);
    return { unreadCount };
  }
}

