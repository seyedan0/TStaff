import type {
  ApplicantStatus,
  PublishedLibraryDocumentDto,
  StudyEvaluationStatus,
} from "@tstaff/contracts";
import type { ApplicantItem, CurrentUser } from "../../shared/types.js";
import { safeStorage } from "../../shared/storage.js";
import {
  DEMO_APPLICANTS,
  DEMO_CASE_RESOURCES,
  DEMO_CASE_SCENARIOS,
  DEMO_DOCUMENT_SEEDS,
  DEMO_MANAGED_DOCUMENTS,
  DEMO_PENDING_EVALUATION,
  DEMO_PERSONAS,
  DEMO_PUBLISHED_DOCUMENTS,
  DEMO_RESEARCH_CASES,
  DEMO_STAGE_SUBMISSIONS,
} from "./demo-seed.js";

const STORE_KEY = "tstaff-demo-state-v1";

interface DemoState {
  version: 1;
  sessionUserId: string | null;
  users: CurrentUser[];
  readVersions: Record<string, string[]>;
  evaluations: StudyEvaluationStatus[];
  applicants: ApplicantItem[];
  archivedDocumentIds: string[];
}

function initialState(): DemoState {
  return {
    version: 1,
    sessionUserId: null,
    users: DEMO_PERSONAS.map(({ user }) => ({ ...user, roles: [...(user.roles ?? [])] })),
    readVersions: {
      "20000000-0000-4000-8000-000000000001": ["41000000-0000-4000-8000-000000000001"],
      "20000000-0000-4000-8000-000000000002": DEMO_DOCUMENT_SEEDS.map(({ versionId }) => versionId),
      "20000000-0000-4000-8000-000000000003": [],
    },
    evaluations: [{ ...DEMO_PENDING_EVALUATION, completedDocuments: [...DEMO_PENDING_EVALUATION.completedDocuments] }],
    applicants: DEMO_APPLICANTS.map((applicant) => ({ ...applicant })),
    archivedDocumentIds: [],
  };
}

function parseState(raw: string | null): DemoState {
  if (!raw) return initialState();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) {
      return initialState();
    }
    const state = value as Partial<DemoState>;
    const seed = initialState();
    return {
      ...seed,
      ...state,
      sessionUserId: typeof state.sessionUserId === "string" ? state.sessionUserId : null,
      users: Array.isArray(state.users) ? state.users : seed.users,
      readVersions: state.readVersions && typeof state.readVersions === "object" ? state.readVersions : seed.readVersions,
      evaluations: Array.isArray(state.evaluations) ? state.evaluations : seed.evaluations,
      applicants: Array.isArray(state.applicants) ? state.applicants : seed.applicants,
      archivedDocumentIds: Array.isArray(state.archivedDocumentIds) ? state.archivedDocumentIds : [],
      version: 1,
    };
  } catch {
    return initialState();
  }
}

function readState(): DemoState {
  return parseState(safeStorage.getItem(STORE_KEY));
}

function writeState(state: DemoState): void {
  safeStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function updateState<T>(update: (state: DemoState) => { state: DemoState; result: T }): T {
  const current = readState();
  const next = update(current);
  writeState(next.state);
  return next.result;
}

export function getDemoPersonas() {
  const state = readState();
  const seeded = DEMO_PERSONAS.flatMap((persona) => {
    const user = state.users.find((item) => item.id === persona.user.id);
    if (!user) return [];
    const promoted = persona.id === "apprentice-pending" && user.role === "INTERN";
    return [{
      ...persona,
      status: promoted ? "کارورز · ارتقایافته" : persona.status,
      summary: promoted ? "پس از تأیید مدیر علمی به کارورز ارتقا یافته است." : persona.summary,
      user: { ...user, roles: [...(user.roles ?? [])] },
    }];
  });
  const applicantUsers = state.users.flatMap((user) => {
    const applicant = state.applicants.find((item) => item.phoneNumber === user.phoneNumber && item.status === "APPROVED");
    if (!applicant || DEMO_PERSONAS.some((persona) => persona.user.id === user.id)) return [];
    return [{
      id: `applicant:${applicant.id}`,
      label: applicant.fullName,
      status: "کارآموز · تأییدشده",
      summary: "حساب نمونه پس از تأیید علمی پرونده ساخته شده است.",
      user: { ...user, roles: [...(user.roles ?? [])] },
    }];
  });
  return [...seeded, ...applicantUsers];
}

export function loginDemoPersona(personaId: string): CurrentUser {
  return updateState((state) => {
    const persona = DEMO_PERSONAS.find((item) => item.id === personaId);
    const applicantId = personaId.startsWith("applicant:") ? personaId.slice("applicant:".length) : null;
    const applicant = applicantId && state.applicants.find((item) => item.id === applicantId && item.status === "APPROVED");
    const user = persona
      ? state.users.find((item) => item.id === persona.user.id)
      : applicant ? state.users.find((item) => item.phoneNumber === applicant.phoneNumber) : undefined;
    if ((!persona && !applicant) || !user || user.isSuspended) throw new Error("حساب نمونه‌ی انتخاب‌شده در دسترس نیست.");
    const updated = { ...state, sessionUserId: user.id };
    return { state: updated, result: { ...user, roles: [...(user.roles ?? [])] } };
  });
}

export function getDemoSession(): CurrentUser | null {
  const state = readState();
  const user = state.users.find((item) => item.id === state.sessionUserId);
  return user ? { ...user, roles: [...(user.roles ?? [])] } : null;
}

export function logoutDemo(): void {
  updateState((state) => ({ state: { ...state, sessionUserId: null }, result: undefined }));
}

export function resetDemoData(): void {
  writeState(initialState());
}

function requireSession(state: DemoState): CurrentUser {
  const user = state.users.find((item) => item.id === state.sessionUserId);
  if (!user) throw new Error("برای ادامه ابتدا یک حساب نمایشی انتخاب کنید.");
  return user;
}

export function getDemoPublishedDocuments(): PublishedLibraryDocumentDto[] {
  const state = readState();
  const user = requireSession(state);
  const read = new Set(state.readVersions[user.id] ?? []);
  return DEMO_PUBLISHED_DOCUMENTS
    .filter((document) => !state.archivedDocumentIds.includes(document.id))
    .map((document) => ({
      ...document,
      currentVersion: { ...document.currentVersion, isRead: read.has(document.currentVersion.id) },
    }));
}

export function getDemoManagedDocuments() {
  const state = readState();
  if (requireSession(state).role !== "SCIENTIFIC_SUPERVISOR") throw new Error("مدیریت کتابخانه فقط برای مدیر علمی است.");
  return DEMO_MANAGED_DOCUMENTS.map((document) => ({
    ...document,
    archivedAt: state.archivedDocumentIds.includes(document.id) ? "2026-11-08T09:00:00.000Z" : null,
    currentVersion: document.currentVersion ? { ...document.currentVersion } : null,
    versions: document.versions.map((version) => ({ ...version })),
  }));
}

export function markDemoDocumentRead(documentId: string, versionId: string): void {
  updateState((state) => {
    const user = requireSession(state);
    const seed = DEMO_DOCUMENT_SEEDS.find((document) => document.documentId === documentId && document.versionId === versionId);
    if (user.role !== "APPRENTICE" || !seed || state.archivedDocumentIds.includes(documentId)) {
      throw new Error("این حساب اجازه‌ی ثبت مطالعه‌ی سند را ندارد.");
    }
    const read = new Set(state.readVersions[user.id] ?? []);
    read.add(versionId);
    return { state: { ...state, readVersions: { ...state.readVersions, [user.id]: [...read] } }, result: undefined };
  });
}

export function getDemoStudyEvaluation(): StudyEvaluationStatus | null {
  const state = readState();
  const user = requireSession(state);
  return state.evaluations.find((evaluation) => evaluation.userId === user.id) ?? null;
}

function snapshotsFor(userId: string, readVersions: Record<string, string[]>, readAt: string) {
  const read = new Set(readVersions[userId] ?? []);
  return DEMO_DOCUMENT_SEEDS
    .filter((document) => read.has(document.versionId))
    .map((document) => ({
      documentId: document.documentId,
      versionId: document.versionId,
      title: document.title,
      category: document.category,
      version: 1,
      isRequired: document.isRequired,
      readAt,
    }));
}

export function requestDemoStudyEvaluation(notes?: string): StudyEvaluationStatus {
  return updateState((state) => {
    const user = requireSession(state);
    if (user.role !== "APPRENTICE") throw new Error("فقط کارآموز می‌تواند درخواست ارزیابی ثبت کند.");
    const existing = state.evaluations.find((evaluation) => evaluation.userId === user.id);
    if (existing?.status === "PENDING" || existing?.status === "APPROVED") return { state, result: existing };
    const reads = new Set(state.readVersions[user.id] ?? []);
    const required = DEMO_DOCUMENT_SEEDS.filter((document) => document.isRequired);
    if (required.length === 0 || required.some((document) => !reads.has(document.versionId))) {
      throw new Error("ابتدا همه‌ی نسخه‌های جاریِ اسناد الزامی را مطالعه کنید.");
    }
    const now = new Date().toISOString();
    const evaluation: StudyEvaluationStatus = {
      id: globalThis.crypto?.randomUUID?.() ?? `50000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`,
      userId: user.id,
      status: "PENDING",
      notes: notes?.trim() || null,
      completedDocuments: snapshotsFor(user.id, state.readVersions, now),
      createdAt: now,
      updatedAt: now,
    };
    const nextEvaluations = [...state.evaluations.filter((item) => item.userId !== user.id), evaluation];
    return { state: { ...state, evaluations: nextEvaluations }, result: evaluation };
  });
}

export function getDemoPendingEvaluations() {
  const state = readState();
  if (requireSession(state).role !== "SCIENTIFIC_SUPERVISOR") throw new Error("کارتابل ارزیابی فقط برای مدیر علمی است.");
  return state.evaluations.filter((evaluation) => evaluation.status === "PENDING").map((evaluation) => {
    const user = state.users.find((item) => item.id === evaluation.userId);
    return {
      ...evaluation,
      completedDocuments: evaluation.completedDocuments.map((document) => ({ ...document })),
      userFullName: user?.fullName ?? "کارآموز نمونه",
      userPhone: user?.phoneNumber ?? "",
      user: user ? { id: user.id, fullName: user.fullName, phoneNumber: user.phoneNumber } : undefined,
    };
  });
}

export function decideDemoEvaluation(evaluationId: string, decision: "APPROVED" | "REVISION_REQUIRED", feedback: string): void {
  updateState((state) => {
    const supervisor = requireSession(state);
    if (supervisor.role !== "SCIENTIFIC_SUPERVISOR") throw new Error("این اقدام فقط برای مدیر علمی فعال است.");
    const existing = state.evaluations.find((item) => item.id === evaluationId && item.status === "PENDING");
    if (!existing) throw new Error("درخواست تغییر کرده یا قبلاً بررسی شده است.");
    const now = new Date().toISOString();
    const evaluation = { ...existing, status: decision, feedback, updatedAt: now };
    const users = decision === "APPROVED"
      ? state.users.map((user) => user.id === existing.userId ? { ...user, role: "INTERN" as const, roles: ["INTERN" as const], stage: "INTERN" as const } : user)
      : state.users;
    return {
      state: { ...state, users, evaluations: state.evaluations.map((item) => item.id === evaluationId ? evaluation : item) },
      result: undefined,
    };
  });
}

export function getDemoTrainees() {
  const state = readState();
  const supervisor = requireSession(state);
  if (supervisor.role !== "SCIENTIFIC_SUPERVISOR") throw new Error("این فهرست فقط برای مدیر علمی است.");
  return state.users
    .filter((user) => ["APPRENTICE", "INTERN"].includes(user.role))
    .map(({ id, fullName, phoneNumber, stage }) => ({ id, fullName, phoneNumber, stage }));
}

export function getDemoApplicants(): ApplicantItem[] {
  const state = readState();
  if (requireSession(state).role !== "PROVINCIAL_DIRECTOR") throw new Error("فهرست پذیرش فقط برای مدیر استانی است.");
  return state.applicants.map((applicant) => ({ ...applicant }));
}

export function updateDemoApplicantStatus(id: string, status: ApplicantStatus, reason?: string): void {
  updateState((state) => {
    if (requireSession(state).role !== "PROVINCIAL_DIRECTOR") throw new Error("تغییر پرونده‌ی پذیرش فقط برای مدیر استانی فعال است.");
    const now = new Date().toISOString();
    const target = state.applicants.find((applicant) => applicant.id === id);
    if (!target) throw new Error("پرونده‌ی نمونه پیدا نشد.");
    const applicants = state.applicants.map((applicant) => applicant.id === id
      ? { ...applicant, status, updatedAt: now, ...(status === "REJECTED" && reason ? { rejectionReason: reason } : {}) }
      : applicant);
    const accountExists = state.users.some((user) => user.phoneNumber === target.phoneNumber);
    const users = status === "APPROVED" && !accountExists
      ? [...state.users, {
        id: globalThis.crypto?.randomUUID?.() ?? "70000000-0000-4000-8000-000000000001",
        phoneNumber: target.phoneNumber,
        fullName: target.fullName,
        role: "APPRENTICE" as const,
        roles: ["APPRENTICE" as const],
        stage: "APPRENTICE" as const,
        isSuspended: false,
      }]
      : state.users;
    return { state: { ...state, users, applicants }, result: undefined };
  });
}

export function getDemoAssetPath(documentId: string): string | null {
  const state = readState();
  requireSession(state);
  if (state.archivedDocumentIds.includes(documentId)) return null;
  return DEMO_DOCUMENT_SEEDS.find((document) => document.documentId === documentId)?.assetPath ?? null;
}

function accessibleDemoCase(state: DemoState, caseId: string) {
  const user = requireSession(state);
  const researchCase = DEMO_RESEARCH_CASES.find((item) => item.id === caseId);
  if (!researchCase) return null;
  if (researchCase.researcherId === user.id) return researchCase;
  if (user.role === "SCIENTIFIC_SUPERVISOR" && researchCase.supervisors?.some((supervisor) => supervisor.userId === user.id && supervisor.isActive)) {
    return researchCase;
  }
  return null;
}

export function getDemoResearchCases(researcherId?: string | null) {
  const state = readState();
  const user = requireSession(state);
  if (user.role === "INTERN" || user.role === "APPRENTICE") {
    return DEMO_RESEARCH_CASES
      .filter((researchCase) => researchCase.researcherId === user.id && (!researcherId || researcherId === user.id))
      .map((researchCase) => ({ ...researchCase, stages: researchCase.stages.map((stage) => ({ ...stage })), supervisors: researchCase.supervisors?.map((item) => ({ ...item })) }));
  }
  if (user.role !== "SCIENTIFIC_SUPERVISOR") return [];
  return DEMO_RESEARCH_CASES
    .filter((researchCase) => (!researcherId || researchCase.researcherId === researcherId) && researchCase.supervisors?.some((supervisor) => supervisor.userId === user.id && supervisor.isActive))
    .map((researchCase) => ({ ...researchCase, stages: researchCase.stages.map((stage) => ({ ...stage })), supervisors: researchCase.supervisors?.map((item) => ({ ...item })) }));
}

export function getDemoCaseResources(caseId: string) {
  const state = readState();
  if (!accessibleDemoCase(state, caseId)) throw new Error("پرونده در این حساب نمایشی قابل مشاهده نیست.");
  return DEMO_CASE_RESOURCES
    .filter((resource) => resource.researchCaseId === caseId)
    .map((resource) => ({ ...resource, interview: resource.interview ? { ...resource.interview, latestReport: resource.interview.latestReport ? { ...resource.interview.latestReport } : null } : null }));
}

export function getDemoStageSubmissions(stageId: string) {
  const state = readState();
  const researchCase = DEMO_RESEARCH_CASES.find((item) => item.stages.some((stage) => stage.id === stageId));
  if (!researchCase || !accessibleDemoCase(state, researchCase.id)) throw new Error("مرحله در این حساب نمایشی قابل مشاهده نیست.");
  return (DEMO_STAGE_SUBMISSIONS[stageId] ?? []).map((item) => ({ ...item }));
}

export function getDemoCaseScenarios(caseId: string) {
  const state = readState();
  if (!accessibleDemoCase(state, caseId)) throw new Error("پرونده در این حساب نمایشی قابل مشاهده نیست.");
  return DEMO_CASE_SCENARIOS
    .filter((scenario) => scenario.researchCaseId === caseId)
    .map((scenario) => ({ ...scenario }));
}

export function getDemoRequiredReadState(userId: string): { required: number; read: number } {
  const read = new Set(readState().readVersions[userId] ?? []);
  const required = DEMO_DOCUMENT_SEEDS.filter((document) => document.isRequired);
  return { required: required.length, read: required.filter((document) => read.has(document.versionId)).length };
}
