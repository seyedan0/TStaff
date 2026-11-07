export interface SessionCleanerPort {
  deleteExpiredSessions(now: Date): Promise<number>;
}

export class ExpiredSessionsCleanup {
  constructor(private readonly port: SessionCleanerPort) {}

  async run(now = new Date()): Promise<{ deletedCount: number }> {
    const deletedCount = await this.port.deleteExpiredSessions(now);
    if (deletedCount > 0) {
      process.stdout.write(
        JSON.stringify({
          level: "info",
          context: "ExpiredSessionsCleanup",
          message: `Purged ${deletedCount} expired user session(s).`,
        }) + "\n",
      );
    }
    return { deletedCount };
  }
}

