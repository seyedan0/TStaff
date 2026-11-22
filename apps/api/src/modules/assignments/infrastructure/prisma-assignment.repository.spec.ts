import { describe, expect, it, vi } from "vitest";
import { PrismaAssignmentRepository } from "./prisma-assignment.repository.js";

describe("PrismaAssignmentRepository (AT-01, AT-29)", () => {
  it("uses only the authoritative MAIN assignment for scientific access", async () => {
    const researchAssignment = {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    };
    const repository = new PrismaAssignmentRepository({
      researchAssignment,
    } as never);

    await repository.isSupervisorAssignedToCase(
      "case-1",
      "legacy-collaborator",
    );
    await repository.getCaseIdsForSupervisor("legacy-collaborator");

    expect(researchAssignment.count).toHaveBeenCalledWith({
      where: {
        researchCaseId: "case-1",
        userId: "legacy-collaborator",
        isActive: true,
        role: "MAIN_SUPERVISOR",
      },
    });
    expect(researchAssignment.findMany).toHaveBeenCalledWith({
      where: {
        userId: "legacy-collaborator",
        isActive: true,
        role: "MAIN_SUPERVISOR",
      },
      select: { researchCaseId: true },
    });
  });

  it("uses executeRaw for the advisory lock before creating the initial assignment", async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      scientificSupervisorAssignment: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      userRole: { count: vi.fn().mockResolvedValue(1) },
      user: { findUnique: vi.fn().mockResolvedValue({ userRoles: [] }) },
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
      ),
    };
    const repository = new PrismaAssignmentRepository(prisma as never);

    await repository.assignToUser({
      userId: "trainee-1",
      supervisorId: "supervisor-1",
      assignedById: "director-1",
    });

    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(tx.scientificSupervisorAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isPrimary: true }),
      }),
    );
  });

  it("rejects a different supervisor even after revocation (FR-001, AT-01)", async () => {
    const tx = {
      $executeRaw: vi.fn(),
      scientificSupervisorAssignment: {
        findFirst: vi.fn().mockResolvedValue({
          supervisorId: "former-supervisor",
          revokedAt: new Date(),
        }),
        upsert: vi.fn(),
      },
    };
    const prisma = {
      userRole: { count: vi.fn().mockResolvedValue(1) },
      user: { findUnique: vi.fn().mockResolvedValue({ userRoles: [] }) },
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
      ),
    };
    const repository = new PrismaAssignmentRepository(prisma as never);
    await expect(
      repository.assignToUser({
        userId: "trainee-1",
        supervisorId: "supervisor-2",
        assignedById: "director-1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(tx.scientificSupervisorAssignment.upsert).not.toHaveBeenCalled();
  });
});
