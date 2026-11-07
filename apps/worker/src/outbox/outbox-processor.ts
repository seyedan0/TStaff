import type { WorkerConfig } from "../config/worker.config.js";
import type { HandlerRegistry } from "../handlers/handler-registry.js";

export interface OutboxRecord {
  id: string;
  eventType: string;
  payload: unknown;
  status: "PENDING" | "PROCESSED" | "FAILED";
  retryCount: number;
  createdAt: Date;
  processedAt?: Date | null;
}

export interface OutboxRepositoryPort {
  findPendingEvents(limit: number): Promise<OutboxRecord[]>;
  markProcessed(id: string, processedAt: Date): Promise<void>;
  recordFailure(
    id: string,
    retryCount: number,
    failedPermanently: boolean,
  ): Promise<void>;
}

export interface ProcessBatchResult {
  total: number;
  processedCount: number;
  failedCount: number;
}

export class OutboxProcessor {
  private readonly failureCooldowns = new Map<string, number>();

  constructor(
    private readonly outboxRepo: OutboxRepositoryPort,
    private readonly registry: HandlerRegistry,
    private readonly config: WorkerConfig,
  ) {}

  public calculateBackoffMs(retryCount: number): number {
    const exponent = Math.max(0, retryCount - 1);
    const delay = this.config.initialBackoffMs * Math.pow(2, exponent);
    return Math.min(delay, this.config.maxBackoffMs);
  }

  public async processBatch(): Promise<ProcessBatchResult> {
    const events = await this.outboxRepo.findPendingEvents(
      this.config.batchSize,
    );
    let processedCount = 0;
    let failedCount = 0;
    const now = Date.now();

    for (const event of events) {
      const cooldownUntil = this.failureCooldowns.get(event.id);
      if (cooldownUntil && now < cooldownUntil) {
        continue;
      }

      const handler = this.registry.get(event.eventType);

      if (!handler) {
        // Unknown event type: fail permanently
        await this.outboxRepo.recordFailure(
          event.id,
          event.retryCount + 1,
          true,
        );
        this.failureCooldowns.delete(event.id);
        failedCount++;
        continue;
      }

      try {
        await handler.handle(event.payload, event.id);
        await this.outboxRepo.markProcessed(event.id, new Date());
        this.failureCooldowns.delete(event.id);
        processedCount++;
      } catch {
        const nextRetry = event.retryCount + 1;
        const failedPermanently = nextRetry >= this.config.maxRetries;
        if (!failedPermanently) {
          const backoff = this.calculateBackoffMs(nextRetry);
          this.failureCooldowns.set(event.id, now + backoff);
        } else {
          this.failureCooldowns.delete(event.id);
        }
        await this.outboxRepo.recordFailure(
          event.id,
          nextRetry,
          failedPermanently,
        );
        failedCount++;
      }
    }

    return {
      total: events.length,
      processedCount,
      failedCount,
    };
  }
}

