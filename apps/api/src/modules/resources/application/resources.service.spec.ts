import { describe, it, expect, beforeEach } from "vitest";
import { ResourcesService } from "./resources.service.js";
import { Resource } from "../domain/resource.entity.js";
import { Interview } from "../domain/interview.entity.js";
import { InterviewReport } from "../domain/interview-report.entity.js";
import {
  InterviewAlreadyExistsForResourceError,
  IncompleteSourcesStageError,
} from "../domain/resource-errors.js";
import type { ResourceRepositoryPort } from "./ports/resource.repository.port.js";

class InMemoryResourceRepository implements ResourceRepositoryPort {
  private resources: Resource[] = [];
  private interviews: Interview[] = [];
  private reports: InterviewReport[] = [];

  async createResource(resource: Resource): Promise<void> {
    this.resources.push(resource);
  }

  async findResourceById(id: string): Promise<Resource | null> {
    return this.resources.find((r) => r.id === id) || null;
  }

  async findResourcesByCaseId(caseId: string): Promise<Resource[]> {
    return this.resources.filter((r) => r.researchCaseId === caseId);
  }

  async saveResource(resource: Resource): Promise<void> {
    const idx = this.resources.findIndex((r) => r.id === resource.id);
    if (idx >= 0) this.resources[idx] = resource;
    else this.resources.push(resource);
  }

  async createInterview(interview: Interview): Promise<void> {
    this.interviews.push(interview);
  }

  async saveInterview(interview: Interview): Promise<void> {
    const index = this.interviews.findIndex((item) => item.id === interview.id);
    if (index >= 0) this.interviews[index] = interview;
  }

  async findInterviewByResourceId(
    resourceId: string,
  ): Promise<Interview | null> {
    return this.interviews.find((i) => i.resourceId === resourceId) || null;
  }

  async findInterviewById(id: string): Promise<Interview | null> {
    return this.interviews.find((i) => i.id === id) || null;
  }

  async createReport(report: InterviewReport): Promise<void> {
    this.reports.push(report);
  }

  async findReportsByInterviewId(
    interviewId: string,
  ): Promise<InterviewReport[]> {
    return this.reports.filter((r) => r.interviewId === interviewId);
  }
}

describe("ResourcesService & Strict 1:1 Interview Rule (D-07, AT-30)", () => {
  let repo: InMemoryResourceRepository;
  let service: ResourcesService;
  let reportsAvailable: boolean;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    reportsAvailable = true;
    service = new ResourcesService(repo, {
      assertReadyForUse: async () => {},
      isAvailable: async () => reportsAvailable,
    } as any);
  });

  it("creates resources and records an interview for a resource", async () => {
    const resource = await service.createResource("case-1", {
      type: "INDIVIDUAL",
      title: "دکتر صابری",
      contactInfo: "09121113355",
    });

    const interview = await service.createInterview(resource.id, {
      intervieweeName: "دکتر صابری",
      intervieweeAge: 52,
      conductedAt: new Date("2026-06-01T09:00:00.000Z"),
    });

    expect(interview.resourceId).toBe(resource.id);
    expect(interview.intervieweeAge).toBe(52);

    const fetchedInterview = await service.getInterviewByResourceId(
      resource.id,
    );
    expect(fetchedInterview?.id).toBe(interview.id);
  });

  it("strictly blocks creating a second interview for the same resource (D-07, AT-30)", async () => {
    const resource = await service.createResource("case-1", {
      type: "INDIVIDUAL",
      title: "استاد رحیمی",
    });

    await service.createInterview(resource.id, {
      intervieweeName: "استاد رحیمی",
      intervieweeAge: 40,
      conductedAt: new Date(),
    });

    // Second interview attempt must be rejected
    await expect(
      service.createInterview(resource.id, {
        intervieweeName: "استاد رحیمی (مصاحبه دوم)",
        intervieweeAge: 40,
        conductedAt: new Date(),
      }),
    ).rejects.toThrow(InterviewAlreadyExistsForResourceError);
  });

  it("validates sources stage completeness requiring 1 interview and 1 report per resource (D-07, FR-058)", async () => {
    const res1 = await service.createResource("case-1", {
      type: "INDIVIDUAL",
      title: "منبع اول",
    });
    const res2 = await service.createResource("case-1", {
      type: "LITERATURE",
      title: "منبع دوم",
    });

    // No interviews yet -> incomplete
    await expect(
      service.assertSourcesStageCompleteness("case-1"),
    ).rejects.toThrow(IncompleteSourcesStageError);

    // Add interview & report for res1 only
    const int1 = await service.createInterview(res1.id, {
      intervieweeName: "فرد اول",
      intervieweeAge: 30,
      conductedAt: new Date(),
    });
    await service.createReport(int1.id, {
      title: "گزارش منبع ۱",
      fileId: "00000000-0000-4000-8000-000000000001",
    }, "researcher-1");

    // Still missing res2 -> incomplete
    await expect(
      service.assertSourcesStageCompleteness("case-1"),
    ).rejects.toThrow(IncompleteSourcesStageError);

    // Add interview & report for res2
    const int2 = await service.createInterview(res2.id, {
      intervieweeName: "نماینده منبع ۲",
      intervieweeAge: 35,
      conductedAt: new Date(),
    });
    await service.createReport(int2.id, {
      title: "گزارش منبع ۲",
      fileId: "00000000-0000-4000-8000-000000000002",
    }, "researcher-1");

    reportsAvailable = false;
    await expect(
      service.assertSourcesStageCompleteness("case-1"),
    ).rejects.toThrow("گزارش مکتوبِ اسکن‌شده");
    reportsAvailable = true;

    // Now all resources have 1 interview and 1 report -> passes!
    const completeness = await service.assertSourcesStageCompleteness("case-1");
    expect(completeness.isComplete).toBe(true);
  });
});
