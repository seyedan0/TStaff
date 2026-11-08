import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { InvalidScientificSupervisorError, InvalidTraineeAssignmentTargetError } from "../domain/assignment-errors.js";
import type {
  AssignedTraineeRecord,
  AssignmentRepositoryPort,
  SupervisorAssignmentRecord,
} from "../application/ports/assignment.repository.port.js";

@Injectable()
export class PrismaAssignmentRepository implements AssignmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async isIntern(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { stage: true, isActive: true } });
    return user?.stage === "INTERN" && user.isActive;
  }

  async assignToUser(input: { userId: string; supervisorId: string; assignedById: string }): Promise<void> {
    if (!(await this.isScientificSupervisor(input.supervisorId))) throw new InvalidScientificSupervisorError();
    const trainee = await this.prisma.user.findUnique({ where: { id: input.userId }, include: { userRoles: { include: { role: true } } } });
    const managerRoles = new Set(["TRACKING_DIRECTOR", "PROVINCIAL_DIRECTOR", "SCIENTIFIC_SUPERVISOR", "SUPPORT_DIRECTOR", "SYSTEM_ADMIN"]);
    if (!trainee || trainee.userRoles.some((entry) => managerRoles.has(entry.role.name))) throw new InvalidTraineeAssignmentTargetError();

    // Serialize assignments per trainee so exactly the first active assignment is MAIN.
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId}))`;
      const activeCount = await tx.scientificSupervisorAssignment.count({ where: { userId: input.userId, revokedAt: null } });
      const existing = await tx.scientificSupervisorAssignment.findUnique({
        where: { userId_supervisorId: { userId: input.userId, supervisorId: input.supervisorId } },
      });
      const isPrimary = existing?.revokedAt === null ? existing.isPrimary : activeCount === 0;
      await tx.scientificSupervisorAssignment.upsert({
        where: { userId_supervisorId: { userId: input.userId, supervisorId: input.supervisorId } },
        create: { ...input, isPrimary },
        update: { revokedAt: null, assignedById: input.assignedById, assignedAt: new Date(), isPrimary },
      });
    });
  }

  async listSupervisorsForUser(userId: string): Promise<SupervisorAssignmentRecord[]> {
    const rows = await this.prisma.scientificSupervisorAssignment.findMany({
      where: { userId, revokedAt: null },
      include: { supervisor: { include: { profile: true } } },
      orderBy: { assignedAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      supervisorId: row.supervisorId,
      supervisorName: row.supervisor.profile ? `${row.supervisor.profile.firstName} ${row.supervisor.profile.lastName}`.trim() : "مدیر علمی",
      phoneNumber: row.supervisor.phoneNumber,
      isPrimary: row.isPrimary,
      assignedAt: row.assignedAt,
    }));
  }

  async listUsersForSupervisor(supervisorId: string): Promise<AssignedTraineeRecord[]> {
    const rows = await this.prisma.scientificSupervisorAssignment.findMany({
      where: { supervisorId, revokedAt: null },
      include: { trainee: { include: { profile: true } } },
      orderBy: { assignedAt: "asc" },
    });
    return rows.map(({ trainee }) => ({
      id: trainee.id,
      fullName: trainee.profile ? `${trainee.profile.firstName} ${trainee.profile.lastName}`.trim() : "کاربر",
      stage: trainee.stage,
      phoneNumber: trainee.phoneNumber,
    }));
  }

  async isSupervisorAssignedToUser(userId: string, supervisorId: string): Promise<boolean> {
    const count = await this.prisma.scientificSupervisorAssignment.count({ where: { userId, supervisorId, revokedAt: null } });
    return count > 0;
  }

  async isScientificSupervisor(userId: string): Promise<boolean> {
    return (await this.prisma.userRole.count({ where: { userId, user: { isActive: true }, role: { name: "SCIENTIFIC_SUPERVISOR" } } })) > 0;
  }
}
