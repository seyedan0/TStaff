import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import type { ResearchChangeRequestDto } from "@tstaff/contracts";
import type { ChangeRequestRepositoryPort } from "../application/ports/change-request.repository.port.js";
import { StaleRevisionError } from "../domain/research-errors.js";

@Injectable()
export class PrismaChangeRequestRepository implements ChangeRequestRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async create(item: ResearchChangeRequestDto) {
    await this.prisma.researchChangeRequest.create({ data: { ...item, createdAt: new Date(item.createdAt), decidedAt: null } });
  }
  async get(id: string): Promise<ResearchChangeRequestDto | null> {
    const row = await this.prisma.researchChangeRequest.findUnique({ where: { id } });
    return row ? this.dto(row) : null;
  }
  async list(caseId: string): Promise<ResearchChangeRequestDto[]> {
    const rows = await this.prisma.researchChangeRequest.findMany({ where: { researchCaseId: caseId }, orderBy: { createdAt: "asc" } });
    return rows.map((row) => this.dto(row));
  }
  async decide(item: ResearchChangeRequestDto, expectedVersion: number) {
    const result = await this.prisma.researchChangeRequest.updateMany({ where: { id: item.id, version: expectedVersion, status: "PENDING" }, data: { status: item.status, version: item.version, reviewerId: item.reviewerId, decisionReason: item.decisionReason, decidedAt: item.decidedAt ? new Date(item.decidedAt) : null } });
    if (!result.count) throw new StaleRevisionError(item.version, expectedVersion);
  }
  private dto(row: { id: string;researchCaseId: string;authorId: string;targetStage: ResearchChangeRequestDto["targetStage"];reason: string;status: string;expectedVersion: number;version: number;reviewerId: string|null;decisionReason: string|null;createdAt: Date;decidedAt: Date|null }): ResearchChangeRequestDto {
    return { ...row, status: row.status as ResearchChangeRequestDto["status"], createdAt: row.createdAt.toISOString(), decidedAt: row.decidedAt?.toISOString() ?? null };
  }
}
