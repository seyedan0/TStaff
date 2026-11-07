import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { ResearchCase } from "../domain/research-case.entity.js";
import { StageInstance } from "../domain/stage-instance.entity.js";
import { StaleRevisionError } from "../domain/research-errors.js";
import type { ResearchRepositoryPort } from "../application/ports/research.repository.port.js";

@Injectable()
export class PrismaResearchRepository implements ResearchRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(researchCase: ResearchCase): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.researchCase.create({
        data: {
          id: researchCase.id,
          title: researchCase.title,
          code: researchCase.code,
          subject: researchCase.subject,
          status: researchCase.status as any,
          version: researchCase.version,
        },
      });

      for (const stage of researchCase.stages) {
        await tx.stageInstance.create({
          data: {
            id: stage.id,
            researchCaseId: stage.researchCaseId,
            stageType: stage.stageType as any,
            status: stage.status as any,
            version: stage.version,
          },
        });
      }
    });
  }

  async findById(id: string): Promise<ResearchCase | null> {
    const raw = await this.prisma.researchCase.findUnique({
      where: { id },
      include: { stages: true },
    });
    if (!raw) return null;

    return this.toDomain(raw);
  }

  async findByCode(code: string): Promise<ResearchCase | null> {
    const raw = await this.prisma.researchCase.findUnique({
      where: { code },
      include: { stages: true },
    });
    if (!raw) return null;

    return this.toDomain(raw);
  }

  async saveWithVersionCheck(
    researchCase: ResearchCase,
    expectedVersion: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Optimistic concurrency CAS check
      const result = await tx.researchCase.updateMany({
        where: {
          id: researchCase.id,
          version: expectedVersion,
        },
        data: {
          title: researchCase.title,
          subject: researchCase.subject,
          status: researchCase.status as any,
          version: researchCase.version,
        },
      });

      if (result.count === 0) {
        const current = await tx.researchCase.findUnique({
          where: { id: researchCase.id },
        });
        throw new StaleRevisionError(current?.version ?? 0, expectedVersion);
      }

      // Update stage instances
      for (const stage of researchCase.stages) {
        await tx.stageInstance.upsert({
          where: {
            researchCaseId_stageType: {
              researchCaseId: stage.researchCaseId,
              stageType: stage.stageType as any,
            },
          },
          create: {
            id: stage.id,
            researchCaseId: stage.researchCaseId,
            stageType: stage.stageType as any,
            status: stage.status as any,
            version: stage.version,
          },
          update: {
            status: stage.status as any,
            version: stage.version,
          },
        });
      }
    });
  }

  async findAll(): Promise<ResearchCase[]> {
    const rawList = await this.prisma.researchCase.findMany({
      include: { stages: true },
    });

    return rawList.map((raw) => this.toDomain(raw));
  }

  async findStageInstanceById(
    stageId: string,
  ): Promise<{
    id: string;
    researchCaseId: string;
    stageType: any;
    status: any;
    version: number;
  } | null> {
    const raw = await this.prisma.stageInstance.findUnique({
      where: { id: stageId },
    });
    if (!raw) return null;
    return {
      id: raw.id,
      researchCaseId: raw.researchCaseId,
      stageType: raw.stageType,
      status: raw.status,
      version: raw.version,
    };
  }

  async updateStageStatus(stageId: string, status: any): Promise<void> {
    await this.prisma.stageInstance.update({
      where: { id: stageId },
      data: { status },
    });
  }

  private toDomain(raw: {
    id: string;
    title: string;
    code: string;
    subject: string;
    status: any;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    stages: Array<{
      id: string;
      researchCaseId: string;
      stageType: any;
      status: any;
      version: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }): ResearchCase {
    const stages = raw.stages.map((s) =>
      StageInstance.reconstruct({
        id: s.id,
        researchCaseId: s.researchCaseId,
        stageType: s.stageType,
        status: s.status,
        version: s.version,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }),
    );

    return ResearchCase.reconstruct({
      id: raw.id,
      title: raw.title,
      code: raw.code,
      subject: raw.subject,
      status: raw.status,
      version: raw.version,
      stages,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
