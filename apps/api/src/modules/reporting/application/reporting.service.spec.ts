import { describe, it, expect, beforeEach } from "vitest";
import { ReportingService } from "./reporting.service.js";
import type { ReportingRepositoryPort } from "./ports/reporting.repository.port.js";
import type {
  ProvincialDirectorMetrics,
  SupervisorWorklist,
  TrackingDirectorBacklog,
  GeneralDirectorSummary,
  WorkflowMetrics,
} from "@tstaff/contracts";

class MockReportingRepository implements ReportingRepositoryPort {
  async getProvincialDirectorMetrics(
    provinceId?: string,
  ): Promise<ProvincialDirectorMetrics> {
    return {
      provinceId,
      totalApplicants: 50,
      approvedApplicants: 25,
      totalApprentices: 20,
      totalInterns: 10,
      activeResearchCases: 8,
    };
  }

  async getSupervisorWorklist(
    supervisorId: string,
  ): Promise<SupervisorWorklist> {
    return {
      supervisorId,
      pendingStageSubmissions: 2,
      pendingScenarioReviews: 1,
      totalSupervisedCases: 4,
      items: [
        {
          caseId: "11111111-1111-1111-1111-111111111111",
          caseCode: "CASE-01",
          caseSubject: "بررسی پدیده",
          stage: "SOURCES",
          pendingItemType: "STAGE_SUBMISSION",
          pendingItemId: "22222222-2222-2222-2222-222222222222",
          submittedAt: "2026-11-07T12:00:00.000Z",
        },
      ],
    };
  }

  async getTrackingDirectorBacklog(): Promise<TrackingDirectorBacklog> {
    return {
      delayedCasesCount: 2,
      reviewRequiredCasesCount: 1,
      unassignedCasesCount: 1,
      backlogItems: [
        {
          caseId: "33333333-3333-3333-3333-333333333333",
          caseCode: "CASE-02",
          subject: "موضوع معطل",
          currentStage: "EXPLANATION",
          status: "REVIEW_REQUIRED",
          daysInCurrentStage: 15,
        },
      ],
    };
  }

  async getGeneralDirectorSummary(): Promise<GeneralDirectorSummary> {
    return {
      totalUsers: 120,
      totalApplicants: 200,
      totalResearchCases: 30,
      casesByStage: {
        SOURCES: 10,
        EXPLANATION: 10,
        PRESCRIPTION: 5,
        SCENARIO: 5,
      },
      completedScenariosCount: 5,
      activeSupervisorsCount: 12,
    };
  }

  async getWorkflowMetrics(): Promise<WorkflowMetrics> {
    return {
      averageStageCompletionDays: {
        SOURCES: 14,
        EXPLANATION: 21,
        PRESCRIPTION: 14,
        SCENARIO: 7,
      },
      rollbackFrequencyByStage: {
        SOURCES: 1,
        EXPLANATION: 2,
        PRESCRIPTION: 0,
        SCENARIO: 0,
      },
    };
  }
}

describe("ReportingService Dashboards (FR-026, FR-027, FR-028, FR-031, AT-09, AT-11, AT-15, AT-24)", () => {
  let repo: MockReportingRepository;
  let service: ReportingService;

  beforeEach(() => {
    repo = new MockReportingRepository();
    service = new ReportingService(repo);
  });

  it("retrieves provincial director metrics (FR-026, AT-09)", async () => {
    const metrics = await service.getProvincialDirectorMetrics("tehran");
    expect(metrics.provinceId).toBe("tehran");
    expect(metrics.totalApplicants).toBe(50);
    expect(metrics.totalInterns).toBe(10);
  });

  it("retrieves supervisor worklist (FR-027, AT-11)", async () => {
    const worklist = await service.getSupervisorWorklist(
      "00000000-0000-0000-0000-000000000001",
    );
    expect(worklist.pendingStageSubmissions).toBe(2);
    expect(worklist.items).toHaveLength(1);
    expect(worklist.items[0]?.caseCode).toBe("CASE-01");
  });

  it("retrieves tracking director backlog (FR-028, AT-15, AT-21)", async () => {
    const backlog = await service.getTrackingDirectorBacklog();
    expect(backlog.reviewRequiredCasesCount).toBe(1);
    expect(backlog.backlogItems[0]?.status).toBe("REVIEW_REQUIRED");
  });

  it("retrieves general director summary and workflow metrics (FR-031, AT-24)", async () => {
    const summary = await service.getGeneralDirectorSummary();
    expect(summary.totalResearchCases).toBe(30);
    expect(summary.activeSupervisorsCount).toBe(12);

    const metrics = await service.getWorkflowMetrics();
    expect(metrics.averageStageCompletionDays["EXPLANATION"]).toBe(21);
    expect(metrics.rollbackFrequencyByStage["EXPLANATION"]).toBe(2);
  });
});

