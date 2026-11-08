import React from "react";
import { BookOpen, MessageSquare, Sparkles, GraduationCap, Users } from "lucide-react";

export type UserNavigationTab = "researcher" | "activist" | "guidance" | "chat" | "forum";

export const UserNavigation: React.FC<{
  active: UserNavigationTab | null;
  isApprentice: boolean;
  onChange: (tab: UserNavigationTab) => void;
}> = ({ active, isApprentice, onChange }) => {
  const tabs = [
    { id: "researcher" as const, label: "پژوهشگر", icon: <BookOpen className="w-4 h-4" />, disabled: isApprentice },
    { id: "activist" as const, label: "کنشگر", icon: <Sparkles className="w-4 h-4" />, disabled: true },
    { id: "guidance" as const, label: "هدایت تحصیلی", icon: <GraduationCap className="w-4 h-4" />, disabled: true },
    { id: "chat" as const, label: "چت روم", icon: <MessageSquare className="w-4 h-4" />, disabled: false },
    { id: "forum" as const, label: "تالار گفت‌وگو", icon: <Users className="w-4 h-4" />, disabled: true },
  ];
  return (
    <nav aria-label="منوی کاربر" className="flex items-center gap-1 overflow-x-auto rounded-apple-lg border border-white/10 bg-white/[0.03] p-1">
      {tabs.map((tab) => tab.disabled ? <span key={tab.id} aria-disabled="true" title="در فاز بعدی فعال می‌شود"
          className="flex min-w-fit flex-1 items-center justify-center gap-2 rounded-apple-md px-3 py-2 text-xs font-semibold cursor-default text-slate-600 opacity-50">
          {tab.icon}<span>{tab.label}</span>
        </span> : <button key={tab.id} type="button" aria-current={active === tab.id ? "page" : undefined}
          onClick={() => onChange(tab.id)}
          className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-apple-md px-3 py-2 text-xs font-semibold transition-all ${active === tab.id ? "bg-apple-blue text-white" : tab.disabled ? "cursor-not-allowed text-slate-600 opacity-50" : "text-slate-300 hover:bg-white/[0.05]"}`}>
          {tab.icon}<span>{tab.label}</span>
        </button>)}
    </nav>
  );
};
