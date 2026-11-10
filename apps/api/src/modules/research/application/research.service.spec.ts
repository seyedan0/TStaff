import { describe, it, expect, beforeEach } from "vitest";
import { ResearchService } from "./research.service.js";
import { ResearchCase } from "../domain/research-case.entity.js";
import {
  StaleRevisionError,
  UnauthorizedSupervisorError,
  InvalidStageTransitionError,
} from "../domain/research-errors.js";
import { IncompleteSourcesStageError } from "../../resources/domain/resource-errors.js";
import type { ResearchRepositoryPort } from "./ports/research.repository.port.js";

class InMemoryResearchRepository implements ResearchRepositoryPort {
  private cases: ResearchCase[] = [];

  async findById(id: string): Promise<ResearchCase | null> {
    return this.cases.find((c) => c.id === id) || null;
  }

  async findByCode(code: string): Promise<ResearchCase | null> {
    return this.cases.find((c) => c.code === code) || null;
  }

  async create(researchCase: ResearchCase): Promise<void> {
    this.cases.push(researchCase);
  }

  async saveWithVersionCheck(researchCase: ResearchCase, expectedVersion: number): Promise<void> {
    const idx = this.cases.findIndex((c) => c.id === researchCase.id);
    if (idx < 0) return;
    const existing = this.cases[idx]!;
    if (existing.version !== expectedVersion) throw new StaleRevisionError(existing.version, expectedVersion);
    this.cases[idx] = researchCase;
  }

  async findAll(): Promise<ResearchCase[]> {
    return this.cases;
  }

  async findStageInstanceById(stageId: string) {
    for (const researchCase of this.cases) {
      const stage = researchCase.stages.find((item) => item.id === stageId);
      if (stage) return { id: stage.id, researchCaseId: stage.researchCaseId, stageType: stage.stageType, status: stage.status, version: stage.version };
    }
    return null;
  }
}

describe("ResearchService reviewer-controlled workflow (D-02, D-03, D-05, D-07, AT-29, AT-30, AT-33)", () => {
  let repo: InMemoryResearchRepository;
  let service: ResearchService;
  let authorizedSupervisors: Set<string>;
  let sourcesComplete: boolean;

  beforeEach(() => {
    repo = new InMemoryResearchRepository();
    authorizedSupervisors = new Set(["user-main", "user-collab"]);
    sourcesComplete = true;

    const assignments = {
      isSupervisorAssignedToUser: async (userId: string, supervisorId: string) => userId === "intern-1" && authorizedSupervisors.has(supervisorId),
      isSupervisorAssignedToCase: async (_caseId: string, supervisorId: string) => authorizedSupervisors.has(supervisorId),
      assignSupervisorToCase: async () => {},
    } as any;
    const resources = {
      assertSourcesStageCompleteness: async () => {
        if (!sourcesComplete) throw new IncompleteSourcesStageError("منابع فاقد مصاحبه یا گزارش هستند");
        return { isComplete: true, totalResources: 2 };
      },
    } as any;
    service = new ResearchService(repo, assignments, resources);
  });

  const createCase = () => service.createCase({
    title: "تحلیل مدیریت سرمایه انسانی",
    code: `RC-${crypto.randomUUID()}`,
    subject: "مدیریت",
    researcherId: "intern-1",
  });

  it("creates a research case owned by the selected intern", async () => {
    const researchCase = await createCase();
    expect(researchCase.researcherId).toBe("intern-1");
    expect(researchCase.version).toBe(1);
    expect(researchCase.status).toBe("DRAFT");
  });

  it("blocks source completion until every source has its interview and scanned report (D-07, AT-30)", async () => {
    const researchCase = await createCase();
    sourcesComplete = false;
    await expect(service.submitSourcesForReview(researchCase.id, "intern-1", 1)).rejects.toThrow(IncompleteSourcesStageError);
  });

  it("opens the next stage only after an assigned supervisor approves a submitted stage", async () => {
    const researchCase = await createCase();
    await expect(service.reviewDecision(researchCase.id, "SOURCES", "user-main", { decision: "APPROVED", expectedVersion: 1 }))
      .rejects.toThrow(InvalidStageTransitionError);

    const submitted = await service.submitSourcesForReview(researchCase.id, "intern-1", 1);
    expect(submitted.getStage("SOURCES")?.status).toBe("SUBMITTED");
    const approved = await service.reviewDecision(researchCase.id, "SOURCES", "user-main", { decision: "APPROVED", expectedVersion: submitted.version });
    expect(approved.getStage("SOURCES")?.status).toBe("APPROVED");
    expect(approved.getStage("EXPLANATION")?.status).toBe("IN_PROGRESS");
    expect(approved.version).toBe(3);
  });

  it("accepts the first concurrent supervisor decision and rejects the stale second decision (D-02, D-03, AT-29)", async () => {
    const researchCase = await createCase();
    const submitted = await service.submitSourcesForReview(researchCase.id, "intern-1", 1);
    const decisions = await Promise.allSettled([
      service.reviewDecision(researchCase.id, "SOURCES", "user-main", { decision: "APPROVED", expectedVersion: submitted.version }),
      service.reviewDecision(researchCase.id, "SOURCES", "user-collab", { decision: "REVISION_REQUESTED", expectedVersion: submitted.version }),
    ]);
    expect(decisions.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    const rejected = decisions.find((item) => item.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(StaleRevisionError);
  });

  it("rejects decisions by a manager outside the intern assignment (D-02)", async () => {
    const researchCase = await createCase();
    const submitted = await service.submitSourcesForReview(researchCase.id, "intern-1", 1);
    await expect(service.reviewDecision(researchCase.id, "SOURCES", "unauthorized-user", { decision: "APPROVED", expectedVersion: submitted.version }))
      .rejects.toThrow(UnauthorizedSupervisorError);
  });

  it("keeps downstream outputs marked for review after a rollback (D-05, FR-061, AT-33)", async () => {
    const researchCase = await createCase();
    const sources = await service.submitSourcesForReview(researchCase.id, "intern-1", 1);
    const afterSources = await service.reviewDecision(researchCase.id, "SOURCES", "user-main", { decision: "APPROVED", expectedVersion: sources.version });
    const explanation = await service.submitStageForReview(researchCase.id, "EXPLANATION", "intern-1", afterSources.version);
    const afterExplanation = await service.reviewDecision(researchCase.id, "EXPLANATION", "user-main", { decision: "APPROVED", expectedVersion: explanation.version });
    const rolledBack = await service.rollbackStage(researchCase.id, {
      targetStage: "SOURCES",
      reason: "نیاز به بازبینی داده‌های میدانی",
      expectedVersion: afterExplanation.version,
    });

    expect(rolledBack.getStage("SOURCES")?.status).toBe("IN_PROGRESS");
    expect(rolledBack.getStage("EXPLANATION")?.status).toBe("REVIEW_REQUIRED");
    expect(rolledBack.getStage("PRESCRIPTION")?.status).toBe("REVIEW_REQUIRED");
  });
});
