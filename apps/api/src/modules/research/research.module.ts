import { forwardRef, Module } from "@nestjs/common";
import { ResearchController } from "./presentation/research.controller.js";
import {
  ResearchService,
  RESEARCH_REPOSITORY,
} from "./application/research.service.js";
import { PrismaResearchRepository } from "./infrastructure/prisma-research.repository.js";
import { AssignmentsModule } from "../assignments/assignments.module.js";
import { ResourcesModule } from "../resources/resources.module.js";

@Module({
  imports: [AssignmentsModule, forwardRef(() => ResourcesModule)],
  controllers: [ResearchController],
  providers: [
    ResearchService,
    {
      provide: RESEARCH_REPOSITORY,
      useClass: PrismaResearchRepository,
    },
  ],
  exports: [ResearchService],
})
export class ResearchModule {}
