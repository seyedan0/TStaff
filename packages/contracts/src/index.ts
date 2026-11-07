import { z } from 'zod';

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
  .int('سن باید یک عدد صحیح باشد')
  .positive('سن باید عددی مثبت باشد')
  .max(120, 'سن معتبر نیست');
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
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  reason: z.string().min(5, 'ذکر دلیل داوری الزامی است'),
  idempotencyKey: z.string().min(10),
});
export type ReviewDecisionRequest = z.infer<typeof ReviewDecisionRequestSchema>;

