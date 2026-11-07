import { Module } from "@nestjs/common";
import { MessagingController } from "./presentation/messaging.controller.js";
import {
  MessagingService,
  MESSAGING_REPOSITORY,
} from "./application/messaging.service.js";
import { PrismaMessagingRepository } from "./infrastructure/prisma-messaging.repository.js";

@Module({
  imports: [],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    {
      provide: MESSAGING_REPOSITORY,
      useClass: PrismaMessagingRepository,
    },
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
