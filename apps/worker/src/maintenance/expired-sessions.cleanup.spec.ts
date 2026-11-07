import { describe, it, expect, vi } from "vitest";
import {
  ExpiredSessionsCleanup,
  type SessionCleanerPort,
} from "./expired-sessions.cleanup.js";

describe("ExpiredSessionsCleanup", () => {
  it("deletes expired sessions using current timestamp", async () => {
    const port: SessionCleanerPort = {
      deleteExpiredSessions: vi.fn().mockResolvedValue(5),
    };
    const cleaner = new ExpiredSessionsCleanup(port);

    const now = new Date("2026-11-07T12:00:00.000Z");
    const result = await cleaner.run(now);

    expect(result.deletedCount).toBe(5);
    expect(port.deleteExpiredSessions).toHaveBeenCalledWith(now);
  });
});

