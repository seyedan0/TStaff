import { Injectable, Inject } from "@nestjs/common";
import type {
  ProvincialDirectorMetrics,
  SupervisorWorklist,
  TrackingDirectorBacklog,
  GeneralDirectorSummary,
  WorkflowMetrics,
} from "@tstaff/contracts";
import type { ReportingRepositoryPort } from "./ports/reporting.repository.port.js";

export const REPORTING_REPOSITORY = Symbol("REPORTING_REPOSITORY");

@Injectable()
export class ReportingService {
  constructor(
    @Inject(REPORTING_REPOSITORY)
    private readonly reportingRepo: ReportingRepositoryPort,
  ) {}

  /**
   * Rule FR-026 / AT-09: Provincial Director Metrics Dashboard
   */
  async getProvincialDirectorMetrics(
    provinceId?: string,
  ): Promise<ProvincialDirectorMetrics> {
    return this.reportingRepo.getProvincialDirectorMetrics(provinceId);
  }

  /**
   * Rule FR-027 / AT-11: Supervisor Operational Worklist
   */
  async getSupervisorWorklist(
    supervisorId: string,
  ): Promise<SupervisorWorklist> {
    return this.reportingRepo.getSupervisorWorklist(supervisorId);
  }

  /**
   * Rule FR-028 / AT-15 / AT-21: Tracking Director Backlog & Stalled Cases
   */
  async getTrackingDirectorBacklog(): Promise<TrackingDirectorBacklog> {
    return this.reportingRepo.getTrackingDirectorBacklog();
  }

  /**
   * Rule FR-031 / AT-24: General Director Strategic Overview & KPIs
   */
  async getGeneralDirectorSummary(): Promise<GeneralDirectorSummary> {
    return this.reportingRepo.getGeneralDirectorSummary();
  }

  /**
   * Workflow Engine Analytical Metrics
   */
  async getWorkflowMetrics(): Promise<WorkflowMetrics> {
    return this.reportingRepo.getWorkflowMetrics();
  }
}

