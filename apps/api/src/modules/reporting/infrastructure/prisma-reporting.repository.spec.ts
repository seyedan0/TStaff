import { describe, expect, it, vi } from "vitest";
import { PrismaReportingRepository } from "./prisma-reporting.repository.js";

describe("PrismaReportingRepository supervisor health (D-09, AT-39)", () => {
  it("surfaces revoked assignments and inactive managers for tracking follow-up", async () => {
    const scientificSupervisorAssignment = {
      findMany: vi.fn().mockResolvedValue([
        {
          userId: "trainee-revoked",
          supervisorId: "supervisor-former",
          revokedAt: new Date("2026-11-21T00:00:00Z"),
          supervisor: {
            id: "supervisor-former",
            isActive: true,
            userRoles: [{ role: { name: "SCIENTIFIC_SUPERVISOR" } }],
          },
        },
        {
          userId: "trainee-inactive",
          supervisorId: "supervisor-inactive",
          revokedAt: null,
          supervisor: {
            id: "supervisor-inactive",
            isActive: false,
            userRoles: [{ role: { name: "SCIENTIFIC_SUPERVISOR" } }],
          },
        },
      ]),
    };
    const prisma = {
      scientificSupervisorAssignment,
      researchCase: { findMany: vi.fn().mockResolvedValue([]) },
      researchAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new PrismaReportingRepository(prisma as never);

    const health = await repository.getSupervisorHealth();

    expect(scientificSupervisorAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.any(Object) }),
    );
    expect(
      scientificSupervisorAssignment.findMany.mock.calls[0]?.[0],
    ).not.toHaveProperty("where");
    expect(health.inactiveSupervisorAssignmentsCount).toBe(1);
    expect(health.revokedSupervisorAssignmentsCount).toBe(1);
    expect(health.issues).toEqual(
      expect.arrayContaining([
        {
          type: "SUPERVISOR_ASSIGNMENT_REVOKED",
          entityId: "trainee-revoked",
          relatedId: "supervisor-former",
        },
        {
          type: "SUPERVISOR_INACTIVE_OR_ROLE_REMOVED",
          entityId: "trainee-inactive",
          relatedId: "supervisor-inactive",
        },
      ]),
    );
  });
});
