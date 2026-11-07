import { describe, it, expect, vi } from "vitest";
import {
  StageDeadlineHandler,
  type StageDeadlineMonitorPort,
  type OverdueCaseInfo,
} from "./stage-deadline.handler.js";

describe("StageDeadlineHandler (FR-061, AT-11, AT-24)", () => {
  it("detects overdue cases and triggers alerts to Tracking Director", async () => {
    const overdueList: OverdueCaseInfo[] = [
      {
        caseId: "11111111-1111-1111-1111-111111111111",
        code: "CASE-01",
        subject: "پرونده معوق",
        stageType: "SOURCES",
        daysElapsed: 48,
      },
    ];

    const monitor: StageDeadlineMonitorPort = {
      findOverdueCases: vi.fn().mockResolvedValue(overdueList),
      alertTrackingDirector: vi.fn().mockResolvedValue(undefined),
    };

    const handler = new StageDeadlineHandler(monitor);

    await handler.handle(
      {
        checkTimestamp: new Date().toISOString(),
        thresholdDays: 45,
      },
      "ev-deadline-1",
    );

    expect(monitor.findOverdueCases).toHaveBeenCalledWith(45);
    expect(monitor.alertTrackingDirector).toHaveBeenCalledWith(overdueList[0]);
  });
});

