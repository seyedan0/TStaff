import { Module } from "@nestjs/common";
import { OrganizationService } from "./application/organization.service.js";
import { ORGANIZATION_REPOSITORY } from "./application/ports/organization.repository.port.js";
import { PrismaOrganizationRepository } from "./infrastructure/prisma-organization.repository.js";
import { OrganizationController } from "./presentation/organization.controller.js";
import { AuditModule } from "../audit/audit.module.js";

@Module({
  imports: [AuditModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository }],
  exports: [OrganizationService],
})
export class OrganizationModule {}
