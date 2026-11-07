import { ResearchAssignment } from "../../domain/assignment.entity.js";

export interface AssignmentRepositoryPort {
  findActiveByCaseId(caseId: string): Promise<ResearchAssignment[]>;
  countActiveByUserId(userId: string): Promise<number>;
  findById(id: string): Promise<ResearchAssignment | null>;
  save(assignment: ResearchAssignment): Promise<void>;
}
