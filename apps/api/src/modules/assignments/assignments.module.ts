import { Module } from "@nestjs/common";
import { AssignmentsController } from "./presentation/assignments.controller.js";
import {
  AssignmentsService,
  ASSIGNMENT_REPOSITORY,
} from "./application/assignments.service.js";
import { PrismaAssignmentRepository } from "./infrastructure/prisma-assignment.repository.js";

@Module({
  imports: [],
  controllers: [AssignmentsController],
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
