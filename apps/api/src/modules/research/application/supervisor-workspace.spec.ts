import { describe, expect, it } from "vitest";
import type { SupervisorWorkspaceUser } from "@tstaff/contracts";
import { prioritizeWorkspaceUsers } from "./supervisor-workspace.service.js";

describe("Scientific attention priority (FR-027, FR-048, CHG-WORKSPACE)", () => {
  it("orders pending users before waiting users, oldest request first, without mutating the list", () => {
    const items = [{ id: "waiting", pendingCount: 0, oldestPendingAt: null }, { id: "new", pendingCount: 2, oldestPendingAt: "2026-11-10" }, { id: "old", pendingCount: 1, oldestPendingAt: "2026-11-01" }] as SupervisorWorkspaceUser[];
    expect(prioritizeWorkspaceUsers(items).map((item) => item.id)).toEqual(["old", "new", "waiting"]);
    expect(items[0]?.id).toBe("waiting");
  });
});
