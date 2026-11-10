import { Module } from "@nestjs/common";
import { ScenariosController } from "./presentation/scenarios.controller.js";
import {
  ScenariosService,
  SCENARIO_REPOSITORY,
} from "./application/scenarios.service.js";
import { PrismaScenarioRepository } from "./infrastructure/prisma-scenario.repository.js";
import { ResearchModule } from "../research/research.module.js";
import { AssignmentsModule } from "../assignments/assignments.module.js";
import { AuditModule } from "../audit/audit.module.js";

@Module({
  imports: [ResearchModule, AssignmentsModule, AuditModule],
  controllers: [ScenariosController],
  providers: [
    ScenariosService,
    {
      provide: SCENARIO_REPOSITORY,
      useClass: PrismaScenarioRepository,
    },
  ],
  exports: [ScenariosService],
})
export class ScenariosModule {}
