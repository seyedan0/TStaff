import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import type { ReportingRepositoryPort } from "../application/ports/reporting.repository.port.js";
import type {
  ProvincialDirectorMetrics,
  SupervisorWorklist,
  SupervisorWorklistItem,
  TrackingDirectorBacklog,
  GeneralDirectorSummary,
  WorkflowMetrics,
} from "@tstaff/contracts";

@Injectable()
export class PrismaReportingRepository implements ReportingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getProvincialDirectorMetrics(
    provinceId?: string,
  ): Promise<ProvincialDirectorMetrics> {
    const applicantFilter = provinceId ? { provinceId } : {};
    const userApplicantFilter = provinceId
      ? { applicant: { provinceId } }
      : {};

    const [
      totalApplicants,
      approvedApplicants,
      totalApprentices,
      totalInterns,
      activeResearchCases,
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
        where: { status: { notIn: ["COMPLETED", "ARCHIVED"] } },
      }),
    ]);

    return {
      provinceId,
      totalApplicants,
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
        role: { in: ["MAIN_SUPERVISOR", "COLLABORATOR_SUPERVISOR"] },
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
      this.prisma.researchAssignment.findMany({
        where: {
          isActive: true,
          role: { in: ["MAIN_SUPERVISOR", "COLLABORATOR_SUPERVISOR"] },
        },
        distinct: ["userId"],
      }),
      this.prisma.stageInstance.groupBy({
        by: ["stageType"],
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
      averageStageCompletionDays: {
        SOURCES: 14,
        EXPLANATION: 21,
        PRESCRIPTION: 14,
        SCENARIO: 7,
      },
      rollbackFrequencyByStage,
    };
  }
}
