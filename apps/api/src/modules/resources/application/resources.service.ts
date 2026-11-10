import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import {
  provinceIdFromName,
  provinceNameFromId,
  type CreateResourceDto,
  type CreateInterviewDto,
  type CreateInterviewReportDto,
  type UpdateResourceDto,
  type UpdateInterviewDto,
  type ResourceOrganizationDto,
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
import { FilesService } from "../../files/application/files.service.js";

export const RESOURCE_REPOSITORY = Symbol("RESOURCE_REPOSITORY");

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepo: ResourceRepositoryPort,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  async createResource(
    caseId: string,
    dto: CreateResourceDto,
  ): Promise<Resource> {
    if (dto.provinceId && !provinceNameFromId(dto.provinceId)) {
      throw new BadRequestException("شناسه استان معتبر نیست");
    }
    const resolvedProvinceId = dto.provinceId ?? provinceIdFromName(dto.province);
    const resolvedProvince = dto.province ?? provinceNameFromId(resolvedProvinceId);
    const resource = Resource.create({
      id: crypto.randomUUID(),
      researchCaseId: caseId,
      type: dto.type,
      title: dto.title,
      description: dto.description ?? null,
      contactInfo: dto.contactInfo ?? null,
      personAge: dto.personAge ?? null,
      position: dto.position ?? null,
      provinceId: resolvedProvinceId,
      province: resolvedProvince,
      county: dto.county ?? null,
    });

    await this.resourceRepo.createResource(resource);
    if (dto.type === "ORGANIZATION" && dto.organizationName) {
      await this.resourceRepo.saveOrganization?.(resource.id, {
        name: dto.organizationName,
        ...(dto.organizationEducationLevel ? { educationLevel: dto.organizationEducationLevel } : {}),
        ...(dto.organizationType ? { organizationType: dto.organizationType } : {}),
      });
    }
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
      intervieweeAge: dto.intervieweeAge ?? resource.toJSON().personAge ?? null,
      conductedAt:
        typeof dto.conductedAt === "string"
          ? new Date(dto.conductedAt)
          : dto.conductedAt,
      ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
      ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
      ...(dto.location !== undefined ? { location: dto.location } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });

    await this.resourceRepo.createInterview(interview);

    const updatedResource = resource.attachInterview(interview.id);
    await this.resourceRepo.saveResource(updatedResource);

    return interview;
  }

  async updateResource(resourceId: string, dto: UpdateResourceDto): Promise<Resource> {
    const resource = await this.resourceRepo.findResourceById(resourceId);
    if (!resource) throw new ResourceNotFoundError(resourceId);
    let provinceIdUpdate: string | null | undefined;
    let provinceUpdate = dto.province;
    if (dto.provinceId !== undefined) {
      const resolvedName = provinceNameFromId(dto.provinceId);
      if (!resolvedName) throw new BadRequestException("شناسه استان معتبر نیست");
      provinceIdUpdate = dto.provinceId;
      provinceUpdate = dto.province ?? resolvedName;
    } else if (dto.province !== undefined) {
      provinceIdUpdate = provinceIdFromName(dto.province);
    }
    const updated = resource.updateInfo({
      ...dto,
      ...(provinceIdUpdate !== undefined ? { provinceId: provinceIdUpdate } : {}),
      ...(provinceUpdate !== undefined ? { province: provinceUpdate } : {}),
    });
    await this.resourceRepo.saveResource(updated);
    return updated;
  }

  async updateInterview(interviewId: string, dto: UpdateInterviewDto): Promise<Interview> {
    const interview = await this.resourceRepo.findInterviewById(interviewId);
    if (!interview) throw new InterviewNotFoundError(interviewId);
    const updated = interview.updateInfo({
      ...(dto.intervieweeName !== undefined ? { intervieweeName: dto.intervieweeName } : {}),
      ...(dto.intervieweeAge !== undefined ? { intervieweeAge: dto.intervieweeAge } : {}),
      ...(dto.conductedAt !== undefined ? { conductedAt: typeof dto.conductedAt === "string" ? new Date(dto.conductedAt) : dto.conductedAt } : {}),
      ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
      ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
      ...(dto.location !== undefined ? { location: dto.location } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });
    await this.resourceRepo.saveInterview(updated);
    return updated;
  }

  async saveOrganization(resourceId: string, dto: ResourceOrganizationDto): Promise<void> {
    const resource = await this.resourceRepo.findResourceById(resourceId);
    if (!resource) throw new ResourceNotFoundError(resourceId);
    if (!this.resourceRepo.saveOrganization) throw new Error("ذخیره مجموعه پشتیبانی نمی‌شود");
    await this.resourceRepo.saveOrganization(resourceId, {
      name: dto.name,
      ...(dto.educationLevel !== undefined ? { educationLevel: dto.educationLevel } : {}),
      ...(dto.organizationType !== undefined ? { organizationType: dto.organizationType } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    });
  }

  async createReport(
    interviewId: string,
    dto: CreateInterviewReportDto,
    authorId: string,
  ): Promise<InterviewReport> {
    const interview = await this.resourceRepo.findInterviewById(interviewId);
    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }
    await this.files.assertReadyForUse(dto.fileId, authorId);

    const previousReports = await this.resourceRepo.findReportsByInterviewId(interviewId);
    const report = InterviewReport.create({
      id: crypto.randomUUID(),
      interviewId,
      authorId,
      title: dto.title,
      version: previousReports.reduce((max, item) => Math.max(max, item.version), 0) + 1,
      ...(dto.content !== undefined ? { content: dto.content } : {}),
      ...(dto.fileId !== undefined ? { storedObjectId: dto.fileId } : {}),
    });

    await this.resourceRepo.createReport(report);
    return report;
  }

  async getResourcesByCaseId(caseId: string): Promise<Resource[]> {
    return this.resourceRepo.findResourcesByCaseId(caseId);
  }
  async getFileCaseIds(fileId: string): Promise<string[]> {
    return this.resourceRepo.findFileCaseIds?.(fileId) ?? [];
  }

  async getResourceById(resourceId: string): Promise<Resource> {
    const resource = await this.resourceRepo.findResourceById(resourceId);
    if (!resource) throw new ResourceNotFoundError(resourceId);
    return resource;
  }

  async getInterviewById(interviewId: string): Promise<Interview | null> {
    return this.resourceRepo.findInterviewById(interviewId);
  }

  async getOrganizationByResourceId(resourceId: string) {
    return this.resourceRepo.findOrganizationByResourceId?.(resourceId) ?? null;
  }

  async getReportsByInterviewId(interviewId: string) {
    return this.resourceRepo.findReportsByInterviewId(interviewId);
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
      const hasScannedReport = await Promise.all(reports.map(async (report) => {
        const storedObjectId = report.toJSON().storedObjectId;
        return !!storedObjectId && this.files.isAvailable(storedObjectId);
      })).then((results) => results.some(Boolean));
      if (!hasScannedReport) {
        missingDetails.push(
          `مصاحبه برای منبع «${res.title}» فاقد گزارش مکتوبِ اسکن‌شده است`,
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
