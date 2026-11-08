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

export const AppPortalDispatcher: React.FC<AppPortalDispatcherProps> = ({
  onNotify,
}) => {
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
      // Fallback for safety
      return <ApprenticePortal onNotify={onNotify} />;
  }
};

