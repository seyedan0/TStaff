import { describe, expect, it } from "vitest";
import { extractSystemRoles } from "./system-roles.js";

describe("extractSystemRoles (AT-29)", () => {
  it("excludes research assignment roles from workspace roles", () => {
    expect(extractSystemRoles(["MAIN_SUPERVISOR", "SCIENTIFIC_SUPERVISOR"])).toEqual(["SCIENTIFIC_SUPERVISOR"]);
  });

  it("returns every unique system role for multi-role workspace selection", () => {
    expect(extractSystemRoles(["SYSTEM_ADMIN", "PROVINCIAL_DIRECTOR", "SYSTEM_ADMIN"])).toEqual(["SYSTEM_ADMIN", "PROVINCIAL_DIRECTOR"]);
  });
});
