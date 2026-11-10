import React from "react";
import { BookOpen, MessageSquare, Search } from "lucide-react";

export type UserNavigationTab = "researcher" | "resources" | "chat";
type UserTabIcon = "researcher" | "resources" | "chat";

export interface MvpUserTab {
  id: UserNavigationTab;
  label: string;
  icon: UserTabIcon;
}

export function getMvpUserTabs(isApprentice: boolean): MvpUserTab[] {
  const shared: MvpUserTab[] = [
    { id: "resources", label: "منابع", icon: "resources" },
    { id: "chat", label: "چت خصوصی", icon: "chat" },
  ];
  return isApprentice
    ? shared
    : [{ id: "researcher", label: "پژوهشگر", icon: "researcher" }, ...shared];
}

const icons = {
  researcher: <Search className="h-4 w-4" />,
  resources: <BookOpen className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
};

export const UserNavigation: React.FC<{
  active: UserNavigationTab | null;
  isApprentice: boolean;
  onChange: (tab: UserNavigationTab) => void;
}> = ({ active, isApprentice, onChange }) => (
  <nav aria-label="منوی کاربر" className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-[#214E3A]/15 bg-[#FFFCF5] p-1.5 shadow-sm">
    {getMvpUserTabs(isApprentice).map((tab) => (
      <button
        key={tab.id}
        type="button"
        aria-current={active === tab.id ? "page" : undefined}
        onClick={() => onChange(tab.id)}
        className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${active === tab.id ? "bg-[#214E3A] text-[#FFFCF5] shadow-sm" : "text-[#4F6659] hover:bg-[#214E3A]/10 hover:text-[#214E3A]"}`}
      >
        {icons[tab.icon]}<span>{tab.label}</span>
      </button>
    ))}
  </nav>
);
