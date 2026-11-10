import { Injectable, Inject } from "@nestjs/common";
import type { AssignmentRepositoryPort } from "./ports/assignment.repository.port.js";

export const ASSIGNMENT_REPOSITORY = Symbol("ASSIGNMENT_REPOSITORY");

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: AssignmentRepositoryPort,
  ) {}

  async assignSupervisorToUser(userId: string, supervisorId: string, assignedById: string): Promise<void> {
    await this.assignmentRepo.assignToUser({ userId, supervisorId, assignedById });
  }

  async getSupervisorsForUser(userId: string) {
    return this.assignmentRepo.listSupervisorsForUser(userId);
  }

  async getUsersForSupervisor(supervisorId: string) {
    return this.assignmentRepo.listUsersForSupervisor(supervisorId);
  }

  async isSupervisorAssignedToUser(userId: string, supervisorId: string): Promise<boolean> {
    return this.assignmentRepo.isSupervisorAssignedToUser(userId, supervisorId);
  }

  async isScientificSupervisor(userId: string): Promise<boolean> {
    return this.assignmentRepo.isScientificSupervisor(userId);
  }

  async isIntern(userId: string): Promise<boolean> {
    return this.assignmentRepo.isIntern(userId);
  }

  async isSupervisorAssignedToCase(caseId: string, supervisorId: string): Promise<boolean> {
    return this.assignmentRepo.isSupervisorAssignedToCase?.(caseId, supervisorId) ?? false;
  }

  async getCaseIdsForSupervisor(supervisorId: string): Promise<string[]> {
    return this.assignmentRepo.getCaseIdsForSupervisor?.(supervisorId) ?? [];
  }

  async assignSupervisorToCase(caseId: string, supervisorId: string, role: "MAIN_SUPERVISOR" | "COLLABORATOR_SUPERVISOR"): Promise<void> {
    if (!this.assignmentRepo.assignToCase) throw new Error("Case assignments are unavailable");
    await this.assignmentRepo.assignToCase({ researchCaseId: caseId, userId: supervisorId, role });
  }

  async revokeSupervisorFromUser(userId: string, supervisorId: string): Promise<void> {
    await this.assignmentRepo.revokeFromUser?.(userId, supervisorId);
  }

  async revokeSupervisorFromCase(caseId: string, supervisorId: string): Promise<void> {
    await this.assignmentRepo.revokeFromCase?.(caseId, supervisorId);
  }
}
