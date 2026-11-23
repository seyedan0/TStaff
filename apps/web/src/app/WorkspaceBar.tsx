import { ChevronLeft, LayoutGrid } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type { SystemRole } from "@tstaff/contracts";
import { SupportRequest } from "../features/support/SupportRequest.js";
import { getHomePath, getNavigation, getRoleLabel } from "./navigation.js";

export function WorkspaceBar({
  role,
  onNotify,
}: {
  role: SystemRole;
  onNotify: (
    type: "success" | "error",
    title: string,
    message?: string,
  ) => void;
}) {
  const { pathname } = useLocation();
  const home = getHomePath(role);
  const current = getNavigation(role).find(
    (item) => pathname === item.to || pathname.startsWith(item.to + "/"),
  );
  return (
    <div className="workspace-bar">
      <nav aria-label="موقعیت در پنل">
        <Link to={home}>
          <LayoutGrid size={16} aria-hidden="true" />
          {getRoleLabel(role)}
        </Link>
        {current && (
          <>
            <ChevronLeft size={14} aria-hidden="true" />
            <Link
              to={current.to}
              aria-current={pathname === current.to ? "page" : undefined}
            >
              {current.label}
            </Link>
          </>
        )}
      </nav>
      {(role === "APPRENTICE" || role === "INTERN") && (
        <SupportRequest onNotify={onNotify} />
      )}
    </div>
  );
}
