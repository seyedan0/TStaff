import { Inject, Injectable } from "@nestjs/common";
import type { SupervisorWorkspaceUser } from "@tstaff/contracts";
import { IdentityService } from "../../identity/application/identity.service.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import { ResearchService } from "./research.service.js";
import { ChangeRequestsService } from "./change-requests.service.js";
import { UnauthorizedSupervisorError } from "../domain/research-errors.js";

export function prioritizeWorkspaceUsers(users: SupervisorWorkspaceUser[]): SupervisorWorkspaceUser[] {
  return [...users].sort((left, right) => Number(right.pendingCount > 0) - Number(left.pendingCount > 0)
    || (left.oldestPendingAt ?? "9999").localeCompare(right.oldestPendingAt ?? "9999")
    || left.id.localeCompare(right.id));
}

@Injectable()
export class SupervisorWorkspaceService {
  constructor(@Inject(ResearchService) private readonly research: ResearchService,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(AssignmentsService) private readonly assignments: AssignmentsService,
    @Inject(ChangeRequestsService) private readonly changes: ChangeRequestsService) {}

  async list(supervisorId: string): Promise<{ users: SupervisorWorkspaceUser[]; total: number }> {
    const userIds = await this.research.getAssignedUserIds(supervisorId);
    const users = prioritizeWorkspaceUsers(await Promise.all(userIds.map((userId) => this.detail(supervisorId, userId))));
    return { users, total: users.length };
  }

  async detail(supervisorId: string, userId: string): Promise<SupervisorWorkspaceUser> {
    if (!(await this.research.getAssignedUserIds(supervisorId)).includes(userId)) throw new UnauthorizedSupervisorError(supervisorId, userId);
    const user = await this.identity.getById(userId);
    const cases = await this.research.listAccessibleCases(supervisorId, ["SCIENTIFIC_SUPERVISOR"], userId);
    const evaluation = await this.identity.getStudyEvaluationForUser(userId);
    const canCreateResearch = await this.assignments.isSupervisorAssignedToUser(userId, supervisorId);
    const pendingEvaluation = canCreateResearch && evaluation?.status === "PENDING" ? evaluation : null;
    const dates: string[] = pendingEvaluation ? [pendingEvaluation.createdAt.toISOString()] : [];
    const changeRequests = [];
    const snapshots = [];
    for (const item of cases) {
      const canReview = await this.research.isSupervisorAssignedToCase(item.id, supervisorId);
      snapshots.push({ ...item.toJSON(), canReview });
      const requests = await this.changes.list(item.id, supervisorId, ["SCIENTIFIC_SUPERVISOR"]);
      changeRequests.push(...requests);
      if (canReview) {
        dates.push(...item.stages.filter((stage) => stage.status === "SUBMITTED").map((stage) => stage.toJSON().updatedAt));
        dates.push(...requests.filter((request) => request.status === "PENDING").map((request) => request.createdAt));
      }
    }
    return { id: user.id, fullName: user.fullName ?? "کاربر", phoneNumber: user.phoneNumber, stage: user.stage,
      cases: snapshots, pendingCount: dates.length, oldestPendingAt: dates.sort()[0] ?? null,
      pendingStudyEvaluationId: pendingEvaluation?.id ?? null, changeRequests, canCreateResearch };
  }
}
