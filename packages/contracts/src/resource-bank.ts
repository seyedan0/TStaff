import { z } from "zod";
export const ProvinceDtoSchema = z.object({ id: z.string().uuid(), name: z.string() });
export type ProvinceDto = z.infer<typeof ProvinceDtoSchema>;
export const ResourceBankQuerySchema = z.object({
  q: z.string().trim().max(120).optional(), provinceId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ResourceBankQuery = z.infer<typeof ResourceBankQuerySchema>;
export const ResourceBankItemSchema = z.object({
  id: z.string(), fullName: z.string(), age: z.number().int().positive().nullable(),
  position: z.string().nullable(), contactInfo: z.string().nullable(),
  provinceId: z.string().nullable(), province: z.string().nullable(), county: z.string().nullable(),
  organization: z.object({ name: z.string(), educationLevel: z.string().nullable(), organizationType: z.string().nullable() }).nullable(),
  referrals: z.array(z.object({ id: z.string(), recipientId: z.string(), status: z.string(), applicantId: z.string().nullable(), createdAt: z.string() })),
  createdAt: z.string(),
});
export type ResourceBankItem = z.infer<typeof ResourceBankItemSchema>;
export type ResourceBankPage = { items: ResourceBankItem[]; total: number; page: number; limit: number };
export const CreateResourceReferralDtoSchema = z.object({ recipientId: z.string().uuid(), notes: z.string().trim().max(3000).optional() });
export const ProvinceScopeDtoSchema = z.object({ managerId: z.string().uuid(), provinceId: z.string().uuid() });
export const UserManagerGrantDtoSchema = z.object({ managerId: z.string().uuid(), userId: z.string().uuid() });
export type ProvinceScopeDto = z.infer<typeof ProvinceScopeDtoSchema>;
export type UserManagerGrantDto = z.infer<typeof UserManagerGrantDtoSchema>;
