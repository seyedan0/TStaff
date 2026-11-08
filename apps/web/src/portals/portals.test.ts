import { describe, it, expect } from "vitest";
import { AppPortalDispatcher } from "./AppPortalDispatcher.js";
import { ApprenticePortal } from "./apprentice/ApprenticePortal.js";
import { InternPortal } from "./intern/InternPortal.js";
import { ScientificSupervisorPortal } from "./scientific-supervisor/ScientificSupervisorPortal.js";
import { ProvincialDirectorPortal } from "./provincial-director/ProvincialDirectorPortal.js";
import { SupportDirectorPortal } from "./support-director/SupportDirectorPortal.js";
import { TrackingDirectorPortal } from "./tracking-director/TrackingDirectorPortal.js";
import { SystemAdminPortal } from "./system-admin/SystemAdminPortal.js";
import { SystemRoleSchema } from "@tstaff/contracts";

describe("Strict Role Portals Architecture & Isolation", () => {
  it("defines all 7 dedicated portal components properly", () => {
    expect(typeof AppPortalDispatcher).toBe("function");
    expect(typeof ApprenticePortal).toBe("function");
    expect(typeof InternPortal).toBe("function");
    expect(typeof ScientificSupervisorPortal).toBe("function");
    expect(typeof ProvincialDirectorPortal).toBe("function");
    expect(typeof SupportDirectorPortal).toBe("function");
    expect(typeof TrackingDirectorPortal).toBe("function");
    expect(typeof SystemAdminPortal).toBe("function");
  });

  it("validates all 7 authoritative system roles against SystemRoleSchema", () => {
    const roles = [
      "APPRENTICE",
      "INTERN",
      "SCIENTIFIC_SUPERVISOR",
      "PROVINCIAL_DIRECTOR",
      "SUPPORT_DIRECTOR",
      "TRACKING_DIRECTOR",
      "SYSTEM_ADMIN",
    ];

    for (const r of roles) {
      expect(SystemRoleSchema.safeParse(r).success).toBe(true);
    }

    // Role invariant: NO separate role called COLLABORATOR_SUPERVISOR
    expect(SystemRoleSchema.safeParse("COLLABORATOR_SUPERVISOR").success).toBe(
      false,
    );
    expect(SystemRoleSchema.safeParse("MAIN_SUPERVISOR").success).toBe(false);
  });
});
