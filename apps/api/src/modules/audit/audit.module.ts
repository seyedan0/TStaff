import { Module } from "@nestjs/common";
import { AuditController } from "./presentation/audit.controller.js";
import {
  AuditService,
  AUDIT_REPOSITORY,
} from "./application/audit.service.js";
import { PrismaAuditRepository } from "./infrastructure/prisma-audit.repository.js";

@Module({
  imports: [],
  controllers: [AuditController],
  providers: [
    AuditService,
    {
      provide: AUDIT_REPOSITORY,
      useClass: PrismaAuditRepository,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
