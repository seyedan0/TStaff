import { usePortalSection } from "../../app/usePortalSection.js";
import React from "react";
import type { UserNavigationTab } from "../../app/UserNavigation.js";
import { DirectChatView } from "../../features/messaging/DirectChatView.js";
import { LibraryDocumentsView } from "../../features/documents/LibraryDocumentsView.js";

interface ApprenticePortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const ApprenticePortal: React.FC<ApprenticePortalProps> = ({
  onNotify,
}) => {
  const activeTab = usePortalSection<UserNavigationTab>(
    { "/library": "resources", "/messages": "chat" },
    "resources",
  );
  if (activeTab === "chat") return <DirectChatView onNotify={onNotify} />;
  return <LibraryDocumentsView isApprentice={true} onNotify={onNotify} />;
};
