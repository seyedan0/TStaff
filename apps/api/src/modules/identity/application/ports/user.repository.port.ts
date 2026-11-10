import { User } from "../../domain/user.entity.js";
import type { StudyDocumentSnapshot } from "@tstaff/contracts";

export interface StudyEvaluationRecord {
  id: string;
  userId: string;
  userFullName?: string | null | undefined;
  userPhone?: string | null | undefined;
  supervisorId?: string | null | undefined;
  status: string;
  notes?: string | null | undefined;
  feedback?: string | null | undefined;
  completedDocuments: StudyDocumentSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportTicketRecord {
  id: string;
  userId: string;
  userFullName?: string | null | undefined;
  userPhone?: string | null | undefined;
  subject: string;
  description: string;
  status: string;
  response?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepositoryPort {
  findProvinceIdByUserId?(userId: string): Promise<string | null>;
  findById(id: string): Promise<User | null>;
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;
  findByApplicantId(applicantId: string): Promise<User | null>;
  findAllManagers(): Promise<User[]>;
  findAllInterns?(): Promise<User[]>;
  save(user: User): Promise<void>;
  createSession?(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  revokeSession?(tokenHash: string): Promise<void>;

  // Apprentice Study Evaluations
  createStudyEvaluation(
    userId: string,
    notes: string | undefined,
    completedDocuments: StudyDocumentSnapshot[],
  ): Promise<StudyEvaluationRecord>;
  getPendingStudyEvaluations(): Promise<StudyEvaluationRecord[]>;
  getStudyEvaluationByUserId(userId: string): Promise<StudyEvaluationRecord | null>;
  decideStudyEvaluation(
    id: string,
    supervisorId: string,
    decision: "APPROVED" | "REVISION_REQUIRED",
    feedback: string,
  ): Promise<StudyEvaluationRecord>;

  // Support Tickets
  createSupportTicket(userId: string, subject: string, description: string): Promise<SupportTicketRecord>;
  getAllSupportTickets(): Promise<SupportTicketRecord[]>;
  resolveSupportTicket(id: string, response: string, status: "RESOLVED" | "CLOSED"): Promise<SupportTicketRecord>;
}
