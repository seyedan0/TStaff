import { describe, it, expect, beforeEach } from "vitest";
import { ArchivalService } from "./archival.service.js";
import { ArchiveJob } from "../domain/archive-job.entity.js";
import { ArchiveJobNotFoundError } from "../domain/archival-errors.js";
import type { ArchiveJobRepositoryPort } from "./ports/archive-job.repository.port.js";

class InMemoryArchiveRepository implements ArchiveJobRepositoryPort {
  private jobs = new Map<string, ArchiveJob>();
  public archivedTargets: { targetType: string; targetId: string }[] = [];

  async save(job: ArchiveJob): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async findById(id: string): Promise<ArchiveJob | null> {
    return this.jobs.get(id) || null;
  }

  async findRecent(limit = 20): Promise<ArchiveJob[]> {
    return Array.from(this.jobs.values()).slice(0, limit);
  }

  async applyTargetArchival(
    targetType: string,
    targetId: string,
  ): Promise<void> {
    this.archivedTargets.push({ targetType, targetId });
  }
}

describe("ArchivalService & Persistent Archival Policy (FR-025, FR-039, AT-14, AT-27, BR-19)", () => {
  let repo: InMemoryArchiveRepository;
  let service: ArchivalService;

  beforeEach(() => {
    repo = new InMemoryArchiveRepository();
    service = new ArchivalService(repo);
  });

  it("creates and completes an archive job, setting target state to archived and storing snapshot", async () => {
    const targetCaseId = "11111111-1111-1111-1111-111111111111";
    const job = await service.createAndProcessArchiveJob({
      targetType: "RESEARCH_CASE",
      targetId: targetCaseId,
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe("COMPLETED");
    expect(job.storageLocation).toContain(targetCaseId);
    expect(job.completedAt).toBeInstanceOf(Date);

    // Verify target status was updated without physical deletion
    expect(repo.archivedTargets).toEqual([
      { targetType: "RESEARCH_CASE", targetId: targetCaseId },
    ]);
  });

  it("throws ArchiveJobNotFoundError when looking up invalid job id", async () => {
    await expect(service.getJobById("non-existent")).rejects.toThrow(
      ArchiveJobNotFoundError,
    );
  });

  it("lists recent archive jobs", async () => {
    await service.createAndProcessArchiveJob({
      targetType: "RESEARCH_CASE",
      targetId: "22222222-2222-2222-2222-222222222222",
    });

    const list = await service.listRecentJobs();
    expect(list).toHaveLength(1);
    expect(list[0]?.targetId).toBe("22222222-2222-2222-2222-222222222222");
  });
});

