import { Injectable, Inject, Optional, ForbiddenException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { LoginDto, CreateManagerDto } from "@tstaff/contracts";
import { User } from "../domain/user.entity.js";
import {
  UserNotFoundError,
  InvalidCredentialsError,
  UserSuspendedError,
  UserAlreadyPromotedError,
} from "../domain/user-errors.js";
import type { UserRepositoryPort } from "./ports/user.repository.port.js";
import type { PasswordHasherPort } from "./ports/password-hasher.port.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import { DocumentsService } from "../../documents/application/documents.service.js";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

@Injectable()
export class IdentityService {
  async getUserProvinceId(userId: string): Promise<string | null> {
    return this.userRepo.findProvinceIdByUserId?.(userId) ?? null;
  }
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Optional() @Inject(AssignmentsService)
    private readonly assignmentsService?: AssignmentsService,
    @Optional() @Inject(DocumentsService)
    private readonly documentsService?: DocumentsService,
  ) {}

  /**
   * Rule FR-001 / BR-01: Create User ONLY after applicant scientific approval
   * Initial stage is strictly APPRENTICE (FR-003)
   */
  async createUserFromApprovedApplicant(applicant: {
    id: string;
    fullName: string;
    phoneNumber: string;
    initialPassword?: string;
  }): Promise<User> {
    const existing = await this.userRepo.findByApplicantId(applicant.id);
    if (existing) {
      return existing;
    }

    const defaultPassword =
      applicant.initialPassword ||
      process.env.DEFAULT_APPLICANT_PASSWORD ||
      randomBytes(18).toString("base64url");
    const passwordHash = await this.passwordHasher.hash(defaultPassword);

    const user = User.create({
      id: crypto.randomUUID(),
      applicantId: applicant.id,
      phoneNumber: applicant.phoneNumber,
      fullName: applicant.fullName,
      initialPasswordHash: passwordHash,
    });

    await this.userRepo.save(user);
    return user;
  }

  /**
   * Phase 1 (MVP) Password-based Login (OTP deferred to post-MVP)
   */
  async login(dto: LoginDto): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findByPhoneNumber(dto.phoneNumber);
    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new UserSuspendedError(user.id);
    }

    const isMatch = await this.passwordHasher.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new InvalidCredentialsError();
    }

    const token = randomBytes(32).toString("base64url");
    if (this.userRepo.createSession) {
      await this.userRepo.createSession({
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      });
    }
    return { user, token };
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  async revokeSession(token: string): Promise<void> {
    if (!this.userRepo.revokeSession) return;
    await this.userRepo.revokeSession(createHash("sha256").update(token).digest("hex"));
  }

  /**
   * Rule FR-035 / AT-12 / BR-18: Suspend user account
   */
  async suspendUser(userId: string, reason: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const updated = user.suspend();
    await this.userRepo.save(updated);
    return updated;
  }

  /**
   * Rule FR-035 / AT-12 / BR-18: Reactivate suspended user account
   */
  async reactivateUser(userId: string, reason?: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const updated = user.reactivate();
    await this.userRepo.save(updated);
    return updated;
  }

  /**
   * Rule: Tracking Director creates other system managers
   */
  async createManager(dto: CreateManagerDto): Promise<User> {
    const existing = await this.userRepo.findByPhoneNumber(dto.phoneNumber);
    if (existing) {
      throw new Error("کاربری با این شماره همراه از قبل در سامانه ثبت شده است");
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const user = User.reconstitute({
      id: crypto.randomUUID(),
      phoneNumber: dto.phoneNumber,
      passwordHash,
      stage: "INTERN", // Managers possess full intern+ authority
      isActive: true,
      isMfaEnabled: false,
      fullName: dto.fullName,
      role: dto.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.userRepo.save(user);
    return user;
  }

  /**
   * Fetch all registered managers in the system
   */
  async getManagers(): Promise<User[]> {
    return this.userRepo.findAllManagers();
  }

  async getInterns(): Promise<User[]> {
    return (await this.userRepo.findAllInterns?.()) ?? [];
  }

  async isScientificSupervisorAssignedToUser(userId: string, supervisorId: string): Promise<boolean> {
    return this.assignmentsService?.isSupervisorAssignedToUser(userId, supervisorId) ?? false;
  }

  /**
   * Apprentice Study Evaluation methods
   */
  async requestStudyEvaluation(userId: string, notes?: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    if (user.stage !== "APPRENTICE") throw new UserAlreadyPromotedError(userId);
    if (!this.documentsService) throw new Error("DocumentsService is required for study evaluation");
    const studySnapshot = await this.documentsService.getStudySnapshot(userId);
    return this.userRepo.createStudyEvaluation(userId, notes, studySnapshot.completedDocuments);
  }

  async getPendingStudyEvaluations(supervisorId: string) {
    if (!this.assignmentsService) return [];
    const assigned = new Set((await this.assignmentsService.getUsersForSupervisor(supervisorId)).map((user) => user.id));
    return (await this.userRepo.getPendingStudyEvaluations()).filter((item) => assigned.has(item.userId));
  }

  async getStudyEvaluationForUser(userId: string) {
    return this.userRepo.getStudyEvaluationByUserId(userId);
  }

  async decideStudyEvaluation(
    evaluationId: string,
    supervisorId: string,
    decision: "APPROVED" | "REVISION_REQUIRED",
    feedback: string,
  ) {
    if (!this.assignmentsService || !(await this.assignmentsService.isSupervisorAssignedToUser(
      (await this.userRepo.getPendingStudyEvaluations()).find((item) => item.id === evaluationId)?.userId ?? "",
      supervisorId,
    ))) throw new ForbiddenException("این کارآموز به شما منتسب نشده است");
    const updatedRecord = await this.userRepo.decideStudyEvaluation(
      evaluationId,
      supervisorId,
      decision,
      feedback,
    );

    // If approved, automatically promote the apprentice to INTERN!
    if (decision === "APPROVED") {
      const user = await this.userRepo.findById(updatedRecord.userId);
      if (user && user.stage === "APPRENTICE") {
        const promoted = user.promoteToIntern();
        await this.userRepo.save(promoted);
      }
    }

    return updatedRecord;
  }

  /**
   * Support Tickets methods
   */
  async createSupportTicket(userId: string, subject: string, description: string) {
    return this.userRepo.createSupportTicket(userId, subject, description);
  }

  async getSupportTickets() {
    return this.userRepo.getAllSupportTickets();
  }

  async resolveSupportTicket(
    ticketId: string,
    response: string,
    status: "RESOLVED" | "CLOSED",
  ) {
    return this.userRepo.resolveSupportTicket(ticketId, response, status);
  }
}
