import { Module } from "@nestjs/common";
import { ScientificAssignmentsController } from "./presentation/scientific-assignments.controller.js";
import {
  AssignmentsService,
  ASSIGNMENT_REPOSITORY,
} from "./application/assignments.service.js";
import { PrismaAssignmentRepository } from "./infrastructure/prisma-assignment.repository.js";
import { AuditModule } from "../audit/audit.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ScientificAssignmentsController],
  providers: [
    AssignmentsService,
    {
      provide: ASSIGNMENT_REPOSITORY,
      useClass: PrismaAssignmentRepository,
    },
  ],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
