import type { ExpiredSessionsCleanup } from "./expired-sessions.cleanup.js";
import type { OutboxPurgeCleanup } from "./outbox-purge.cleanup.js";

export class MaintenanceScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly sessionCleanup: ExpiredSessionsCleanup,
    private readonly outboxPurge: OutboxPurgeCleanup,
    private readonly intervalMs: number,
    private readonly retentionDays: number,
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNext(0);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public async runAll(): Promise<void> {
    try {
      await this.sessionCleanup.run();
    } catch (err) {
      process.stderr.write(
        JSON.stringify({
          level: "error",
          context: "MaintenanceScheduler",
          message: `Session cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
        }) + "\n",
      );
    }

    try {
      await this.outboxPurge.run(this.retentionDays);
    } catch (err) {
      process.stderr.write(
        JSON.stringify({
          level: "error",
          context: "MaintenanceScheduler",
          message: `Outbox purge failed: ${err instanceof Error ? err.message : String(err)}`,
        }) + "\n",
      );
    }
  }

  private scheduleNext(delayMs: number): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      await this.runAll();
      if (this.isRunning) {
        this.scheduleNext(this.intervalMs);
      }
    }, delayMs);
  }
}

