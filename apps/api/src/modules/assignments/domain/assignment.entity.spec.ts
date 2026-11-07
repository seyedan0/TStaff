import { describe, it, expect } from "vitest";
import { ResearchAssignment } from "./assignment.entity.js";
import {
  MainSupervisorAlreadyAssignedError,
  CollaboratorSupervisorAlreadyAssignedError,
} from "./assignment-errors.js";

describe("ResearchAssignment Domain Entity (D-02)", () => {
  it("creates an active assignment for MAIN_SUPERVISOR", () => {
    const assignment = ResearchAssignment.create({
      id: "assign-1",
      researchCaseId: "case-1",
      userId: "user-1",
      role: "MAIN_SUPERVISOR",
    });

    expect(assignment.id).toBe("assign-1");
    expect(assignment.researchCaseId).toBe("case-1");
    expect(assignment.userId).toBe("user-1");
    expect(assignment.role).toBe("MAIN_SUPERVISOR");
    expect(assignment.isActive).toBe(true);
    expect(assignment.unassignedAt).toBeNull();
  });

  it("deactivates an assignment immutably", () => {
    const active = ResearchAssignment.create({
      id: "assign-1",
      researchCaseId: "case-1",
      userId: "user-1",
      role: "MAIN_SUPERVISOR",
    });

    const deactivated = active.deactivate();

    expect(active.isActive).toBe(true); // Original unchanged (immutability)
    expect(deactivated.isActive).toBe(false);
    expect(deactivated.unassignedAt).toBeInstanceOf(Date);
    expect(deactivated.id).toBe(active.id);
  });

  it("validates supervisor constraints against existing active assignments", () => {
    const activeMain = ResearchAssignment.create({
      id: "assign-1",
      researchCaseId: "case-1",
      userId: "user-1",
      role: "MAIN_SUPERVISOR",
    });

    // Throws if trying to add another MAIN_SUPERVISOR when one is active
    expect(() =>
      ResearchAssignment.validateCanAssign("MAIN_SUPERVISOR", [activeMain]),
    ).toThrow(MainSupervisorAlreadyAssignedError);

    // Allows adding a COLLABORATOR_SUPERVISOR when only MAIN is active
    expect(() =>
      ResearchAssignment.validateCanAssign("COLLABORATOR_SUPERVISOR", [
        activeMain,
      ]),
    ).not.toThrow();

    const activeCollab = ResearchAssignment.create({
      id: "assign-2",
      researchCaseId: "case-1",
      userId: "user-2",
      role: "COLLABORATOR_SUPERVISOR",
    });

    // Throws if trying to add another COLLABORATOR when one is already active
    expect(() =>
      ResearchAssignment.validateCanAssign("COLLABORATOR_SUPERVISOR", [
        activeMain,
        activeCollab,
      ]),
    ).toThrow(CollaboratorSupervisorAlreadyAssignedError);
  });
});
