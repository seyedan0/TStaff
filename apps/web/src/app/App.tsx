import React, { createContext, useCallback, useContext, useState } from "react";
import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider, useLocation, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "../features/auth/AuthContext.js";
import { LoginForm } from "../features/auth/LoginForm.js";
import { AppHeader } from "./AppHeader.js";
import { AppPortalDispatcher } from "../portals/AppPortalDispatcher.js";
import { ResearchCasesView } from "../features/research/ResearchCasesView.js";
import { ApplicantsView } from "../features/applicants/ApplicantsView.js";
import { ResourceBankView } from "../features/resources/ResourceBankView.js";
import { Toast } from "../shared/ui/Toast.js";
import type { ToastMessage } from "../shared/types.js";
import { getHomePath, getNavigation, routeAccess, safeReturnTo } from "./navigation.js";

type Notify = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
const NoticeContext = createContext<Notify>(() => undefined);
function RouteContent() {
  const { currentUser } = useAuth();
  const notify = useContext(NoticeContext);
  const { pathname } = useLocation();
  const [query] = useSearchParams();
  if (!currentUser) return null;
  if (pathname === "/" || pathname === "/login") {
    const destination = safeReturnTo(query.get("returnTo"));
    return <Navigate replace to={destination && routeAccess(currentUser.role, destination.split("?")[0]!) === "allowed" ? destination : getHomePath(currentUser.role)} />;
  }
  const access = routeAccess(currentUser.role, pathname);
  if (access !== "allowed") return <section role="alert" className="apple-glass-card rounded-3xl p-10 text-center"><p className="mb-3 text-4xl font-bold text-apple-blue">{access === "forbidden" ? "۴۰۳" : "۴۰۴"}</p><h2 className="text-xl font-bold">{access === "forbidden" ? "دسترسی به این بخش مجاز نیست" : "صفحه پیدا نشد"}</h2><Link className="mt-5 inline-block text-sm text-apple-blue underline" to={getHomePath(currentUser.role)}>بازگشت به صفحه نخست</Link></section>;
  if (pathname.startsWith("/resource-bank")) return <ResourceBankView onNotify={notify} />;
  if (pathname.startsWith("/projects")) return <ResearchCasesView onNotify={notify} researcherId={query.get("researcherId") ?? undefined} canManage={currentUser.role === "SCIENTIFIC_SUPERVISOR"} />;
  if (pathname.startsWith("/admissions")) return <ApplicantsView onNotify={notify} />;
  return <AppPortalDispatcher onNotify={notify} />;
}
function AppContent() {
  const { isAuthenticated, isLoading, currentUser, requiresRoleSelection, chooseRole, logout } = useAuth();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const location = useLocation();
  const addToast = useCallback<Notify>((type, title, message) => setToasts(previous => [...previous, { id: crypto.randomUUID(), type, title, message }]), []);
  const removeToast = useCallback((id: string) => setToasts(previous => previous.filter(item => item.id !== id)), []);
  const notices = <div className="fixed bottom-6 left-6 z-50 flex max-w-[calc(100vw-3rem)] flex-col gap-2">{toasts.map(item => <Toast key={item.id} toast={item} onDismiss={removeToast} />)}</div>;
  if (isLoading) return <div className="min-h-screen" aria-busy="true" aria-label="در حال بارگذاری حساب" />;
  if (!isAuthenticated) {
    if (location.pathname !== "/login") return <Navigate replace to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} />;
    return <div className="flex min-h-screen flex-col justify-center"><LoginForm />{notices}</div>;
  }
  if (currentUser && requiresRoleSelection) return <div className="flex min-h-screen items-center justify-center p-6"><section className="apple-glass-card w-full max-w-xl rounded-3xl p-8"><h1 className="text-xl font-bold">انتخاب فضای کاری</h1><p className="mt-2 text-sm text-slate-400">یکی از نقش‌های مجاز حساب را انتخاب کنید.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{currentUser.roles?.map(role => <button key={role} type="button" onClick={() => chooseRole(role)} className="rounded-2xl border border-apple-blue/20 p-4 text-right hover:bg-apple-blue/5">{getNavigation(role)[0]?.label ?? role}</button>)}</div><button type="button" onClick={logout} className="mt-5 text-sm text-apple-red">خروج</button></section></div>;
  return <NoticeContext.Provider value={addToast}><div className="flex min-h-screen flex-col">
    <AppHeader onNotify={addToast} />
    <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 md:p-8"><Outlet /></main>
    <footer className="border-t border-apple-blue/10 px-4 py-5 text-center text-xs text-slate-500">TStaff · همراه مسیر پژوهش</footer>{notices}
  </div></NoticeContext.Provider>;
}
const paths = ["/", "/login", "/projects", "/projects/:caseId", "/projects/:caseId/stages/:stageType", "/projects/:caseId/resources/:resourceId", "/supervision/users", "/supervision/users/:userId", "/supervision/reviews", "/supervision/evaluations", "/admissions", "/admissions/:applicantId", "/resource-bank", "/resource-bank/:resourceId", "/library", "/library/:documentId", "/messages", "/messages/:conversationId", "/province/metrics", "/tracking/:section", "/support/:section", "/support/:section/:ticketId", "/management/:section", "*"];
export const appRoutes = [{ element: <AuthProvider><AppContent /></AuthProvider>, children: paths.map(path => ({ path, element: <RouteContent /> })) }];
export const App: React.FC = () => {
  const [router] = useState(() => createBrowserRouter(appRoutes));
  return <RouterProvider router={router} />;
};
