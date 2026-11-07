import { Module } from "@nestjs/common";
import { ReportingController } from "./presentation/reporting.controller.js";
import {
  ReportingService,
  REPORTING_REPOSITORY,
} from "./application/reporting.service.js";
import { PrismaReportingRepository } from "./infrastructure/prisma-reporting.repository.js";

@Module({
  imports: [],
  controllers: [ReportingController],
  providers: [
    ReportingService,
    {
      provide: REPORTING_REPOSITORY,
      useClass: PrismaReportingRepository,
    },
  ],
  exports: [ReportingService],
})
export class ReportingModule {}
