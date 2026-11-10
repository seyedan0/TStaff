import { Inject, Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ResearchService } from "../../research/application/research.service.js";
import { ResourcesService } from "../../resources/application/resources.service.js";
import { ReviewsService } from "../../reviews/application/reviews.service.js";
import type { FileAccessPort } from "../application/ports/files.ports.js";

/** Resolve public feature services lazily because those features also use FilesService. */
@Injectable()
export class AttachedFileAccessPolicy implements FileAccessPort {
  constructor(@Inject(ModuleRef) private readonly modules: ModuleRef) {}

  async canDownload(fileId: string, userId: string, roles: string[]): Promise<boolean> {
    const resources = this.modules.get(ResourcesService, { strict: false });
    const reviews = this.modules.get(ReviewsService, { strict: false });
    const research = this.modules.get(ResearchService, { strict: false });
    const [resourceCases, submissionCases] = await Promise.all([
      resources.getFileCaseIds(fileId),
      reviews.getFileCaseIds(fileId),
    ]);
    for (const caseId of new Set([...resourceCases, ...submissionCases])) {
      if (await research.canUserAccessCase(caseId, userId, roles)) return true;
    }
    return false;
  }
}
