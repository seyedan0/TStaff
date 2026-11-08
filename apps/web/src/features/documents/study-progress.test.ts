import { describe, expect, it } from "vitest";
import { getStudyProgress } from "./study-progress.js";
import type { PublishedLibraryDocumentDto } from "@tstaff/contracts";

const document = (
  id: string,
  isRequired: boolean,
  isRead: boolean,
): PublishedLibraryDocumentDto => ({
  id,
  currentVersion: {
    id: `${id}-version`,
    version: 2,
    title: id,
    description: "شرح",
    category: "آموزش",
    isRequired,
    status: "PUBLISHED",
    publishedAt: "2026-11-08T00:00:00.000Z",
    isRead,
    fileName: `${id}.pdf`,
    scanStatus: "AVAILABLE",
  },
});

describe("library study progress (FR-004, FR-006, AT-36)", () => {
  it("does not allow an evaluation request when no required document is published", () => {
    expect(getStudyProgress([document("reference", false, true)]))
      .toMatchObject({ requiredCount: 0, readRequiredCount: 0, canRequestEvaluation: false });
  });

  it("requires the current version of every required document but ignores optional references", () => {
    expect(getStudyProgress([
      document("required-read", true, true),
      document("required-unread", true, false),
      document("optional", false, false),
    ])).toMatchObject({ requiredCount: 2, readRequiredCount: 1, canRequestEvaluation: false });

    expect(getStudyProgress([
      document("required", true, true),
      document("optional", false, false),
    ])).toMatchObject({ requiredCount: 1, readRequiredCount: 1, canRequestEvaluation: true });
  });
});
