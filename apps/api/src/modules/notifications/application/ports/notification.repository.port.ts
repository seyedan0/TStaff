import { Notification } from "../../domain/notification.entity.js";
import type { NotificationQuery } from "@tstaff/contracts";

export interface NotificationRepositoryPort {
  save(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(
    userId: string,
    filter: NotificationQuery,
  ): Promise<Notification[]>;
  countUnread(userId: string): Promise<number>;
}

