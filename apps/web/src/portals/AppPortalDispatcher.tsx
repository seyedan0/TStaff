import React from "react";
import { useAuth } from "../features/auth/AuthContext.js";
import { ApprenticePortal } from "./apprentice/ApprenticePortal.js";
import { InternPortal } from "./intern/InternPortal.js";
import { ScientificSupervisorPortal } from "./scientific-supervisor/ScientificSupervisorPortal.js";
import { ProvincialDirectorPortal } from "./provincial-director/ProvincialDirectorPortal.js";
import { SupportDirectorPortal } from "./support-director/SupportDirectorPortal.js";
import { TrackingDirectorPortal } from "./tracking-director/TrackingDirectorPortal.js";
import { SystemAdminPortal } from "./system-admin/SystemAdminPortal.js";

export interface AppPortalDispatcherProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const AppPortalDispatcher: React.FC<AppPortalDispatcherProps> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  switch (currentUser.role) {
    case "APPRENTICE":
      return <ApprenticePortal onNotify={onNotify} />;
    case "INTERN":
      return <InternPortal onNotify={onNotify} />;
    case "SCIENTIFIC_SUPERVISOR":
      return <ScientificSupervisorPortal onNotify={onNotify} />;
    case "PROVINCIAL_DIRECTOR":
      return <ProvincialDirectorPortal onNotify={onNotify} />;
    case "SUPPORT_DIRECTOR":
      return <SupportDirectorPortal onNotify={onNotify} />;
    case "TRACKING_DIRECTOR":
      return <TrackingDirectorPortal onNotify={onNotify} />;
    case "SYSTEM_ADMIN":
      return <SystemAdminPortal onNotify={onNotify} />;
    default:
      return (
        <section role="alert" className="rounded-2xl border border-[#D94F3D]/35 bg-[#D94F3D]/10 p-6 text-right">
          <h2 className="font-bold text-[#B53727]">دسترسی نامعتبر</h2>
          <p className="mt-2 text-sm text-[#214031]">
            نقش این حساب در سامانه معتبر نیست. لطفاً خارج شوید و دوباره وارد شوید.
          </p>
        </section>
      );
  }
};
