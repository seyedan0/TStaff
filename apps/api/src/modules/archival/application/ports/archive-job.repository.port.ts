import { ArchiveJob } from "../../domain/archive-job.entity.js";

export interface ArchiveJobRepositoryPort {
  save(job: ArchiveJob): Promise<void>;
  findById(id: string): Promise<ArchiveJob | null>;
  findRecent(limit?: number): Promise<ArchiveJob[]>;
  applyTargetArchival(targetType: string, targetId: string): Promise<void>;
}

