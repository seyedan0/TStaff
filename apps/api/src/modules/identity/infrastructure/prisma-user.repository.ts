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
      include: {
        profile: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async findByApplicantId(applicantId: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { applicantId },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async findAllManagers(): Promise<User[]> {
    const rawUsers = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: {
                in: [
                  "TRACKING_DIRECTOR",
                  "PROVINCIAL_DIRECTOR",
                  "MAIN_SUPERVISOR",
                  "COLLABORATOR_SUPERVISOR",
                ],
              },
            },
          },
        },
      },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rawUsers.map((u) => this.toDomain(u));
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

    if (user.fullName) {
      const parts = user.fullName.trim().split(" ");
      const firstName = parts[0] || user.fullName;
      const lastName = parts.slice(1).join(" ") || " ";
      await this.prisma.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          firstName,
          lastName,
        },
        update: {
          firstName,
          lastName,
        },
      });
    }

    if (user.role) {
      const roleRecord = await this.prisma.role.upsert({
        where: { name: user.role },
        create: { name: user.role },
        update: {},
      });
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: roleRecord.id,
          },
        },
        create: {
          userId: user.id,
          roleId: roleRecord.id,
        },
        update: {},
      });
    }
  }

  private toDomain(raw: any): User {
    const fullName = raw.profile
      ? `${raw.profile.firstName} ${raw.profile.lastName}`.trim()
      : null;
    const role =
      raw.userRoles && raw.userRoles.length > 0
        ? raw.userRoles[0].role?.name || null
        : null;

    return User.reconstitute({
      id: raw.id,
      applicantId: raw.applicantId,
      phoneNumber: raw.phoneNumber,
      email: raw.email,
      passwordHash: raw.passwordHash,
      stage: raw.stage as UserStageType,
      isActive: raw.isActive,
      isMfaEnabled: raw.isMfaEnabled,
      fullName,
      role,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
