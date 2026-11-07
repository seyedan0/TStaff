import { Module } from "@nestjs/common";
import { ArchivalController } from "./presentation/archival.controller.js";
import {
  ArchivalService,
  ARCHIVE_JOB_REPOSITORY,
} from "./application/archival.service.js";
import { PrismaArchivalRepository } from "./infrastructure/prisma-archival.repository.js";
import { AuditModule } from "../audit/audit.module.js";

@Module({
  imports: [AuditModule],
  controllers: [ArchivalController],
  providers: [
    ArchivalService,
    {
      provide: ARCHIVE_JOB_REPOSITORY,
      useClass: PrismaArchivalRepository,
    },
  ],
  exports: [ArchivalService],
})
export class ArchivalModule {}
