import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import type { ReportingRepositoryPort } from "../application/ports/reporting.repository.port.js";
import type {
  ProvincialDirectorMetrics,
  SupervisorWorklist,
  SupervisorWorklistItem,
  TrackingDirectorBacklog,
  GeneralDirectorSummary,
  WorkflowMetrics,
  SupervisorHealth,
  SupervisorHealthIssue,
} from "@tstaff/contracts";

@Injectable()
export class PrismaReportingRepository implements ReportingRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProvincialDirectorMetrics(
    provinceId?: string,
  ): Promise<ProvincialDirectorMetrics> {
    const applicantFilter = provinceId ? { provinceId } : {};
    const userApplicantFilter = provinceId ? { applicant: { provinceId } } : {};

    const [
      totalApplicants,
      approvedApplicants,
      totalApprentices,
      totalInterns,
      activeResearchCases,
      statusCounts,
      pendingSupervisorAllocation,
    ] = await Promise.all([
      this.prisma.applicant.count({ where: applicantFilter }),
      this.prisma.applicant.count({
        where: { ...applicantFilter, status: "APPROVED" },
      }),
      this.prisma.user.count({
        where: { stage: "APPRENTICE", isActive: true, ...userApplicantFilter },
      }),
      this.prisma.user.count({
        where: { stage: "INTERN", isActive: true, ...userApplicantFilter },
      }),
      this.prisma.researchCase.count({
        where: {
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
          ...(provinceId ? { researcher: { applicant: { provinceId } } } : {}),
        },
      }),
      this.prisma.applicant.groupBy({
        by: ["status"],
        where: applicantFilter,
        _count: { status: true },
      }),
      this.prisma.applicant.count({
        where: {
          ...applicantFilter,
          status: "PENDING",
          initialSupervisorId: null,
        },
      }),
    ]);

    const applicantsByStatus = Object.fromEntries(
      statusCounts.map((entry) => [entry.status, entry._count.status]),
    );

    return {
      provinceId,
      totalApplicants,
      applicantsByStatus,
      pendingSupervisorAllocation,
      approvedApplicants,
      totalApprentices,
      totalInterns,
      activeResearchCases,
    };
  }

  async getSupervisorWorklist(
    supervisorId: string,
  ): Promise<SupervisorWorklist> {
    const assignments = await this.prisma.researchAssignment.findMany({
      where: {
        userId: supervisorId,
        isActive: true,
        role: "MAIN_SUPERVISOR",
      },
      select: { researchCaseId: true },
    });

    const caseIds = assignments.map((a) => a.researchCaseId);

    if (caseIds.length === 0) {
      return {
        supervisorId,
        pendingStageSubmissions: 0,
        pendingScenarioReviews: 0,
        totalSupervisedCases: 0,
        items: [],
      };
    }

    const [pendingSubmissions, pendingScenarios] = await Promise.all([
      this.prisma.stageSubmission.findMany({
        where: {
          stageInstance: { researchCaseId: { in: caseIds } },
          status: "SUBMITTED",
        },
        include: {
          stageInstance: {
            include: { researchCase: true },
          },
        },
        orderBy: { submittedAt: "asc" },
      }),
      this.prisma.scenario.findMany({
        where: {
          researchCaseId: { in: caseIds },
          status: "UNDER_REVIEW",
        },
        include: {
          researchCase: true,
        },
        orderBy: { updatedAt: "asc" },
      }),
    ]);

    const items: SupervisorWorklistItem[] = [
      ...pendingSubmissions.map((s) => ({
        caseId: s.stageInstance.researchCaseId,
        caseCode: s.stageInstance.researchCase.code,
        caseSubject: s.stageInstance.researchCase.subject,
        stage: s.stageInstance.stageType,
        pendingItemType: "STAGE_SUBMISSION" as const,
        pendingItemId: s.id,
        submittedAt: s.submittedAt.toISOString(),
      })),
      ...pendingScenarios.map((sc) => ({
        caseId: sc.researchCaseId,
        caseCode: sc.researchCase.code,
        caseSubject: sc.researchCase.subject,
        stage: "SCENARIO",
        pendingItemType: "SCENARIO" as const,
        pendingItemId: sc.id,
        submittedAt: sc.updatedAt.toISOString(),
      })),
    ];

    return {
      supervisorId,
      pendingStageSubmissions: pendingSubmissions.length,
      pendingScenarioReviews: pendingScenarios.length,
      totalSupervisedCases: caseIds.length,
      items,
    };
  }

  async getTrackingDirectorBacklog(): Promise<TrackingDirectorBacklog> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [reviewRequiredStages, unassignedCases, delayedCasesCount] =
      await Promise.all([
        this.prisma.stageInstance.findMany({
          where: {
            status: "REVIEW_REQUIRED",
            researchCase: { status: { notIn: ["COMPLETED", "ARCHIVED"] } },
          },
          include: { researchCase: true },
        }),
        this.prisma.researchCase.findMany({
          where: {
            status: { notIn: ["COMPLETED", "ARCHIVED"] },
            assignments: {
              none: {
                role: "MAIN_SUPERVISOR",
                isActive: true,
              },
            },
          },
        }),
        this.prisma.researchCase.count({
          where: {
            status: { notIn: ["COMPLETED", "ARCHIVED"] },
            stages: {
              some: {
                status: "IN_PROGRESS",
                createdAt: { lt: thirtyDaysAgo },
              },
            },
          },
        }),
      ]);

    const now = Date.now();
    const backlogItems = reviewRequiredStages.map((st) => ({
      caseId: st.researchCaseId,
      caseCode: st.researchCase.code,
      subject: st.researchCase.subject,
      currentStage: st.stageType,
      status: st.status,
      daysInCurrentStage: Math.max(
        0,
        Math.floor((now - st.createdAt.getTime()) / (1000 * 3600 * 24)),
      ),
    }));

    return {
      delayedCasesCount,
      reviewRequiredCasesCount: reviewRequiredStages.length,
      unassignedCasesCount: unassignedCases.length,
      backlogItems,
    };
  }

  async getGeneralDirectorSummary(): Promise<GeneralDirectorSummary> {
    const [
      totalUsers,
      totalApplicants,
      totalResearchCases,
      completedScenariosCount,
      supervisorAssignments,
      stageCounts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.applicant.count(),
      this.prisma.researchCase.count(),
      this.prisma.scenario.count({ where: { status: "APPROVED_INTERNAL" } }),
      this.prisma.scientificSupervisorAssignment.findMany({
        where: {
          revokedAt: null,
          supervisor: {
            isActive: true,
            userRoles: { some: { role: { name: "SCIENTIFIC_SUPERVISOR" } } },
          },
        },
        distinct: ["supervisorId"],
      }),
      this.prisma.stageInstance.groupBy({
        by: ["stageType"],
        where: {
          status: {
            in: [
              "IN_PROGRESS",
              "SUBMITTED",
              "REVISION_REQUESTED",
              "REVIEW_REQUIRED",
            ],
          },
        },
        _count: { stageType: true },
      }),
    ]);

    const casesByStage: Record<string, number> = {
      SOURCES: 0,
      EXPLANATION: 0,
      PRESCRIPTION: 0,
      SCENARIO: 0,
    };

    for (const item of stageCounts) {
      casesByStage[item.stageType] = item._count.stageType;
    }

    return {
      totalUsers,
      totalApplicants,
      totalResearchCases,
      casesByStage,
      completedScenariosCount,
      activeSupervisorsCount: supervisorAssignments.length,
    };
  }

  async getWorkflowMetrics(): Promise<WorkflowMetrics> {
    const rollbackEvents = await this.prisma.auditEvent.findMany({
      where: { action: "STAGE_ROLLED_BACK" },
      take: 100,
    });

    const rollbackFrequencyByStage: Record<string, number> = {
      SOURCES: 0,
      EXPLANATION: 0,
      PRESCRIPTION: 0,
      SCENARIO: 0,
    };

    for (const ev of rollbackEvents) {
      const payload = ev.payload as Record<string, unknown> | null;
      const stage = (payload?.["targetStage"] as string) || "SOURCES";
      if (rollbackFrequencyByStage[stage] !== undefined) {
        rollbackFrequencyByStage[stage]++;
      }
    }

    return {
      rollbackFrequencyByStage,
    };
  }

  async getSupervisorHealth(): Promise<SupervisorHealth> {
    const [userAssignments, researchCases, collaboratorAssignments] =
      await Promise.all([
        this.prisma.scientificSupervisorAssignment.findMany({
          include: {
            supervisor: {
              select: {
                id: true,
                isActive: true,
                userRoles: { include: { role: { select: { name: true } } } },
              },
            },
          },
        }),
        this.prisma.researchCase.findMany({
          select: {
            id: true,
            code: true,
            researcherId: true,
            assignments: {
              where: { role: "MAIN_SUPERVISOR", isActive: true },
              select: { userId: true },
            },
          },
        }),
        this.prisma.researchAssignment.findMany({
          where: { role: "COLLABORATOR_SUPERVISOR" },
          select: { id: true, researchCaseId: true, userId: true },
        }),
      ]);

    const issues: SupervisorHealthIssue[] = [];
    const supervisorByUser = new Map<string, string>();
    let inactiveSupervisorAssignmentsCount = 0;
    let revokedSupervisorAssignmentsCount = 0;
    for (const assignment of userAssignments) {
      if (assignment.revokedAt) {
        revokedSupervisorAssignmentsCount += 1;
        issues.push({
          type: "SUPERVISOR_ASSIGNMENT_REVOKED",
          entityId: assignment.userId,
          relatedId: assignment.supervisorId,
        });
        continue;
      }
      supervisorByUser.set(assignment.userId, assignment.supervisorId);
      const hasRole = assignment.supervisor.userRoles.some(
        (entry) => entry.role.name === "SCIENTIFIC_SUPERVISOR",
      );
      if (!assignment.supervisor.isActive || !hasRole) {
        inactiveSupervisorAssignmentsCount += 1;
        issues.push({
          type: "SUPERVISOR_INACTIVE_OR_ROLE_REMOVED",
          entityId: assignment.userId,
          relatedId: assignment.supervisorId,
        });
      }
    }

    const affectedCases = new Set<string>();
    for (const researchCase of researchCases) {
      if (!researchCase.researcherId) {
        affectedCases.add(researchCase.id);
        issues.push({
          type: "CASE_OWNER_MISSING",
          entityId: researchCase.id,
          caseCode: researchCase.code,
        });
      }
      if (researchCase.assignments.length === 0) {
        affectedCases.add(researchCase.id);
        issues.push({
          type: "CASE_SUPERVISOR_MISSING",
          entityId: researchCase.id,
          caseCode: researchCase.code,
        });
        continue;
      }
      if (researchCase.assignments.length > 1) {
        affectedCases.add(researchCase.id);
        issues.push({
          type: "CASE_MULTIPLE_MAIN_SUPERVISORS",
          entityId: researchCase.id,
          caseCode: researchCase.code,
        });
      }
      const expectedSupervisorId = researchCase.researcherId
        ? supervisorByUser.get(researchCase.researcherId)
        : undefined;
      for (const assignment of researchCase.assignments) {
        if (
          !expectedSupervisorId ||
          expectedSupervisorId !== assignment.userId
        ) {
          affectedCases.add(researchCase.id);
          issues.push({
            type: "CASE_SUPERVISOR_MISMATCH",
            entityId: researchCase.id,
            relatedId: assignment.userId,
            caseCode: researchCase.code,
          });
        }
      }
    }

    for (const assignment of collaboratorAssignments) {
      issues.push({
        type: "LEGACY_COLLABORATOR_ASSIGNMENT",
        entityId: assignment.researchCaseId,
        relatedId: assignment.userId,
      });
    }

    return {
      inactiveSupervisorAssignmentsCount,
      revokedSupervisorAssignmentsCount,
      legacyCollaboratorAssignmentsCount: collaboratorAssignments.length,
      caseSupervisorMismatchCount: affectedCases.size,
      issues: issues.slice(0, 100),
    };
  }
}
