import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import type { Prisma } from "@tstaff/database";
import { StudyDocumentSnapshotSchema, type StudyDocumentSnapshot } from "@tstaff/contracts";
import { User, UserStageType } from "../domain/user.entity.js";
import type {
  UserRepositoryPort,
  StudyEvaluationRecord,
  SupportTicketRecord,
} from "../application/ports/user.repository.port.js";
import { extractSystemRoles } from "../domain/system-roles.js";

type StudyEvaluationWithUser = Prisma.ApprenticeEvaluationGetPayload<{
  include: { user: { include: { profile: true } } };
}>;

function mapStudyEvaluation(raw: StudyEvaluationWithUser): StudyEvaluationRecord {
  const parsedDocuments = StudyDocumentSnapshotSchema.array().safeParse(raw.completedDocuments);
  return {
    id: raw.id,
    userId: raw.userId,
    userFullName: raw.user.profile
      ? `${raw.user.profile.firstName} ${raw.user.profile.lastName}`.trim()
      : undefined,
    userPhone: raw.user.phoneNumber,
    supervisorId: raw.supervisorId,
    status: raw.status,
    notes: raw.notes,
    feedback: raw.feedback,
    completedDocuments: parsedDocuments.success ? parsedDocuments.data : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.prisma.userSession.create({ data: input });
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.prisma.userSession.deleteMany({ where: { tokenHash } });
  }

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
        isActive: true,
        userRoles: {
          some: {
            role: {
              name: {
                in: [
                  "TRACKING_DIRECTOR",
                  "PROVINCIAL_DIRECTOR",
                  "SCIENTIFIC_SUPERVISOR",
                  "SUPPORT_DIRECTOR",
                  "SYSTEM_ADMIN",
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

  async findAllInterns(): Promise<User[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        stage: "INTERN",
        userRoles: { none: { role: { name: { in: ["TRACKING_DIRECTOR", "PROVINCIAL_DIRECTOR", "SCIENTIFIC_SUPERVISOR", "SUPPORT_DIRECTOR", "SYSTEM_ADMIN"] } } } },
      },
      include: { profile: true, userRoles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toDomain(row));
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
      if (user.role === "APPRENTICE" || user.role === "INTERN") {
        await this.prisma.userRole.deleteMany({
          where: { userId: user.id, role: { name: { in: ["APPRENTICE", "INTERN"] } } },
        });
      }
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

  async createStudyEvaluation(
    userId: string,
    notes: string | undefined,
    completedDocuments: StudyDocumentSnapshot[],
  ): Promise<StudyEvaluationRecord> {
    const raw = await this.prisma.apprenticeEvaluation.create({
      data: {
        userId,
        status: "PENDING",
        notes: notes ?? null,
        completedDocuments: completedDocuments as Prisma.InputJsonValue,
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    return mapStudyEvaluation(raw);
  }

  async getPendingStudyEvaluations(): Promise<StudyEvaluationRecord[]> {
    const list = await this.prisma.apprenticeEvaluation.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return list.map(mapStudyEvaluation);
  }

  async getStudyEvaluationByUserId(userId: string): Promise<StudyEvaluationRecord | null> {
    const raw = await this.prisma.apprenticeEvaluation.findFirst({
      where: { userId },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!raw) return null;

    return mapStudyEvaluation(raw);
  }

  async decideStudyEvaluation(
    id: string,
    supervisorId: string,
    decision: "APPROVED" | "REVISION_REQUIRED",
    feedback: string,
  ): Promise<StudyEvaluationRecord> {
    const raw = await this.prisma.apprenticeEvaluation.update({
      where: { id },
      data: {
        supervisorId,
        status: decision,
        feedback,
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    return mapStudyEvaluation(raw);
  }

  async createSupportTicket(
    userId: string,
    subject: string,
    description: string,
  ): Promise<SupportTicketRecord> {
    const raw = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject,
        description,
        status: "OPEN",
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    return {
      id: raw.id,
      userId: raw.userId,
      userFullName: raw.user.profile
        ? `${raw.user.profile.firstName} ${raw.user.profile.lastName}`.trim()
        : undefined,
      userPhone: raw.user.phoneNumber,
      subject: raw.subject,
      description: raw.description,
      status: raw.status,
      response: raw.response,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async getAllSupportTickets(): Promise<SupportTicketRecord[]> {
    const list = await this.prisma.supportTicket.findMany({
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return list.map((raw) => ({
      id: raw.id,
      userId: raw.userId,
      userFullName: raw.user.profile
        ? `${raw.user.profile.firstName} ${raw.user.profile.lastName}`.trim()
        : undefined,
      userPhone: raw.user.phoneNumber,
      subject: raw.subject,
      description: raw.description,
      status: raw.status,
      response: raw.response,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }));
  }

  async resolveSupportTicket(
    id: string,
    response: string,
    status: "RESOLVED" | "CLOSED",
  ): Promise<SupportTicketRecord> {
    const raw = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        response,
        status,
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    return {
      id: raw.id,
      userId: raw.userId,
      userFullName: raw.user.profile
        ? `${raw.user.profile.firstName} ${raw.user.profile.lastName}`.trim()
        : undefined,
      userPhone: raw.user.phoneNumber,
      subject: raw.subject,
      description: raw.description,
      status: raw.status,
      response: raw.response,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private toDomain(raw: any): User {
    const fullName = raw.profile
      ? `${raw.profile.firstName} ${raw.profile.lastName}`.trim()
      : null;
    const roles: string[] = (raw.userRoles ?? [])
      .map((entry: { role?: { name?: string } }) => entry.role?.name)
      .filter((name: string | undefined): name is string => !!name);
    const authorizedRoles = extractSystemRoles(roles);
    const role = authorizedRoles[0] ?? null;

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
      roles: authorizedRoles,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
