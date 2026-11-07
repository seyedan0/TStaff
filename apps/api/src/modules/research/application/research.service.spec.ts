import { describe, it, expect, beforeEach } from "vitest";
import { ResearchService } from "./research.service.js";
import { ResearchCase } from "../domain/research-case.entity.js";
import {
  StaleRevisionError,
  UnauthorizedSupervisorError,
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

  async saveWithVersionCheck(
    researchCase: ResearchCase,
    expectedVersion: number,
  ): Promise<void> {
    const idx = this.cases.findIndex((c) => c.id === researchCase.id);
    if (idx < 0) return;

    const existing = this.cases[idx]!;
    if (existing.version !== expectedVersion) {
      throw new StaleRevisionError(existing.version, expectedVersion);
    }

    this.cases[idx] = researchCase;
  }

  async findAll(): Promise<ResearchCase[]> {
    return this.cases;
  }
}

describe("ResearchService Concurrency & Stage Workflow (D-02, D-03, D-05, D-07, AT-29, AT-33)", () => {
  let repo: InMemoryResearchRepository;
  let service: ResearchService;
  let authorizedSupervisors: Set<string>;
  let sourcesComplete: boolean;

  beforeEach(() => {
    repo = new InMemoryResearchRepository();
    authorizedSupervisors = new Set(["user-main", "user-collab"]);
    sourcesComplete = true;

    const mockAssignmentsService = {
      isAuthorizedSupervisor: async (_caseId: string, userId: string) =>
        authorizedSupervisors.has(userId),
    } as any;

    const mockResourcesService = {
      assertSourcesStageCompleteness: async (_caseId: string) => {
        if (!sourcesComplete) {
          throw new IncompleteSourcesStageError("منابع فاقد مصاحبه هستند");
        }
        return { isComplete: true, totalResources: 2 };
      },
    } as any;

    service = new ResearchService(
      repo,
      mockAssignmentsService,
      mockResourcesService,
    );
  });

  it("creates a new research case", async () => {
    const rCase = await service.createCase({
      title: "مدیریت سرمایه انسانی",
      code: "RC-101",
      subject: "مدیریت",
    });

    expect(rCase.id).toBeDefined();
    expect(rCase.version).toBe(1);
    expect(rCase.status).toBe("DRAFT");
  });

  it("blocks advance from SOURCES stage if resources are incomplete (D-07, AT-30)", async () => {
    const rCase = await service.createCase({
      title: "عنوان",
      code: "RC-102",
      subject: "موضوع",
    });

    sourcesComplete = false;

    await expect(service.advanceStage(rCase.id, 1)).rejects.toThrow(
      IncompleteSourcesStageError,
    );
  });

  it("advances stage successfully when sources are complete and version matches", async () => {
    const rCase = await service.createCase({
      title: "عنوان",
      code: "RC-103",
      subject: "موضوع",
    });

    sourcesComplete = true;

    const advanced = await service.advanceStage(rCase.id, 1);
    expect(advanced.version).toBe(2);
    expect(advanced.status).toBe("EXPLANATION_STAGE");
  });

  it("handles concurrent scientific supervisor review decisions with CAS: first commits, second gets 409 STALE_REVISION (D-02, D-03, AT-29)", async () => {
    const rCase = await service.createCase({
      title: "عنوان",
      code: "RC-104",
      subject: "موضوع",
    });

    // Both supervisors read version 1
    const expectedVersion = 1;

    // Supervisor 1 (MAIN) submits decision
    const decision1Promise = service.reviewDecision(
      rCase.id,
      "SOURCES",
      "user-main",
      {
        decision: "APPROVED",
        notes: "تایید توسط مدیر اصلی",
        expectedVersion,
      },
    );

    const result1 = await decision1Promise;
    expect(result1.version).toBe(2);

    // Supervisor 2 (COLLABORATOR) attempts to submit with the stale expectedVersion (1)
    await expect(
      service.reviewDecision(rCase.id, "SOURCES", "user-collab", {
        decision: "REVISION_REQUESTED",
        notes: "نظر مدیر همکار با تاخیر",
        expectedVersion, // Stale!
      }),
    ).rejects.toThrow(StaleRevisionError);
  });

  it("rejects review decision by unauthorized user (D-02)", async () => {
    const rCase = await service.createCase({
      title: "عنوان",
      code: "RC-105",
      subject: "موضوع",
    });

    await expect(
      service.reviewDecision(rCase.id, "SOURCES", "unauthorized-user", {
        decision: "APPROVED",
        expectedVersion: 1,
      }),
    ).rejects.toThrow(UnauthorizedSupervisorError);
  });

  it("rolls back stage and cascades downstream stages to REVIEW_REQUIRED (D-05, AT-33)", async () => {
    const rCase = await service.createCase({
      title: "عنوان",
      code: "RC-106",
      subject: "موضوع",
    });

    // Advance to EXPLANATION (v2)
    const v2 = await service.advanceStage(rCase.id, 1);
    // Advance to PRESCRIPTION (v3)
    const v3 = await service.advanceStage(rCase.id, 2);
    expect(v3.status).toBe("PRESCRIPTION_STAGE");

    // Rollback to SOURCES with expectedVersion 3
    const rolledBack = await service.rollbackStage(rCase.id, {
      targetStage: "SOURCES",
      reason: "نیاز به تجدید مصاحبه‌ها",
      expectedVersion: 3,
    });

    expect(rolledBack.version).toBe(4);
    expect(rolledBack.status).toBe("SOURCES_STAGE");
    expect(rolledBack.getStage("SOURCES")?.status).toBe("IN_PROGRESS");
    expect(rolledBack.getStage("EXPLANATION")?.status).toBe("REVIEW_REQUIRED");
    expect(rolledBack.getStage("PRESCRIPTION")?.status).toBe("REVIEW_REQUIRED");
  });
});
