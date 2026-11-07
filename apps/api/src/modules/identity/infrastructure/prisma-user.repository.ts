import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { User, UserStageType } from "../domain/user.entity.js";
import type { UserRepositoryPort } from "../application/ports/user.repository.port.js";

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async findByApplicantId(applicantId: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { applicantId },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async save(user: User): Promise<void> {
    const data = {
      applicantId: user.applicantId ?? null,
      phoneNumber: user.phoneNumber,
      email: user.email ?? null,
      passwordHash: user.passwordHash ?? null,
      stage: user.stage as any,
      isActive: user.isActive,
      isMfaEnabled: user.isMfaEnabled,
    };

    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        ...data,
      },
      update: data,
    });
  }

  private toDomain(raw: any): User {
    return User.reconstitute({
      id: raw.id,
      applicantId: raw.applicantId,
      phoneNumber: raw.phoneNumber,
      email: raw.email,
      passwordHash: raw.passwordHash,
      stage: raw.stage as UserStageType,
      isActive: raw.isActive,
      isMfaEnabled: raw.isMfaEnabled,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
