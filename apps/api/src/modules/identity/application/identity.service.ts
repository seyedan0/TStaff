import { Injectable, Inject } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { LoginDto } from "@tstaff/contracts";
import { User } from "../domain/user.entity.js";
import {
  UserNotFoundError,
  InvalidCredentialsError,
  UserSuspendedError,
} from "../domain/user-errors.js";
import type { UserRepositoryPort } from "./ports/user.repository.port.js";
import type { PasswordHasherPort } from "./ports/password-hasher.port.js";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

@Injectable()
export class IdentityService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
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
      (process.env.NODE_ENV === "production"
        ? randomBytes(12).toString("base64url")
        : "TStaff@123456");
    const passwordHash = await this.passwordHasher.hash(defaultPassword);

    const user = User.create({
      id: crypto.randomUUID(),
      applicantId: applicant.id,
      phoneNumber: applicant.phoneNumber,
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

    // Phase 1 Mock/Session Token
    const token = `sess_${user.id}_${Date.now()}`;
    return { user, token };
  }

  /**
   * Rule FR-004 / AT-03: Provincial Director promotes Apprentice to Intern
   */
  async promoteToIntern(
    userId: string,
    evaluationNotes?: string,
  ): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const updated = user.promoteToIntern();
    await this.userRepo.save(updated);
    return updated;
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }
}
