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
  initialSupervisorId: z.string().uuid(),
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

export const SystemRoleSchema = z.enum([
  "APPRENTICE",
  "INTERN",
  "SCIENTIFIC_SUPERVISOR",
  "PROVINCIAL_DIRECTOR",
  "SUPPORT_DIRECTOR",
  "TRACKING_DIRECTOR",
  "SYSTEM_ADMIN",
]);
export type SystemRole = z.infer<typeof SystemRoleSchema>;

export const ManagerRoleSchema = z.enum([
  "TRACKING_DIRECTOR",
  "PROVINCIAL_DIRECTOR",
  "SCIENTIFIC_SUPERVISOR",
  "SUPPORT_DIRECTOR",
  "SYSTEM_ADMIN",
]);
export type ManagerRole = z.infer<typeof ManagerRoleSchema>;

export const CreateManagerDtoSchema = z.object({
  fullName: z.string().min(3, "نام و نام خانوادگی مدیر باید حداقل ۳ کاراکتر باشد"),
  phoneNumber: z
    .string()
    .regex(/^09\d{9}$/, "شماره همراه باید با 09 آغاز شده و ۱۱ رقم باشد"),
  password: z.string().min(8, "رمز عبور اولیه باید حداقل ۸ کاراکتر باشد"),
  role: ManagerRoleSchema,
  provinceId: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateManagerDto = z.infer<typeof CreateManagerDtoSchema>;

export const RequestStudyEvaluationDtoSchema = z.object({
  completedGuidelines: z.array(z.string()).min(1, "حداقل یک عنوان شیوه‌نامه باید علامت خورده باشد"),
  notes: z.string().optional(),
});
export type RequestStudyEvaluationDto = z.infer<typeof RequestStudyEvaluationDtoSchema>;

export const EvaluateStudyDtoSchema = z.object({
  decision: z.enum(["APPROVED", "REVISION_REQUIRED"]),
  feedback: z.string().min(5, "ثبت بازخورد یا توضیحات ارزیابی الزامی است"),
});
export type EvaluateStudyDto = z.infer<typeof EvaluateStudyDtoSchema>;

export const CreateSupportTicketDtoSchema = z.object({
  subject: z.string().min(3, "موضوع پیام پشتیبانی الزامی است"),
  description: z.string().min(10, "شرح پیام باید حداقل ۱۰ کاراکتر باشد"),
});
export type CreateSupportTicketDto = z.infer<typeof CreateSupportTicketDtoSchema>;

export const ResolveSupportTicketDtoSchema = z.object({
  response: z.string().min(5, "پاسخ پشتیبانی الزامی است"),
  status: z.enum(["RESOLVED", "CLOSED"]),
});
export type ResolveSupportTicketDto = z.infer<typeof ResolveSupportTicketDtoSchema>;

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
  "SUBMITTED",
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
  researcherId: z.string().uuid().optional(),
});
export type CreateResearchCaseDto = z.infer<typeof CreateResearchCaseDtoSchema>;

export const AssignSupervisorDtoSchema = z.object({
  userId: z.string().uuid("شناسه کاربر نامعتبر است"),
  role: SupervisorRoleSchema,
});
export type AssignSupervisorDto = z.infer<typeof AssignSupervisorDtoSchema>;

export const AssignScientificSupervisorToUserDtoSchema = z.object({
  supervisorId: z.string().uuid(),
});
export type AssignScientificSupervisorToUserDto = z.infer<typeof AssignScientificSupervisorToUserDtoSchema>;

export const CreateResourceDtoSchema = z.object({
  type: ResourceTypeSchema,
  title: z
    .string()
    .min(2, "عنوان منبع الزامی است")
    .max(255, "عنوان منبع حداکثر ۲۵۵ کاراکتر است"),
  description: z.string().max(2000, "توضیحات حداکثر ۲۰۰۰ کاراکتر است").optional(),
  contactInfo: z.string().max(255, "اطلاعات تماس حداکثر ۲۵۵ کاراکتر است").optional(),
  personAge: IntegerAgeSchema.optional(),
  position: z.string().min(2).max(255).optional(),
  province: z.string().max(120).optional(),
  county: z.string().max(120).optional(),
  organizationName: z.string().max(255).optional(),
  organizationEducationLevel: z.string().max(120).optional(),
  organizationType: z.string().max(120).optional(),
}).superRefine((resource, context) => {
  if (resource.type === "INDIVIDUAL" && resource.personAge === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["personAge"], message: "سن فرد الزامی است" });
  }
  if (resource.type === "INDIVIDUAL" && !resource.position) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["position"], message: "سمت یا شغل فرد الزامی است" });
  }
});
export type CreateResourceDto = z.infer<typeof CreateResourceDtoSchema>;

export const UpdateResourceDtoSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(2000).optional(),
  contactInfo: z.string().max(255).optional(),
  personAge: IntegerAgeSchema.optional(),
  position: z.string().min(2).max(255).optional(),
  province: z.string().max(120).optional(),
  county: z.string().max(120).optional(),
}).refine((value) => Object.keys(value).length > 0, "حداقل یک فیلد برای اصلاح لازم است");
export type UpdateResourceDto = z.infer<typeof UpdateResourceDtoSchema>;

export const ResourceOrganizationDtoSchema = z.object({
  name: z.string().min(2).max(255),
  educationLevel: z.string().max(120).optional(),
  organizationType: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
});
export type ResourceOrganizationDto = z.infer<typeof ResourceOrganizationDtoSchema>;

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
  durationMinutes: z.number().int().positive().max(1440).optional(),
  mode: z.string().max(80).optional(),
  location: z.string().max(255).optional(),
  notes: z.string().max(4000).optional(),
});
export type CreateInterviewDto = z.infer<typeof CreateInterviewDtoSchema>;

export const UpdateInterviewDtoSchema = z.object({
  intervieweeName: z.string().min(2).max(255).optional(),
  intervieweeAge: IntegerAgeSchema.optional(),
  conductedAt: z.string().datetime().or(z.date()).optional(),
  durationMinutes: z.number().int().positive().max(1440).optional(),
  mode: z.string().max(80).optional(),
  location: z.string().max(255).optional(),
  notes: z.string().max(4000).optional(),
}).refine((value) => Object.keys(value).length > 0, "حداقل یک فیلد برای اصلاح لازم است");
export type UpdateInterviewDto = z.infer<typeof UpdateInterviewDtoSchema>;

export const CreateInterviewReportDtoSchema = z.object({
  title: z
    .string()
    .min(2, "عنوان گزارش مصاحبه الزامی است")
    .max(255, "عنوان گزارش حداکثر ۲۵۵ کاراکتر است"),
  fileId: z.string().uuid(),
  content: z.string().max(20000).optional(),
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

/**
 * ----------------------------------------------------------------------------
 * Milestone 4: Scientific Review, Stage Submissions & Scenarios
 * (D-02, D-03, D-05, FR-016 - FR-023, FR-040, FR-057, FR-061, AT-05 - AT-08, AT-16, AT-29, AT-33)
 * ----------------------------------------------------------------------------
 */

export const SubmissionStatusSchema = z.enum([
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "REVISION_REQUIRED",
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const CreateStageSubmissionDtoSchema = z.object({
  content: z.string().min(5, "توضیحات ارسال الزامی است").max(50000),
  fileId: z.string().uuid().optional(),
  expectedVersion: z
    .number()
    .int()
    .positive("نسخه مورد انتظار باید عدد صحیح مثبت باشد"),
});
export type CreateStageSubmissionDto = z.infer<
  typeof CreateStageSubmissionDtoSchema
>;

export const SubmitReviewDecisionDtoSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  reason: z
    .string()
    .min(5, "علت داوری حداقل ۵ کاراکتر است")
    .max(2000, "علت داوری حداکثر ۲۰۰۰ کاراکتر است"),
  expectedVersion: z
    .number()
    .int()
    .positive("نسخه مورد انتظار باید عدد صحیح مثبت باشد"),
  caseVersion: z
    .number()
    .int()
    .positive("نسخه پرونده باید عدد صحیح مثبت باشد"),
  idempotencyKey: z
    .string()
    .min(10, "کلید یکتایی حداقل ۱۰ کاراکتر است")
    .max(100, "کلید یکتایی حداکثر ۱۰۰ کاراکتر است"),
});
export type SubmitReviewDecisionDto = z.infer<
  typeof SubmitReviewDecisionDtoSchema
>;

export const ScenarioStatusSchema = z.enum([
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED_INTERNAL",
  "ARCHIVED",
]);
export type ScenarioStatus = z.infer<typeof ScenarioStatusSchema>;

export const ScenarioAudienceSchema = z.enum(["TEACHER", "STUDENT", "MENTOR", "OTHER"]);
export type ScenarioAudience = z.infer<typeof ScenarioAudienceSchema>;

export const ScenarioStructuredContentSchema = z.object({
  audience: ScenarioAudienceSchema,
  province: z.string().min(2).max(120),
  category: z.string().min(2).max(120),
  keywords: z.array(z.string().min(2).max(80)).min(1).max(30),
  implementationSteps: z.array(z.string().min(5).max(3000)).min(1).max(30),
});
export type ScenarioStructuredContent = z.infer<typeof ScenarioStructuredContentSchema>;

const ScenarioContentJsonSchema = z.string().min(20).max(50000).superRefine((value, context) => {
  try {
    ScenarioStructuredContentSchema.parse(JSON.parse(value));
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "محتوای سناریو باید شامل مخاطب، استان، دسته‌بندی، کلیدواژه و مراحل اجرا باشد" });
  }
});

export const CreateScenarioDtoSchema = z.object({
  title: z
    .string()
    .min(3, "عنوان سناریو باید حداقل ۳ کاراکتر باشد")
    .max(255, "عنوان سناریو حداکثر ۲۵۵ کاراکتر است"),
  summary: z
    .string()
    .min(10, "چکیده سناریو باید حداقل ۱۰ کاراکتر باشد")
    .max(2000, "چکیده سناریو حداکثر ۲۰۰۰ کاراکتر است"),
  content: ScenarioContentJsonSchema,
});
export type CreateScenarioDto = z.infer<typeof CreateScenarioDtoSchema>;

export const UpdateScenarioDtoSchema = z.object({
  title: z
    .string()
    .min(3, "عنوان سناریو باید حداقل ۳ کاراکتر باشد")
    .max(255, "عنوان سناریو حداکثر ۲۵۵ کاراکتر است")
    .optional(),
  summary: z
    .string()
    .min(10, "چکیده سناریو باید حداقل ۱۰ کاراکتر باشد")
    .max(2000, "چکیده سناریو حداکثر ۲۰۰۰ کاراکتر است")
    .optional(),
  content: ScenarioContentJsonSchema.optional(),
  expectedVersion: z
    .number()
    .int()
    .positive("نسخه مورد انتظار باید عدد صحیح مثبت باشد"),
});
export type UpdateScenarioDto = z.infer<typeof UpdateScenarioDtoSchema>;

export const SubmitScenarioDtoSchema = z.object({
  expectedVersion: z
    .number()
    .int()
    .positive("نسخه مورد انتظار باید عدد صحیح مثبت باشد"),
});
export type SubmitScenarioDto = z.infer<typeof SubmitScenarioDtoSchema>;

export const ReviewScenarioDtoSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  reason: z
    .string()
    .min(5, "علت داوری حداقل ۵ کاراکتر است")
    .max(2000, "علت داوری حداکثر ۲۰۰۰ کاراکتر است"),
  expectedVersion: z
    .number()
    .int()
    .positive("نسخه مورد انتظار باید عدد صحیح مثبت باشد"),
  caseVersion: z
    .number()
    .int()
    .positive("نسخه پرونده باید عدد صحیح مثبت باشد"),
  idempotencyKey: z
    .string()
    .min(10, "کلید یکتایی حداقل ۱۰ کاراکتر است")
    .max(100, "کلید یکتایی حداکثر ۱۰۰ کاراکتر است"),
});
export type ReviewScenarioDto = z.infer<typeof ReviewScenarioDtoSchema>;

export const ScenarioBankQuerySchema = z.object({
  query: z.string().max(255).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ScenarioBankQuery = z.infer<typeof ScenarioBankQuerySchema>;

/**
 * ----------------------------------------------------------------------------
 * Milestone 5: Management, Communications, Audit, Archival, Reporting & Settings
 * (D-04, FR-024 - FR-031, FR-035, FR-039, FR-052, FR-060, AT-09 - AT-15, AT-21, AT-24, AT-25, AT-27, AT-31, AT-32, AT-34, BR-16 - BR-19)
 * ----------------------------------------------------------------------------
 */

// 1. Identity Suspension (AT-12, BR-18)
export const SuspendUserDtoSchema = z.object({
  reason: z
    .string()
    .min(5, "علت تعلیق باید حداقل ۵ کاراکتر باشد")
    .max(1000, "علت تعلیق حداکثر ۱۰۰۰ کاراکتر است"),
});
export type SuspendUserDto = z.infer<typeof SuspendUserDtoSchema>;

export const ReactivateUserDtoSchema = z.object({
  reason: z
    .string()
    .min(5, "علت فعال‌سازی باید حداقل ۵ کاراکتر باشد")
    .max(1000, "علت فعال‌سازی حداکثر ۱۰۰۰ کاراکتر است")
    .optional(),
});
export type ReactivateUserDto = z.infer<typeof ReactivateUserDtoSchema>;

// 2. Messaging (1:1 Direct Chat - AT-10, AT-14, BR-16)
export const ConversationTypeSchema = z.enum([
  "DIRECT_SUPERVISOR_TRAINEE",
  "RESEARCH_TEAM_INTERNAL",
]);
export type ConversationType = z.infer<typeof ConversationTypeSchema>;

export const CreateConversationDtoSchema = z.object({
  participantId: z.string().uuid("شناسه مخاطب نامعتبر است"),
  type: ConversationTypeSchema.default("DIRECT_SUPERVISOR_TRAINEE"),
  researchCaseId: z.string().uuid("شناسه پژوهش نامعتبر است").optional(),
});
export type CreateConversationDto = z.input<typeof CreateConversationDtoSchema>;

export const SendMessageDtoSchema = z.object({
  content: z
    .string()
    .min(1, "متن پیام الزامی است")
    .max(5000, "متن پیام حداکثر ۵۰۰۰ کاراکتر است"),
  attachmentId: z.string().uuid("شناسه پیوست نامعتبر است").optional(),
});
export type SendMessageDto = z.infer<typeof SendMessageDtoSchema>;

export const MessageDtoSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  attachmentId: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
});
export type MessageDto = z.infer<typeof MessageDtoSchema>;

export const ConversationDtoSchema = z.object({
  id: z.string().uuid(),
  type: ConversationTypeSchema,
  researchCaseId: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});
export type ConversationDto = z.infer<typeof ConversationDtoSchema>;

// 3. Notifications (D-04, AT-31, AT-32, BR-17)
export const CreateNotificationDtoSchema = z.object({
  userId: z.string().uuid("شناسه کاربر نامعتبر است"),
  type: z.string().min(2, "نوع اعلان الزامی است").max(100),
  title: z.string().min(2, "عنوان اعلان الزامی است").max(255),
  body: z.string().min(2, "متن اعلان الزامی است").max(5000),
  isCritical: z.boolean().default(false), // D-04: Only critical triggers immediate push
});
export type CreateNotificationDto = z.input<typeof CreateNotificationDtoSchema>;

export const NotificationQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type NotificationQuery = z.input<typeof NotificationQuerySchema>;

export const MarkNotificationReadDtoSchema = z.object({
  isRead: z.boolean().default(true),
});
export type MarkNotificationReadDto = z.infer<
  typeof MarkNotificationReadDtoSchema
>;

export const NotificationDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  isCritical: z.boolean(),
  createdAt: z.date().or(z.string()),
});
export type NotificationDto = z.infer<typeof NotificationDtoSchema>;

// 4. Audit Log (D-04, AT-25, AT-31, AT-32)
export const CreateAuditEventDtoSchema = z.object({
  aggregateType: z.string().min(2).max(100),
  aggregateId: z.string().min(1).max(100),
  action: z.string().min(2).max(100),
  actorId: z.string().uuid().optional(),
  ipAddress: z.string().max(45).optional(),
  payload: z.record(z.unknown()).optional(),
});
export type CreateAuditEventDto = z.infer<typeof CreateAuditEventDtoSchema>;

export const AuditQueryFilterSchema = z.object({
  aggregateType: z.string().optional(),
  aggregateId: z.string().optional(),
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type AuditQueryFilter = z.input<typeof AuditQueryFilterSchema>;

export const AuditEventDtoSchema = z.object({
  id: z.string().uuid(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  action: z.string(),
  actorId: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  payload: z.unknown().optional(),
  createdAt: z.date().or(z.string()),
});
export type AuditEventDto = z.infer<typeof AuditEventDtoSchema>;

// 5. Archival (AT-14, AT-27, BR-19)
export const ArchiveTargetTypeSchema = z.enum([
  "RESEARCH_CASE",
  "CONVERSATION",
  "APPLICANT",
]);
export type ArchiveTargetType = z.infer<typeof ArchiveTargetTypeSchema>;

export const ArchiveJobStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);
export type ArchiveJobStatus = z.infer<typeof ArchiveJobStatusSchema>;

export const CreateArchiveJobDtoSchema = z.object({
  targetType: ArchiveTargetTypeSchema,
  targetId: z.string().uuid("شناسه هدف نامعتبر است"),
});
export type CreateArchiveJobDto = z.infer<typeof CreateArchiveJobDtoSchema>;

export const ArchiveJobDtoSchema = z.object({
  id: z.string().uuid(),
  targetType: ArchiveTargetTypeSchema,
  targetId: z.string().uuid(),
  status: ArchiveJobStatusSchema,
  storageLocation: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  completedAt: z.date().or(z.string()).nullable().optional(),
});
export type ArchiveJobDto = z.infer<typeof ArchiveJobDtoSchema>;

// 6. Reporting & Dashboards (AT-09, AT-11, AT-15, AT-21, AT-24)
export const ProvincialDirectorMetricsSchema = z.object({
  provinceId: z.string().optional(),
  totalApplicants: z.number().int().nonnegative(),
  approvedApplicants: z.number().int().nonnegative(),
  totalApprentices: z.number().int().nonnegative(),
  totalInterns: z.number().int().nonnegative(),
  activeResearchCases: z.number().int().nonnegative(),
});
export type ProvincialDirectorMetrics = z.infer<
  typeof ProvincialDirectorMetricsSchema
>;

export const SupervisorWorklistItemSchema = z.object({
  caseId: z.string().uuid(),
  caseCode: z.string(),
  caseSubject: z.string(),
  stage: z.string(),
  pendingItemType: z.enum(["STAGE_SUBMISSION", "SCENARIO"]),
  pendingItemId: z.string().uuid(),
  submittedAt: z.date().or(z.string()),
});
export type SupervisorWorklistItem = z.infer<
  typeof SupervisorWorklistItemSchema
>;

export const SupervisorWorklistSchema = z.object({
  supervisorId: z.string().uuid(),
  pendingStageSubmissions: z.number().int().nonnegative(),
  pendingScenarioReviews: z.number().int().nonnegative(),
  totalSupervisedCases: z.number().int().nonnegative(),
  items: z.array(SupervisorWorklistItemSchema),
});
export type SupervisorWorklist = z.infer<typeof SupervisorWorklistSchema>;

export const TrackingDirectorBacklogItemSchema = z.object({
  caseId: z.string().uuid(),
  caseCode: z.string(),
  subject: z.string(),
  currentStage: z.string(),
  status: z.string(),
  daysInCurrentStage: z.number().int().nonnegative(),
});
export type TrackingDirectorBacklogItem = z.infer<
  typeof TrackingDirectorBacklogItemSchema
>;

export const TrackingDirectorBacklogSchema = z.object({
  delayedCasesCount: z.number().int().nonnegative(),
  reviewRequiredCasesCount: z.number().int().nonnegative(),
  unassignedCasesCount: z.number().int().nonnegative(),
  backlogItems: z.array(TrackingDirectorBacklogItemSchema),
});
export type TrackingDirectorBacklog = z.infer<
  typeof TrackingDirectorBacklogSchema
>;

export const GeneralDirectorSummarySchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  totalApplicants: z.number().int().nonnegative(),
  totalResearchCases: z.number().int().nonnegative(),
  casesByStage: z.record(z.number().int().nonnegative()),
  completedScenariosCount: z.number().int().nonnegative(),
  activeSupervisorsCount: z.number().int().nonnegative(),
});
export type GeneralDirectorSummary = z.infer<
  typeof GeneralDirectorSummarySchema
>;

export const WorkflowMetricsSchema = z.object({
  averageStageCompletionDays: z.record(z.number().nonnegative()),
  rollbackFrequencyByStage: z.record(z.number().int().nonnegative()),
});
export type WorkflowMetrics = z.infer<typeof WorkflowMetricsSchema>;

// 7. Runtime System Settings (FR-052, AT-34)
export const SystemSettingSchema = z.object({
  key: z.string().min(2, "کلید تنظیمات حداقل ۲ کاراکتر است").max(100),
  value: z.string(),
  description: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  updatedAt: z.date().or(z.string()),
});
export type SystemSetting = z.infer<typeof SystemSettingSchema>;

export const UpdateSystemSettingDtoSchema = z.object({
  value: z.string().min(1, "مقدار تنظیمات الزامی است"),
  description: z.string().max(1000).optional(),
});
export type UpdateSystemSettingDto = z.infer<
  typeof UpdateSystemSettingDtoSchema
>;

/**
 * ----------------------------------------------------------------------------
 * Milestone 6: Transactional Outbox, Background Worker & Async Events
 * (D-04, FR-025, FR-039, FR-060, FR-061, AT-11, AT-14, AT-24, AT-27, AT-31, AT-32)
 * ----------------------------------------------------------------------------
 */

export const OutboxStatusSchema = z.enum(["PENDING", "PROCESSED", "FAILED"]);
export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;

export const OutboxEventTypeSchema = z.enum([
  "NOTIFICATION_EVENT",
  "AUDIT_EVENT",
  "ARCHIVAL_SNAPSHOT_EVENT",
  "STAGE_DEADLINE_CHECK",
]);
export type OutboxEventType = z.infer<typeof OutboxEventTypeSchema>;

export const NotificationEventPayloadSchema = z.object({
  userId: z.string().uuid("شناسه کاربر نامعتبر است"),
  type: z.string().min(2, "نوع اعلان الزامی است"),
  title: z.string().min(2, "عنوان اعلان الزامی است"),
  body: z.string().min(2, "متن اعلان الزامی است"),
  isCritical: z.boolean().default(false),
});
export type CreateNotificationEventPayload = z.input<
  typeof NotificationEventPayloadSchema
>;
export type NotificationEventPayload = z.infer<
  typeof NotificationEventPayloadSchema
>;

export const AuditEventPayloadSchema = z.object({
  aggregateType: z.string().min(2),
  aggregateId: z.string().min(1),
  action: z.string().min(2),
  actorId: z.string().uuid().optional(),
  ipAddress: z.string().max(45).optional(),
  payload: z.record(z.unknown()).optional(),
});
export type AuditEventPayload = z.infer<typeof AuditEventPayloadSchema>;

export const ArchivalSnapshotEventPayloadSchema = z.object({
  jobId: z.string().uuid(),
  targetType: z.enum(["RESEARCH_CASE", "CONVERSATION", "APPLICANT"]),
  targetId: z.string().uuid(),
});
export type ArchivalSnapshotEventPayload = z.infer<
  typeof ArchivalSnapshotEventPayloadSchema
>;

export const StageDeadlineCheckPayloadSchema = z.object({
  checkTimestamp: z.string().datetime().or(z.date()),
  thresholdDays: z.number().int().positive().default(45),
});
export type CreateStageDeadlineCheckPayload = z.input<
  typeof StageDeadlineCheckPayloadSchema
>;
export type StageDeadlineCheckPayload = z.infer<
  typeof StageDeadlineCheckPayloadSchema
>;

export const OutboxEventDtoSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string(),
  payload: z.unknown(),
  status: OutboxStatusSchema,
  retryCount: z.number().int().nonnegative(),
  createdAt: z.date().or(z.string()),
  processedAt: z.date().or(z.string()).nullable().optional(),
});
export type OutboxEventDto = z.infer<typeof OutboxEventDtoSchema>;

export const CreateOutboxEventDtoSchema = z.object({
  eventType: z.string().min(2).max(100),
  payload: z.record(z.unknown()),
});
export type CreateOutboxEventDto = z.infer<typeof CreateOutboxEventDtoSchema>;




