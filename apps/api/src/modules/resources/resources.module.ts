import { forwardRef, Module } from "@nestjs/common";
import { ResourcesController } from "./presentation/resources.controller.js";
import {
  ResourcesService,
  RESOURCE_REPOSITORY,
} from "./application/resources.service.js";
import { PrismaResourceRepository } from "./infrastructure/prisma-resource.repository.js";
import { FilesModule } from "../files/files.module.js";
import { ResearchModule } from "../research/research.module.js";
import { OrganizationModule } from "../organization/organization.module.js";
import { ApplicantsModule } from "../applicants/applicants.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { ResourceBankController } from "./presentation/resource-bank.controller.js";
import { ResourceBankService } from "./application/resource-bank.service.js";
import { RESOURCE_BANK_REPOSITORY } from "./application/ports/resource-bank.repository.port.js";
import { PrismaResourceBankRepository } from "./infrastructure/prisma-resource-bank.repository.js";

@Module({
  imports: [FilesModule, forwardRef(() => ResearchModule), OrganizationModule, ApplicantsModule, AuditModule],
  controllers: [ResourcesController, ResourceBankController],
  providers: [
    ResourceBankService,
    { provide: RESOURCE_BANK_REPOSITORY, useClass: PrismaResourceBankRepository },
    ResourcesService,
    {
      provide: RESOURCE_REPOSITORY,
      useClass: PrismaResourceRepository,
    },
  ],
  exports: [ResourcesService, ResourceBankService],
})
export class ResourcesModule {}
