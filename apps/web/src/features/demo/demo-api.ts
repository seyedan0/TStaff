import type { ApplicantStatus } from "@tstaff/contracts";
import {
  decideDemoEvaluation,
  getDemoApplicants,
  getDemoAssetPath,
  getDemoManagedDocuments,
  getDemoPendingEvaluations,
  getDemoPublishedDocuments,
  getDemoCaseResources,
  getDemoCaseScenarios,
  getDemoResearchCases,
  getDemoSession,
  getDemoStageSubmissions,
  getDemoStudyEvaluation,
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

function bodyOf(options: RequestInit): Record<string, unknown> {
  if (typeof options.body !== "string") return {};
  try {
    const value: unknown = JSON.parse(options.body);
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function requestDemo<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const path = pathname(endpoint);
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
  } else if (method === "GET" && path === "/scientific-supervisors/me/trainees") {
    result = getDemoTrainees();
  } else if (method === "GET" && path === "/applicants") {
    result = getDemoApplicants();
  } else if (method === "GET" && path === "/research-cases") {
    const query = endpoint.includes("?") ? new URLSearchParams(endpoint.slice(endpoint.indexOf("?") + 1)) : new URLSearchParams();
    result = getDemoResearchCases(query.get("researcherId"));
  } else {
    const readMatch = path.match(/^\/documents\/([^/]+)\/versions\/([^/]+)\/read$/);
    const decisionMatch = path.match(/^\/users\/study-evaluations\/([^/]+)\/decide$/);
    const applicantSubmitMatch = path.match(/^\/applicants\/([^/]+)\/submit$/);
    const applicantDecisionMatch = path.match(/^\/applicants\/([^/]+)\/decisions$/);
    const applicantReopenMatch = path.match(/^\/applicants\/([^/]+)\/reopen$/);
    const resourcesMatch = path.match(/^\/research-cases\/([^/]+)\/resources$/);
    const stageSubmissionsMatch = path.match(/^\/stages\/([^/]+)\/submissions$/);
    const caseScenariosMatch = path.match(/^\/research-cases\/([^/]+)\/scenarios$/);

    if (method === "GET" && resourcesMatch) {
      result = getDemoCaseResources(resourcesMatch[1]!);
    } else if (method === "GET" && stageSubmissionsMatch) {
      result = getDemoStageSubmissions(stageSubmissionsMatch[1]!);
    } else if (method === "GET" && caseScenariosMatch) {
      result = getDemoCaseScenarios(caseScenariosMatch[1]!);
    } else if (method === "POST" && readMatch) {
      markDemoDocumentRead(readMatch[1]!, readMatch[2]!);
      result = {};
    } else if (method === "POST" && decisionMatch) {
      if ((body.decision !== "APPROVED" && body.decision !== "REVISION_REQUIRED") || typeof body.feedback !== "string" || body.feedback.trim().length < 5) {
        throw new Error("تصمیم ارزیابی نمونه معتبر نیست.");
      }
      decideDemoEvaluation(decisionMatch[1]!, body.decision, body.feedback.trim());
      result = {};
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
    } else {
      throw new Error("این عملیات در نسخه‌ی نمایشیِ بدون API فعال نیست.");
    }
  }

  return result as T;
}

export async function downloadDemo(endpoint: string, filename: string): Promise<void> {
  const match = pathname(endpoint).match(/^\/documents\/([^/]+)\/download$/);
  if (!match) throw new Error("این فایل در نسخه‌ی نمایشی در دسترس نیست.");
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
