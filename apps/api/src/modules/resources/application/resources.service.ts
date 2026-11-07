import { Injectable, Inject } from "@nestjs/common";
import type {
  CreateResourceDto,
  CreateInterviewDto,
  CreateInterviewReportDto,
} from "@tstaff/contracts";
import { Resource } from "../domain/resource.entity.js";
import { Interview } from "../domain/interview.entity.js";
import { InterviewReport } from "../domain/interview-report.entity.js";
import {
  ResourceNotFoundError,
  InterviewNotFoundError,
  InterviewAlreadyExistsForResourceError,
  IncompleteSourcesStageError,
} from "../domain/resource-errors.js";
import type { ResourceRepositoryPort } from "./ports/resource.repository.port.js";

export const RESOURCE_REPOSITORY = Symbol("RESOURCE_REPOSITORY");

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: ResourceRepositoryPort,
  ) {}

  async createResource(
    caseId: string,
    dto: CreateResourceDto,
  ): Promise<Resource> {
    const resource = Resource.create({
      id: crypto.randomUUID(),
      researchCaseId: caseId,
      type: dto.type,
      title: dto.title,
      description: dto.description ?? null,
      contactInfo: dto.contactInfo ?? null,
    });

    await this.resourceRepo.createResource(resource);
    return resource;
  }

  async createInterview(
    resourceId: string,
    dto: CreateInterviewDto,
  ): Promise<Interview> {
    const resource = await this.resourceRepo.findResourceById(resourceId);
    if (!resource) {
      throw new ResourceNotFoundError(resourceId);
    }

    const existingInterview =
      await this.resourceRepo.findInterviewByResourceId(resourceId);
    if (existingInterview || resource.interviewId !== null) {
      throw new InterviewAlreadyExistsForResourceError(resourceId);
    }

    const interview = Interview.create({
      id: crypto.randomUUID(),
      resourceId,
      intervieweeName: dto.intervieweeName,
      intervieweeAge: dto.intervieweeAge ?? null,
      conductedAt:
        typeof dto.conductedAt === "string"
          ? new Date(dto.conductedAt)
          : dto.conductedAt,
    });

    await this.resourceRepo.createInterview(interview);

    const updatedResource = resource.attachInterview(interview.id);
    await this.resourceRepo.saveResource(updatedResource);

    return interview;
  }

  async createReport(
    interviewId: string,
    dto: CreateInterviewReportDto,
  ): Promise<InterviewReport> {
    const interview = await this.resourceRepo.findInterviewById(interviewId);
    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    const report = InterviewReport.create({
      id: crypto.randomUUID(),
      interviewId,
      title: dto.title,
      content: dto.content,
    });

    await this.resourceRepo.createReport(report);
    return report;
  }

  async getResourcesByCaseId(caseId: string): Promise<Resource[]> {
    return this.resourceRepo.findResourcesByCaseId(caseId);
  }

  async getInterviewByResourceId(
    resourceId: string,
  ): Promise<Interview | null> {
    return this.resourceRepo.findInterviewByResourceId(resourceId);
  }

  /**
   * Rule D-07 / FR-058 / AT-30:
   * In order to complete the SOURCES stage, each resource must have:
   * 1. Exactly one registered interview
   * 2. At least one versioned written report
   */
  async assertSourcesStageCompleteness(
    caseId: string,
  ): Promise<{ isComplete: boolean; totalResources: number }> {
    const resources = await this.resourceRepo.findResourcesByCaseId(caseId);
    if (resources.length === 0) {
      throw new IncompleteSourcesStageError(
        "هیچ منبعی برای پرونده ثبت نشده است",
      );
    }

    const missingDetails: string[] = [];

    for (const res of resources) {
      const interview = await this.resourceRepo.findInterviewByResourceId(
        res.id,
      );
      if (!interview) {
        missingDetails.push(`منبع «${res.title}» فاقد مصاحبه است`);
        continue;
      }

      const reports = await this.resourceRepo.findReportsByInterviewId(
        interview.id,
      );
      if (reports.length === 0) {
        missingDetails.push(
          `مصاحبه برای منبع «${res.title}» فاقد گزارش مکتوب است`,
        );
      }
    }

    if (missingDetails.length > 0) {
      throw new IncompleteSourcesStageError(missingDetails.join("; "));
    }

    return {
      isComplete: true,
      totalResources: resources.length,
    };
  }
}
