import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { provinceIdFromName } from "@tstaff/contracts";
import { Resource } from "../domain/resource.entity.js";
import { Interview } from "../domain/interview.entity.js";
import { InterviewReport } from "../domain/interview-report.entity.js";
import type { ResourceRepositoryPort } from "../application/ports/resource.repository.port.js";

@Injectable()
export class PrismaResourceRepository implements ResourceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  async findFileCaseIds(fileId: string): Promise<string[]> {
    const reports = await this.prisma.interviewReport.findMany({ where: { storedObjectId: fileId }, select: { interview: { select: { resource: { select: { researchCaseId: true } } } } } });
    return [...new Set(reports.map((report) => report.interview.resource.researchCaseId))];
  }

  async saveOrganization(resourceId: string, data: { name: string; educationLevel?: string; organizationType?: string; description?: string }): Promise<void> {
    await this.prisma.resourceOrganization.upsert({
      where: { resourceId },
      create: { resourceId, ...data },
      update: data,
    });
  }

  async findOrganizationByResourceId(resourceId: string) {
    return this.prisma.resourceOrganization.findUnique({ where: { resourceId } });
  }

  async createResource(resource: Resource): Promise<void> {
    await this.prisma.resource.create({
      data: {
        id: resource.id,
        researchCaseId: resource.researchCaseId,
        type: resource.type as any,
        title: resource.title,
        description: resource.description,
        contactInfo: resource.contactInfo,
        personAge: resource.toJSON().personAge,
        position: resource.toJSON().position,
        province: resource.toJSON().province,
        provinceId: provinceIdFromName(resource.toJSON().province),
        county: resource.toJSON().county,
        status: resource.status as any,
      },
    });
  }

  async findResourceById(id: string): Promise<Resource | null> {
    const raw = await this.prisma.resource.findUnique({
      where: { id },
      include: { interview: true },
    });
    if (!raw) return null;

    return Resource.reconstruct({
      id: raw.id,
      researchCaseId: raw.researchCaseId,
      type: raw.type as any,
      title: raw.title,
      description: raw.description,
      contactInfo: raw.contactInfo,
      personAge: raw.personAge,
      position: raw.position,
      province: raw.province,
      county: raw.county,
      status: raw.status as any,
      interviewId: raw.interview?.id ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findResourcesByCaseId(caseId: string): Promise<Resource[]> {
    const raw = await this.prisma.resource.findMany({
      where: { researchCaseId: caseId },
      include: { interview: true },
    });

    return raw.map((r) =>
      Resource.reconstruct({
        id: r.id,
        researchCaseId: r.researchCaseId,
        type: r.type as any,
        title: r.title ?? "",
        description: r.description,
        contactInfo: r.contactInfo,
        personAge: r.personAge,
        position: r.position,
        province: r.province,
        county: r.county,
        status: r.status as any,
        interviewId: r.interview?.id ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
  }

  async saveResource(resource: Resource): Promise<void> {
    await this.prisma.resource.update({
      where: { id: resource.id },
      data: {
        status: resource.status as any,
        title: resource.title,
        description: resource.description,
        contactInfo: resource.contactInfo,
        personAge: resource.toJSON().personAge,
        position: resource.toJSON().position,
        province: resource.toJSON().province,
        provinceId: provinceIdFromName(resource.toJSON().province),
        county: resource.toJSON().county,
      },
    });
  }

  async createInterview(interview: Interview): Promise<void> {
    await this.prisma.interview.create({
      data: {
        id: interview.id,
        resourceId: interview.resourceId,
        intervieweeName: interview.intervieweeName,
        intervieweeAge: interview.intervieweeAge,
        conductedAt: interview.conductedAt,
        durationMinutes: interview.toJSON().durationMinutes,
        mode: interview.toJSON().mode,
        location: interview.toJSON().location,
        notes: interview.toJSON().notes,
        status: interview.status as any,
      },
    });
  }

  async saveInterview(interview: Interview): Promise<void> {
    const data = interview.toJSON();
    await this.prisma.interview.update({
      where: { id: interview.id },
      data: {
        intervieweeName: data.intervieweeName,
        intervieweeAge: data.intervieweeAge,
        conductedAt: new Date(data.conductedAt),
        durationMinutes: data.durationMinutes,
        mode: data.mode,
        location: data.location,
        notes: data.notes,
      },
    });
  }

  async findInterviewByResourceId(
    resourceId: string,
  ): Promise<Interview | null> {
    const raw = await this.prisma.interview.findUnique({
      where: { resourceId },
    });
    if (!raw) return null;

    return Interview.reconstruct({
      id: raw.id,
      resourceId: raw.resourceId,
      intervieweeName: raw.intervieweeName,
      intervieweeAge: raw.intervieweeAge,
      conductedAt: raw.conductedAt,
      durationMinutes: raw.durationMinutes,
      mode: raw.mode,
      location: raw.location,
      notes: raw.notes,
      status: raw.status as any,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findInterviewById(id: string): Promise<Interview | null> {
    const raw = await this.prisma.interview.findUnique({
      where: { id },
    });
    if (!raw) return null;

    return Interview.reconstruct({
      id: raw.id,
      resourceId: raw.resourceId,
      intervieweeName: raw.intervieweeName,
      intervieweeAge: raw.intervieweeAge,
      conductedAt: raw.conductedAt,
      durationMinutes: raw.durationMinutes,
      mode: raw.mode,
      location: raw.location,
      notes: raw.notes,
      status: raw.status as any,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async createReport(report: InterviewReport): Promise<void> {
    await this.prisma.interviewReport.create({
      data: {
        id: report.id,
        interviewId: report.interviewId,
        authorId: report.toJSON().authorId,
        version: report.version,
        title: report.title,
        content: report.content,
        storedObjectId: report.toJSON().storedObjectId,
        status: report.status as any,
      },
    });
  }

  async findReportsByInterviewId(
    interviewId: string,
  ): Promise<InterviewReport[]> {
    const raw = await this.prisma.interviewReport.findMany({
      where: { interviewId },
      orderBy: { version: "asc" },
    });

    return raw.map((r) =>
      InterviewReport.reconstruct({
        id: r.id,
        interviewId: r.interviewId,
        authorId: r.authorId,
        version: r.version,
        title: r.title ?? "",
        content: r.content,
        storedObjectId: r.storedObjectId,
        status: r.status as any,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
  }
}
