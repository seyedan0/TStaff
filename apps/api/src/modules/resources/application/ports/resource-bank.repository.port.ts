import type { ResourceBankItem, ResourceBankPage, ResourceBankQuery } from "@tstaff/contracts";
export const RESOURCE_BANK_REPOSITORY = Symbol("RESOURCE_BANK_REPOSITORY");
export interface BankScope { actorId: string; nationwide: boolean; provinceIds: string[] }
export interface ReferralRecord { id: string; resourceId: string; recipientId: string; status: string; applicantId: string | null; revokedAt: Date | null }
export interface ResourceBankRepositoryPort {
  list(scope: BankScope, query: ResourceBankQuery): Promise<ResourceBankPage>;
  find(id: string, scope: BankScope): Promise<ResourceBankItem | null>;
  refer(resourceId: string, recipientId: string, actorId: string, snapshot: ResourceBankItem, notes?: string): Promise<ReferralRecord>;
  findReferral(resourceId: string, recipientId: string): Promise<ReferralRecord | null>;
  hasActiveConversion(resourceId: string): Promise<{ referralId: string; applicantId: string | null } | null>;
  referral(id: string): Promise<ReferralRecord | null>;
  claimConversion(id: string): Promise<boolean>;
  completeConversion(id: string, applicantId: string): Promise<void>;
  revoke(id: string): Promise<void>;
  hasApplicantReferral(recipientId: string, applicantId: string): Promise<boolean>;
}
