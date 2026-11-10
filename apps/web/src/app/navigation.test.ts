import { describe, expect, it } from "vitest";
import { getNavigation, getHomePath, getRoleLabel, routeAccess, safeReturnTo } from "./navigation.js";

describe("CHG-NAV-01 / FR-048 URL navigation and negative authorization", () => {
  it("keeps apprentice research and bank routes inaccessible", () => {
    expect(getHomePath("APPRENTICE")).toBe("/library");
    expect(routeAccess("APPRENTICE", "/projects/123")).toBe("forbidden");
    expect(routeAccess("INTERN", "/resource-bank/123")).toBe("forbidden");
  });
  it("restricts creation routes before parameterized detail routes", () => {
    expect(routeAccess("INTERN", "/projects/new")).toBe("forbidden");
    expect(routeAccess("SCIENTIFIC_SUPERVISOR", "/projects/new")).toBe("allowed");
    expect(routeAccess("SCIENTIFIC_SUPERVISOR", "/admissions/new")).toBe("forbidden");
    expect(routeAccess("PROVINCIAL_DIRECTOR", "/admissions/new")).toBe("allowed");
    expect(routeAccess("TRACKING_DIRECTOR", "/admissions/applicant-1")).toBe("forbidden");
  });
  it("supports scientific user, library, messaging, support and stage deep links", () => {
    expect(routeAccess("SCIENTIFIC_SUPERVISOR", "/supervision/users/user-1")).toBe("allowed");
    expect(routeAccess("SCIENTIFIC_SUPERVISOR", "/projects/case-1/stages/SOURCES")).toBe("allowed");
    expect(routeAccess("APPRENTICE", "/library/doc-1")).toBe("allowed");
    expect(routeAccess("INTERN", "/messages/conv-1")).toBe("allowed");
    expect(routeAccess("SUPPORT_DIRECTOR", "/support/users/user-1")).toBe("allowed");
    expect(routeAccess("INTERN", "/projects/case-1/stages/INVALID")).toBe("not-found");
    expect(routeAccess("INTERN", "/missing")).toBe("not-found");
  });
  it("restricts management routes to their role and has no scenario bank", () => {
    expect(routeAccess("PROVINCIAL_DIRECTOR", "/management/settings")).toBe("forbidden");
    expect(routeAccess("TRACKING_DIRECTOR", "/resource-bank")).toBe("allowed");
    expect(getNavigation("SCIENTIFIC_SUPERVISOR").map(item => item.to)).not.toContain("/scenarios/bank");
    expect(getRoleLabel("SCIENTIFIC_SUPERVISOR")).toBe("مدیر علمی");
  });
  it("preserves safe direct links and rejects external redirect targets", () => {
    expect(safeReturnTo("/projects/a?tab=history")).toBe("/projects/a?tab=history");
    for (const target of ["//evil.test", "/\\evil.test", "https://evil.test", "/login"]) expect(safeReturnTo(target)).toBeNull();
  });
});
