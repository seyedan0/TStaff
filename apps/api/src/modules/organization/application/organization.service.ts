import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import { ORGANIZATION_REPOSITORY, type OrganizationRepositoryPort } from "./ports/organization.repository.port.js";
import { AuditService } from "../../audit/application/audit.service.js";
import { TRANSACTION_RUNNER, type TransactionRunner } from "../../../platform/transactions/transaction-runner.js";

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY) private readonly repository: OrganizationRepositoryPort,
    private readonly audit: AuditService,
    @Optional() @Inject(TRANSACTION_RUNNER) private readonly transactions?: TransactionRunner,
  ) {}
  provinces() { return this.repository.provinces(); }
  provinceIds(managerId: string) { return this.repository.provinceIds(managerId); }
  scopes(managerId?: string) { return this.repository.scopes(managerId); }
  hasUserGrant(managerId: string, userId: string) { return this.repository.hasUserGrant(managerId, userId); }
  async canAccessProvince(managerId: string, provinceId: string | null) {
    return !!provinceId && (await this.provinceIds(managerId)).includes(provinceId);
  }
  async resolveProvinceId(name: string | null): Promise<string | null> {
    if (!name) return null;
    const normalize = (value: string) => value.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌]+/g, "").replace(/^استان/, "");
    return (await this.provinces()).find((province) => province.id === name || normalize(province.name) === normalize(name))?.id ?? null;
  }
  async setProvinceScope(managerId: string, provinceId: string, actorId: string, active: boolean) {
    if (!(await this.provinces()).some((province) => province.id === provinceId)) throw new BadRequestException("استان معتبر نیست");
    return this.atomic(async () => {
      await this.repository.setProvinceScope(managerId, provinceId, actorId, active);
      await this.audit.recordEvent({ aggregateType: "ProvincialScope", aggregateId: managerId, actorId, action: active ? "SCOPE_ASSIGNED" : "SCOPE_REVOKED", payload: { provinceId } });
    });
  }
  async setUserGrant(managerId: string, userId: string, actorId: string, active: boolean) {
    return this.atomic(async () => {
      await this.repository.setUserGrant(managerId, userId, actorId, active);
      await this.audit.recordEvent({ aggregateType: "UserManagerGrant", aggregateId: userId, actorId, action: active ? "USER_GRANT_ASSIGNED" : "USER_GRANT_REVOKED", payload: { managerId } });
    });
  }
  private atomic<T>(operation: () => Promise<T>) { return this.transactions ? this.transactions.run(operation) : operation(); }
}
