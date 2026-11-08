import { describe, it, expect, beforeEach } from "vitest";
import { AssignmentsService } from "./assignments.service.js";
import type { AssignmentRepositoryPort, SupervisorAssignmentRecord } from "./ports/assignment.repository.port.js";

class InMemoryAssignmentRepository implements AssignmentRepositoryPort {
  private assignments: SupervisorAssignmentRecord[] = [];
  private readonly scientificSupervisors = new Set<string>();

  constructor() {
    for (let index = 1; index <= 10; index += 1) this.scientificSupervisors.add(`supervisor-${index}`);
  }

  async assignToUser(input: { userId: string; supervisorId: string; assignedById: string }): Promise<void> {
    if (!this.scientificSupervisors.has(input.supervisorId)) throw new Error("کاربر انتخاب‌شده مدیر علمی نیست");
    if (this.assignments.some((item) => item.userId === input.userId && item.supervisorId === input.supervisorId)) return;
    this.assignments.push({
      id: `assignment-${this.assignments.length + 1}`,
      userId: input.userId,
      supervisorId: input.supervisorId,
      supervisorName: input.supervisorId,
      phoneNumber: "09120000000",
      isPrimary: !this.assignments.some((item) => item.userId === input.userId),
      assignedAt: new Date(),
    });
  }

  async listSupervisorsForUser(userId: string): Promise<SupervisorAssignmentRecord[]> {
    return this.assignments.filter((item) => item.userId === userId);
  }

  async listUsersForSupervisor(supervisorId: string) {
    return this.assignments.filter((item) => item.supervisorId === supervisorId).map((item) => ({
      id: item.userId,
      fullName: item.userId,
      stage: "INTERN",
      phoneNumber: item.phoneNumber,
    }));
  }

  async isSupervisorAssignedToUser(userId: string, supervisorId: string): Promise<boolean> {
    return this.assignments.some((item) => item.userId === userId && item.supervisorId === supervisorId);
  }

  async isScientificSupervisor(userId: string): Promise<boolean> {
    return this.scientificSupervisors.has(userId);
  }
}

describe("AssignmentsService (D-03, AT-01, AT-29, AT-31)", () => {
  let repo: InMemoryAssignmentRepository;
  let service: AssignmentsService;

  beforeEach(() => {
    repo = new InMemoryAssignmentRepository();
    service = new AssignmentsService(repo);
  });

  it("allows any number of supervisors at trainee scope and marks only the first as primary", async () => {
    for (let index = 1; index <= 10; index += 1) {
      await service.assignSupervisorToUser("trainee-1", `supervisor-${index}`, "tracking-director");
    }
    const assignments = await service.getSupervisorsForUser("trainee-1");
    expect(assignments).toHaveLength(10);
    expect(assignments.filter((item) => item.isPrimary).map((item) => item.supervisorId)).toEqual(["supervisor-1"]);
  });

  it("lists only trainees assigned to the requesting supervisor", async () => {
    await service.assignSupervisorToUser("trainee-1", "supervisor-1", "tracking-director");
    await service.assignSupervisorToUser("trainee-2", "supervisor-2", "tracking-director");

    expect(await service.getUsersForSupervisor("supervisor-1")).toMatchObject([{ id: "trainee-1" }]);
    expect(await service.isSupervisorAssignedToUser("trainee-2", "supervisor-1")).toBe(false);
  });

  it("rejects assigning a user who does not have the scientific supervisor role", async () => {
    await expect(service.assignSupervisorToUser("trainee-1", "other-user", "tracking-director"))
      .rejects.toThrow("کاربر انتخاب‌شده مدیر علمی نیست");
  });
});
