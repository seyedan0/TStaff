import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import type { OrganizationRepositoryPort } from "../application/ports/organization.repository.port.js";

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  provinces() { return this.prisma.province.findMany({ orderBy: { name: "asc" } }); }
  async provinceIds(managerId: string) {
    return (await this.prisma.provincialScope.findMany({ where: { managerId, revokedAt: null }, select: { provinceId: true } })).map((row) => row.provinceId);
  }
  async hasUserGrant(managerId: string, userId: string) {
    return !!(await this.prisma.userManagerGrant.findFirst({ where: { managerId, userId, revokedAt: null } }));
  }
  async setProvinceScope(managerId: string, provinceId: string, actorId: string, active: boolean) {
    await this.prisma.provincialScope.upsert({
      where: { managerId_provinceId: { managerId, provinceId } },
      create: { managerId, provinceId, assignedById: actorId, revokedAt: active ? null : new Date() },
      update: { assignedById: actorId, assignedAt: new Date(), revokedAt: active ? null : new Date() },
    });
  }
  async setUserGrant(managerId: string, userId: string, actorId: string, active: boolean) {
    await this.prisma.userManagerGrant.upsert({
      where: { managerId_userId: { managerId, userId } },
      create: { managerId, userId, assignedById: actorId, revokedAt: active ? null : new Date() },
      update: { assignedById: actorId, assignedAt: new Date(), revokedAt: active ? null : new Date() },
    });
  }
  scopes(managerId?: string) {
    return this.prisma.provincialScope.findMany({ where: managerId ? { managerId } : {}, orderBy: { assignedAt: "desc" } });
  }
  userGrants(managerId?: string) {
    return this.prisma.userManagerGrant.findMany({
      where: { ...(managerId ? { managerId } : {}), revokedAt: null },
      orderBy: { assignedAt: "desc" },
    });
  }
}
