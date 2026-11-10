import { describe, expect, it } from "vitest";
import { ResearchService } from "./research.service.js";
import { ResearchCase } from "../domain/research-case.entity.js";

describe("Research record scopes (FR-027, FR-041, AT-29, CHG-ACCESS)", () => {
  const makeService = (userAssignment: boolean, caseAssignment: boolean) => {
    const item = ResearchCase.create({ id: "case-a", title: "Test case", code: "RC-1", subject: "Test", researcherId: "trainee" });
    return new ResearchService({ findById: async () => item } as any, {
      isSupervisorAssignedToUser: async () => userAssignment,
      isSupervisorAssignedToCase: async () => caseAssignment,
    } as any, {} as any);
  };

  it("allows a user-level mentor to read but not scientifically decide an unrelated case", async () => {
    const service = makeService(true, false);
    expect(await service.canUserAccessCase("case-a", "mentor", ["SCIENTIFIC_SUPERVISOR"])).toBe(true);
    expect(await service.isSupervisorAssignedToCase("case-a", "mentor")).toBe(false);
  });

  it("includes a case-only collaborator in that case's read and review scope", async () => {
    const service = makeService(false, true);
    expect(await service.canUserAccessCase("case-a", "collaborator", ["SCIENTIFIC_SUPERVISOR"])).toBe(true);
    expect(await service.isSupervisorAssignedToCase("case-a", "collaborator")).toBe(true);
  });

  it("denies a provincial role with no explicit scope and denies revoked supervisors", async () => {
    const service = makeService(false, false);
    expect(await service.canUserAccessCase("case-a", "other", ["PROVINCIAL_DIRECTOR"])).toBe(false);
    expect(await service.canUserAccessCase("case-a", "revoked", ["SCIENTIFIC_SUPERVISOR"])).toBe(false);
  });
});
