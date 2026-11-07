import { ArchivalSnapshotEventPayloadSchema } from "@tstaff/contracts";
import type { OutboxEventHandler } from "./handler.interface.js";

export interface ArchivalWriterPort {
  generateAndSaveSnapshot(
    jobId: string,
    targetType: string,
    targetId: string,
  ): Promise<string>;
  completeJob(jobId: string, storageLocation: string): Promise<void>;
}

export class ArchivalSnapshotHandler implements OutboxEventHandler {
  public readonly eventType = "ARCHIVAL_SNAPSHOT_EVENT";

  constructor(private readonly writer: ArchivalWriterPort) {}

  async handle(payload: unknown, _eventId: string): Promise<void> {
    const validated = ArchivalSnapshotEventPayloadSchema.parse(payload);

    const storageLocation = await this.writer.generateAndSaveSnapshot(
      validated.jobId,
      validated.targetType,
      validated.targetId,
    );

    await this.writer.completeJob(validated.jobId, storageLocation);
  }
}

