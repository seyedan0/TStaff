import type {
  ProvincialDirectorMetrics,
  SupervisorWorklist,
  TrackingDirectorBacklog,
  GeneralDirectorSummary,
  WorkflowMetrics,
  SupervisorHealth,
} from "@tstaff/contracts";

export interface ReportingRepositoryPort {
  getProvincialDirectorMetrics(
    provinceId?: string,
  ): Promise<ProvincialDirectorMetrics>;
  getSupervisorWorklist(supervisorId: string): Promise<SupervisorWorklist>;
  getTrackingDirectorBacklog(): Promise<TrackingDirectorBacklog>;
  getGeneralDirectorSummary(): Promise<GeneralDirectorSummary>;
  getWorkflowMetrics(): Promise<WorkflowMetrics>;
  getSupervisorHealth(): Promise<SupervisorHealth>;
}
