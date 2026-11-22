import { forwardRef, Module } from "@nestjs/common";
import { ApplicantsController } from "./presentation/applicants.controller.js";
import {
  ApplicantsService,
  APPLICANT_REPOSITORY,
  APPLICANT_APPROVED_HOOK,
  type ApplicantApprovedHook,
} from "./application/applicants.service.js";
import { PrismaApplicantRepository } from "./infrastructure/prisma-applicant.repository.js";
import { IdentityModule, IdentityService } from "../identity/index.js";
import { AssignmentsModule } from "../assignments/assignments.module.js";
import { OrganizationModule } from "../organization/organization.module.js";
import { ResourcesModule } from "../resources/resources.module.js";
import { AuditModule } from "../audit/audit.module.js";

class IdentityApprovedHookAdapter implements ApplicantApprovedHook {
  constructor(private readonly identityService: IdentityService) {}
  async onApplicantApproved(applicant: {
    id: string;
    fullName: string;
    phoneNumber: string;
    initialSupervisorId?: string | null;
    assignedById?: string;
  }): Promise<void> {
    await this.identityService.createUserFromApprovedApplicant(applicant);
  }
}

@Module({
  imports: [
    IdentityModule,
    AssignmentsModule,
    OrganizationModule,
    AuditModule,
    forwardRef(() => ResourcesModule),
  ],
  controllers: [ApplicantsController],
  providers: [
    ApplicantsService,
    {
      provide: APPLICANT_REPOSITORY,
      useClass: PrismaApplicantRepository,
    },
    {
      provide: APPLICANT_APPROVED_HOOK,
      useFactory: (identityService: IdentityService) =>
        new IdentityApprovedHookAdapter(identityService),
      inject: [IdentityService],
    },
  ],
  exports: [ApplicantsService],
})
export class ApplicantsModule {}
