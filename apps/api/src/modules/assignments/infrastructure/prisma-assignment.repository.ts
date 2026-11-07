import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { ResearchAssignment } from "../domain/assignment.entity.js";
import type { AssignmentRepositoryPort } from "../application/ports/assignment.repository.port.js";

@Injectable()
export class PrismaAssignmentRepository implements AssignmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByCaseId(caseId: string): Promise<ResearchAssignment[]> {
    const raw = await this.prisma.researchAssignment.findMany({
      where: {
        researchCaseId: caseId,
        isActive: true,
      },
    });

    return raw.map((r) => this.toDomain(r));
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.prisma.researchAssignment.count({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  async findById(id: string): Promise<ResearchAssignment | null> {
    const raw = await this.prisma.researchAssignment.findUnique({
      where: { id },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async save(assignment: ResearchAssignment): Promise<void> {
    const data = {
      researchCaseId: assignment.researchCaseId,
      userId: assignment.userId,
      role: assignment.role as any,
      isActive: assignment.isActive,
      assignedAt: assignment.assignedAt,
      unassignedAt: assignment.unassignedAt,
    };

    await this.prisma.researchAssignment.upsert({
      where: { id: assignment.id },
      create: {
        id: assignment.id,
        ...data,
      },
      update: data,
    });
  }

  private toDomain(raw: {
    id: string;
    researchCaseId: string;
    userId: string;
    role: any;
    isActive: boolean;
    assignedAt: Date;
    unassignedAt: Date | null;
  }): ResearchAssignment {
    return ResearchAssignment.reconstruct({
      id: raw.id,
      researchCaseId: raw.researchCaseId,
      userId: raw.userId,
      role: raw.role,
      isActive: raw.isActive,
      assignedAt: raw.assignedAt,
      unassignedAt: raw.unassignedAt,
    });
  }
}
