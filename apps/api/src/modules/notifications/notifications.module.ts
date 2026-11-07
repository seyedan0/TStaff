import { Module } from "@nestjs/common";
import { NotificationsController } from "./presentation/notifications.controller.js";
import {
  NotificationsService,
  NOTIFICATION_REPOSITORY,
} from "./application/notifications.service.js";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository.js";

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
