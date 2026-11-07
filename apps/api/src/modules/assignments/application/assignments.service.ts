import { Injectable, Inject } from "@nestjs/common";
import type { AssignSupervisorDto } from "@tstaff/contracts";
import { ResearchAssignment } from "../domain/assignment.entity.js";
import { SupervisorCapacityExceededError } from "../domain/assignment-errors.js";
import type { AssignmentRepositoryPort } from "./ports/assignment.repository.port.js";

export const ASSIGNMENT_REPOSITORY = Symbol("ASSIGNMENT_REPOSITORY");
export const MAX_SUPERVISOR_CAPACITY = 5;

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: AssignmentRepositoryPort,
  ) {}

  async assignSupervisor(
    caseId: string,
    dto: AssignSupervisorDto,
  ): Promise<ResearchAssignment> {
    const activeCount = await this.assignmentRepo.countActiveByUserId(
      dto.userId,
    );
    if (activeCount >= MAX_SUPERVISOR_CAPACITY) {
      throw new SupervisorCapacityExceededError(
        dto.userId,
        MAX_SUPERVISOR_CAPACITY,
      );
    }

    const activeAssignments =
      await this.assignmentRepo.findActiveByCaseId(caseId);
    ResearchAssignment.validateCanAssign(dto.role, activeAssignments);

    const assignment = ResearchAssignment.create({
      id: crypto.randomUUID(),
      researchCaseId: caseId,
      userId: dto.userId,
      role: dto.role,
    });

    await this.assignmentRepo.save(assignment);
    return assignment;
  }

  async reassignSupervisor(
    caseId: string,
    dto: AssignSupervisorDto,
  ): Promise<ResearchAssignment> {
    const activeCount = await this.assignmentRepo.countActiveByUserId(
      dto.userId,
    );
    if (activeCount >= MAX_SUPERVISOR_CAPACITY) {
      throw new SupervisorCapacityExceededError(
        dto.userId,
        MAX_SUPERVISOR_CAPACITY,
      );
    }

    const activeAssignments =
      await this.assignmentRepo.findActiveByCaseId(caseId);
    const existing = activeAssignments.find(
      (a) => a.role === dto.role && a.isActive,
    );

    if (existing) {
      const deactivated = existing.deactivate();
      await this.assignmentRepo.save(deactivated);
    }

    const assignment = ResearchAssignment.create({
      id: crypto.randomUUID(),
      researchCaseId: caseId,
      userId: dto.userId,
      role: dto.role,
    });

    await this.assignmentRepo.save(assignment);
    return assignment;
  }

  async getSupervisors(caseId: string): Promise<ResearchAssignment[]> {
    const active = await this.assignmentRepo.findActiveByCaseId(caseId);
    return active.filter(
      (a) =>
        a.role === "MAIN_SUPERVISOR" || a.role === "COLLABORATOR_SUPERVISOR",
    );
  }

  async isAuthorizedSupervisor(
    caseId: string,
    userId: string,
  ): Promise<boolean> {
    const supervisors = await this.getSupervisors(caseId);
    return supervisors.some((s) => s.userId === userId && s.isActive);
  }
}
