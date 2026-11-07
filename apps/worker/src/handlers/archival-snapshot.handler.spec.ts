import { describe, it, expect, vi } from "vitest";
import {
  ArchivalSnapshotHandler,
  type ArchivalWriterPort,
} from "./archival-snapshot.handler.js";

describe("ArchivalSnapshotHandler (FR-025, FR-039, AT-14, AT-27, BR-19)", () => {
  it("generates snapshot and completes archive job without physical deletion", async () => {
    const writer: ArchivalWriterPort = {
      generateAndSaveSnapshot: vi
        .fn()
        .mockResolvedValue("archives/research_cases/case-01_snapshot.json"),
      completeJob: vi.fn().mockResolvedValue(undefined),
    };
    const handler = new ArchivalSnapshotHandler(writer);

    await handler.handle(
      {
        jobId: "11111111-1111-1111-1111-111111111111",
        targetType: "RESEARCH_CASE",
        targetId: "22222222-2222-2222-2222-222222222222",
      },
      "ev-arc-1",
    );

    expect(writer.generateAndSaveSnapshot).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "RESEARCH_CASE",
      "22222222-2222-2222-2222-222222222222",
    );
    expect(writer.completeJob).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "archives/research_cases/case-01_snapshot.json",
    );
  });
});

