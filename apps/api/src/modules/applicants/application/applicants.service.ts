import { Injectable, Inject, Optional } from "@nestjs/common";
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
  ApplicantAllocationConflictError,
} from "../domain/applicant-errors.js";
import type { ApplicantRepositoryPort } from "./ports/applicant.repository.port.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import { AuditService } from "../../audit/application/audit.service.js";
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from "../../../platform/transactions/transaction-runner.js";

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
    @Optional()
    @Inject(AuditService)
    private readonly auditService?: AuditService,
    @Optional()
    @Inject(TRANSACTION_RUNNER)
    private readonly transactions?: TransactionRunner,
  ) {}

  async createDraft(
    dto: CreateApplicantDto,
    createdById?: string,
  ): Promise<Applicant> {
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
      initialSupervisorId: null,
      createdById: createdById ?? null,
      educationLevel: dto.education ?? null,
      fieldOfStudy: dto.fieldOfStudy ?? null,
      notes: dto.notes ?? null,
      rejectionReason: null,
    });

    await this.applicantRepo.save(applicant);
    return applicant;
  }

  async getPendingAllocationQueue(): Promise<Applicant[]> {
    if (this.applicantRepo.findPendingAllocationQueue)
      return this.applicantRepo.findPendingAllocationQueue();
    return (await this.applicantRepo.findAll({ status: "PENDING" })).filter(
      (item) => !item.initialSupervisorId,
    );
  }

  async assignInitialSupervisor(
    applicantId: string,
    supervisorId: string,
    actorId: string,
  ): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(applicantId);
    if (!applicant) throw new ApplicantNotFoundError(applicantId);
    if (applicant.status !== "PENDING" || applicant.initialSupervisorId)
      throw new ApplicantAllocationConflictError();
    if (!(await this.assignmentsService.isScientificSupervisor(supervisorId)))
      throw new InvalidInitialSupervisorError();
    if (!this.applicantRepo.assignInitialSupervisor)
      throw new Error("Applicant allocation is unavailable");
    const assignedAt = new Date();
    if (
      !(await this.applicantRepo.assignInitialSupervisor(
        applicantId,
        supervisorId,
        actorId,
        assignedAt,
      ))
    )
      throw new ApplicantAllocationConflictError();
    await this.auditService?.recordEvent({
      aggregateType: "Applicant",
      aggregateId: applicantId,
      action: "APPLICANT_SUPERVISOR_ALLOCATED",
      actorId,
      payload: { supervisorId },
    });
    return (await this.applicantRepo.findById(applicantId))!;
  }

  async submitForReview(
    id: string,
    actorId?: string,
    reviewerId?: string,
  ): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }
    if (!applicant.initialSupervisorId)
      throw new InvalidInitialSupervisorError();
    if (reviewerId && applicant.initialSupervisorId !== reviewerId) {
      throw new ApplicantNotAssignedToReviewerError();
    }

    const updated = applicant.submitForReview();
    const persist = async () => {
      await this.applicantRepo.save(updated);
      await this.auditService?.recordEvent({
        aggregateType: "Applicant",
        aggregateId: id,
        action: "APPLICANT_SUBMITTED_FOR_REVIEW",
        actorId,
        payload: { supervisorId: applicant.initialSupervisorId },
      });
    };
    if (this.transactions) await this.transactions.run(persist);
    else await persist();
    return updated;
  }

  async reviewDecision(
    id: string,
    dto: ReviewApplicantDecisionDto,
    reviewerId?: string,
    actorId?: string,
  ): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }
    if (!applicant.initialSupervisorId)
      throw new InvalidInitialSupervisorError();
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
          assignedById:
            applicant.initialSupervisorAssignedById ??
            applicant.initialSupervisorId ??
            "system",
        });
        return applicant;
      }
      const updated = applicant.approve();
      const persistApproval = async () => {
        await this.applicantRepo.save(updated);
        await this.approvedHook.onApplicantApproved({
          id: updated.id,
          fullName: updated.fullName,
          phoneNumber: updated.phoneNumber,
          initialSupervisorId: updated.initialSupervisorId ?? null,
          assignedById:
            updated.initialSupervisorAssignedById ??
            updated.initialSupervisorId ??
            "system",
        });
        await this.auditService?.recordEvent({
          aggregateType: "Applicant",
          aggregateId: id,
          action: "APPLICANT_APPROVED_AND_ACCOUNT_CREATED",
          actorId: actorId ?? reviewerId,
          payload: { supervisorId: updated.initialSupervisorId },
        });
      };
      if (this.transactions) await this.transactions.run(persistApproval);
      else await persistApproval();
      return updated;
    }

    const updated = applicant.reject(dto.reason || "رد توسط ارزیابی علمی");
    const persistRejection = async () => {
      await this.applicantRepo.save(updated);
      await this.auditService?.recordEvent({
        aggregateType: "Applicant",
        aggregateId: id,
        action: "APPLICANT_REJECTED_AND_ARCHIVED",
        actorId: actorId ?? reviewerId,
        payload: { archivedAt: updated.archivedAt?.toISOString() },
      });
    };
    if (this.transactions) await this.transactions.run(persistRejection);
    else await persistRejection();
    return updated;
  }

  async requestReopen(
    id: string,
    reason: string,
    actorId?: string,
  ): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }

    const updated = applicant.requestReopen(reason);
    const persist = async () => {
      await this.applicantRepo.save(updated);
      await this.auditService?.recordEvent({
        aggregateType: "Applicant",
        aggregateId: id,
        action: "APPLICANT_REOPEN_REQUESTED",
        actorId,
      });
    };
    if (this.transactions) await this.transactions.run(persist);
    else await persist();
    return updated;
  }

  async getById(id: string): Promise<Applicant> {
    const applicant = await this.applicantRepo.findById(id);
    if (!applicant) {
      throw new ApplicantNotFoundError(id);
    }
    return applicant;
  }

  async list(
    filter?: {
      provinceId?: string | undefined;
      status?: string | undefined;
    },
    assignedSupervisorId?: string,
  ): Promise<Applicant[]> {
    const applicants = await this.applicantRepo.findAll(filter);
    return assignedSupervisorId
      ? applicants.filter(
          (applicant) => applicant.initialSupervisorId === assignedSupervisorId,
        )
      : applicants;
  }
}
