import { ConflictException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type { CreateApplicantDto, ResourceBankQuery } from "@tstaff/contracts";
import { RESOURCE_BANK_REPOSITORY, type ResourceBankRepositoryPort } from "./ports/resource-bank.repository.port.js";
import { OrganizationService } from "../../organization/application/organization.service.js";
import { ApplicantsService } from "../../applicants/application/applicants.service.js";
import { AuditService } from "../../audit/application/audit.service.js";
import { TRANSACTION_RUNNER, type TransactionRunner } from "../../../platform/transactions/transaction-runner.js";

export interface BankActor { id: string; roles: string[] }
@Injectable()
export class ResourceBankService {
  constructor(
    @Inject(RESOURCE_BANK_REPOSITORY) private readonly repository: ResourceBankRepositoryPort,
    @Inject(OrganizationService) private readonly organization: OrganizationService,
    @Inject(forwardRef(() => ApplicantsService)) private readonly applicants: ApplicantsService,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
    @Optional() @Inject(TRANSACTION_RUNNER) private readonly transactions?: TransactionRunner,
  ) {}
  async list(actor: BankActor, query: ResourceBankQuery) { return this.repository.list(await this.scope(actor), query); }
  async get(id: string, actor: BankActor) {
    const item = await this.repository.find(id, await this.scope(actor));
    if (!item) throw new NotFoundException("منبع در محدوده دسترسی یافت نشد");
    return item;
  }
  async refer(id: string, recipientId: string, actor: BankActor, notes?: string) {
    if (!actor.roles.includes("TRACKING_DIRECTOR")) throw new ForbiddenException("ارجاع بین‌استانی فقط برای مدیر پیگیری مجاز است");
    const source = await this.get(id, actor);
    return this.runTx(async () => {
      if (await this.repository.hasActiveConversion(id)) {
        throw new ConflictException("این منبع قبلاً به پرونده متقاضی تبدیل شده است");
      }
      const existing = await this.repository.findReferral(id, recipientId);
      if (existing) {
        if (existing.revokedAt) throw new ConflictException("ارجاع قبلی لغو شده است؛ ابتدا دامنه دسترسی را بررسی کنید");
        throw new ConflictException("این منبع قبلاً به این مدیر ارجاع شده است");
      }
      const referral = await this.repository.refer(id, recipientId, actor.id, source, notes);
      if (referral.revokedAt) throw new ConflictException("ارجاع قبلی لغو شده است؛ ابتدا دامنه دسترسی را بررسی کنید");
      await this.audit?.recordEvent({ aggregateType: "ResourceReferral", aggregateId: referral.id, actorId: actor.id, action: "RESOURCE_REFERRED", payload: { resourceId: id, recipientId } });
      return referral;
    });
  }
  async revokeReferral(id: string, actor: BankActor) {
    if (!actor.roles.includes("TRACKING_DIRECTOR")) throw new ForbiddenException();
    const referral = await this.repository.referral(id);
    if (!referral) throw new NotFoundException();
    await this.runTx(async () => {
      await this.repository.revoke(id);
      await this.audit?.recordEvent({ aggregateType: "ResourceReferral", aggregateId: id, actorId: actor.id, action: "RESOURCE_REFERRAL_REVOKED", payload: { recipientId: referral.recipientId } });
    });
  }
  async createApplicant(id: string, dto: CreateApplicantDto, actor: BankActor) {
    if (!actor.roles.includes("PROVINCIAL_DIRECTOR")) throw new ForbiddenException("ثبت پذیرش بر عهده مدیر استانی است");
    const source = await this.get(id, actor);
    if (!(await this.organization.canAccessProvince(actor.id, dto.provinceId)) && dto.provinceId !== source.provinceId) throw new ForbiddenException("استان پذیرش در محدوده مجاز نیست");
    return this.runTx(async () => {
      const activeConversion = await this.repository.hasActiveConversion(id);
      const referral = await this.repository.refer(id, actor.id, actor.id, source);
      if (referral.revokedAt) throw new ForbiddenException("ارجاع لغو شده است");
      if (activeConversion && activeConversion.referralId !== referral.id) {
        throw new ConflictException("این منبع قبلاً به پرونده متقاضی تبدیل شده است");
      }
      if (referral.applicantId) return this.applicants.getById(referral.applicantId).then((applicant) => applicant.toJSON());
      if (!(await this.repository.claimConversion(referral.id))) throw new ConflictException("ثبت این معرفی در حال انجام است");
      const applicant = await this.applicants.createDraft(dto, actor.id);
      await this.repository.completeConversion(referral.id, applicant.id);
      await this.audit?.recordEvent({ aggregateType: "ResourceReferral", aggregateId: referral.id, actorId: actor.id, action: "REFERRAL_APPLICANT_CREATED", payload: { applicantId: applicant.id, resourceId: id } });
      return applicant.toJSON();
    });
  }
  private runTx<T>(op: () => Promise<T>) { return this.transactions ? this.transactions.run(op) : op(); }
  canReadApplicant(managerId: string, applicantId: string) { return this.repository.hasApplicantReferral(managerId, applicantId); }
  private async scope(actor: BankActor) {
    const nationwide = actor.roles.includes("TRACKING_DIRECTOR");
    if (!nationwide && !actor.roles.includes("PROVINCIAL_DIRECTOR")) throw new ForbiddenException("دسترسی به بانک منابع مجاز نیست");
    return { actorId: actor.id, nationwide, provinceIds: nationwide ? [] : await this.organization.provinceIds(actor.id) };
  }
}
