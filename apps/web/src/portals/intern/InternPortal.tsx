import { usePortalSection } from "../../app/usePortalSection.js";
import React from "react";
import { ResearchCasesView } from "../../features/research/ResearchCasesView.js";
import { DirectChatView } from "../../features/messaging/DirectChatView.js";
import { LibraryDocumentsView } from "../../features/documents/LibraryDocumentsView.js";
import type { UserNavigationTab } from "../../app/UserNavigation.js";

interface InternPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const InternPortal: React.FC<InternPortalProps> = ({ onNotify }) => {
  const activeTab = usePortalSection<UserNavigationTab>(
    { "/projects": "researcher", "/library": "resources", "/messages": "chat" },
    "researcher",
  );
  if (activeTab === "chat") return <DirectChatView onNotify={onNotify} />;
  if (activeTab === "researcher")
    return <ResearchCasesView onNotify={onNotify} />;
  return <LibraryDocumentsView isApprentice={false} onNotify={onNotify} />;
};
