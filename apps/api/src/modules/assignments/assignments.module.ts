import { Module } from "@nestjs/common";
import { ScientificAssignmentsController } from "./presentation/scientific-assignments.controller.js";
import {
  AssignmentsService,
  ASSIGNMENT_REPOSITORY,
} from "./application/assignments.service.js";
import { PrismaAssignmentRepository } from "./infrastructure/prisma-assignment.repository.js";

@Module({
  imports: [],
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
