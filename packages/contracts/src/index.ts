import { z, ZodError } from "zod";

export { z, ZodError };

/**
 * Standard RFC 7807 Problem Details Error Contract
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  code: z.string(),
  detail: z.string(),
  traceId: z.string(),
  currentVersion: z.number().int().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

/**
 * Rule D-01 / FR-056: Age is strictly a positive integer, not derived from birthdate
 */
export const IntegerAgeSchema = z
  .number()
  .int("سن باید یک عدد صحیح باشد")
  .positive("سن باید عددی مثبت باشد")
  .max(120, "سن معتبر نیست");
export type IntegerAge = z.infer<typeof IntegerAgeSchema>;

/**
 * Common Pagination Contract
 */
export const CursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CursorPaginationQuery = z.infer<typeof CursorPaginationQuerySchema>;

/**
 * Concurrency Review Decision Request Contract (Compare-and-Swap)
 */
export const ReviewDecisionRequestSchema = z.object({
  submissionId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  reason: z.string().min(5, "ذکر دلیل داوری الزامی است"),
  idempotencyKey: z.string().min(10),
});
export type ReviewDecisionRequest = z.infer<typeof ReviewDecisionRequestSchema>;

/**
 * Health Check API Response Contract (M1 Baseline)
 */
export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  timestamp: z.string().datetime(),
  uptime: z.number().nonnegative(),
  version: z.string(),
  database: z.enum(["connected", "disconnected", "disabled"]),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/**
 * M2: Admission & Identity Contracts
 */
export const ApplicantStatusSchema = z.enum([
  "PENDING",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
  "REOPEN_REQUESTED",
]);
export type ApplicantStatus = z.infer<typeof ApplicantStatusSchema>;

export const CreateApplicantDtoSchema = z.object({
  fullName: z.string().min(3, "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد"),
  nationalId: z.string().regex(/^\d{10}$/, "کد ملی باید دقیقاً ۱۰ رقم باشد"),
  phoneNumber: z
    .string()
    .regex(/^09\d{9}$/, "شماره همراه باید با 09 آغاز شده و ۱۱ رقم باشد"),
  age: IntegerAgeSchema,
  provinceId: z.string().uuid("شناسه استان نامعتبر است"),
  education: z.string().min(2, "مقطع تحصیلی الزامی است"),
  fieldOfStudy: z.string().min(2, "رشته تحصیلی الزامی است"),
  notes: z.string().optional(),
});
export type CreateApplicantDto = z.infer<typeof CreateApplicantDtoSchema>;

export const ReviewApplicantDecisionDtoSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().optional(),
});
export type ReviewApplicantDecisionDto = z.infer<
  typeof ReviewApplicantDecisionDtoSchema
>;

export const ApplicantReopenRequestDtoSchema = z.object({
  reason: z
    .string()
    .min(10, "دلیل درخواست بازگشایی باید حداقل ۱۰ کاراکتر باشد"),
});
export type ApplicantReopenRequestDto = z.infer<
  typeof ApplicantReopenRequestDtoSchema
>;

export const LoginDtoSchema = z.object({
  phoneNumber: z.string().regex(/^09\d{9}$/, "شماره همراه معتبر نیست"),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
});
export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const UserStageSchema = z.enum(["APPRENTICE", "INTERN"]);
export type UserStage = z.infer<typeof UserStageSchema>;

export const PromoteToInternDtoSchema = z.object({
  evaluationNotes: z.string().min(5, "ثبت توضیحات ارزیابی الزامی است"),
});
export type PromoteToInternDto = z.infer<typeof PromoteToInternDtoSchema>;
