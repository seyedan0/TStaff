import { Module } from "@nestjs/common";
import { MessagingController } from "./presentation/messaging.controller.js";
import {
  MessagingService,
  MESSAGING_REPOSITORY,
} from "./application/messaging.service.js";
import { PrismaMessagingRepository } from "./infrastructure/prisma-messaging.repository.js";
import { IdentityModule } from "../identity/identity.module.js";
import { AssignmentsModule } from "../assignments/assignments.module.js";
import { ResearchModule } from "../research/research.module.js";
import { OrganizationModule } from "../organization/organization.module.js";

@Module({
  imports: [IdentityModule, AssignmentsModule, ResearchModule, OrganizationModule],
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
