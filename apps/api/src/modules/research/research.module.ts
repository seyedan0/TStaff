import { Module } from "@nestjs/common";
import { ResearchController } from "./presentation/research.controller.js";
import { StageGuard } from "../../platform/security/stage.guard.js";

@Module({
  imports: [],
  controllers: [ResearchController],
  providers: [StageGuard],
  exports: [],
})
export class ResearchModule {}
