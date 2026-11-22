import { Applicant } from "../../domain/applicant.entity.js";

export interface ApplicantRepositoryPort {
  findById(id: string): Promise<Applicant | null>;
  findByPhoneNumber(phoneNumber: string): Promise<Applicant | null>;
  findByNationalId(nationalId: string): Promise<Applicant | null>;
  save(applicant: Applicant): Promise<void>;
  assignInitialSupervisor?(
    applicantId: string,
    supervisorId: string,
    assignedById: string,
    assignedAt: Date,
  ): Promise<boolean>;
  findPendingAllocationQueue?(): Promise<Applicant[]>;
  findAll(filter?: {
    provinceId?: string | undefined;
    status?: string | undefined;
  }): Promise<Applicant[]>;
}
