import { PrismaService } from "@tstaff/database";
import { loadWorkerConfig } from "./config/worker.config.js";
import { HandlerRegistry } from "./handlers/handler-registry.js";
import { NotificationDispatcherHandler } from "./handlers/notification-dispatcher.handler.js";
import { AuditDispatcherHandler } from "./handlers/audit-dispatcher.handler.js";
import { ArchivalSnapshotHandler } from "./handlers/archival-snapshot.handler.js";
import { StageDeadlineHandler } from "./handlers/stage-deadline.handler.js";
import {
  PrismaNotificationWriter,
  PrismaAuditWriter,
  PrismaArchivalWriter,
  PrismaStageDeadlineMonitor,
} from "./handlers/prisma-handler-writers.js";
import { PrismaOutboxRepository } from "./outbox/prisma-outbox.repository.js";
import { OutboxProcessor } from "./outbox/outbox-processor.js";
import { OutboxPoller } from "./outbox/outbox-poller.js";
import { ExpiredSessionsCleanup } from "./maintenance/expired-sessions.cleanup.js";
import { OutboxPurgeCleanup } from "./maintenance/outbox-purge.cleanup.js";
import { PrismaMaintenanceAdapter } from "./maintenance/prisma-maintenance.adapter.js";
import { MaintenanceScheduler } from "./maintenance/maintenance-scheduler.js";

function logWorker(message: string, level = "info", meta?: Record<string, unknown>) {
  process.stdout.write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context: "Worker",
      message,
      ...meta,
    }) + "\n",
  );
}

async function startWorker() {
  const config = loadWorkerConfig();
  const prisma = new PrismaService();

  try {
    await prisma.$connect();
    logWorker("Connected to PostgreSQL database");
  } catch (err) {
    logWorker("Database connection warning (soft start)", "warn", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 1. Initialize Event Handlers
  const registry = new HandlerRegistry();
  registry
    .register(
      new NotificationDispatcherHandler(new PrismaNotificationWriter(prisma)),
    )
    .register(new AuditDispatcherHandler(new PrismaAuditWriter(prisma)))
    .register(new ArchivalSnapshotHandler(new PrismaArchivalWriter(prisma)))
    .register(
      new StageDeadlineHandler(new PrismaStageDeadlineMonitor(prisma)),
    );

  logWorker("Registered Outbox Event Handlers", "info", {
    handlers: registry.registeredTypes(),
  });

  // 2. Initialize Outbox Engine
  const outboxRepo = new PrismaOutboxRepository(prisma);
  const processor = new OutboxProcessor(outboxRepo, registry, config);
  const poller = new OutboxPoller(processor, config.pollIntervalMs);

  // 3. Initialize Maintenance Engine
  const maintenanceAdapter = new PrismaMaintenanceAdapter(prisma);
  const sessionCleanup = new ExpiredSessionsCleanup(maintenanceAdapter);
  const outboxPurge = new OutboxPurgeCleanup(maintenanceAdapter);
  const maintenanceScheduler = new MaintenanceScheduler(
    sessionCleanup,
    outboxPurge,
    config.sessionCleanupIntervalMs,
    config.outboxPurgeRetentionDays,
  );

  // 4. Start Loops
  poller.start();
  maintenanceScheduler.start();
  logWorker("TStaff Background Worker successfully started", "info", {
    pollIntervalMs: config.pollIntervalMs,
    batchSize: config.batchSize,
  });

  // 5. Graceful Teardown
  const shutdown = async (signal: string) => {
    logWorker(`Received ${signal}, shutting down gracefully...`, "info");
    await poller.stop();
    maintenanceScheduler.stop();
    await prisma.$disconnect();
    logWorker("Worker stopped cleanly.", "info");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

startWorker();
