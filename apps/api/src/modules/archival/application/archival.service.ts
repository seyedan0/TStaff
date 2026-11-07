import { Injectable, Inject, Optional } from "@nestjs/common";
import type { CreateArchiveJobDto } from "@tstaff/contracts";
import { ArchiveJob } from "../domain/archive-job.entity.js";
import { ArchiveJobNotFoundError } from "../domain/archival-errors.js";
import type { ArchiveJobRepositoryPort } from "./ports/archive-job.repository.port.js";
import { AuditService } from "../../audit/application/audit.service.js";

export const ARCHIVE_JOB_REPOSITORY = Symbol("ARCHIVE_JOB_REPOSITORY");

@Injectable()
export class ArchivalService {
  constructor(
    @Inject(ARCHIVE_JOB_REPOSITORY)
    private readonly archiveRepo: ArchiveJobRepositoryPort,
    @Optional()
    private readonly auditService?: AuditService,
  ) {}

  /**
   * Rule FR-025 / FR-039 / AT-14 / AT-27 / BR-19:
   * Archival freezes snapshots and marks entities as ARCHIVED without physical deletion.
   */
  async createAndProcessArchiveJob(
    dto: CreateArchiveJobDto,
    actorId?: string,
  ): Promise<ArchiveJob> {
    const job = ArchiveJob.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
    });

    await this.archiveRepo.save(job);

    // Transition to RUNNING
    const running = job.startRunning();
    await this.archiveRepo.save(running);

    try {
      // Apply archival status update to target entity (mark as ARCHIVED)
      await this.archiveRepo.applyTargetArchival(dto.targetType, dto.targetId);

      // Complete job with snapshot location
      const snapshotLocation = `archives/${dto.targetType.toLowerCase()}s/${dto.targetId}_snapshot.json`;
      const completed = running.complete(snapshotLocation);
      await this.archiveRepo.save(completed);

      // Audit event
      if (this.auditService) {
        await this.auditService.recordEvent({
          aggregateType: dto.targetType,
          aggregateId: dto.targetId,
          action: "ARCHIVAL_COMPLETED",
          actorId,
          payload: {
            jobId: completed.id,
            snapshotLocation,
          },
        });
      }

      return completed;
    } catch (err) {
      const failed = running.fail();
      await this.archiveRepo.save(failed);
      throw err;
    }
  }

  async getJobById(id: string): Promise<ArchiveJob> {
    const job = await this.archiveRepo.findById(id);
    if (!job) {
      throw new ArchiveJobNotFoundError(id);
    }
    return job;
  }

  async listRecentJobs(limit = 20): Promise<ArchiveJob[]> {
    return this.archiveRepo.findRecent(limit);
  }
}

