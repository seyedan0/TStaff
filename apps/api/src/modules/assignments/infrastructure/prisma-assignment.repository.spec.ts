import { describe, expect, it, vi } from "vitest";
import { PrismaAssignmentRepository } from "./prisma-assignment.repository.js";

describe("PrismaAssignmentRepository (AT-01, AT-29)", () => {
  it("uses executeRaw for the advisory lock before creating the initial assignment", async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      scientificSupervisorAssignment: {
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      userRole: { count: vi.fn().mockResolvedValue(1) },
      user: { findUnique: vi.fn().mockResolvedValue({ userRoles: [] }) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
    };
    const repository = new PrismaAssignmentRepository(prisma as never);

    await repository.assignToUser({ userId: "trainee-1", supervisorId: "supervisor-1", assignedById: "director-1" });

    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(tx.scientificSupervisorAssignment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ isPrimary: true }),
    }));
  });
});
