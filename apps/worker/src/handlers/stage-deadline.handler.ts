import { StageDeadlineCheckPayloadSchema } from "@tstaff/contracts";
import type { OutboxEventHandler } from "./handler.interface.js";

export interface OverdueCaseInfo {
  caseId: string;
  code: string;
  subject: string;
  stageType: string;
  daysElapsed: number;
}

export interface StageDeadlineMonitorPort {
  findOverdueCases(thresholdDays: number): Promise<OverdueCaseInfo[]>;
  alertTrackingDirector(overdueCase: OverdueCaseInfo): Promise<void>;
}

export class StageDeadlineHandler implements OutboxEventHandler {
  public readonly eventType = "STAGE_DEADLINE_CHECK";

  constructor(private readonly monitor: StageDeadlineMonitorPort) {}

  async handle(payload: unknown, _eventId: string): Promise<void> {
    const validated = StageDeadlineCheckPayloadSchema.parse(payload);
    const thresholdDays = validated.thresholdDays ?? 45;

    const overdueCases = await this.monitor.findOverdueCases(thresholdDays);

    for (const overdue of overdueCases) {
      await this.monitor.alertTrackingDirector(overdue);
    }
  }
}

