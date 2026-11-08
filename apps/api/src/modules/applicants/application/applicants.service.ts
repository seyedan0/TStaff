import { Injectable, Inject } from "@nestjs/common";
import {
  CreateApplicantDto,
  ReviewApplicantDecisionDto,
} from "@tstaff/contracts";
import { Applicant } from "../domain/applicant.entity.js";
import {
  ApplicantNotFoundError,
  ApplicantAlreadyExistsError,
  ApplicantNotAssignedToReviewerError,
  InvalidInitialSupervisorError,
} from "../domain/applicant-errors.js";
import type { ApplicantRepositoryPort } from "./ports/applicant.repository.port.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";

export const APPLICANT_REPOSITORY = Symbol("APPLICANT_REPOSITORY");
export const APPLICANT_APPROVED_HOOK = Symbol("APPLICANT_APPROVED_HOOK");

export interface ApplicantApprovedHook {
  onApplicantApproved(applicant: {
    id: string;
    fullName: string;
    phoneNumber: string;
    initialSupervisorId?: string | null;
    assignedById?: string;
  }): Promise<void>;
}

@Injectable()
export class ApplicantsService {
  constructor(
    @Inject(APPLICANT_REPOSITORY)
    private readonly applicantRepo: ApplicantRepositoryPort,
    @Inject(APPLICANT_APPROVED_HOOK)
    private readonly approvedHook: ApplicantApprovedHook,
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService,
  ) {}

  async createDraft(dto: CreateApplicantDto, createdById?: string): Promise<Applicant> {
    if (!dto.initialSupervisorId || !(await this.assignmentsService.isScientificSupervisor(dto.initialSupervisorId))) {
      throw new InvalidInitialSupervisorError();
    }
    const existingByPhone = await this.applicantRepo.findByPhoneNumber(
      dto.phoneNumber,
    );
    if (
      existingByPhone &&
      existingByPhone.status !== "ARCHIVED" &&
      existingByPhone.status !== "REJECTED"
    ) {
      throw new ApplicantAlreadyExistsError("شماره همراه", dto.phoneNumber);
    }

    if (dto.nationalId) {
      const existingByNationalId = await this.applicantRepo.findByNationalId(
        dto.nationalId,
      );
      if (
        existingByNationalId &&
        existingByNationalId.status !== "ARCHIVED" &&
        existingByNationalId.status !== "REJECTED"
      ) {
        throw new ApplicantAlreadyExistsError("کد ملی", dto.nationalId);
      }
    }

    const id = crypto.randomUUID();
    const applicant = Applicant.create({
      id,
      fullName: dto.fullName,
      nationalId: dto.nationalId,
      phoneNumber: dto.phoneNumber,
      age: dto.age,
      provinceId: dto.provinceId ?? null,
      initialSupervisorId: dto.initialSupervisorId ?? null,
      createdById: createdById ?? null,
      educationLevel: dto.education ?? null,
      fieldOfStudy: dto.fieldOfStudy ?? null,
      notes: dto.notes ?? null,
      rejectionReason: null,
    });

    await this.applicantRepo.save(applicant);
    return applicant;
  }

  async submitForReview(id: string): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }

    const updated = applicant.submitForReview();
    await this.applicantRepo.save(updated);
    return updated;
  }

  async reviewDecision(
    id: string,
    dto: ReviewApplicantDecisionDto,
    reviewerId?: string,
  ): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }
    if (reviewerId && applicant.initialSupervisorId !== reviewerId) {
      throw new ApplicantNotAssignedToReviewerError();
    }

    if (dto.decision === "APPROVED") {
      if (applicant.status === "APPROVED") {
        await this.approvedHook.onApplicantApproved({
          id: applicant.id,
          fullName: applicant.fullName,
          phoneNumber: applicant.phoneNumber,
          initialSupervisorId: applicant.initialSupervisorId ?? null,
          assignedById: applicant.createdById ?? applicant.initialSupervisorId ?? "system",
        });
        return applicant;
      }
      const updated = applicant.approve();
      await this.applicantRepo.save(updated);
      await this.approvedHook.onApplicantApproved({
        id: updated.id,
        fullName: updated.fullName,
        phoneNumber: updated.phoneNumber,
        initialSupervisorId: updated.initialSupervisorId ?? null,
        assignedById: updated.createdById ?? updated.initialSupervisorId ?? "system",
      });
      return updated;
    }

    const updated = applicant.reject(dto.reason || "رد توسط ارزیابی علمی");
    await this.applicantRepo.save(updated);
    return updated;
  }

  async requestReopen(id: string, reason: string): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }

    const updated = applicant.requestReopen(reason);
    await this.applicantRepo.save(updated);
    return updated;
  }

  async getById(id: string): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }
    return applicant;
  }

  async list(filter?: {
    provinceId?: string | undefined;
    status?: string | undefined;
  }, assignedSupervisorId?: string): Promise<Applicant[]> {
    const applicants = await this.applicantRepo.findAll(filter);
    return assignedSupervisorId
      ? applicants.filter((applicant) => applicant.initialSupervisorId === assignedSupervisorId)
      : applicants;
  }
}
