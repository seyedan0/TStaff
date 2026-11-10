import React from "react";
import { useLocation } from "react-router-dom";
import { ScientificReviewsView } from "../../features/reviews/ScientificReviewsView.js";
import { DirectChatView } from "../../features/messaging/DirectChatView.js";
import { LibraryManagementView } from "../../features/documents/LibraryManagementView.js";
import { SupervisorWorkspaceView } from "../../features/supervision/SupervisorWorkspaceView.js";
import { SupervisorUserProfileView } from "../../features/supervision/SupervisorUserProfileView.js";
import { StudyEvaluationsView } from "../../features/supervision/StudyEvaluationsView.js";

interface ScientificSupervisorPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const ScientificSupervisorPortal: React.FC<ScientificSupervisorPortalProps> = ({ onNotify }) => {
  const { pathname } = useLocation();

  if (/^\/supervision\/users\/[^/]+\/?$/.test(pathname)) {
    return <SupervisorUserProfileView onNotify={onNotify} />;
  }
  if (pathname.startsWith("/supervision/reviews")) {
    return <ScientificReviewsView onNotify={onNotify} />;
  }
  if (pathname.startsWith("/supervision/evaluations")) {
    return <StudyEvaluationsView onNotify={onNotify} />;
  }
  if (pathname.startsWith("/library")) {
    return <LibraryManagementView onNotify={onNotify} />;
  }
  if (pathname.startsWith("/messages")) {
    return <DirectChatView onNotify={onNotify} />;
  }
  return <SupervisorWorkspaceView onNotify={onNotify} />;
};
