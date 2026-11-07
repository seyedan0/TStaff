import { describe, it, expect, vi } from "vitest";
import {
  OutboxPurgeCleanup,
  type OutboxPurgerPort,
} from "./outbox-purge.cleanup.js";

describe("OutboxPurgeCleanup", () => {
  it("purges processed events older than retention cutoff", async () => {
    const port: OutboxPurgerPort = {
      deleteProcessedEventsOlderThan: vi.fn().mockResolvedValue(12),
    };
    const purger = new OutboxPurgeCleanup(port);

    const result = await purger.run(14);

    expect(result.purgedCount).toBe(12);
    expect(port.deleteProcessedEventsOlderThan).toHaveBeenCalledWith(
      expect.any(Date),
    );
  });
});

