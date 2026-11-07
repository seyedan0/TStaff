import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import {
  ArchiveJob,
  type ArchiveJobStatus,
  type ArchiveTargetType,
} from "../domain/archive-job.entity.js";
import type { ArchiveJobRepositoryPort } from "../application/ports/archive-job.repository.port.js";
import type { ArchiveJobStatus as PrismaArchiveStatus } from "@tstaff/database";

@Injectable()
export class PrismaArchivalRepository implements ArchiveJobRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(job: ArchiveJob): Promise<void> {
    await this.prisma.archiveJob.upsert({
      where: { id: job.id },
      create: {
        id: job.id,
        targetType: job.targetType,
        targetId: job.targetId,
        status: job.status as PrismaArchiveStatus,
        storageLocation: job.storageLocation ?? null,
        createdAt: job.createdAt,
        completedAt: job.completedAt ?? null,
      },
      update: {
        status: job.status as PrismaArchiveStatus,
        storageLocation: job.storageLocation ?? null,
        completedAt: job.completedAt ?? null,
      },
    });
  }

  async findById(id: string): Promise<ArchiveJob | null> {
    const row = await this.prisma.archiveJob.findUnique({
      where: { id },
    });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findRecent(limit = 20): Promise<ArchiveJob[]> {
    const rows = await this.prisma.archiveJob.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async applyTargetArchival(
    targetType: string,
    targetId: string,
  ): Promise<void> {
    switch (targetType) {
      case "RESEARCH_CASE":
        await this.prisma.researchCase.update({
          where: { id: targetId },
          data: { status: "ARCHIVED" },
        });
        break;
      case "APPLICANT":
        await this.prisma.applicant.update({
          where: { id: targetId },
          data: { status: "ARCHIVED" },
        });
        break;
      case "CONVERSATION":
        // Conversation has no status enum; preserved as immutable snapshot
        break;
      default:
        break;
    }
  }

  private mapToDomain(row: {
    id: string;
    targetType: string;
    targetId: string;
    status: string;
    storageLocation: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }): ArchiveJob {
    return ArchiveJob.reconstitute({
      id: row.id,
      targetType: row.targetType as ArchiveTargetType,
      targetId: row.targetId,
      status: row.status as ArchiveJobStatus,
      storageLocation: row.storageLocation,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    });
  }
}
