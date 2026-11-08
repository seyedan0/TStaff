import { describe, it, expect, beforeEach, vi } from "vitest";
import { IdentityService } from "./identity.service.js";
import { User } from "../domain/user.entity.js";
import {
  InvalidCredentialsError,
  UserSuspendedError,
  UserAlreadyPromotedError,
} from "../domain/user-errors.js";
import type { UserRepositoryPort } from "./ports/user.repository.port.js";
import type { PasswordHasherPort } from "./ports/password-hasher.port.js";
import type { DocumentsService } from "../../documents/application/documents.service.js";

class InMemoryUserRepository implements UserRepositoryPort {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.phoneNumber === phoneNumber) return user;
    }
    return null;
  }

  async findByApplicantId(applicantId: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.applicantId === applicantId) return user;
    }
    return null;
  }

  async findAllManagers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (u) =>
        u.role &&
        [
          "TRACKING_DIRECTOR",
          "PROVINCIAL_DIRECTOR",
          "SCIENTIFIC_SUPERVISOR",
          "SUPPORT_DIRECTOR",
          "SYSTEM_ADMIN",
        ].includes(u.role),
    );
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async createStudyEvaluation(userId: string, notes?: string, completedDocuments: any[] = []): Promise<any> {
    return { id: "eval-1", userId, status: "PENDING", notes, completedDocuments, createdAt: new Date(), updatedAt: new Date() };
  }

  async getPendingStudyEvaluations(): Promise<any[]> {
    return [];
  }

  async getStudyEvaluationByUserId(userId: string): Promise<any> {
    return null;
  }

  async decideStudyEvaluation(id: string, supervisorId: string, decision: any, feedback: string): Promise<any> {
    return { id, supervisorId, status: decision, feedback, createdAt: new Date(), updatedAt: new Date() };
  }

  async createSupportTicket(userId: string, subject: string, description: string): Promise<any> {
    return { id: "ticket-1", userId, subject, description, status: "OPEN", createdAt: new Date(), updatedAt: new Date() };
  }

  async getAllSupportTickets(): Promise<any[]> {
    return [];
  }

  async resolveSupportTicket(id: string, response: string, status: any): Promise<any> {
    return { id, response, status, createdAt: new Date(), updatedAt: new Date() };
  }
}

class FakePasswordHasher implements PasswordHasherPort {
  async hash(password: string): Promise<string> {
    return `hashed_${password}`;
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return hash === `hashed_${password}`;
  }
}

describe("IdentityService (FR-001, FR-003, FR-004, AT-01, AT-03)", () => {
  let userRepo: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let identityService: IdentityService;
  let documentsService: Pick<DocumentsService, "getStudySnapshot">;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    documentsService = {
      getStudySnapshot: async () => ({
        requiredCount: 1,
        readRequiredCount: 1,
        completedDocuments: [{
          documentId: "123e4567-e89b-12d3-a456-426614174001",
          versionId: "123e4567-e89b-12d3-a456-426614174002",
          title: "شیوه‌نامه منابع",
          category: "آموزش",
          version: 1,
          isRequired: true,
          readAt: new Date().toISOString(),
        }],
      }),
    };
    identityService = new IdentityService(userRepo, hasher, undefined, documentsService as DocumentsService);
  });

  it("stores the server-verified document version snapshot with an apprentice evaluation (FR-004 / AT-37)", async () => {
    const user = await identityService.createUserFromApprovedApplicant({
      id: "app-study-1",
      fullName: "کارآموز آزمون",
      phoneNumber: "09123334456",
    });

    const evaluation = await identityService.requestStudyEvaluation(user.id, "درخواست ارزیابی");

    expect(evaluation.completedDocuments).toEqual(expect.arrayContaining([
      expect.objectContaining({ versionId: "123e4567-e89b-12d3-a456-426614174002", version: 1 }),
    ]));
  });

  it("does not accept evaluation requests after the apprentice has been promoted (FR-004 / AT-37)", async () => {
    const user = await identityService.createUserFromApprovedApplicant({
      id: "app-study-2",
      fullName: "کارورز آزمون",
      phoneNumber: "09123334457",
    });
    await userRepo.save(user.promoteToIntern());

    await expect(identityService.requestStudyEvaluation(user.id))
      .rejects.toThrow(UserAlreadyPromotedError);
  });

  it("shows study evaluations only to assigned supervisors and blocks unrelated decisions (FR-004 / AT-37)", async () => {
    const user = await identityService.createUserFromApprovedApplicant({
      id: "app-study-3",
      fullName: "کارآموز منتسب",
      phoneNumber: "09123334458",
    });
    const assignments = {
      getUsersForSupervisor: vi.fn(async (supervisorId: string) =>
        supervisorId === "assigned-supervisor" ? [{ id: user.id }] : []),
      isSupervisorAssignedToUser: vi.fn(async (userId: string, supervisorId: string) =>
        userId === user.id && supervisorId === "assigned-supervisor"),
    };
    const evaluation = {
      id: "eval-assigned",
      userId: user.id,
      status: "PENDING",
      notes: "",
      completedDocuments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(userRepo, "getPendingStudyEvaluations").mockResolvedValue([evaluation]);
    const assignedService = new IdentityService(
      userRepo,
      hasher,
      assignments as never,
      documentsService as DocumentsService,
    );

    await expect(assignedService.getPendingStudyEvaluations("assigned-supervisor"))
      .resolves.toEqual([evaluation]);
    await expect(assignedService.getPendingStudyEvaluations("unrelated-supervisor"))
      .resolves.toEqual([]);
    await expect(assignedService.decideStudyEvaluation("eval-assigned", "unrelated-supervisor", "APPROVED", ""))
      .rejects.toThrow("این کارآموز به شما منتسب نشده است");
  });

  it("creates user with initial stage APPRENTICE only after scientific approval (FR-003)", async () => {
    const user = await identityService.createUserFromApprovedApplicant({
      id: "app-1",
      fullName: "امیر رضایی",
      phoneNumber: "09121113344",
      initialPassword: "SecurePassword123",
    });

    expect(user.id).toBeDefined();
    expect(user.applicantId).toBe("app-1");
    expect(user.fullName).toBe("امیر رضایی");
    expect(user.stage).toBe("APPRENTICE");
    expect(user.isActive).toBe(true);

    const saved = await userRepo.findById(user.id);
    expect(saved).not.toBeNull();
    expect(saved?.stage).toBe("APPRENTICE");
  });

  it("authenticates user with valid phone and password (Phase 1 Password Auth)", async () => {
    await identityService.createUserFromApprovedApplicant({
      id: "app-2",
      fullName: "نرگس کریمی",
      phoneNumber: "09122223344",
      initialPassword: "Password456",
    });

    const result = await identityService.login({
      phoneNumber: "09122223344",
      password: "Password456",
    });

    expect(result.user.phoneNumber).toBe("09122223344");
    expect(result.token).toBeDefined();
  });

  it("rejects login with invalid password", async () => {
    await identityService.createUserFromApprovedApplicant({
      id: "app-3",
      fullName: "حمید طاهری",
      phoneNumber: "09123334455",
      initialPassword: "CorrectPassword",
    });

    await expect(
      identityService.login({
        phoneNumber: "09123334455",
        password: "WrongPassword",
      }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("blocks suspended user from logging in", async () => {
    const user = await identityService.createUserFromApprovedApplicant({
      id: "app-4",
      fullName: "کاربر معلق",
      phoneNumber: "09124445577",
      initialPassword: "Password123",
    });

    const suspended = user.suspend();
    await userRepo.save(suspended);

    await expect(
      identityService.login({
        phoneNumber: "09124445577",
        password: "Password123",
      }),
    ).rejects.toThrow(UserSuspendedError);
  });

  it("creates the approved applicant as APPRENTICE until scientific study approval (FR-003, FR-004 / AT-02, AT-03)", async () => {
    const user = await identityService.createUserFromApprovedApplicant({
      id: "app-5",
      fullName: "محمد نادری",
      phoneNumber: "09125556677",
    });

    expect(user.stage).toBe("APPRENTICE");
    expect((await userRepo.findById(user.id))?.stage).toBe("APPRENTICE");
  });

  it("suspends and reactivates user account (FR-035 / AT-12 / BR-18)", async () => {
    const user = await identityService.createUserFromApprovedApplicant({
      id: "app-6",
      fullName: "سارا حسینی",
      phoneNumber: "09126667788",
      initialPassword: "Password789",
    });

    expect(user.isActive).toBe(true);

    const suspended = await identityService.suspendUser(
      user.id,
      "تخلف انضباطی",
    );
    expect(suspended.isActive).toBe(false);

    // Login is now blocked
    await expect(
      identityService.login({
        phoneNumber: "09126667788",
        password: "Password789",
      }),
    ).rejects.toThrow(UserSuspendedError);

    // Reactivate
    const reactivated = await identityService.reactivateUser(
      user.id,
      "حل مسئله",
    );
    expect(reactivated.isActive).toBe(true);

    // Login works again
    const result = await identityService.login({
      phoneNumber: "09126667788",
      password: "Password789",
    });
    expect(result.user.isActive).toBe(true);
  });
});
