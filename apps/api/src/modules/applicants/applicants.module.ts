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
import { AssignmentsService } from "../assignments/application/assignments.service.js";
import { OrganizationModule } from "../organization/organization.module.js";
import { ResourcesModule } from "../resources/resources.module.js";

class IdentityApprovedHookAdapter implements ApplicantApprovedHook {
  constructor(
    private readonly identityService: IdentityService,
    private readonly assignmentsService: AssignmentsService,
  ) {}
  async onApplicantApproved(applicant: {
    id: string;
    fullName: string;
    phoneNumber: string;
    initialSupervisorId?: string | null;
    assignedById?: string;
  }): Promise<void> {
    const user = await this.identityService.createUserFromApprovedApplicant(applicant);
    if (applicant.initialSupervisorId) await this.assignmentsService.assignSupervisorToUser(
      user.id, applicant.initialSupervisorId, applicant.assignedById ?? applicant.initialSupervisorId,
    );
  }
}

@Module({
  imports: [IdentityModule, AssignmentsModule, OrganizationModule, forwardRef(() => ResourcesModule)],
  controllers: [ApplicantsController],
  providers: [
    ApplicantsService,
    {
      provide: APPLICANT_REPOSITORY,
      useClass: PrismaApplicantRepository,
    },
    {
      provide: APPLICANT_APPROVED_HOOK,
      useFactory: (identityService: IdentityService, assignmentsService: AssignmentsService) =>
        new IdentityApprovedHookAdapter(identityService, assignmentsService),
      inject: [IdentityService, AssignmentsService],
    },
  ],
  exports: [ApplicantsService],
})
export class ApplicantsModule {}
