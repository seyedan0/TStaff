export interface SupervisorAssignmentRecord {
  id: string;
  userId: string;
  supervisorId: string;
  supervisorName: string;
  phoneNumber: string;
  isPrimary: boolean;
  assignedAt: Date;
}

export interface AssignedTraineeRecord {
  id: string;
  fullName: string;
  stage: string;
  phoneNumber: string;
}

export interface AssignmentRepositoryPort {
  isSupervisorAssignedToCase?(caseId: string, supervisorId: string): Promise<boolean>;
  getCaseIdsForSupervisor?(supervisorId: string): Promise<string[]>;
  assignToCase?(input: { researchCaseId: string; userId: string; role: "MAIN_SUPERVISOR" | "COLLABORATOR_SUPERVISOR" }): Promise<void>;
  revokeFromUser?(userId: string, supervisorId: string): Promise<void>;
  revokeFromCase?(caseId: string, supervisorId: string): Promise<void>;
  assignToUser(input: { userId: string; supervisorId: string; assignedById: string }): Promise<void>;
  listSupervisorsForUser(userId: string): Promise<SupervisorAssignmentRecord[]>;
  listUsersForSupervisor(supervisorId: string): Promise<AssignedTraineeRecord[]>;
  isSupervisorAssignedToUser(userId: string, supervisorId: string): Promise<boolean>;
  isScientificSupervisor(userId: string): Promise<boolean>;
  isIntern(userId: string): Promise<boolean>;
}
