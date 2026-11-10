import { Injectable } from "@nestjs/common";
import { PrismaService, type Prisma } from "@tstaff/database";
import type { ResourceBankItem, ResourceBankQuery } from "@tstaff/contracts";
import type { BankScope, ResourceBankRepositoryPort } from "../application/ports/resource-bank.repository.port.js";

const selection = {
  id: true, title: true, personAge: true, position: true, contactInfo: true,
  provinceId: true, province: true, county: true, createdAt: true,
  organization: { select: { name: true, educationLevel: true, organizationType: true } },
  referrals: { select: { id: true, recipientId: true, status: true, applicantId: true, createdAt: true, revokedAt: true } },
} satisfies Prisma.ResourceSelect;
type BankRow = Prisma.ResourceGetPayload<{ select: typeof selection }>;

@Injectable()
export class PrismaResourceBankRepository implements ResourceBankRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  async list(scope: BankScope, query: ResourceBankQuery) {
    const where: Prisma.ResourceWhereInput = { AND: [this.access(scope),
      ...(query.provinceId ? [{ provinceId: query.provinceId }] : []),
      ...(query.q ? [{ OR: ["title", "contactInfo", "position"].map((field) => ({ [field]: { contains: query.q, mode: "insensitive" } })) }] : []),
    ] };
    const [rows, total] = await Promise.all([
      this.prisma.resource.findMany({ where, select: selection, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.resource.count({ where }),
    ]);
    return { items: rows.map((row) => this.dto(row, scope)), total, page: query.page, limit: query.limit };
  }
  async find(id: string, scope: BankScope) {
    const row = await this.prisma.resource.findFirst({ where: { AND: [{ id }, this.access(scope)] }, select: selection });
    return row ? this.dto(row, scope) : null;
  }
  refer(resourceId: string, recipientId: string, actorId: string, snapshot: ResourceBankItem, notes?: string) {
    return this.prisma.resourceReferral.upsert({
      where: { resourceId_recipientId: { resourceId, recipientId } },
      create: { resourceId, recipientId, referredById: actorId, snapshot: JSON.parse(JSON.stringify({ ...snapshot, referrals: [] })), ...(notes ? { notes } : {}) },
      update: {},
    });
  }
  referral(id: string) { return this.prisma.resourceReferral.findUnique({ where: { id } }); }
  async claimConversion(id: string) {
    const updated = await this.prisma.resourceReferral.updateMany({ where: { id, status: "PENDING", revokedAt: null, applicantId: null }, data: { status: "CONVERTING" } });
    return updated.count === 1;
  }
  async completeConversion(id: string, applicantId: string) {
    await this.prisma.resourceReferral.update({ where: { id }, data: { status: "CONVERTED", applicantId } });
  }
  async revoke(id: string) {
    await this.prisma.resourceReferral.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date() } });
  }
  async hasApplicantReferral(recipientId: string, applicantId: string) {
    return !!(await this.prisma.resourceReferral.findFirst({ where: { recipientId, applicantId, revokedAt: null } }));
  }
  private access(scope: BankScope): Prisma.ResourceWhereInput {
    return scope.nationwide ? {} : { OR: [
      { provinceId: { in: scope.provinceIds } },
      { referrals: { some: { recipientId: scope.actorId, revokedAt: null } } },
    ] };
  }
  private dto(row: BankRow, scope: BankScope): ResourceBankItem {
    return {
      id: row.id, fullName: row.title, age: row.personAge, position: row.position, contactInfo: row.contactInfo,
      provinceId: row.provinceId, province: row.province, county: row.county, organization: row.organization,
      referrals: row.referrals.filter((referral) => !referral.revokedAt && (scope.nationwide || referral.recipientId === scope.actorId)).map(({ id, recipientId, status, applicantId, createdAt }) => ({ id, recipientId, status, applicantId, createdAt: createdAt.toISOString() })),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
