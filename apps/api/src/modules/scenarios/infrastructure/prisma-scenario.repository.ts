import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import type { ScenarioDecisionDto, ScenarioVersionDto } from "@tstaff/contracts";
import { Scenario } from "../domain/scenario.entity.js";
import { StaleScenarioRevisionError } from "../domain/scenarios-errors.js";
import type { ScenarioRepositoryPort } from "../application/ports/scenario.repository.port.js";

@Injectable()
export class PrismaScenarioRepository implements ScenarioRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(scenario: Scenario): Promise<void> {
    await this.prisma.$transaction(async () => {
    await this.prisma.scenario.create({
      data: {
        id: scenario.id,
        researchCaseId: scenario.researchCaseId,
        createdById: scenario.createdById,
        title: scenario.title,
        summary: scenario.summary,
        content: scenario.content,
        version: scenario.version,
        status: scenario.status as any,
      },
    });
    await this.saveSnapshot(scenario);
    });
  }

  async findById(id: string): Promise<Scenario | null> {
    const raw = await this.prisma.scenario.findUnique({
      where: { id },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async findByCaseId(caseId: string): Promise<Scenario[]> {
    const list = await this.prisma.scenario.findMany({
      where: { researchCaseId: caseId },
      orderBy: { createdAt: "desc" },
    });
    return list.map((raw) => this.toDomain(raw));
  }

  async saveWithVersionCheck(
    scenario: Scenario,
    expectedVersion: number,
  ): Promise<void> {
    await this.prisma.$transaction(async () => {
    const result = await this.prisma.scenario.updateMany({
      where: {
        id: scenario.id,
        version: expectedVersion,
      },
      data: {
        title: scenario.title,
        summary: scenario.summary,
        content: scenario.content,
        status: scenario.status as any,
        version: scenario.version,
      },
    });

    if (result.count === 0) {
      const current = await this.prisma.scenario.findUnique({
        where: { id: scenario.id },
      });
      throw new StaleScenarioRevisionError(
        current?.version ?? 0,
        expectedVersion,
      );
    }
    await this.saveSnapshot(scenario);
    });
  }

  async findVersions(scenarioId: string): Promise<ScenarioVersionDto[]> {
    const rows = await this.prisma.scenarioVersion.findMany({ where: { scenarioId }, orderBy: { version: "desc" } });
    return rows.map((row) => ({
      version: row.version,
      title: row.title,
      summary: row.summary,
      content: row.content,
      status: row.status as ScenarioVersionDto["status"],
      createdById: row.createdById ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async findDecisions(scenarioId: string): Promise<ScenarioDecisionDto[]> {
    const rows = await this.prisma.reviewDecision.findMany({
      where: { scenarioId },
      orderBy: { decidedAt: "desc" },
    });
    const reviewerIds = [...new Set(rows.map((r) => r.reviewerId))];
    const reviewers = reviewerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: reviewerIds } },
          include: { profile: true },
        })
      : [];
    const nameById = new Map(
      reviewers.map((u) => [
        u.id,
        u.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : null,
      ]),
    );
    return rows.map((row) => ({
      id: row.id,
      reviewerId: row.reviewerId,
      reviewerName: nameById.get(row.reviewerId) ?? null,
      decision: row.decision as "APPROVED" | "CHANGES_REQUESTED",
      expectedVersion: row.expectedVersion,
      actualVersion: row.actualVersion,
      reason: row.reason,
      decidedAt: row.decidedAt.toISOString(),
    }));
  }

  private async saveSnapshot(scenario: Scenario) {
    await this.prisma.scenarioVersion.create({ data: { id: crypto.randomUUID(), scenarioId: scenario.id, version: scenario.version,
      title: scenario.title, summary: scenario.summary, content: scenario.content, status: scenario.status, createdById: scenario.createdById } });
  }

  /**
   * Internal Scenario Bank Query (MVP boundary: strictly internal)
   */
  async findInternalBank(query?: {
    query?: string | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
  }): Promise<Scenario[]> {
    const take = query?.limit ?? 20;
    const where: any = {
      status: "APPROVED_INTERNAL",
    };
    if (query?.query) {
      where.OR = [
        { title: { contains: query.query, mode: "insensitive" } },
        { summary: { contains: query.query, mode: "insensitive" } },
      ];
    }
    const findArgs: any = {
      where,
      take,
      orderBy: { createdAt: "desc" },
    };
    if (query?.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }
    const list = await this.prisma.scenario.findMany(findArgs);
    return list.map((raw) => this.toDomain(raw));
  }

  async saveDecision(decision: {
    id: string;
    scenarioId: string;
    reviewerId: string;
    decision: any;
    expectedVersion: number;
    actualVersion: number;
    reason: string;
    idempotencyKey: string;
    decidedAt: Date;
  }): Promise<void> {
    await this.prisma.reviewDecision.create({
      data: {
        id: decision.id,
        scenarioId: decision.scenarioId,
        reviewerId: decision.reviewerId,
        decision: decision.decision,
        expectedVersion: decision.expectedVersion,
        actualVersion: decision.actualVersion,
        reason: decision.reason,
        idempotencyKey: decision.idempotencyKey,
        decidedAt: decision.decidedAt,
      },
    });
  }

  async findDecisionByIdempotencyKey(
    key: string,
  ): Promise<{
    id: string;
    scenarioId: string;
    reviewerId: string;
    decision: any;
    expectedVersion: number;
    actualVersion: number;
    reason: string;
    idempotencyKey: string;
    decidedAt: Date;
  } | null> {
    const raw = await this.prisma.reviewDecision.findUnique({
      where: { idempotencyKey: key },
    });
    if (!raw || !raw.scenarioId) return null;
    return {
      id: raw.id,
      scenarioId: raw.scenarioId,
      reviewerId: raw.reviewerId,
      decision: raw.decision,
      expectedVersion: raw.expectedVersion,
      actualVersion: raw.actualVersion,
      reason: raw.reason,
      idempotencyKey: raw.idempotencyKey,
      decidedAt: raw.decidedAt,
    };
  }

  private toDomain(raw: {
    id: string;
    researchCaseId: string;
    title: string;
    summary: string;
    content: string;
    version: number;
    status: any;
    createdAt: Date;
    updatedAt: Date;
    createdById?: string | null;
  }): Scenario {
    return Scenario.reconstruct({
      id: raw.id,
      researchCaseId: raw.researchCaseId,
      createdById: raw.createdById ?? null,
      title: raw.title,
      summary: raw.summary,
      content: raw.content,
      version: raw.version,
      status: raw.status as any,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
