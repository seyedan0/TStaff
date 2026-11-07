import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { Resource } from "../domain/resource.entity.js";
import { Interview } from "../domain/interview.entity.js";
import { InterviewReport } from "../domain/interview-report.entity.js";
import type { ResourceRepositoryPort } from "../application/ports/resource.repository.port.js";

@Injectable()
export class PrismaResourceRepository implements ResourceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createResource(resource: Resource): Promise<void> {
    await this.prisma.resource.create({
      data: {
        id: resource.id,
        researchCaseId: resource.researchCaseId,
        type: resource.type as any,
        title: resource.title,
        description: resource.description,
        contactInfo: resource.contactInfo,
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
        status: interview.status as any,
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
        version: report.version,
        title: report.title,
        content: report.content,
        status: report.status as any,
      },
    });
  }

  async findReportsByInterviewId(
    interviewId: string,
  ): Promise<InterviewReport[]> {
    const raw = await this.prisma.interviewReport.findMany({
      where: { interviewId },
    });

    return raw.map((r) =>
      InterviewReport.reconstruct({
        id: r.id,
        interviewId: r.interviewId,
        version: r.version,
        title: r.title ?? "",
        content: r.content,
        status: r.status as any,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
  }
}
