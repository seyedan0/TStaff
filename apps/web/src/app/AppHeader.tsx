import React from "react";
import { ShieldCheck, LogOut, User, Bell } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext.js";
import { Badge } from "../shared/ui/Badge.js";
import type { SystemRole } from "@tstaff/contracts";

export interface AppHeaderProps {
  onNotify: (type: "info", title: string, message?: string) => void;
}

const ROLE_DISPLAY_NAMES: Record<SystemRole, { label: string; variant: "info" | "success" | "warning" | "neutral" }> = {
  APPRENTICE: { label: "کارآموز پژوهشی", variant: "neutral" },
  INTERN: { label: "کارورز پژوهش", variant: "info" },
  SCIENTIFIC_SUPERVISOR: { label: "مدیر علمی", variant: "success" },
  PROVINCIAL_DIRECTOR: { label: "مدیر استانی", variant: "info" },
  SUPPORT_DIRECTOR: { label: "مدیر پشتیبانی", variant: "warning" },
  TRACKING_DIRECTOR: { label: "مدیر پیگیری", variant: "warning" },
  SYSTEM_ADMIN: { label: "مدیر کل و ادمین", variant: "info" },
};

export const AppHeader: React.FC<AppHeaderProps> = ({ onNotify }) => {
  const { currentUser, logout } = useAuth();

  if (!currentUser) return null;

  const roleMeta = ROLE_DISPLAY_NAMES[currentUser.role] || {
    label: currentUser.role,
    variant: "neutral" as const,
  };

  return (
    <header className="sticky top-0 z-40 apple-glass border-b border-white/10 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-apple-md bg-apple-blue/20 border border-apple-blue/40 flex items-center justify-center text-apple-blue shadow-apple-glow shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              سامانه پژوهشگران TStaff
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-apple-blue/15 text-apple-blue border border-apple-blue/30 font-mono">
                v1.0 MVP
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              شبکه هوشمند راهبری پرونده‌های پژوهشی و پذیرش علمی
            </p>
          </div>
        </div>

        {/* User Info & Controls */}
        <div className="flex items-center gap-3">
          {/* User Profile Chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs">
            <User className="w-3.5 h-3.5 text-apple-blue shrink-0" />
            <div className="text-right">
              <span className="font-semibold text-slate-200 block text-[11px] max-w-[140px] truncate">
                {currentUser.fullName || currentUser.phoneNumber}
              </span>
            </div>
            <Badge variant={roleMeta.variant} size="sm">
              {roleMeta.label}
            </Badge>
          </div>

          {/* Notifications Button */}
          <button
            onClick={() =>
              onNotify(
                "info",
                "سیاست اعلان‌ها (D-04)",
                "طبق تصمیم D-04، صرفاً رخدادهای حساس و فوری نوتیفیکیشن صادر می‌کنند تا تمرکز کاربر حفظ شود.",
              )
            }
            className="p-2 rounded-apple-md text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="اعلان‌ها"
            title="مرکز اعلان‌ها"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-apple-md text-slate-400 hover:text-apple-red hover:bg-apple-red/10 active:scale-95 transition-all"
            aria-label="خروج"
            title="خروج از حساب کاربری"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

