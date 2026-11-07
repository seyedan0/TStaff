import type { OutboxProcessor } from "./outbox-processor.js";

export class OutboxPoller {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;

  constructor(
    private readonly processor: OutboxProcessor,
    private readonly pollIntervalMs: number,
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNext(0);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      await this.processor.processBatch();
    } finally {
      this.isProcessing = false;
    }
  }

  private scheduleNext(delayMs: number): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      try {
        await this.tick();
      } catch (err) {
        process.stderr.write(
          JSON.stringify({
            level: "error",
            context: "OutboxPoller",
            message: `Polling tick failed: ${err instanceof Error ? err.message : String(err)}`,
          }) + "\n",
        );
      } finally {
        if (this.isRunning) {
          this.scheduleNext(this.pollIntervalMs);
        }
      }
    }, delayMs);
  }
}

