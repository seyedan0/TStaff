export interface WorkerConfig {
  pollIntervalMs: number;
  batchSize: number;
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  sessionCleanupIntervalMs: number;
  outboxPurgeRetentionDays: number;
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return {
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS
      ? Number.parseInt(env.WORKER_POLL_INTERVAL_MS, 10)
      : 2000,
    batchSize: env.WORKER_BATCH_SIZE
      ? Number.parseInt(env.WORKER_BATCH_SIZE, 10)
      : 50,
    maxRetries: env.WORKER_MAX_RETRIES
      ? Number.parseInt(env.WORKER_MAX_RETRIES, 10)
      : 5,
    initialBackoffMs: env.WORKER_INITIAL_BACKOFF_MS
      ? Number.parseInt(env.WORKER_INITIAL_BACKOFF_MS, 10)
      : 1000,
    maxBackoffMs: env.WORKER_MAX_BACKOFF_MS
      ? Number.parseInt(env.WORKER_MAX_BACKOFF_MS, 10)
      : 60000,
    sessionCleanupIntervalMs: env.WORKER_SESSION_CLEANUP_INTERVAL_MS
      ? Number.parseInt(env.WORKER_SESSION_CLEANUP_INTERVAL_MS, 10)
      : 3600000,
    outboxPurgeRetentionDays: env.WORKER_OUTBOX_RETENTION_DAYS
      ? Number.parseInt(env.WORKER_OUTBOX_RETENTION_DAYS, 10)
      : 14,
  };
}

