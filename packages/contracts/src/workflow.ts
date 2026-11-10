import { z } from "zod";

const stage = z.enum(["SOURCES", "EXPLANATION", "PRESCRIPTION", "SCENARIO"]);
export const CreateResearchChangeRequestDtoSchema = z.object({
  targetStage: stage,
  reason: z.string().trim().min(5).max(3000),
  expectedVersion: z.number().int().positive(),
});
export type CreateResearchChangeRequestDto = z.infer<typeof CreateResearchChangeRequestDtoSchema>;
export const DecideResearchChangeRequestDtoSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().min(5).max(3000),
  expectedVersion: z.number().int().positive(),
  caseVersion: z.number().int().positive(),
});
export type DecideResearchChangeRequestDto = z.infer<typeof DecideResearchChangeRequestDtoSchema>;
export const ResearchChangeRequestDtoSchema = CreateResearchChangeRequestDtoSchema.extend({
  id: z.string(), researchCaseId: z.string(), authorId: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]), version: z.number().int().positive(),
  reviewerId: z.string().nullable(), decisionReason: z.string().nullable(),
  createdAt: z.string(), decidedAt: z.string().nullable(),
});
export type ResearchChangeRequestDto = z.infer<typeof ResearchChangeRequestDtoSchema>;

export const StageSnapshotSchema = z.object({
  id: z.string(), stageType: stage,
  status: z.enum(["PENDING", "IN_PROGRESS", "SUBMITTED", "REVIEW_REQUIRED", "APPROVED", "REVISION_REQUESTED"]),
  version: z.number().int(),
});
export const ResearchCaseSnapshotSchema = z.object({
  id: z.string(), code: z.string(), title: z.string(), subject: z.string(),
  status: z.string(), version: z.number().int(), researcherId: z.string().nullable().optional(),
  stages: z.array(StageSnapshotSchema),
  canReview: z.boolean().optional(),
});
export type ResearchCaseSnapshot = z.infer<typeof ResearchCaseSnapshotSchema>;
export const SupervisorHistoryEventSchema = z.object({
  id: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  action: z.string(),
  actorId: z.string().nullable().optional(),
  actorName: z.string().nullable().optional(),
  payload: z.unknown().optional(),
  createdAt: z.string(),
});
export type SupervisorHistoryEvent = z.infer<typeof SupervisorHistoryEventSchema>;

export const SupervisorWorkspaceUserSchema = z.object({
  id: z.string(), fullName: z.string(), phoneNumber: z.string(),
  stage: z.enum(["APPRENTICE", "INTERN"]),
  nationalId: z.string().nullable().optional(),
  age: z.number().int().positive().nullable().optional(),
  provinceId: z.string().nullable().optional(),
  provinceName: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  fieldOfStudy: z.string().nullable().optional(),
  cases: z.array(ResearchCaseSnapshotSchema),
  pendingCount: z.number().int().nonnegative(), oldestPendingAt: z.string().nullable(),
  pendingStudyEvaluationId: z.string().nullable(), changeRequests: z.array(ResearchChangeRequestDtoSchema),
  canCreateResearch: z.boolean().default(false),
  history: z.array(SupervisorHistoryEventSchema).optional(),
});
export type SupervisorWorkspaceUser = z.infer<typeof SupervisorWorkspaceUserSchema>;
