import { describe, expect, it } from "vitest";
import { getNavigation, getHomePath, routeAccess, safeReturnTo } from "./navigation.js";

describe("CHG-NAV-01 / FR-048 URL navigation and negative authorization", () => {
  it("keeps apprentice research and bank routes inaccessible", () => {
    expect(getHomePath("APPRENTICE")).toBe("/library");
    expect(routeAccess("APPRENTICE", "/projects/123")).toBe("forbidden");
    expect(routeAccess("INTERN", "/resource-bank/123")).toBe("forbidden");
  });
  it("supports scientific user and stage deep links", () => {
    expect(routeAccess("SCIENTIFIC_SUPERVISOR", "/supervision/users/user-1")).toBe("allowed");
    expect(routeAccess("SCIENTIFIC_SUPERVISOR", "/projects/case-1/stages/SOURCES")).toBe("allowed");
    expect(routeAccess("INTERN", "/projects/case-1/stages/INVALID")).toBe("not-found");
    expect(routeAccess("INTERN", "/missing")).toBe("not-found");
  });
  it("restricts management routes to their role and has no scenario bank", () => {
    expect(routeAccess("PROVINCIAL_DIRECTOR", "/management/settings")).toBe("forbidden");
    expect(routeAccess("TRACKING_DIRECTOR", "/resource-bank")).toBe("allowed");
    expect(getNavigation("SCIENTIFIC_SUPERVISOR").map(item => item.to)).not.toContain("/scenarios/bank");
  });
  it("preserves safe direct links and rejects external redirect targets", () => {
    expect(safeReturnTo("/projects/a?tab=history")).toBe("/projects/a?tab=history");
    for (const target of ["//evil.test", "/\\evil.test", "https://evil.test", "/login"]) expect(safeReturnTo(target)).toBeNull();
  });
});
