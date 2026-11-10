import { Inject, Injectable, Optional } from "@nestjs/common";
import type { SupervisorHistoryEvent, SupervisorWorkspaceUser } from "@tstaff/contracts";
import { IdentityService } from "../../identity/application/identity.service.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import { AuditService } from "../../audit/application/audit.service.js";
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
    @Inject(ChangeRequestsService) private readonly changes: ChangeRequestsService,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService) {}

  async list(supervisorId: string): Promise<{ users: SupervisorWorkspaceUser[]; total: number }> {
    const userIds = await this.research.getAssignedUserIds(supervisorId);
    const users = prioritizeWorkspaceUsers(await Promise.all(userIds.map((userId) => this.detail(supervisorId, userId, false))));
    return { users, total: users.length };
  }

  async detail(supervisorId: string, userId: string, includeHistory = true): Promise<SupervisorWorkspaceUser> {
    if (!(await this.research.getAssignedUserIds(supervisorId)).includes(userId)) throw new UnauthorizedSupervisorError(supervisorId, userId);
    const user = await this.identity.getById(userId);
    const cases = await this.research.listAccessibleCases(supervisorId, ["SCIENTIFIC_SUPERVISOR"], userId);
    const evaluation = await this.identity.getStudyEvaluationForUser(userId);
    const canCreateResearch = await this.assignments.isSupervisorAssignedToUser(userId, supervisorId);
    const applicantDetails = canCreateResearch ? await this.identity.getUserApplicantDetails(userId) : null;
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
    const history = includeHistory ? await this.loadHistory(userId, canCreateResearch, cases.map((item) => item.id)) : undefined;
    return {
      id: user.id,
      fullName: user.fullName ?? "کاربر",
      phoneNumber: user.phoneNumber,
      stage: user.stage,
      nationalId: applicantDetails?.nationalId ?? null,
      age: applicantDetails?.age ?? null,
      provinceId: applicantDetails?.provinceId ?? null,
      provinceName: applicantDetails?.provinceName ?? null,
      education: applicantDetails?.education ?? null,
      fieldOfStudy: applicantDetails?.fieldOfStudy ?? null,
      cases: snapshots,
      pendingCount: dates.length,
      oldestPendingAt: dates.sort()[0] ?? null,
      pendingStudyEvaluationId: pendingEvaluation?.id ?? null,
      changeRequests,
      canCreateResearch,
      ...(history ? { history } : {}),
    };
  }

  private async loadHistory(userId: string, includeUserEvents: boolean, caseIds: string[]): Promise<SupervisorHistoryEvent[]> {
    if (!this.audit) return [];
    const queries = [
      ...(includeUserEvents ? [this.audit.queryEvents({ aggregateType: "User", aggregateId: userId, limit: 50 })] : []),
      ...caseIds.map((caseId) => this.audit!.queryEvents({ aggregateType: "ResearchCase", aggregateId: caseId, limit: 50 })),
    ];
    const groups = await Promise.all(queries);
    const byId = new Map<string, ReturnType<typeof groups[number][number]["toJSON"]>>();
    for (const event of groups.flat()) {
      const json = event.toJSON();
      byId.set(json.id, json);
    }
    const actorNames = new Map<string, string>();
    const actorIds = [...new Set([...byId.values()].map((item) => item.actorId).filter((id): id is string => !!id))];
    await Promise.all(actorIds.map(async (actorId) => {
      try {
        const actor = await this.identity.getById(actorId);
        if (actor.fullName) actorNames.set(actorId, actor.fullName);
      } catch {
        // Ignore deleted or external actor lookup failures
      }
    }));
    return [...byId.values()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => ({
        id: item.id,
        aggregateType: item.aggregateType,
        aggregateId: item.aggregateId,
        action: item.action,
        actorId: item.actorId ?? null,
        actorName: item.actorId ? actorNames.get(item.actorId) ?? null : null,
        payload: item.payload,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
      }));
  }
}
