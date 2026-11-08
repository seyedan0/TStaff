import type { ProblemDetails } from "@tstaff/contracts";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  public problem: ProblemDetails;
  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title || "خطایی رخ داده است");
    this.name = "ApiError";
    this.problem = problem;
  }
}

class ApiClient {
  public setAuth(_token: string | null, _stage: string = "INTERN", _userId: string | null = null) {}

  public getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof document !== "undefined") {
      const csrf = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith("tstaff_csrf="))?.split("=").slice(1).join("=");
      if (csrf) headers["X-CSRF-Token"] = decodeURIComponent(csrf);
    }
    return headers;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const mergedHeaders = {
      ...this.getHeaders(),
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders,
      credentials: "include",
    });

    if (!response.ok) {
      let problem: ProblemDetails;
      try {
        problem = await response.json();
      } catch {
        problem = {
          type: "https://api.tstaff.ir/problems/http-error",
          title: `خطای سرور (${response.status})`,
          status: response.status,
          code: "HTTP_ERROR",
          detail: response.statusText || "خطا در برقراری ارتباط با سرور",
          traceId: "client-gen",
        };
      }
      throw new ApiError(problem);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  public get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  public post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async upload<T>(endpoint: string, file: File): Promise<T> {
    const form = new FormData();
    form.append("file", file);
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(this.getHeaders());
    headers.delete("Content-Type");
    const response = await fetch(url, { method: "POST", headers, body: form, credentials: "include" });
    if (!response.ok) {
      let problem: ProblemDetails;
      try { problem = await response.json(); }
      catch { problem = { type: "https://api.tstaff.ir/problems/http-error", title: `خطای سرور (${response.status})`, status: response.status, code: "HTTP_ERROR", detail: response.statusText || "خطا در برقراری ارتباط با سرور", traceId: "client-gen" }; }
      throw new ApiError(problem);
    }
    return response.json();
  }

  public async download(endpoint: string, filename: string): Promise<void> {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(this.getHeaders());
    headers.delete("Content-Type");
    const response = await fetch(url, { headers, credentials: "include" });
    if (!response.ok) throw new Error("دریافت فایل مجاز نیست یا فایل در دسترس نیست");
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  public put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
