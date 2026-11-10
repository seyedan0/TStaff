import type {
  UserStage,
  StageType,
  StageStatus,
  ApplicantStatus,
  SupervisorRole,
  SystemRole,
} from "@tstaff/contracts";

export interface CurrentUser {
  id: string;
  phoneNumber: string;
  fullName: string;
  stage: UserStage;
  isSuspended: boolean;
  provinceId?: string | null;
  role: SystemRole;
  roles?: SystemRole[];
}

export type NavigationTab =
  | "research"
  | "applicants"
  | "reviews"
  | "messages"
  | "admin";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
}

export interface ApplicantItem {
  id: string;
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  age: number;
  provinceId: string;
  initialSupervisorId?: string | null;
  education?: string;
  educationLevel?: string | null;
  fieldOfStudy: string;
  status: ApplicantStatus;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StageInstanceItem {
  id: string;
  stageType: StageType;
  status: StageStatus;
  version: number;
}

export interface SupervisorItem {
  id: string;
  userId: string;
  role: SupervisorRole;
  isActive: boolean;
}

export interface ResearchCaseItem {
  id: string;
  code: string;
  title: string;
  subject: string;
  researcherId?: string | null;
  status: string;
  version: number;
  stages: StageInstanceItem[];
  supervisors?: SupervisorItem[];
  canReview?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterviewItem {
  id: string;
  resourceId: string;
  intervieweeName: string;
  intervieweeAge?: number;
  conductedAt: string;
  hasReport?: boolean;
  reportsCount?: number;
  durationMinutes?: number | null;
  mode?: string | null;
  location?: string | null;
  notes?: string | null;
  latestReport?: { id: string; title: string; storedObjectId?: string | null; version: number } | null;
}

export interface ResourceItem {
  id: string;
  researchCaseId: string;
  type: "INDIVIDUAL" | "ORGANIZATION";
  title: string;
  description?: string;
  contactInfo?: string | null;
  personAge?: number | null;
  position?: string | null;
  provinceId?: string | null;
  province?: string | null;
  county?: string | null;
  organization?: { name: string; educationLevel?: string | null; organizationType?: string | null; description?: string | null } | null;
  hasInterview?: boolean;
  interview?: InterviewItem | null;
  createdAt?: string;
  updatedAt?: string;
}
