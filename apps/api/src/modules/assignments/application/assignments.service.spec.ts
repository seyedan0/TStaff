import { describe, it, expect, beforeEach } from "vitest";
import { AssignmentsService } from "./assignments.service.js";
import { ResearchAssignment } from "../domain/assignment.entity.js";
import {
  MainSupervisorAlreadyAssignedError,
  CollaboratorSupervisorAlreadyAssignedError,
  SupervisorCapacityExceededError,
} from "../domain/assignment-errors.js";
import type { AssignmentRepositoryPort } from "./ports/assignment.repository.port.js";

class InMemoryAssignmentRepository implements AssignmentRepositoryPort {
  private assignments: ResearchAssignment[] = [];

  async findActiveByCaseId(caseId: string): Promise<ResearchAssignment[]> {
    return this.assignments.filter(
      (a) => a.researchCaseId === caseId && a.isActive,
    );
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.assignments.filter((a) => a.userId === userId && a.isActive)
      .length;
  }

  async findById(id: string): Promise<ResearchAssignment | null> {
    return this.assignments.find((a) => a.id === id) || null;
  }

  async save(assignment: ResearchAssignment): Promise<void> {
    const idx = this.assignments.findIndex((a) => a.id === assignment.id);
    if (idx >= 0) {
      this.assignments[idx] = assignment;
    } else {
      this.assignments.push(assignment);
    }
  }
}

describe("AssignmentsService (D-02)", () => {
  let repo: InMemoryAssignmentRepository;
  let service: AssignmentsService;

  beforeEach(() => {
    repo = new InMemoryAssignmentRepository();
    service = new AssignmentsService(repo);
  });

  it("assigns MAIN_SUPERVISOR and COLLABORATOR_SUPERVISOR successfully", async () => {
    const main = await service.assignSupervisor("case-1", {
      userId: "user-main",
      role: "MAIN_SUPERVISOR",
    });
    expect(main.role).toBe("MAIN_SUPERVISOR");
    expect(main.isActive).toBe(true);

    const collab = await service.assignSupervisor("case-1", {
      userId: "user-collab",
      role: "COLLABORATOR_SUPERVISOR",
    });
    expect(collab.role).toBe("COLLABORATOR_SUPERVISOR");
    expect(collab.isActive).toBe(true);

    const supervisors = await service.getSupervisors("case-1");
    expect(supervisors).toHaveLength(2);
  });

  it("prevents adding second active MAIN_SUPERVISOR without reassigning", async () => {
    await service.assignSupervisor("case-1", {
      userId: "user-main-1",
      role: "MAIN_SUPERVISOR",
    });

    await expect(
      service.assignSupervisor("case-1", {
        userId: "user-main-2",
        role: "MAIN_SUPERVISOR",
      }),
    ).rejects.toThrow(MainSupervisorAlreadyAssignedError);
  });

  it("prevents adding second active COLLABORATOR_SUPERVISOR", async () => {
    await service.assignSupervisor("case-1", {
      userId: "user-collab-1",
      role: "COLLABORATOR_SUPERVISOR",
    });

    await expect(
      service.assignSupervisor("case-1", {
        userId: "user-collab-2",
        role: "COLLABORATOR_SUPERVISOR",
      }),
    ).rejects.toThrow(CollaboratorSupervisorAlreadyAssignedError);
  });

  it("enforces supervisor capacity limit (max 5 active cases)", async () => {
    for (let i = 1; i <= 5; i++) {
      await service.assignSupervisor(`case-${i}`, {
        userId: "busy-supervisor",
        role: "MAIN_SUPERVISOR",
      });
    }

    await expect(
      service.assignSupervisor("case-6", {
        userId: "busy-supervisor",
        role: "MAIN_SUPERVISOR",
      }),
    ).rejects.toThrow(SupervisorCapacityExceededError);
  });

  it("reassigns a supervisor by archiving the previous one", async () => {
    const first = await service.assignSupervisor("case-1", {
      userId: "user-1",
      role: "MAIN_SUPERVISOR",
    });

    const second = await service.reassignSupervisor("case-1", {
      userId: "user-2",
      role: "MAIN_SUPERVISOR",
    });

    expect(second.userId).toBe("user-2");
    expect(second.isActive).toBe(true);

    const updatedFirst = await repo.findById(first.id);
    expect(updatedFirst?.isActive).toBe(false);

    const activeSupervisors = await service.getSupervisors("case-1");
    expect(activeSupervisors).toHaveLength(1);
    expect(activeSupervisors[0]!.userId).toBe("user-2");
  });

  it("verifies authorized supervisor authority for both MAIN and COLLABORATOR (D-02, D-03)", async () => {
    await service.assignSupervisor("case-1", {
      userId: "user-main",
      role: "MAIN_SUPERVISOR",
    });
    await service.assignSupervisor("case-1", {
      userId: "user-collab",
      role: "COLLABORATOR_SUPERVISOR",
    });

    expect(await service.isAuthorizedSupervisor("case-1", "user-main")).toBe(
      true,
    );
    expect(await service.isAuthorizedSupervisor("case-1", "user-collab")).toBe(
      true,
    );
    expect(await service.isAuthorizedSupervisor("case-1", "other-user")).toBe(
      false,
    );
  });
});
