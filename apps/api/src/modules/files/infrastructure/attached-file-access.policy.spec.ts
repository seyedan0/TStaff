import { describe, expect, it, vi } from "vitest";
import type { ModuleRef } from "@nestjs/core";
import { ResearchService } from "../../research/application/research.service.js";
import { ResourcesService } from "../../resources/application/resources.service.js";
import { ReviewsService } from "../../reviews/application/reviews.service.js";
import { AttachedFileAccessPolicy } from "./attached-file-access.policy.js";

vi.mock("../../research/application/research.service.js", () => ({ ResearchService: class ResearchService {} }));
vi.mock("../../resources/application/resources.service.js", () => ({ ResourcesService: class ResourcesService {} }));
vi.mock("../../reviews/application/reviews.service.js", () => ({ ReviewsService: class ReviewsService {} }));

describe("CHG-FILES actual attached-parent permission (FR-014 / AT-18)", () => {
  const setup = (parents: string[], permitted: string[]) => {
    const canUserAccessCase = vi.fn(async (caseId: string) => permitted.includes(caseId));
    const services = new Map<unknown, unknown>([
      [ResourcesService, { getFileCaseIds: vi.fn(async () => parents) }],
      [ReviewsService, { getFileCaseIds: vi.fn(async () => []) }],
      [ResearchService, { canUserAccessCase }],
    ]);
    const policy = new AttachedFileAccessPolicy({ get: (token: unknown) => services.get(token) } as ModuleRef);
    return { policy, canUserAccessCase };
  };

  it("denies a bank-only provincial manager and a revoked supervisor", async () => {
    const { policy } = setup(["case-a"], []);
    expect(await policy.canDownload("file-a", "provincial", ["PROVINCIAL_DIRECTOR"])).toBe(false);
    expect(await policy.canDownload("file-a", "revoked", ["SCIENTIFIC_SUPERVISOR"])).toBe(false);
  });

  it("allows a case collaborator only for the actual case containing the file", async () => {
    const { policy, canUserAccessCase } = setup(["case-a"], ["case-a"]);
    expect(await policy.canDownload("file-a", "collaborator", ["SCIENTIFIC_SUPERVISOR"])).toBe(true);
    expect(canUserAccessCase).toHaveBeenCalledWith("case-a", "collaborator", ["SCIENTIFIC_SUPERVISOR"]);
    const unrelated = setup(["case-b"], ["case-a"]);
    expect(await unrelated.policy.canDownload("file-b", "collaborator", ["SCIENTIFIC_SUPERVISOR"])).toBe(false);
  });

  it("does not grant access to an unattached upload even to a manager", async () => {
    const { policy, canUserAccessCase } = setup([], ["case-a"]);
    expect(await policy.canDownload("orphan", "manager", ["TRACKING_DIRECTOR"])).toBe(false);
    expect(canUserAccessCase).not.toHaveBeenCalled();
  });
});
