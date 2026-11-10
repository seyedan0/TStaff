import { IRAN_PROVINCES, type ResourceBankItem, type ResourceBankPage } from "@tstaff/contracts";
import { DEMO_AUDIT_EVENTS, DEMO_CONTACTS, DEMO_DIRECTORY_USERS } from "./demo-seed.js";
import { readDemoState, requireDemoSession, updateDemoState } from "./demo-store.js";

export function getDemoResourceBankPage(q: string | null, provinceId: string | null, page: number, limit: number): ResourceBankPage {
  const state = readDemoState();
  const user = requireDemoSession(state);
  if (!["TRACKING_DIRECTOR", "PROVINCIAL_DIRECTOR"].includes(user.role)) {
    throw new Error("دسترسی به بانک منابع مجاز نیست.");
  }
  const activeScopes = state.scopes.filter((s) => s.managerId === user.id && !s.revokedAt).map((s) => s.provinceId);
  const needle = (q ?? "").trim().toLowerCase();
  const visible = state.resourceBank.filter((item) => {
    const scopeAllowed =
      user.role === "TRACKING_DIRECTOR" ||
      (item.provinceId && activeScopes.includes(item.provinceId)) ||
      item.referrals.some((r) => r.recipientId === user.id && r.status !== "REVOKED");
    if (!scopeAllowed) return false;
    if (provinceId && item.provinceId !== provinceId) return false;
    if (!needle) return true;
    return `${item.fullName} ${item.position ?? ""} ${item.province ?? ""} ${item.county ?? ""} ${item.organization?.name ?? ""}`.toLowerCase().includes(needle);
  });
  const start = (page - 1) * limit;
  return { items: visible.slice(start, start + limit), total: visible.length, page, limit };
}

export function getDemoResourceBankItem(id: string): ResourceBankItem {
  const page = getDemoResourceBankPage(null, null, 1, 100);
  const found = page.items.find((item) => item.id === id);
  if (!found) throw new Error("منبع مورد نظر در محدوده دسترسی یافت نشد.");
  return found;
}

export function getDemoOrganizationScopes() {
  const state = readDemoState();
  const user = requireDemoSession(state);
  if (user.role === "TRACKING_DIRECTOR") return state.scopes.filter((s) => !s.revokedAt);
  return state.scopes.filter((s) => s.managerId === user.id && !s.revokedAt);
}

export function getDemoDirectoryUsers(managersOnly = false) {
  const state = readDemoState();
  requireDemoSession(state);
  const list = state.users.map((u) => {
    const seeded = DEMO_DIRECTORY_USERS.find((d) => d.id === u.id);
    return {
      id: u.id,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      stage: u.stage,
      role: u.role,
      roles: u.roles ?? [u.role],
      isActive: !u.isSuspended,
      provinceId: u.provinceId ?? null,
      createdAt: seeded?.createdAt ?? "2026-11-01T09:00:00.000Z",
    };
  });
  return managersOnly ? list.filter((u) => !["APPRENTICE", "INTERN"].includes(u.role)) : list;
}

export function getDemoSupportTickets() {
  const state = readDemoState();
  requireDemoSession(state);
  return state.supportTickets.map((t) => ({ ...t }));
}

export function createDemoSupportTicket(subject: string, description: string) {
  return updateDemoState((state) => {
    const user = requireDemoSession(state);
    const now = new Date().toISOString();
    const ticket = {
      id: globalThis.crypto?.randomUUID?.() ?? `71000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`,
      userId: user.id,
      subject,
      description,
      status: "OPEN" as const,
      createdAt: now,
      updatedAt: now,
      userFullName: user.fullName,
      userPhone: user.phoneNumber,
    };
    return { state: { ...state, supportTickets: [ticket, ...state.supportTickets] }, result: ticket };
  });
}

export function resolveDemoSupportTicket(id: string, status: "RESOLVED" | "CLOSED", response: string) {
  return updateDemoState((state) => {
    requireDemoSession(state);
    const now = new Date().toISOString();
    const tickets = state.supportTickets.map((t) => (t.id === id ? { ...t, status, response, updatedAt: now } : t));
    return { state: { ...state, supportTickets: tickets }, result: {} };
  });
}

export function getDemoConversations() {
  const state = readDemoState();
  const me = requireDemoSession(state);
  return state.conversations
    .filter((c) => c.participantIds.includes(me.id))
    .map((c) => {
      const otherId = c.participantIds.find((pid) => pid !== me.id) ?? me.id;
      const other = state.users.find((u) => u.id === otherId);
      const msgs = state.messages.filter((m) => m.conversationId === c.id);
      return {
        id: c.id,
        type: c.type,
        researchCaseId: c.researchCaseId ?? null,
        updatedAt: c.updatedAt,
        otherParticipant: other
          ? { id: other.id, fullName: other.fullName, phoneNumber: other.phoneNumber, role: other.role, stage: other.stage }
          : null,
        lastMessage: msgs.at(-1) ?? null,
      };
    });
}

export function getDemoConversationContacts() {
  const state = readDemoState();
  const me = requireDemoSession(state);
  return DEMO_CONTACTS.filter((c) => c.id !== me.id);
}

export function createDemoConversation(participantId: string, type: string) {
  return updateDemoState((state) => {
    const me = requireDemoSession(state);
    const existing = state.conversations.find((c) => c.participantIds.includes(me.id) && c.participantIds.includes(participantId));
    if (existing) return { state, result: existing };
    const created = {
      id: globalThis.crypto?.randomUUID?.() ?? `72000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`,
      type,
      researchCaseId: null,
      updatedAt: new Date().toISOString(),
      participantIds: [me.id, participantId],
    };
    return { state: { ...state, conversations: [created, ...state.conversations] }, result: created };
  });
}

export function getDemoConversationMessages(conversationId: string) {
  const state = readDemoState();
  const me = requireDemoSession(state);
  const conv = state.conversations.find((c) => c.id === conversationId && c.participantIds.includes(me.id));
  if (!conv) throw new Error("گفت‌وگو در دسترس نیست.");
  return state.messages.filter((m) => m.conversationId === conversationId);
}

export function sendDemoMessage(conversationId: string, content: string) {
  return updateDemoState((state) => {
    const me = requireDemoSession(state);
    const now = new Date().toISOString();
    const message = {
      id: globalThis.crypto?.randomUUID?.() ?? `73000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`,
      conversationId,
      senderId: me.id,
      content,
      attachmentId: null,
      createdAt: now,
    };
    const conversations = state.conversations.map((c) => (c.id === conversationId ? { ...c, updatedAt: now } : c));
    return { state: { ...state, conversations, messages: [...state.messages, message] }, result: message };
  });
}

export function getDemoProvincialMetrics(provinceId?: string | null) {
  const state = readDemoState();
  requireDemoSession(state);
  const apps = provinceId ? state.applicants.filter((a) => a.provinceId === provinceId) : state.applicants;
  const users = provinceId ? state.users.filter((u) => u.provinceId === provinceId) : state.users;
  return {
    ...(provinceId ? { provinceId } : {}),
    totalApplicants: apps.length,
    approvedApplicants: apps.filter((a) => a.status === "APPROVED").length,
    totalApprentices: users.filter((u) => u.role === "APPRENTICE").length,
    totalInterns: users.filter((u) => u.role === "INTERN").length,
    activeResearchCases: state.researchCases.length,
  };
}

export function getDemoGeneralSummary() {
  const state = readDemoState();
  requireDemoSession(state);
  return {
    totalUsers: state.users.length,
    totalApplicants: state.applicants.length,
    totalResearchCases: state.researchCases.length,
    casesByStage: { SOURCES: 0, EXPLANATION: 0, PRESCRIPTION: 0, SCENARIO: state.researchCases.length },
    completedScenariosCount: 0,
    activeSupervisorsCount: state.users.filter((u) => u.role === "SCIENTIFIC_SUPERVISOR" && !u.isSuspended).length,
  };
}

export function getDemoTrackingBacklog() {
  const state = readDemoState();
  requireDemoSession(state);
  return { delayedCasesCount: 0, reviewRequiredCasesCount: 0, unassignedCasesCount: 0, backlogItems: [] };
}

export function getDemoWorkflowMetrics() {
  requireDemoSession(readDemoState());
  return {
    averageStageCompletionDays: { SOURCES: 4, EXPLANATION: 6, PRESCRIPTION: 5, SCENARIO: 0 },
    rollbackFrequencyByStage: { SOURCES: 0, EXPLANATION: 0, PRESCRIPTION: 0, SCENARIO: 0 },
  };
}

export function getDemoAuditEvents(q?: string | null) {
  requireDemoSession(readDemoState());
  const needle = (q ?? "").trim().toLowerCase();
  return DEMO_AUDIT_EVENTS.filter((e) => !needle || `${e.action} ${e.aggregateType} ${e.aggregateId}`.toLowerCase().includes(needle));
}

export function getDemoSettings() {
  return readDemoState().settings.map((s) => ({ ...s }));
}

export function updateDemoSetting(key: string, value: string, description?: string) {
  return updateDemoState((state) => {
    requireDemoSession(state);
    const now = new Date().toISOString();
    const exists = state.settings.some((s) => s.key === key);
    const settings = exists
      ? state.settings.map((s) => (s.key === key ? { ...s, value, ...(description ? { description } : {}), updatedAt: now } : s))
      : [...state.settings, { key, value, description: description ?? null, updatedAt: now }];
    return { state: { ...state, settings }, result: {} };
  });
}

export function getDemoArchiveJobs() {
  return readDemoState().archiveJobs.map((j) => ({ ...j }));
}

export function getDemoHealth() {
  return { status: "ok", timestamp: new Date().toISOString(), uptime: 1200, version: "0.1.0-demo", database: "connected" };
}

export { IRAN_PROVINCES };

