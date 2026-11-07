import { Module } from "@nestjs/common";
import { ApplicantsController } from "./presentation/applicants.controller.js";
import {
  ApplicantsService,
  APPLICANT_REPOSITORY,
  APPLICANT_APPROVED_HOOK,
  type ApplicantApprovedHook,
} from "./application/applicants.service.js";
import { PrismaApplicantRepository } from "./infrastructure/prisma-applicant.repository.js";
import { IdentityModule, IdentityService } from "../identity/index.js";

class IdentityApprovedHookAdapter implements ApplicantApprovedHook {
  constructor(private readonly identityService: IdentityService) {}
  async onApplicantApproved(applicant: {
    id: string;
    fullName: string;
    phoneNumber: string;
  }): Promise<void> {
    await this.identityService.createUserFromApprovedApplicant(applicant);
  }
}

@Module({
  imports: [IdentityModule],
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
