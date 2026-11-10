import {
  IRAN_PROVINCES,
  provinceNameFromId,
  type ApplicantStatus,
  type PublishedLibraryDocumentDto,
  type ResearchChangeRequestDto,
  type ResourceBankItem,
  type StudyEvaluationStatus,
  type SupervisorWorkspaceUser,
} from "@tstaff/contracts";
import type { ApplicantItem, CurrentUser, ResearchCaseItem } from "../../shared/types.js";
import { safeStorage } from "../../shared/storage.js";
import {
  DEMO_APPLICANTS,
  DEMO_ARCHIVE_JOBS,
  DEMO_AUDIT_EVENTS,
  DEMO_CASE_RESOURCES,
  DEMO_CASE_SCENARIOS,
  DEMO_CHANGE_REQUESTS,
  DEMO_CONVERSATIONS,
  DEMO_DOCUMENT_SEEDS,
  DEMO_MANAGED_DOCUMENTS,
  DEMO_MESSAGES,
  DEMO_PENDING_EVALUATION,
  DEMO_PERSONAS,
  DEMO_PUBLISHED_DOCUMENTS,
  DEMO_RESEARCH_CASES,
  DEMO_RESOURCE_BANK,
  DEMO_SCOPES,
  DEMO_SETTINGS,
  DEMO_STAGE_SUBMISSIONS,
  DEMO_SUPERVISOR_HISTORY,
  DEMO_SUPPORT_TICKETS,
} from "./demo-seed.js";

const STORE_KEY = "tstaff-demo-state-v2";

export interface DemoSupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  response?: string;
  createdAt: string;
  updatedAt: string;
  userFullName?: string;
  userPhone?: string;
}

export interface DemoConversation {
  id: string;
  type: string;
  researchCaseId?: string | null;
  updatedAt: string;
  participantIds: string[];
}

export interface DemoState {
  version: 2;
  sessionUserId: string | null;
  users: CurrentUser[];
  readVersions: Record<string, string[]>;
  evaluations: StudyEvaluationStatus[];
  applicants: ApplicantItem[];
  archivedDocumentIds: string[];
  researchCases: ResearchCaseItem[];
  changeRequests: ResearchChangeRequestDto[];
  resourceBank: ResourceBankItem[];
  supportTickets: DemoSupportTicket[];
  conversations: DemoConversation[];
  messages: typeof DEMO_MESSAGES;
  settings: typeof DEMO_SETTINGS;
  archiveJobs: typeof DEMO_ARCHIVE_JOBS;
  scopes: typeof DEMO_SCOPES;
}

function initialState(): DemoState {
  return {
    version: 2,
    sessionUserId: null,
    users: DEMO_PERSONAS.map(({ user }) => ({ ...user, roles: [...(user.roles ?? [])] })),
    readVersions: {
      "20000000-0000-4000-8000-000000000001": ["41000000-0000-4000-8000-000000000001"],
      "20000000-0000-4000-8000-000000000002": DEMO_DOCUMENT_SEEDS.map(({ versionId }) => versionId),
      "20000000-0000-4000-8000-000000000003": [],
    },
    evaluations: [{ ...DEMO_PENDING_EVALUATION, completedDocuments: [...DEMO_PENDING_EVALUATION.completedDocuments] }],
    applicants: DEMO_APPLICANTS.map((a) => ({ ...a })),
    archivedDocumentIds: [],
    researchCases: DEMO_RESEARCH_CASES.map((c) => ({ ...c, stages: c.stages.map((s) => ({ ...s })), supervisors: c.supervisors?.map((s) => ({ ...s })) })),
    changeRequests: DEMO_CHANGE_REQUESTS.map((r) => ({ ...r })),
    resourceBank: DEMO_RESOURCE_BANK.map((r) => ({ ...r, referrals: [...r.referrals] })),
    supportTickets: DEMO_SUPPORT_TICKETS.map((t) => ({ ...t })),
    conversations: DEMO_CONVERSATIONS.map((c) => ({ ...c, participantIds: [...c.participantIds] })),
    messages: DEMO_MESSAGES.map((m) => ({ ...m })),
    settings: DEMO_SETTINGS.map((s) => ({ ...s })),
    archiveJobs: DEMO_ARCHIVE_JOBS.map((j) => ({ ...j })),
    scopes: DEMO_SCOPES.map((s) => ({ ...s })),
  };
}

export function readDemoState(): DemoState {
  const raw = safeStorage.getItem(STORE_KEY);
  if (!raw) return initialState();
  try {
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    if (!parsed || typeof parsed !== "object" || parsed.version !== 2) return initialState();
    const seed = initialState();
    return {
      ...seed,
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : seed.users,
      applicants: Array.isArray(parsed.applicants) ? parsed.applicants : seed.applicants,
      evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : seed.evaluations,
      researchCases: Array.isArray(parsed.researchCases) ? parsed.researchCases : seed.researchCases,
      changeRequests: Array.isArray(parsed.changeRequests) ? parsed.changeRequests : seed.changeRequests,
      resourceBank: Array.isArray(parsed.resourceBank) ? parsed.resourceBank : seed.resourceBank,
      supportTickets: Array.isArray(parsed.supportTickets) ? parsed.supportTickets : seed.supportTickets,
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : seed.conversations,
      messages: Array.isArray(parsed.messages) ? parsed.messages : seed.messages,
      settings: Array.isArray(parsed.settings) ? parsed.settings : seed.settings,
      scopes: Array.isArray(parsed.scopes) ? parsed.scopes : seed.scopes,
      version: 2,
    };
  } catch {
    return initialState();
  }
}

export function updateDemoState<T>(update: (state: DemoState) => { state: DemoState; result: T }): T {
  const next = update(readDemoState());
  safeStorage.setItem(STORE_KEY, JSON.stringify(next.state));
  return next.result;
}

export function requireDemoSession(state: DemoState): CurrentUser {
  const user = state.users.find((item) => item.id === state.sessionUserId);
  if (!user) throw new Error("برای ادامه ابتدا یک حساب نمایشی انتخاب کنید.");
  return user;
}

export function getDemoPersonas() {
  const state = readDemoState();
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
  return updateDemoState((state) => {
    const persona = DEMO_PERSONAS.find((item) => item.id === personaId);
    const applicantId = personaId.startsWith("applicant:") ? personaId.slice("applicant:".length) : null;
    const applicant = applicantId && state.applicants.find((item) => item.id === applicantId && item.status === "APPROVED");
    const user = persona
      ? state.users.find((item) => item.id === persona.user.id)
      : applicant ? state.users.find((item) => item.phoneNumber === applicant.phoneNumber) : undefined;
    if ((!persona && !applicant) || !user || user.isSuspended) throw new Error("حساب نمونه انتخاب‌شده در دسترس نیست.");
    return { state: { ...state, sessionUserId: user.id }, result: { ...user, roles: [...(user.roles ?? [])] } };
  });
}

export function getDemoSession(): CurrentUser | null {
  const state = readDemoState();
  const user = state.users.find((item) => item.id === state.sessionUserId);
  return user ? { ...user, roles: [...(user.roles ?? [])] } : null;
}

export function logoutDemo(): void {
  updateDemoState((state) => ({ state: { ...state, sessionUserId: null }, result: undefined }));
}

export function resetDemoData(): void {
  safeStorage.setItem(STORE_KEY, JSON.stringify(initialState()));
}

export function getDemoPublishedDocuments(): PublishedLibraryDocumentDto[] {
  const state = readDemoState();
  const user = requireDemoSession(state);
  const read = new Set(state.readVersions[user.id] ?? []);
  return DEMO_PUBLISHED_DOCUMENTS
    .filter((doc) => !state.archivedDocumentIds.includes(doc.id))
    .map((doc) => ({ ...doc, currentVersion: { ...doc.currentVersion, isRead: read.has(doc.currentVersion.id) } }));
}

export function getDemoPublishedDocument(documentId: string): PublishedLibraryDocumentDto {
  const found = getDemoPublishedDocuments().find((d) => d.id === documentId);
  if (!found) throw new Error("سند مورد نظر یافت نشد.");
  return found;
}

export function getDemoManagedDocuments() {
  const state = readDemoState();
  if (requireDemoSession(state).role !== "SCIENTIFIC_SUPERVISOR") throw new Error("مدیریت کتابخانه فقط برای مدیر علمی است.");
  return DEMO_MANAGED_DOCUMENTS.map((doc) => ({
    ...doc,
    archivedAt: state.archivedDocumentIds.includes(doc.id) ? "2026-11-08T09:00:00.000Z" : null,
    currentVersion: doc.currentVersion ? { ...doc.currentVersion } : null,
    versions: doc.versions.map((v) => ({ ...v })),
  }));
}

export function markDemoDocumentRead(documentId: string, versionId: string): void {
  updateDemoState((state) => {
    const user = requireDemoSession(state);
    const seed = DEMO_DOCUMENT_SEEDS.find((d) => d.documentId === documentId && d.versionId === versionId);
    if (user.role !== "APPRENTICE" || !seed || state.archivedDocumentIds.includes(documentId)) {
      throw new Error("این حساب اجازه ثبت مطالعه سند را ندارد.");
    }
    const read = new Set(state.readVersions[user.id] ?? []);
    read.add(versionId);
    return { state: { ...state, readVersions: { ...state.readVersions, [user.id]: [...read] } }, result: undefined };
  });
}

export function getDemoStudyEvaluation(): StudyEvaluationStatus | null {
  const state = readDemoState();
  const user = requireDemoSession(state);
  return state.evaluations.find((e) => e.userId === user.id) ?? null;
}

export function requestDemoStudyEvaluation(notes?: string): StudyEvaluationStatus {
  return updateDemoState((state) => {
    const user = requireDemoSession(state);
    if (user.role !== "APPRENTICE") throw new Error("فقط کارآموز می‌تواند درخواست ارزیابی ثبت کند.");
    const existing = state.evaluations.find((e) => e.userId === user.id);
    if (existing?.status === "PENDING" || existing?.status === "APPROVED") return { state, result: existing };
    const reads = new Set(state.readVersions[user.id] ?? []);
    const required = DEMO_DOCUMENT_SEEDS.filter((d) => d.isRequired);
    if (required.length === 0 || required.some((d) => !reads.has(d.versionId))) {
      throw new Error("ابتدا همه نسخه‌های جاری اسناد الزامی را مطالعه کنید.");
    }
    const now = new Date().toISOString();
    const evaluation: StudyEvaluationStatus = {
      id: globalThis.crypto?.randomUUID?.() ?? `50000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`,
      userId: user.id,
      status: "PENDING",
      notes: notes?.trim() || null,
      completedDocuments: DEMO_DOCUMENT_SEEDS.filter((d) => reads.has(d.versionId)).map((d) => ({
        documentId: d.documentId, versionId: d.versionId, title: d.title, category: d.category, version: 1, isRequired: d.isRequired, readAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    return { state: { ...state, evaluations: [...state.evaluations.filter((i) => i.userId !== user.id), evaluation] }, result: evaluation };
  });
}

export function getDemoPendingEvaluations() {
  const state = readDemoState();
  if (requireDemoSession(state).role !== "SCIENTIFIC_SUPERVISOR") throw new Error("کارتابل ارزیابی فقط برای مدیر علمی است.");
  return state.evaluations.filter((e) => e.status === "PENDING").map((e) => {
    const user = state.users.find((i) => i.id === e.userId);
    return {
      ...e,
      completedDocuments: e.completedDocuments.map((d) => ({ ...d })),
      userFullName: user?.fullName ?? "کارآموز نمونه",
      userPhone: user?.phoneNumber ?? "",
      user: user ? { id: user.id, fullName: user.fullName, phoneNumber: user.phoneNumber } : undefined,
    };
  });
}

export function decideDemoEvaluation(evaluationId: string, decision: "APPROVED" | "REVISION_REQUIRED", feedback: string): void {
  updateDemoState((state) => {
    if (requireDemoSession(state).role !== "SCIENTIFIC_SUPERVISOR") throw new Error("این اقدام فقط برای مدیر علمی فعال است.");
    const existing = state.evaluations.find((i) => i.id === evaluationId && i.status === "PENDING");
    if (!existing) throw new Error("درخواست تغییر کرده یا قبلاً بررسی شده است.");
    const evaluation = { ...existing, status: decision, feedback, updatedAt: new Date().toISOString() };
    const users = decision === "APPROVED"
      ? state.users.map((u) => (u.id === existing.userId ? { ...u, role: "INTERN" as const, roles: ["INTERN" as const], stage: "INTERN" as const } : u))
      : state.users;
    return { state: { ...state, users, evaluations: state.evaluations.map((i) => (i.id === evaluationId ? evaluation : i)) }, result: undefined };
  });
}

function buildWorkspaceUsers(state: DemoState): SupervisorWorkspaceUser[] {
  const supervisor = requireDemoSession(state);
  if (supervisor.role !== "SCIENTIFIC_SUPERVISOR") throw new Error("این کارتابل فقط برای مدیر علمی است.");
  const trainees = state.users.filter((u) => ["APPRENTICE", "INTERN"].includes(u.role));
  const users: SupervisorWorkspaceUser[] = trainees.map((u) => {
    const evalRow = state.evaluations.find((e) => e.userId === u.id && e.status === "PENDING");
    const cases = state.researchCases.filter(
      (c) => c.researcherId === u.id && c.supervisors?.some((s) => s.userId === supervisor.id && s.isActive),
    );
    const pendingReqs = state.changeRequests.filter((r) => r.status === "PENDING" && cases.some((c) => c.id === r.researchCaseId));
    const submittedStagesCount = cases.reduce((acc, c) => acc + c.stages.filter((s) => s.status === "SUBMITTED").length, 0);
    const pendingCount = (evalRow ? 1 : 0) + pendingReqs.length + submittedStagesCount;
    const dates: string[] = [];
    if (evalRow) dates.push(evalRow.createdAt);
    pendingReqs.forEach((r) => dates.push(r.createdAt));
    cases.forEach((c) => { if (c.updatedAt && c.stages.some((s) => s.status === "SUBMITTED")) dates.push(c.updatedAt); });
    const oldestPendingAt = dates.sort()[0] ?? null;
    const applicantMatch = state.applicants.find((a) => a.phoneNumber === u.phoneNumber);
    return {
      id: u.id,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      stage: u.stage,
      nationalId: applicantMatch?.nationalId ?? "0012345678",
      age: applicantMatch?.age ?? 25,
      provinceId: u.provinceId ?? IRAN_PROVINCES[27]!.id,
      provinceName: provinceNameFromId(u.provinceId ?? IRAN_PROVINCES[27]!.id) ?? "مرکزی",
      education: applicantMatch?.education ?? "کارشناسی ارشد",
      fieldOfStudy: applicantMatch?.fieldOfStudy ?? "علوم اجتماعی",
      cases: cases.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        subject: c.subject,
        status: c.status,
        version: c.version,
        researcherId: c.researcherId ?? null,
        stages: c.stages.map((s) => ({ ...s })),
        canReview: true,
      })),
      pendingCount,
      oldestPendingAt,
      pendingStudyEvaluationId: evalRow?.id ?? null,
      changeRequests: pendingReqs,
      canCreateResearch: true,
      history: DEMO_SUPERVISOR_HISTORY,
    };
  });
  return users.sort((a, b) => {
    if ((a.pendingCount > 0) !== (b.pendingCount > 0)) return a.pendingCount > 0 ? -1 : 1;
    if (a.oldestPendingAt && b.oldestPendingAt) return a.oldestPendingAt.localeCompare(b.oldestPendingAt);
    return a.fullName.localeCompare(b.fullName, "fa");
  });
}

export function getDemoSupervisorWorkspace() {
  const users = buildWorkspaceUsers(readDemoState());
  return { users, total: users.length };
}

export function getDemoSupervisorTraineeProfile(userId: string) {
  const user = buildWorkspaceUsers(readDemoState()).find((u) => u.id === userId);
  if (!user) throw new Error("پروفایل کاربر در محدوده دسترسی یافت نشد.");
  return user;
}

export function getDemoTrainees() {
  return buildWorkspaceUsers(readDemoState()).map(({ id, fullName, phoneNumber, stage }) => ({ id, fullName, phoneNumber, stage }));
}

export function getDemoSupervisorReviews() {
  const state = readDemoState();
  const supervisor = requireDemoSession(state);
  if (supervisor.role !== "SCIENTIFIC_SUPERVISOR") return [];
  return state.researchCases.flatMap((c) => {
    const researcher = state.users.find((u) => u.id === c.researcherId);
    return c.stages
      .filter((s) => s.status === "SUBMITTED" && s.stageType !== "SCENARIO")
      .map((s) => ({
        id: s.id,
        kind: s.stageType === "SOURCES" ? ("SOURCE_STAGE" as const) : ("SUBMISSION" as const),
        caseId: c.id,
        caseCode: c.code,
        caseTitle: c.title,
        researcherId: c.researcherId ?? "",
        internName: researcher?.fullName ?? "پژوهشگر",
        stageId: s.id,
        stageType: s.stageType,
        stageName: s.stageType,
        caseVersion: c.version,
        submittedAt: c.updatedAt ?? "2026-11-07T11:30:00.000Z",
        summary: "مرحله ارسال‌شده جهت بررسی مدیر علمی (حالت نمایشی).",
      }));
  });
}

export function getDemoSupervisorScenarios() {
  const state = readDemoState();
  if (requireDemoSession(state).role !== "SCIENTIFIC_SUPERVISOR") return [];
  return DEMO_CASE_SCENARIOS.filter((sc) => sc.status === "UNDER_REVIEW").map((sc) => {
    const researchCase = state.researchCases.find((c) => c.id === sc.researchCaseId);
    const intern = state.users.find((u) => u.id === researchCase?.researcherId);
    return {
      id: sc.id,
      version: sc.version,
      caseVersion: researchCase?.version ?? 1,
      title: sc.title,
      summary: sc.summary,
      content: sc.content,
      caseId: sc.researchCaseId,
      caseCode: researchCase?.code ?? "TS-DEMO",
      caseTitle: researchCase?.title ?? "پژوهش نمونه",
      internName: intern?.fullName ?? "پژوهشگر نمونه",
    };
  });
}

export function getDemoApplicants(): ApplicantItem[] {
  const state = readDemoState();
  const user = requireDemoSession(state);
  if (!["PROVINCIAL_DIRECTOR", "SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN"].includes(user.role)) {
    throw new Error("فهرست پذیرش در دسترس این نقش نیست.");
  }
  return state.applicants.map((a) => ({ ...a }));
}

export function getDemoApplicant(id: string): ApplicantItem {
  const found = getDemoApplicants().find((a) => a.id === id);
  if (!found) throw new Error("پرونده متقاضی پیدا نشد.");
  return found;
}

export function updateDemoApplicantStatus(id: string, status: ApplicantStatus, reason?: string): void {
  updateDemoState((state) => {
    const role = requireDemoSession(state).role;
    if (!["PROVINCIAL_DIRECTOR", "SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN"].includes(role)) {
      throw new Error("تغییر پرونده پذیرش برای این نقش مجاز نیست.");
    }
    const now = new Date().toISOString();
    const target = state.applicants.find((a) => a.id === id);
    if (!target) throw new Error("پرونده نمونه پیدا نشد.");
    const applicants = state.applicants.map((a) =>
      a.id === id ? { ...a, status, updatedAt: now, ...(status === "REJECTED" && reason ? { rejectionReason: reason } : {}) } : a,
    );
    const exists = state.users.some((u) => u.phoneNumber === target.phoneNumber);
    const users = status === "APPROVED" && !exists
      ? [...state.users, {
        id: globalThis.crypto?.randomUUID?.() ?? "70000000-0000-4000-8000-000000000001",
        phoneNumber: target.phoneNumber,
        fullName: target.fullName,
        role: "APPRENTICE" as const,
        roles: ["APPRENTICE" as const],
        stage: "APPRENTICE" as const,
        isSuspended: false,
        provinceId: target.provinceId,
      }]
      : state.users;
    return { state: { ...state, users, applicants }, result: undefined };
  });
}

export function getDemoAssetPath(documentId: string): string | null {
  const state = readDemoState();
  requireDemoSession(state);
  if (state.archivedDocumentIds.includes(documentId)) return null;
  return DEMO_DOCUMENT_SEEDS.find((d) => d.documentId === documentId)?.assetPath ?? null;
}

function accessibleDemoCase(state: DemoState, caseId: string) {
  const user = requireDemoSession(state);
  const rc = state.researchCases.find((item) => item.id === caseId);
  if (!rc) return null;
  if (rc.researcherId === user.id || ["TRACKING_DIRECTOR", "SYSTEM_ADMIN"].includes(user.role)) return rc;
  if (user.role === "SCIENTIFIC_SUPERVISOR" && rc.supervisors?.some((s) => s.userId === user.id && s.isActive)) return rc;
  return null;
}

export function getDemoResearchCases(researcherId?: string | null) {
  const state = readDemoState();
  const user = requireDemoSession(state);
  if (user.role === "INTERN" || user.role === "APPRENTICE") {
    return state.researchCases.filter((rc) => rc.researcherId === user.id && (!researcherId || researcherId === user.id));
  }
  if (user.role === "SCIENTIFIC_SUPERVISOR") {
    return state.researchCases.filter(
      (rc) => (!researcherId || rc.researcherId === researcherId) && rc.supervisors?.some((s) => s.userId === user.id && s.isActive),
    );
  }
  return [];
}

export function getDemoResearchCase(caseId: string) {
  const rc = accessibleDemoCase(readDemoState(), caseId);
  if (!rc) throw new Error("پرونده در این حساب نمایشی قابل مشاهده نیست.");
  return rc;
}

export function getDemoCaseResources(caseId: string) {
  if (!accessibleDemoCase(readDemoState(), caseId)) throw new Error("پرونده در این حساب نمایشی قابل مشاهده نیست.");
  return DEMO_CASE_RESOURCES.filter((r) => r.researchCaseId === caseId);
}

export function getDemoStageSubmissions(stageId: string) {
  const state = readDemoState();
  const rc = state.researchCases.find((item) => item.stages.some((s) => s.id === stageId));
  if (!rc || !accessibleDemoCase(state, rc.id)) throw new Error("مرحله در این حساب نمایشی قابل مشاهده نیست.");
  return DEMO_STAGE_SUBMISSIONS[stageId] ?? [];
}

export function getDemoCaseScenarios(caseId: string) {
  if (!accessibleDemoCase(readDemoState(), caseId)) throw new Error("پرونده در این حساب نمایشی قابل مشاهده نیست.");
  return DEMO_CASE_SCENARIOS.filter((s) => s.researchCaseId === caseId);
}

export function getDemoCaseChangeRequests(caseId: string) {
  const state = readDemoState();
  if (!accessibleDemoCase(state, caseId)) throw new Error("پرونده در این حساب نمایشی قابل مشاهده نیست.");
  return state.changeRequests.filter((r) => r.researchCaseId === caseId);
}

export { DEMO_AUDIT_EVENTS };
