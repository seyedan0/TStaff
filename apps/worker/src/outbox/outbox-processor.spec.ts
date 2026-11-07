import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  OutboxProcessor,
  type OutboxRecord,
  type OutboxRepositoryPort,
} from "./outbox-processor.js";
import { HandlerRegistry } from "../handlers/handler-registry.js";
import type { OutboxEventHandler } from "../handlers/handler.interface.js";
import type { WorkerConfig } from "../config/worker.config.js";

class InMemoryOutboxRepository implements OutboxRepositoryPort {
  public records = new Map<string, OutboxRecord>();

  async findPendingEvents(limit: number): Promise<OutboxRecord[]> {
    return Array.from(this.records.values())
      .filter((r) => r.status === "PENDING")
      .slice(0, limit);
  }

  async markProcessed(id: string, processedAt: Date): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      r.status = "PROCESSED";
      r.processedAt = processedAt;
    }
  }

  async recordFailure(
    id: string,
    retryCount: number,
    failedPermanently: boolean,
  ): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      r.status = failedPermanently ? "FAILED" : "PENDING";
      r.retryCount = retryCount;
    }
  }
}

describe("OutboxProcessor (Transactional Outbox Engine)", () => {
  let repo: InMemoryOutboxRepository;
  let registry: HandlerRegistry;
  let config: WorkerConfig;
  let processor: OutboxProcessor;

  beforeEach(() => {
    repo = new InMemoryOutboxRepository();
    registry = new HandlerRegistry();
    config = {
      pollIntervalMs: 1000,
      batchSize: 10,
      maxRetries: 3,
      initialBackoffMs: 1000,
      maxBackoffMs: 10000,
      sessionCleanupIntervalMs: 60000,
      outboxPurgeRetentionDays: 7,
    };
    processor = new OutboxProcessor(repo, registry, config);
  });

  it("calculates exponential backoff correctly with ceiling", () => {
    expect(processor.calculateBackoffMs(1)).toBe(1000);
    expect(processor.calculateBackoffMs(2)).toBe(2000);
    expect(processor.calculateBackoffMs(3)).toBe(4000);
    expect(processor.calculateBackoffMs(4)).toBe(8000);
    expect(processor.calculateBackoffMs(5)).toBe(10000); // capped by maxBackoffMs
  });

  it("processes pending event successfully and marks as PROCESSED", async () => {
    const handlerFn = vi.fn().mockResolvedValue(undefined);
    const mockHandler: OutboxEventHandler = {
      eventType: "NOTIFICATION_EVENT",
      handle: handlerFn,
    };
    registry.register(mockHandler);

    repo.records.set("ev-1", {
      id: "ev-1",
      eventType: "NOTIFICATION_EVENT",
      payload: { message: "Test Notification" },
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date(),
    });

    const res = await processor.processBatch();

    expect(res.processedCount).toBe(1);
    expect(res.failedCount).toBe(0);
    expect(handlerFn).toHaveBeenCalledWith(
      { message: "Test Notification" },
      "ev-1",
    );

    const updated = repo.records.get("ev-1");
    expect(updated?.status).toBe("PROCESSED");
    expect(updated?.processedAt).toBeInstanceOf(Date);
  });

  it("marks as FAILED immediately if event type has no registered handler", async () => {
    repo.records.set("ev-unknown", {
      id: "ev-unknown",
      eventType: "UNREGISTERED_EVENT",
      payload: {},
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date(),
    });

    const res = await processor.processBatch();

    expect(res.processedCount).toBe(0);
    expect(res.failedCount).toBe(1);
    const record = repo.records.get("ev-unknown");
    expect(record?.status).toBe("FAILED");
  });

  it("retries on handler failure and marks FAILED after maxRetries", async () => {
    const failingHandler: OutboxEventHandler = {
      eventType: "FAIL_EVENT",
      handle: vi.fn().mockRejectedValue(new Error("External service down")),
    };
    registry.register(failingHandler);

    repo.records.set("ev-fail", {
      id: "ev-fail",
      eventType: "FAIL_EVENT",
      payload: {},
      status: "PENDING",
      retryCount: 2, // 1 retry left until maxRetries = 3
      createdAt: new Date(),
    });

    const res = await processor.processBatch();

    expect(res.failedCount).toBe(1);
    const record = repo.records.get("ev-fail");
    expect(record?.retryCount).toBe(3);
    expect(record?.status).toBe("FAILED");
  });

  it("enforces backoff cooldown between retries", async () => {
    const failingHandler: OutboxEventHandler = {
      eventType: "COOLDOWN_EVENT",
      handle: vi.fn().mockRejectedValue(new Error("Downstream glitch")),
    };
    registry.register(failingHandler);

    repo.records.set("ev-cooldown", {
      id: "ev-cooldown",
      eventType: "COOLDOWN_EVENT",
      payload: {},
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date(),
    });

    // 1st attempt: fails, backoff set
    const res1 = await processor.processBatch();
    expect(res1.failedCount).toBe(1);

    // 2nd immediate attempt: skipped due to cooldown
    const res2 = await processor.processBatch();
    expect(res2.processedCount).toBe(0);
    expect(res2.failedCount).toBe(0);
    expect(failingHandler.handle).toHaveBeenCalledTimes(1);
  });
});

