import { Injectable, Inject, Optional } from "@nestjs/common";
import type { AssignmentRepositoryPort } from "./ports/assignment.repository.port.js";
import { AuditService } from "../../audit/application/audit.service.js";
import { NotificationsService } from "../../notifications/application/notifications.service.js";

export const ASSIGNMENT_REPOSITORY = Symbol("ASSIGNMENT_REPOSITORY");

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: AssignmentRepositoryPort,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
  ) {}

  async assignSupervisorToUser(userId: string, supervisorId: string, assignedById: string): Promise<void> {
    await this.assignmentRepo.assignToUser({ userId, supervisorId, assignedById });
    await this.audit?.recordEvent({
      aggregateType: "User",
      aggregateId: userId,
      action: "SCIENTIFIC_SUPERVISOR_ASSIGNED",
      actorId: assignedById,
      payload: { supervisorId },
    });
    await this.notifications?.createNotification({
      userId,
      type: "SUPERVISOR_ASSIGNED",
      title: "انتساب مدیر علمی",
      body: "مدیر علمی جدید برای هدایت شما در سامانه ثبت شد.",
      isCritical: true,
    });
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

  async getCaseSupervisors(caseId: string) {
    return (await this.assignmentRepo.listCaseSupervisors?.(caseId)) ?? [];
  }

  async assignSupervisorToCase(
    caseId: string,
    supervisorId: string,
    role: "MAIN_SUPERVISOR" | "COLLABORATOR_SUPERVISOR",
    actorId?: string,
  ): Promise<void> {
    if (!this.assignmentRepo.assignToCase) throw new Error("Case assignments are unavailable");
    await this.assignmentRepo.assignToCase({ researchCaseId: caseId, userId: supervisorId, role });
    if (actorId) {
      await this.audit?.recordEvent({
        aggregateType: "ResearchCase",
        aggregateId: caseId,
        action: "CASE_SUPERVISOR_ASSIGNED",
        actorId,
        payload: { supervisorId, role },
      });
      await this.notifications?.createNotification({
        userId: supervisorId,
        type: "CASE_ASSIGNED",
        title: "انتساب به پرونده پژوهش",
        body: "شما به عنوان مدیر علمی به یک پرونده پژوهشی منتسب شدید.",
        isCritical: true,
      });
    }
  }

  async replaceMainSupervisorOnCase(caseId: string, supervisorId: string, actorId: string): Promise<void> {
    if (!this.assignmentRepo.replaceMainSupervisorOnCase) throw new Error("Main supervisor replacement is unavailable");
    await this.assignmentRepo.replaceMainSupervisorOnCase(caseId, supervisorId);
    await this.audit?.recordEvent({
      aggregateType: "ResearchCase",
      aggregateId: caseId,
      action: "MAIN_SUPERVISOR_REPLACED",
      actorId,
      payload: { supervisorId },
    });
    await this.notifications?.createNotification({
      userId: supervisorId,
      type: "CASE_MAIN_SUPERVISOR_ASSIGNED",
      title: "تعویض مدیر علمی اصلی پرونده",
      body: "مسئولیت مدیر علمی اصلی پرونده به شما واگذار شد.",
      isCritical: true,
    });
  }

  async revokeSupervisorFromUser(userId: string, supervisorId: string, actorId?: string): Promise<void> {
    await this.assignmentRepo.revokeFromUser?.(userId, supervisorId);
    if (actorId) {
      await this.audit?.recordEvent({
        aggregateType: "User",
        aggregateId: userId,
        action: "SCIENTIFIC_SUPERVISOR_REVOKED",
        actorId,
        payload: { supervisorId },
      });
      await this.notifications?.createNotification({
        userId,
        type: "SUPERVISOR_REVOKED",
        title: "لغو انتساب مدیر علمی",
        body: "انتساب یکی از مدیران علمی شما لغو شد.",
        isCritical: true,
      });
    }
  }

  async revokeSupervisorFromCase(caseId: string, supervisorId: string, actorId?: string): Promise<void> {
    await this.assignmentRepo.revokeFromCase?.(caseId, supervisorId);
    if (actorId) {
      await this.audit?.recordEvent({
        aggregateType: "ResearchCase",
        aggregateId: caseId,
        action: "CASE_SUPERVISOR_REVOKED",
        actorId,
        payload: { supervisorId },
      });
      await this.notifications?.createNotification({
        userId: supervisorId,
        type: "CASE_SUPERVISOR_REVOKED",
        title: "لغو انتساب پرونده پژوهش",
        body: "انتساب شما به پرونده پژوهشی لغو گردید.",
        isCritical: true,
      });
    }
  }
}
