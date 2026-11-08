import { Resource } from "../../domain/resource.entity.js";
import { Interview } from "../../domain/interview.entity.js";
import { InterviewReport } from "../../domain/interview-report.entity.js";

export interface ResourceRepositoryPort {
  createResource(resource: Resource): Promise<void>;
  findResourceById(id: string): Promise<Resource | null>;
  findResourcesByCaseId(caseId: string): Promise<Resource[]>;
  saveResource(resource: Resource): Promise<void>;
  saveOrganization?(resourceId: string, data: { name: string; educationLevel?: string; organizationType?: string; description?: string }): Promise<void>;
  findOrganizationByResourceId?(resourceId: string): Promise<{ name: string; educationLevel: string | null; organizationType: string | null; description: string | null } | null>;

  createInterview(interview: Interview): Promise<void>;
  saveInterview(interview: Interview): Promise<void>;
  findInterviewByResourceId(resourceId: string): Promise<Interview | null>;
  findInterviewById(id: string): Promise<Interview | null>;

  createReport(report: InterviewReport): Promise<void>;
  findReportsByInterviewId(interviewId: string): Promise<InterviewReport[]>;
}
