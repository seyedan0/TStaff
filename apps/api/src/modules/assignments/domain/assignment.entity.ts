import type { AssignmentRole } from "@tstaff/contracts";
import {
  MainSupervisorAlreadyAssignedError,
  CollaboratorSupervisorAlreadyAssignedError,
} from "./assignment-errors.js";

export interface ResearchAssignmentProps {
  id: string;
  researchCaseId: string;
  userId: string;
  role: AssignmentRole;
  isActive: boolean;
  assignedAt: Date;
  unassignedAt: Date | null;
}

export class ResearchAssignment {
  private constructor(private readonly props: ResearchAssignmentProps) {}

  static create(params: {
    id: string;
    researchCaseId: string;
    userId: string;
    role: AssignmentRole;
  }): ResearchAssignment {
    return new ResearchAssignment({
      id: params.id,
      researchCaseId: params.researchCaseId,
      userId: params.userId,
      role: params.role,
      isActive: true,
      assignedAt: new Date(),
      unassignedAt: null,
    });
  }

  static reconstruct(props: ResearchAssignmentProps): ResearchAssignment {
    return new ResearchAssignment(props);
  }

  static validateCanAssign(
    role: AssignmentRole,
    activeAssignments: ResearchAssignment[],
  ): void {
    if (role === "MAIN_SUPERVISOR") {
      const existingMain = activeAssignments.find(
        (a) => a.role === "MAIN_SUPERVISOR" && a.isActive,
      );
      if (existingMain) {
        throw new MainSupervisorAlreadyAssignedError(
          existingMain.researchCaseId,
        );
      }
    } else if (role === "COLLABORATOR_SUPERVISOR") {
      const existingCollab = activeAssignments.find(
        (a) => a.role === "COLLABORATOR_SUPERVISOR" && a.isActive,
      );
      if (existingCollab) {
        throw new CollaboratorSupervisorAlreadyAssignedError(
          existingCollab.researchCaseId,
        );
      }
    }
  }

  deactivate(): ResearchAssignment {
    return new ResearchAssignment({
      ...this.props,
      isActive: false,
      unassignedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get researchCaseId(): string {
    return this.props.researchCaseId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get role(): AssignmentRole {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get assignedAt(): Date {
    return this.props.assignedAt;
  }

  get unassignedAt(): Date | null {
    return this.props.unassignedAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      researchCaseId: this.props.researchCaseId,
      userId: this.props.userId,
      role: this.props.role,
      isActive: this.props.isActive,
      assignedAt: this.props.assignedAt.toISOString(),
      unassignedAt: this.props.unassignedAt?.toISOString() ?? null,
    };
  }
}
