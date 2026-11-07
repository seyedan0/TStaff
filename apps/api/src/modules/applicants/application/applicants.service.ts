import { Injectable, Inject } from "@nestjs/common";
import {
  CreateApplicantDto,
  ReviewApplicantDecisionDto,
} from "@tstaff/contracts";
import { Applicant } from "../domain/applicant.entity.js";
import {
  ApplicantNotFoundError,
  ApplicantAlreadyExistsError,
} from "../domain/applicant-errors.js";
import type { ApplicantRepositoryPort } from "./ports/applicant.repository.port.js";

export const APPLICANT_REPOSITORY = Symbol("APPLICANT_REPOSITORY");
export const APPLICANT_APPROVED_HOOK = Symbol("APPLICANT_APPROVED_HOOK");

export interface ApplicantApprovedHook {
  onApplicantApproved(applicant: {
    id: string;
    fullName: string;
    phoneNumber: string;
  }): Promise<void>;
}

@Injectable()
export class ApplicantsService {
  constructor(
    @Inject(APPLICANT_REPOSITORY)
    private readonly applicantRepo: ApplicantRepositoryPort,
    @Inject(APPLICANT_APPROVED_HOOK)
    private readonly approvedHook?: ApplicantApprovedHook,
  ) {}

  async createDraft(dto: CreateApplicantDto): Promise<Applicant> {
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
  ): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }

    let updated: Applicant;
    if (dto.decision === "APPROVED") {
      updated = applicant.approve();
      await this.applicantRepo.save(updated);

      // Trigger user creation in Identity module (FR-001/BR-01: ONLY after scientific approval)
      if (this.approvedHook) {
        await this.approvedHook.onApplicantApproved({
          id: updated.id,
          fullName: updated.fullName,
          phoneNumber: updated.phoneNumber,
        });
      }
    } else {
      updated = applicant.reject(dto.reason || "رد توسط ارزیابی علمی");
      await this.applicantRepo.save(updated);
    }

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
  }): Promise<Applicant[]> {
    return this.applicantRepo.findAll(filter);
  }
}
