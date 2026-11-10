import React, { useEffect, useState } from "react";
import { BookOpen, LogOut, Menu, RotateCcw, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import type { SystemRole } from "@tstaff/contracts";
import { useAuth } from "../features/auth/AuthContext.js";
import { isDemoMode } from "../features/demo/demo-mode.js";
import { resetDemoData } from "../features/demo/demo-store.js";
import { getHomePath, getNavigation, getRoleLabel } from "./navigation.js";

export interface AppHeaderProps { onNotify: (type: "info", title: string, message?: string) => void }
export const AppHeader: React.FC<AppHeaderProps> = ({ onNotify }) => {
  const { currentUser, logout, chooseRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!currentUser) return null;
  const items = getNavigation(currentUser.role);
  const roles = currentUser.roles?.length ? currentUser.roles : [currentUser.role];

  const handleRoleSwitch = (nextRole: SystemRole) => {
    chooseRole(nextRole);
    setMenuOpen(false);
    navigate(getHomePath(nextRole));
  };

  return (
    <header className="site-header sticky top-0 z-40 border-b border-[#214E3A]/20 shadow-md">
      {isDemoMode() && (
        <div className="border-b border-white/15 bg-black/15 px-4 py-1 text-center text-[11px] text-[#F3EBDD]">
          نسخه نمایشی · اطلاعات نمونه است
        </div>
      )}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3.5 md:px-6">
        <Link to={getHomePath(currentUser.role)} className="flex shrink-0 items-center gap-2.5 text-[#FFFCF5]" aria-label="صفحه نخست">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
            <BookOpen className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-base font-bold tracking-wide">TStaff</span>
            <span className="block text-[10px] text-[#F3EBDD]/80">شبکه پژوهشگران</span>
          </span>
        </Link>

        <nav aria-label="منوی اصلی" className="hidden flex-1 flex-wrap items-center justify-center gap-1 lg:flex">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-xs font-medium transition ${
                  isActive ? "bg-[#F3EBDD] text-[#214E3A] font-semibold shadow-sm" : "text-[#F3EBDD]/90 hover:bg-white/10 hover:text-[#FFFCF5]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 text-[#FFFCF5]">
          {roles.length > 1 ? (
            <select
              aria-label="تغییر نقش کاری"
              value={currentUser.role}
              onChange={(e) => handleRoleSwitch(e.target.value as SystemRole)}
              className="hidden rounded-xl border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs text-[#FFFCF5] outline-none sm:block"
            >
              {roles.map((r) => (
                <option key={r} value={r} className="bg-[#FFFCF5] text-[#214031]">
                  {getRoleLabel(r)}
                </option>
              ))}
            </select>
          ) : (
            <span className="hidden rounded-xl bg-white/12 px-2.5 py-1 text-[11px] font-medium text-[#F3EBDD] sm:block">
              {getRoleLabel(currentUser.role)}
            </span>
          )}

          <span className="hidden max-w-36 truncate text-xs font-medium md:block">
            {currentUser.fullName || currentUser.phoneNumber}
          </span>

          {isDemoMode() && (
            <button
              type="button"
              aria-label="بازنشانی داده‌های نمایشی"
              onClick={() => {
                resetDemoData();
                logout();
                onNotify("info", "داده‌های نمونه بازنشانی شد");
              }}
              className="rounded-xl p-2 hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={logout} aria-label="خروج" className="rounded-xl p-2 hover:bg-white/10">
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="فهرست بخش‌ها"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-xl p-2 hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-navigation" aria-label="منوی اصلی موبایل" className="w-full space-y-3 border-t border-white/15 pt-3 lg:hidden">
            <div className="flex items-center justify-between gap-2 text-xs text-[#F3EBDD]">
              <span className="truncate font-medium">{currentUser.fullName || currentUser.phoneNumber}</span>
              {roles.length > 1 ? (
                <select
                  aria-label="تغییر نقش کاری موبایل"
                  value={currentUser.role}
                  onChange={(e) => handleRoleSwitch(e.target.value as SystemRole)}
                  className="rounded-xl border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs text-[#FFFCF5]"
                >
                  {roles.map((r) => (
                    <option key={r} value={r} className="bg-[#FFFCF5] text-[#214031]">
                      {getRoleLabel(r)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">{getRoleLabel(currentUser.role)}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => {
                const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                      isActive ? "bg-[#F3EBDD] text-[#214E3A] font-semibold" : "bg-white/10 text-[#FFFCF5]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
