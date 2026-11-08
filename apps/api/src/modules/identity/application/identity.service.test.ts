import { describe, it, expect, beforeEach } from "vitest";
import { IdentityService } from "./identity.service.js";
import { User } from "../domain/user.entity.js";
import {
  InvalidCredentialsError,
  UserSuspendedError,
  UserAlreadyPromotedError,
} from "../domain/user-errors.js";
import type { UserRepositoryPort } from "./ports/user.repository.port.js";
import type { PasswordHasherPort } from "./ports/password-hasher.port.js";

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
          "MAIN_SUPERVISOR",
          "COLLABORATOR_SUPERVISOR",
        ].includes(u.role),
    );
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
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

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    identityService = new IdentityService(userRepo, hasher);
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

  it("promotes user from APPRENTICE to INTERN (FR-004 / AT-03)", async () => {
    const user = await identityService.createUserFromApprovedApplicant({
      id: "app-5",
      fullName: "محمد نادری",
      phoneNumber: "09125556677",
    });

    expect(user.stage).toBe("APPRENTICE");

    const promoted = await identityService.promoteToIntern(user.id);
    expect(promoted.stage).toBe("INTERN");

    // Attempting to promote again throws UserAlreadyPromotedError
    await expect(identityService.promoteToIntern(user.id)).rejects.toThrow(
      UserAlreadyPromotedError,
    );
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
