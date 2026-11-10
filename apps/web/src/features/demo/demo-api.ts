import type { ApplicantStatus } from "@tstaff/contracts";
import {
  createDemoConversation,
  createDemoSupportTicket,
  getDemoArchiveJobs,
  getDemoAuditEvents,
  getDemoConversationContacts,
  getDemoConversationMessages,
  getDemoConversations,
  getDemoDirectoryUsers,
  getDemoGeneralSummary,
  getDemoHealth,
  getDemoOrganizationScopes,
  getDemoProvincialMetrics,
  getDemoResourceBankItem,
  getDemoResourceBankPage,
  getDemoSettings,
  getDemoSupportTickets,
  getDemoTrackingBacklog,
  getDemoWorkflowMetrics,
  IRAN_PROVINCES,
  resolveDemoSupportTicket,
  sendDemoMessage,
  updateDemoSetting,
} from "./demo-admin-store.js";
import {
  decideDemoEvaluation,
  getDemoApplicant,
  getDemoApplicants,
  getDemoAssetPath,
  getDemoCaseChangeRequests,
  getDemoCaseResources,
  getDemoCaseScenarios,
  getDemoManagedDocuments,
  getDemoPendingEvaluations,
  getDemoPublishedDocument,
  getDemoPublishedDocuments,
  getDemoResearchCase,
  getDemoResearchCases,
  getDemoSession,
  getDemoStageSubmissions,
  getDemoStudyEvaluation,
  getDemoSupervisorReviews,
  getDemoSupervisorScenarios,
  getDemoSupervisorTraineeProfile,
  getDemoSupervisorWorkspace,
  getDemoTrainees,
  loginDemoPersona,
  logoutDemo,
  markDemoDocumentRead,
  requestDemoStudyEvaluation,
  updateDemoApplicantStatus,
} from "./demo-store.js";

function pathname(endpoint: string): string {
  return endpoint.split("?", 1)[0] ?? endpoint;
}

function queryOf(endpoint: string): URLSearchParams {
  const idx = endpoint.indexOf("?");
  return idx >= 0 ? new URLSearchParams(endpoint.slice(idx + 1)) : new URLSearchParams();
}

function bodyOf(options: RequestInit): Record<string, unknown> {
  if (typeof options.body !== "string") return {};
  try {
    const value: unknown = JSON.parse(options.body);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function requestDemo<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const path = pathname(endpoint);
  const query = queryOf(endpoint);
  const body = bodyOf(options);
  let result: unknown;

  if (method === "GET" && path === "/auth/session") {
    result = { user: getDemoSession() };
  } else if (method === "POST" && path === "/demo/login") {
    result = { user: loginDemoPersona(String(body.personaId ?? "")) };
  } else if (method === "POST" && path === "/auth/logout") {
    logoutDemo();
    result = {};
  } else if (method === "GET" && path === "/documents") {
    result = getDemoPublishedDocuments();
  } else if (method === "GET" && path === "/documents/management") {
    result = getDemoManagedDocuments();
  } else if (method === "GET" && path === "/users/study-evaluations/my-status") {
    result = getDemoStudyEvaluation();
  } else if (method === "POST" && path === "/users/study-evaluations/request") {
    result = requestDemoStudyEvaluation(typeof body.notes === "string" ? body.notes : undefined);
  } else if (method === "GET" && path === "/users/study-evaluations/pending") {
    result = getDemoPendingEvaluations();
  } else if (method === "GET" && path === "/scientific-supervisors/me/workspace") {
    result = getDemoSupervisorWorkspace();
  } else if (method === "GET" && path === "/scientific-supervisors/me/trainees") {
    result = getDemoTrainees();
  } else if (method === "GET" && path === "/scientific-supervisors/me/reviews") {
    result = getDemoSupervisorReviews();
  } else if (method === "GET" && path === "/scientific-supervisors/me/scenarios") {
    result = getDemoSupervisorScenarios();
  } else if (method === "GET" && path === "/applicants") {
    result = getDemoApplicants();
  } else if (method === "GET" && path === "/research-cases") {
    result = getDemoResearchCases(query.get("researcherId"));
  } else if (method === "GET" && path === "/research-cases/directory") {
    result = getDemoResearchCases(null);
  } else if (method === "GET" && path === "/resource-bank") {
    result = getDemoResourceBankPage(query.get("q"), query.get("provinceId"), Number(query.get("page") || 1), Number(query.get("limit") || 12));
  } else if (method === "GET" && path === "/organization/provinces") {
    result = IRAN_PROVINCES;
  } else if (method === "GET" && path === "/organization/scopes") {
    result = getDemoOrganizationScopes();
  } else if (method === "GET" && path === "/organization/user-grants") {
    result = [];
  } else if (method === "GET" && path === "/users") {
    result = getDemoDirectoryUsers(false);
  } else if (method === "GET" && path === "/users/managers") {
    result = getDemoDirectoryUsers(true);
  } else if (method === "GET" && path === "/users/support-tickets") {
    result = getDemoSupportTickets();
  } else if (method === "POST" && path === "/users/support-tickets") {
    result = createDemoSupportTicket(String(body.subject ?? ""), String(body.description ?? ""));
  } else if (method === "GET" && path === "/conversations") {
    result = getDemoConversations();
  } else if (method === "GET" && path === "/conversations/contacts") {
    result = getDemoConversationContacts();
  } else if (method === "POST" && path === "/conversations") {
    result = createDemoConversation(String(body.participantId ?? ""), String(body.type ?? "DIRECT_SUPERVISOR_TRAINEE"));
  } else if (method === "GET" && path === "/reporting/provincial-director") {
    result = getDemoProvincialMetrics(query.get("provinceId"));
  } else if (method === "GET" && path === "/reporting/general-director-summary") {
    result = getDemoGeneralSummary();
  } else if (method === "GET" && path === "/reporting/tracking-director-backlog") {
    result = getDemoTrackingBacklog();
  } else if (method === "GET" && path === "/reporting/workflow-metrics") {
    result = getDemoWorkflowMetrics();
  } else if (method === "GET" && path === "/audit-events") {
    result = getDemoAuditEvents(query.get("q"));
  } else if (method === "GET" && path === "/settings") {
    result = getDemoSettings();
  } else if (method === "GET" && path === "/archives/jobs") {
    result = getDemoArchiveJobs();
  } else if (method === "GET" && path === "/health") {
    result = getDemoHealth();
  } else {
    const docDetailMatch = path.match(/^\/documents\/([^/]+)$/);
    const readMatch = path.match(/^\/documents\/([^/]+)\/versions\/([^/]+)\/read$/);
    const traineeProfileMatch = path.match(/^\/scientific-supervisors\/me\/trainees\/([^/]+)$/);
    const decisionMatch = path.match(/^\/users\/study-evaluations\/([^/]+)\/decide$/);
    const ticketResolveMatch = path.match(/^\/users\/support-tickets\/([^/]+)\/resolve$/);
    const applicantDetailMatch = path.match(/^\/applicants\/([^/]+)$/);
    const applicantSubmitMatch = path.match(/^\/applicants\/([^/]+)\/submit$/);
    const applicantDecisionMatch = path.match(/^\/applicants\/([^/]+)\/decisions$/);
    const applicantReopenMatch = path.match(/^\/applicants\/([^/]+)\/reopen$/);
    const resourceBankItemMatch = path.match(/^\/resource-bank\/([^/]+)$/);
    const caseDetailMatch = path.match(/^\/research-cases\/([^/]+)$/);
    const resourcesMatch = path.match(/^\/research-cases\/([^/]+)\/resources$/);
    const stageSubmissionsMatch = path.match(/^\/stages\/([^/]+)\/submissions$/);
    const caseScenariosMatch = path.match(/^\/research-cases\/([^/]+)\/scenarios$/);
    const caseChangeReqsMatch = path.match(/^\/research-cases\/([^/]+)\/change-requests$/);
    const convMessagesMatch = path.match(/^\/conversations\/([^/]+)\/messages$/);
    const settingPutMatch = path.match(/^\/settings\/([^/]+)$/);

    if (method === "GET" && docDetailMatch) {
      result = getDemoPublishedDocument(docDetailMatch[1]!);
    } else if (method === "GET" && traineeProfileMatch) {
      result = getDemoSupervisorTraineeProfile(traineeProfileMatch[1]!);
    } else if (method === "GET" && applicantDetailMatch) {
      result = getDemoApplicant(applicantDetailMatch[1]!);
    } else if (method === "GET" && resourceBankItemMatch) {
      result = getDemoResourceBankItem(resourceBankItemMatch[1]!);
    } else if (method === "GET" && caseDetailMatch) {
      result = getDemoResearchCase(caseDetailMatch[1]!);
    } else if (method === "GET" && resourcesMatch) {
      result = getDemoCaseResources(resourcesMatch[1]!);
    } else if (method === "GET" && stageSubmissionsMatch) {
      result = getDemoStageSubmissions(stageSubmissionsMatch[1]!);
    } else if (method === "GET" && caseScenariosMatch) {
      result = getDemoCaseScenarios(caseScenariosMatch[1]!);
    } else if (method === "GET" && caseChangeReqsMatch) {
      result = getDemoCaseChangeRequests(caseChangeReqsMatch[1]!);
    } else if (method === "GET" && convMessagesMatch) {
      result = getDemoConversationMessages(convMessagesMatch[1]!);
    } else if (method === "POST" && convMessagesMatch) {
      result = sendDemoMessage(convMessagesMatch[1]!, String(body.content ?? ""));
    } else if (method === "POST" && readMatch) {
      markDemoDocumentRead(readMatch[1]!, readMatch[2]!);
      result = {};
    } else if (method === "POST" && decisionMatch) {
      if ((body.decision !== "APPROVED" && body.decision !== "REVISION_REQUIRED") || typeof body.feedback !== "string" || body.feedback.trim().length < 5) {
        throw new Error("تصمیم ارزیابی نمونه معتبر نیست.");
      }
      decideDemoEvaluation(decisionMatch[1]!, body.decision, body.feedback.trim());
      result = {};
    } else if (method === "POST" && ticketResolveMatch) {
      const status = body.status === "CLOSED" ? "CLOSED" : "RESOLVED";
      result = resolveDemoSupportTicket(ticketResolveMatch[1]!, status, String(body.response ?? ""));
    } else if (method === "POST" && applicantSubmitMatch) {
      updateDemoApplicantStatus(applicantSubmitMatch[1]!, "IN_REVIEW");
      result = {};
    } else if (method === "POST" && applicantDecisionMatch) {
      const status: ApplicantStatus | null = body.decision === "APPROVED" || body.decision === "REJECTED" ? body.decision : null;
      if (!status) throw new Error("تصمیم پذیرش نمونه معتبر نیست.");
      updateDemoApplicantStatus(
        applicantDecisionMatch[1]!,
        status,
        typeof body.reviewerNotes === "string" ? body.reviewerNotes : typeof body.reason === "string" ? body.reason : undefined,
      );
      result = {};
    } else if (method === "POST" && applicantReopenMatch) {
      updateDemoApplicantStatus(applicantReopenMatch[1]!, "REOPEN_REQUESTED");
      result = {};
    } else if (method === "PUT" && settingPutMatch) {
      result = updateDemoSetting(decodeURIComponent(settingPutMatch[1]!), String(body.value ?? ""), typeof body.description === "string" ? body.description : undefined);
    } else {
      throw new Error("این عملیات در نسخه نمایشی بدون API فعال نیست.");
    }
  }

  return result as T;
}

export async function downloadDemo(endpoint: string, filename: string): Promise<void> {
  const match = pathname(endpoint).match(/^\/documents\/([^/]+)\/download$/);
  if (!match) throw new Error("این فایل در نسخه نمایشی در دسترس نیست.");
  const assetPath = getDemoAssetPath(match[1]!);
  if (!assetPath) throw new Error("فایل نمونه پیدا نشد.");

  const response = await fetch(assetPath, { credentials: "omit" });
  if (!response.ok) throw new Error("فایل نمونه در دسترس نیست.");
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
