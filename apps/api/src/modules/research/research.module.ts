import { forwardRef, Module } from "@nestjs/common";
import { ResearchController } from "./presentation/research.controller.js";
import {
  ResearchService,
  RESEARCH_REPOSITORY,
} from "./application/research.service.js";
import { PrismaResearchRepository } from "./infrastructure/prisma-research.repository.js";
import { AssignmentsModule } from "../assignments/assignments.module.js";
import { ResourcesModule } from "../resources/resources.module.js";
import { IdentityModule } from "../identity/identity.module.js";
import { OrganizationModule } from "../organization/organization.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { ChangeRequestsController } from "./presentation/change-requests.controller.js";
import { SupervisorWorkspaceController } from "./presentation/supervisor-workspace.controller.js";
import { ChangeRequestsService } from "./application/change-requests.service.js";
import { SupervisorWorkspaceService } from "./application/supervisor-workspace.service.js";
import { CHANGE_REQUEST_REPOSITORY } from "./application/ports/change-request.repository.port.js";
import { PrismaChangeRequestRepository } from "./infrastructure/prisma-change-request.repository.js";

@Module({
  imports: [AssignmentsModule, IdentityModule, OrganizationModule, AuditModule, forwardRef(() => ResourcesModule)],
  controllers: [ResearchController, ChangeRequestsController, SupervisorWorkspaceController],
  providers: [
    ResearchService,
    ChangeRequestsService,
    SupervisorWorkspaceService,
    { provide: CHANGE_REQUEST_REPOSITORY, useClass: PrismaChangeRequestRepository },
    {
      provide: RESEARCH_REPOSITORY,
      useClass: PrismaResearchRepository,
    },
  ],
  exports: [ResearchService],
})
export class ResearchModule {}
