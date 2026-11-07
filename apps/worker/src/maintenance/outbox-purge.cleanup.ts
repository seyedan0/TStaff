export interface OutboxPurgerPort {
  deleteProcessedEventsOlderThan(cutoff: Date): Promise<number>;
}

export class OutboxPurgeCleanup {
  constructor(private readonly port: OutboxPurgerPort) {}

  async run(retentionDays = 14): Promise<{ purgedCount: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 3600 * 1000);
    const purgedCount = await this.port.deleteProcessedEventsOlderThan(cutoff);

    if (purgedCount > 0) {
      process.stdout.write(
        JSON.stringify({
          level: "info",
          context: "OutboxPurgeCleanup",
          message: `Purged ${purgedCount} processed outbox event(s) older than ${retentionDays} day(s).`,
        }) + "\n",
      );
    }

    return { purgedCount };
  }
}

