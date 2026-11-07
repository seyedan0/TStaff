/**
 * Core Database Table Names and Metadata Constants
 * Defined according to Technical Proposal Section 6.2
 */
export const TABLES = {
  APPLICANTS: 'applicants',
  ADMISSION_REVIEWS: 'admission_reviews',
  USERS: 'users',
  PROFILES: 'profiles',
  USER_SESSIONS: 'user_sessions',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  RESEARCH_ASSIGNMENTS: 'research_assignments',
  RESEARCH_CASES: 'research_cases',
  STAGE_INSTANCES: 'stage_instances',
  STAGE_SUBMISSIONS: 'stage_submissions',
  RESOURCES: 'resources',
  INTERVIEWS: 'interviews',
  INTERVIEW_REPORTS: 'interview_reports',
  REVIEW_DECISIONS: 'review_decisions',
  SCENARIOS: 'scenarios',
  STORED_OBJECTS: 'stored_objects',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  AUDIT_EVENTS: 'audit_events',
  OUTBOX_EVENTS: 'outbox_events',
  ARCHIVE_JOBS: 'archive_jobs',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

