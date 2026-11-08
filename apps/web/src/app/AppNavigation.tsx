import React from "react";
import {
  FolderGit2,
  UserPlus,
  Scale,
  MessageSquare,
  SlidersHorizontal,
} from "lucide-react";
import type { NavigationTab } from "../shared/types.js";
import { useAuth } from "../features/auth/AuthContext.js";

export interface AppNavigationProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({
  currentTab,
  onTabChange,
}) => {
  const { currentUser } = useAuth();
  const isApprentice = currentUser?.stage === "APPRENTICE";

  const tabs = [
    {
      id: "research" as NavigationTab,
      label: "پرونده‌های پژوهش",
      icon: <FolderGit2 className="w-4 h-4" />,
      disabled: isApprentice, // Rule AT-02: Research blocked for apprentice
      badge: isApprentice ? "مسدود برای کارآموز (AT-02)" : undefined,
    },
    {
      id: "applicants" as NavigationTab,
      label: "پذیرش متقاضیان",
      icon: <UserPlus className="w-4 h-4" />,
    },
    {
      id: "reviews" as NavigationTab,
      label: "داوری علمی و سناریو",
      icon: <Scale className="w-4 h-4" />,
      disabled: isApprentice,
    },
    {
      id: "messages" as NavigationTab,
      label: "گفت‌وگوی مستقیم",
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: "admin" as NavigationTab,
      label: "مدیریت و تنظیمات",
      icon: <SlidersHorizontal className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="p-1 rounded-apple-xl apple-glass border border-white/10 flex items-center justify-between gap-1 shadow-apple-card max-w-3xl mx-auto overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            title={tab.badge}
            className={`flex-1 py-2 px-3 rounded-apple-md flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 select-none whitespace-nowrap active:scale-[0.97] ${
              isActive
                ? "bg-apple-blue text-white shadow-sm"
                : tab.disabled
                ? "opacity-35 cursor-not-allowed text-slate-500"
                : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

