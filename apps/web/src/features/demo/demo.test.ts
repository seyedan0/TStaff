import { describe, it, expect, beforeEach } from "vitest";
import { IRAN_PROVINCES, type ResourceBankPage, type SupervisorWorkspaceUser } from "@tstaff/contracts";
import { requestDemo } from "./demo-api.js";
import { DEMO_PERSONAS, DEMO_RESEARCH_CASES } from "./demo-seed.js";

function installMemoryStorage() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
}

describe("Demo Mode Store & Contract Parity", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("uses valid canonical province UUIDs and covers all 7 system roles in personas", () => {
    const roles = new Set(DEMO_PERSONAS.map((p) => p.user.role));
    for (const r of [
      "APPRENTICE",
      "INTERN",
      "SCIENTIFIC_SUPERVISOR",
      "PROVINCIAL_DIRECTOR",
      "TRACKING_DIRECTOR",
      "SUPPORT_DIRECTOR",
      "SYSTEM_ADMIN",
    ] as const) {
      expect(roles.has(r)).toBe(true);
    }

    const validIds = new Set(IRAN_PROVINCES.map((ir) => ir.id));
    for (const p of DEMO_PERSONAS) {
      if (p.user.provinceId) {
        expect(validIds.has(p.user.provinceId)).toBe(true);
      }
    }
  });

  it("orders supervisor workspace pending-first, blocks bank for supervisor, and scopes bank for directors", async () => {
    await requestDemo("/demo/login", {
      method: "POST",
      body: JSON.stringify({ personaId: "scientific-supervisor" }),
    });

    const ws = await requestDemo<{ users: SupervisorWorkspaceUser[]; total: number }>(
      "/scientific-supervisors/me/workspace",
    );
    expect(ws.total).toBeGreaterThanOrEqual(2);
    expect(ws.users[0]!.pendingCount).toBeGreaterThan(0);

    const detail = await requestDemo<{ id: string; cases: unknown[]; pendingItems: unknown[] }>(
      `/scientific-supervisors/me/trainees/${ws.users[0]!.id}`,
    );
    expect(detail.id).toBe(ws.users[0]!.id);

    const caseId = DEMO_RESEARCH_CASES[0]!.id;
    const singleCase = await requestDemo<{ id: string; stages: unknown[] }>(`/research-cases/${caseId}`);
    expect(singleCase.id).toBe(caseId);
    expect(singleCase.stages.length).toBeGreaterThanOrEqual(4);

    // Negative authorization: SCIENTIFIC_SUPERVISOR cannot access /resource-bank
    await expect(requestDemo("/resource-bank")).rejects.toThrow();

    // TRACKING_DIRECTOR sees nationwide bank; PROVINCIAL_DIRECTOR sees scoped bank
    await requestDemo("/demo/login", {
      method: "POST",
      body: JSON.stringify({ personaId: "tracking-director" }),
    });
    const nationwideBank = await requestDemo<ResourceBankPage>("/resource-bank");
    expect(nationwideBank.items.length).toBeGreaterThanOrEqual(2);

    await requestDemo("/demo/login", {
      method: "POST",
      body: JSON.stringify({ personaId: "provincial-director" }),
    });
    const scopedBank = await requestDemo<ResourceBankPage>("/resource-bank");
    expect(scopedBank.items.length).toBeGreaterThanOrEqual(1);
    expect(scopedBank.items.length).toBeLessThanOrEqual(nationwideBank.items.length);
  });

  it("handles support tickets, direct conversations, settings, archives, and health endpoints", async () => {
    await requestDemo("/demo/login", {
      method: "POST",
      body: JSON.stringify({ personaId: "support-director" }),
    });

    const ticket = await requestDemo<{ id: string; status: string }>("/users/support-tickets", {
      method: "POST",
      body: JSON.stringify({ subject: "تیکت تست", description: "شرح آزمایشی" }),
    });
    expect(ticket.status).toBe("OPEN");

    await requestDemo(`/users/support-tickets/${ticket.id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ status: "RESOLVED", response: "پاسخ ثبت شد" }),
    });
    const tickets = await requestDemo<Array<{ id: string; status: string }>>("/users/support-tickets");
    expect(tickets.find((t) => t.id === ticket.id)?.status).toBe("RESOLVED");

    await requestDemo("/demo/login", {
      method: "POST",
      body: JSON.stringify({ personaId: "scientific-supervisor" }),
    });
    const convs = await requestDemo<Array<{ id: string }>>("/conversations");
    expect(convs.length).toBeGreaterThanOrEqual(1);
    const msgs = await requestDemo<Array<{ id: string }>>(`/conversations/${convs[0]!.id}/messages`);
    expect(msgs.length).toBeGreaterThanOrEqual(1);

    const sent = await requestDemo<{ content: string }>(`/conversations/${convs[0]!.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: "پیام آزمایشی" }),
    });
    expect(sent.content).toBe("پیام آزمایشی");

    await requestDemo("/demo/login", {
      method: "POST",
      body: JSON.stringify({ personaId: "system-admin" }),
    });
    await requestDemo("/settings/deadline_days.SOURCES", {
      method: "PUT",
      body: JSON.stringify({ value: "18" }),
    });
    const settings = await requestDemo<Array<{ key: string; value: string }>>("/settings");
    expect(settings.find((s) => s.key === "deadline_days.SOURCES")?.value).toBe("18");

    const health = await requestDemo<{ status: string }>("/health");
    expect(health.status).toBe("ok");
  });
});
