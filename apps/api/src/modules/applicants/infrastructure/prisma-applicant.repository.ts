import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { Applicant, ApplicantStatusType } from "../domain/applicant.entity.js";
import type { ApplicantRepositoryPort } from "../application/ports/applicant.repository.port.js";

@Injectable()
export class PrismaApplicantRepository implements ApplicantRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Applicant | null> {
    const raw = await this.prisma.applicant.findUnique({
      where: { id },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Applicant | null> {
    const raw = await this.prisma.applicant.findFirst({
      where: { phoneNumber },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async findByNationalId(nationalId: string): Promise<Applicant | null> {
    const raw = await this.prisma.applicant.findFirst({
      where: { nationalId },
    });
    if (!raw) return null;
    return this.toDomain(raw);
  }

  async save(applicant: Applicant): Promise<void> {
    const data = {
      fullName: applicant.fullName,
      nationalId: applicant.nationalId || null,
      phoneNumber: applicant.phoneNumber,
      age: applicant.age,
      provinceId: applicant.provinceId ?? null,
      initialSupervisorId: applicant.initialSupervisorId ?? null,
      createdById: applicant.createdById ?? null,
      educationLevel: applicant.educationLevel ?? null,
      fieldOfStudy: applicant.fieldOfStudy ?? null,
      status: applicant.status as any,
      notes: applicant.notes ?? null,
      rejectionReason: applicant.rejectionReason ?? null,
    };

    await this.prisma.applicant.upsert({
      where: { id: applicant.id },
      create: {
        id: applicant.id,
        ...data,
      },
      update: data,
    });
  }

  async findAll(filter?: {
    provinceId?: string | undefined;
    status?: string | undefined;
  }): Promise<Applicant[]> {
    const where: any = {};
    if (filter?.provinceId) {
      where.provinceId = filter.provinceId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    const rows = await this.prisma.applicant.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(raw: any): Applicant {
    return Applicant.reconstitute({
      id: raw.id,
      fullName: raw.fullName,
      nationalId: raw.nationalId || "",
      phoneNumber: raw.phoneNumber,
      age: raw.age,
      provinceId: raw.provinceId,
      initialSupervisorId: raw.initialSupervisorId,
      createdById: raw.createdById,
      educationLevel: raw.educationLevel,
      fieldOfStudy: raw.fieldOfStudy,
      status: raw.status as ApplicantStatusType,
      notes: raw.notes,
      rejectionReason: raw.rejectionReason,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
