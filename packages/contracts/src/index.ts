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

/**
 * ----------------------------------------------------------------------------
 * Milestone 3: Research, Assignments & Scientific Resources
 * (D-02, D-03, D-05, D-07, FR-005 - FR-012, AT-02, AT-28, AT-29, AT-30, AT-33)
 * ----------------------------------------------------------------------------
 */

export const ResearchStatusSchema = z.enum([
  "DRAFT",
  "SOURCES_STAGE",
  "EXPLANATION_STAGE",
  "PRESCRIPTION_STAGE",
  "SCENARIO_STAGE",
  "COMPLETED",
  "SUSPENDED",
  "ARCHIVED",
]);
export type ResearchStatus = z.infer<typeof ResearchStatusSchema>;

export const AssignmentRoleSchema = z.enum([
  "MAIN_SUPERVISOR",
  "COLLABORATOR_SUPERVISOR",
  "PRIMARY_RESEARCHER",
  "ASSISTANT_RESEARCHER",
]);
export type AssignmentRole = z.infer<typeof AssignmentRoleSchema>;

export const SupervisorRoleSchema = z.enum([
  "MAIN_SUPERVISOR",
  "COLLABORATOR_SUPERVISOR",
]);
export type SupervisorRole = z.infer<typeof SupervisorRoleSchema>;

export const StageTypeSchema = z.enum([
  "SOURCES",
  "EXPLANATION",
  "PRESCRIPTION",
  "SCENARIO",
]);
export type StageType = z.infer<typeof StageTypeSchema>;

export const StageStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "REVIEW_REQUIRED",
  "APPROVED",
  "REVISION_REQUESTED",
]);
export type StageStatus = z.infer<typeof StageStatusSchema>;

export const ResourceTypeSchema = z.enum([
  "INDIVIDUAL",
  "ORGANIZATION",
  "LITERATURE",
  "DATASET",
]);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

export const ResourceStatusSchema = z.enum([
  "IDENTIFIED",
  "INTERVIEWED",
  "VALIDATED",
  "REJECTED",
]);
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>;

export const InterviewStatusSchema = z.enum([
  "SCHEDULED",
  "CONDUCTED",
  "CANCELLED",
]);
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;

export const CreateResearchCaseDtoSchema = z.object({
  title: z
    .string()
    .min(3, "عنوان پرونده باید حداقل ۳ کاراکتر باشد")
    .max(255, "عنوان پرونده حداکثر ۲۵۵ کاراکتر است"),
  code: z
    .string()
    .min(2, "کد پرونده الزامی است")
    .max(50, "کد پرونده حداکثر ۵۰ کاراکتر است"),
  subject: z
    .string()
    .min(2, "موضوع پژوهش الزامی است")
    .max(255, "موضوع پژوهش حداکثر ۲۵۵ کاراکتر است"),
});
export type CreateResearchCaseDto = z.infer<typeof CreateResearchCaseDtoSchema>;

export const AssignSupervisorDtoSchema = z.object({
  userId: z.string().uuid("شناسه کاربر نامعتبر است"),
  role: SupervisorRoleSchema,
});
export type AssignSupervisorDto = z.infer<typeof AssignSupervisorDtoSchema>;

export const CreateResourceDtoSchema = z.object({
  type: ResourceTypeSchema,
  title: z
    .string()
    .min(2, "عنوان منبع الزامی است")
    .max(255, "عنوان منبع حداکثر ۲۵۵ کاراکتر است"),
  description: z.string().max(2000, "توضیحات حداکثر ۲۰۰۰ کاراکتر است").optional(),
  contactInfo: z.string().max(255, "اطلاعات تماس حداکثر ۲۵۵ کاراکتر است").optional(),
});
export type CreateResourceDto = z.infer<typeof CreateResourceDtoSchema>;

export const CreateInterviewDtoSchema = z.object({
  intervieweeName: z
    .string()
    .min(2, "نام مصاحبه‌شونده الزامی است")
    .max(255, "نام مصاحبه‌شونده حداکثر ۲۵۵ کاراکتر است"),
  intervieweeAge: IntegerAgeSchema.optional(),
  conductedAt: z
    .string()
    .datetime({ message: "تاریخ و زمان مصاحبه نامعتبر است" })
    .or(z.date()),
});
export type CreateInterviewDto = z.infer<typeof CreateInterviewDtoSchema>;

export const CreateInterviewReportDtoSchema = z.object({
  title: z
    .string()
    .min(2, "عنوان گزارش مصاحبه الزامی است")
    .max(255, "عنوان گزارش حداکثر ۲۵۵ کاراکتر است"),
  content: z
    .string()
    .min(10, "متن گزارش مصاحبه باید حداقل ۱۰ کاراکتر باشد")
    .max(20000, "متن گزارش حداکثر ۲۰۰۰۰ کاراکتر است"),
});
export type CreateInterviewReportDto = z.infer<
  typeof CreateInterviewReportDtoSchema
>;

export const AdvanceStageDtoSchema = z.object({
  expectedVersion: z
    .number()
    .int()
    .positive("نسخه مورد انتظار باید عدد صحیح مثبت باشد"),
});
export type AdvanceStageDto = z.infer<typeof AdvanceStageDtoSchema>;

export const RollbackStageDtoSchema = z.object({
  targetStage: StageTypeSchema,
  reason: z
    .string()
    .min(5, "علت بازگشت مرحله باید حداقل ۵ کاراکتر باشد")
    .max(1000, "علت بازگشت مرحله حداکثر ۱۰۰۰ کاراکتر است"),
  expectedVersion: z
    .number()
    .int()
    .positive("نسخه مورد انتظار باید عدد صحیح مثبت باشد"),
});
export type RollbackStageDto = z.infer<typeof RollbackStageDtoSchema>;

export const ReviewDecisionDtoSchema = z.object({
  decision: z.enum(["APPROVED", "REVISION_REQUESTED", "REJECTED"]),
  notes: z.string().max(2000, "توضیحات داوری حداکثر ۲۰۰۰ کاراکتر است").optional(),
  expectedVersion: z
    .number()
    .int()
    .positive("نسخه مورد انتظار باید عدد صحیح مثبت باشد"),
});
export type ReviewDecisionDto = z.infer<typeof ReviewDecisionDtoSchema>;

