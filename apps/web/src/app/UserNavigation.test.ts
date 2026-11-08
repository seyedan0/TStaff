import { describe, expect, it } from "vitest";
import { getMvpUserTabs } from "./UserNavigation.js";

describe("MVP user navigation (FR-003, FR-006)", () => {
  it("shows Resources and private chat to apprentices", () => {
    expect(getMvpUserTabs(true).map((tab) => tab.id)).toEqual(["resources", "chat"]);
  });

  it("adds research for interns and excludes out-of-MVP destinations", () => {
    expect(getMvpUserTabs(false).map((tab) => tab.id)).toEqual(["researcher", "resources", "chat"]);
  });
});
