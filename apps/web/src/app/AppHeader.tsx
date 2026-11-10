import React, { useState } from "react";
import { BookOpen, LogOut, Menu, RotateCcw, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.js";
import { isDemoMode } from "../features/demo/demo-mode.js";
import { resetDemoData } from "../features/demo/demo-store.js";
import { getHomePath, getNavigation } from "./navigation.js";

export interface AppHeaderProps { onNotify: (type: "info", title: string, message?: string) => void }
export const AppHeader: React.FC<AppHeaderProps> = ({ onNotify }) => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  if (!currentUser) return null;
  const items = getNavigation(currentUser.role);
  return <header className="site-header sticky top-0 z-40 shadow-lg">
    {isDemoMode() && <div className="border-b border-white/15 bg-black/10 px-4 py-1 text-center text-[11px] text-white/75">نسخه نمایشی · اطلاعات نمونه است</div>}
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 md:px-6">
      <Link to={getHomePath(currentUser.role)} className="flex shrink-0 items-center gap-2.5 text-white" aria-label="صفحه نخست">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><BookOpen className="h-6 w-6" /></span>
        <span><span className="block text-base font-bold tracking-wide">TStaff</span><span className="block text-[10px] text-white/65">شبکه پژوهشگران</span></span>
      </Link>
      <nav aria-label="منوی اصلی" className="hidden flex-1 flex-wrap items-center justify-center gap-1 lg:flex">
        {items.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-xl px-3 py-2.5 text-xs font-medium transition ${isActive ? "bg-white text-[#214E3A] shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>{item.label}</NavLink>)}
      </nav>
      <div className="ms-auto flex items-center gap-2 text-white">
        <span className="hidden max-w-36 truncate text-xs sm:block">{currentUser.fullName || currentUser.phoneNumber}</span>
        {isDemoMode() && <button type="button" aria-label="بازنشانی داده‌های نمایشی" onClick={() => { resetDemoData(); logout(); onNotify("info", "داده‌های نمونه بازنشانی شد"); }} className="rounded-xl p-2 hover:bg-white/10"><RotateCcw className="h-4 w-4" /></button>}
        <button type="button" onClick={logout} aria-label="خروج" className="rounded-xl p-2 hover:bg-white/10"><LogOut className="h-4 w-4" /></button>
        <button type="button" aria-label="فهرست بخش‌ها" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl p-2 hover:bg-white/10 lg:hidden">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {menuOpen && <nav id="mobile-navigation" aria-label="منوی اصلی موبایل" className="grid w-full grid-cols-2 gap-2 border-t border-white/15 pt-3 lg:hidden">
        {items.map(item => <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} aria-current={pathname.startsWith(item.to) ? "page" : undefined} className={`rounded-xl px-3 py-3 text-xs ${pathname.startsWith(item.to) ? "bg-white text-[#214E3A]" : "bg-white/5 text-white"}`}>{item.label}</Link>)}
      </nav>}
    </div>
  </header>;
};
