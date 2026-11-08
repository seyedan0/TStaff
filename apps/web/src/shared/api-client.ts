import type { ProblemDetails } from "@tstaff/contracts";
import { safeStorage } from "./storage.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export class ApiError extends Error {
  public problem: ProblemDetails;
  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title || "خطایی رخ داده است");
    this.name = "ApiError";
    this.problem = problem;
  }
}

class ApiClient {
  private token: string | null = null;
  private userStage: string = "INTERN";
  private userId: string | null = null;

  constructor() {
    this.token = safeStorage.getItem("tstaff_token");
    this.userStage = safeStorage.getItem("tstaff_user_stage") || "INTERN";
    this.userId = safeStorage.getItem("tstaff_user_id");
  }

  public setAuth(token: string | null, stage: string = "INTERN", userId: string | null = null) {
    this.token = token;
    this.userStage = stage;
    this.userId = userId;
    if (token) safeStorage.setItem("tstaff_token", token);
    else safeStorage.removeItem("tstaff_token");
    safeStorage.setItem("tstaff_user_stage", stage);
    if (userId) safeStorage.setItem("tstaff_user_id", userId);
    else safeStorage.removeItem("tstaff_user_id");
  }

  public getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-stage": this.userStage,
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    if (this.userId) {
      headers["x-user-id"] = this.userId;
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
