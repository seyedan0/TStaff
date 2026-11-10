import React, { createContext, useCallback, useContext, useState } from "react";
import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider, useLocation, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "../features/auth/AuthContext.js";
import { LoginForm } from "../features/auth/LoginForm.js";
import { AppHeader } from "./AppHeader.js";
import { AppPortalDispatcher } from "../portals/AppPortalDispatcher.js";
import { ResearchCasesView } from "../features/research/ResearchCasesView.js";
import { ProjectCreatePage } from "../features/research/ProjectCreatePage.js";
import { ApplicantsView } from "../features/applicants/ApplicantsView.js";
import { ApplicantCreatePage } from "../features/applicants/ApplicantCreatePage.js";
import { ApplicantDetailPage } from "../features/applicants/ApplicantDetailPage.js";
import { ResourceBankView } from "../features/resources/ResourceBankView.js";
import { LoadingState } from "../shared/ui/StateFeedback.js";
import { Toast } from "../shared/ui/Toast.js";
import type { ToastMessage } from "../shared/types.js";
import { getHomePath, getNavigation, getRoleLabel, routeAccess, safeReturnTo } from "./navigation.js";

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
    return (
      <Navigate
        replace
        to={
          destination && routeAccess(currentUser.role, destination.split(/[?#]/)[0]!) === "allowed"
            ? destination
            : getHomePath(currentUser.role)
        }
      />
    );
  }

  const access = routeAccess(currentUser.role, pathname);
  if (access !== "allowed") {
    return (
      <section role="alert" className="mx-auto max-w-lg rounded-3xl border border-[#214E3A]/15 bg-[#FFFCF5] p-10 text-center shadow-sm">
        <p className="mb-3 text-4xl font-bold text-[#D94F3D]">{access === "forbidden" ? "۴۰۳" : "۴۰۴"}</p>
        <h2 className="text-xl font-bold text-[#214031]">
          {access === "forbidden" ? "دسترسی به این بخش مجاز نیست" : "صفحه پیدا نشد"}
        </h2>
        <p className="mt-2 text-xs text-[#4F6659]">
          {access === "forbidden"
            ? "نقش فعال کنونی شما اجازه ورود به این نشانی را ندارد."
            : "نشانی واردشده در سامانه تعریف نشده است."}
        </p>
        <Link
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#214E3A] px-5 py-2.5 text-xs font-semibold text-[#FFFCF5] transition hover:bg-[#183B2D]"
          to={getHomePath(currentUser.role)}
        >
          بازگشت به صفحه نخست
        </Link>
      </section>
    );
  }

  if (pathname.startsWith("/resource-bank")) return <ResourceBankView onNotify={notify} />;
  if (/^\/projects\/new\/?$/.test(pathname)) return <ProjectCreatePage onNotify={notify} />;
  if (pathname.startsWith("/projects")) {
    return (
      <ResearchCasesView
        onNotify={notify}
        researcherId={query.get("researcherId") ?? undefined}
        canManage={currentUser.role === "SCIENTIFIC_SUPERVISOR"}
      />
    );
  }
  if (/^\/admissions\/new\/?$/.test(pathname)) return <ApplicantCreatePage onNotify={notify} />;
  if (/^\/admissions\/[^/]+\/?$/.test(pathname)) return <ApplicantDetailPage onNotify={notify} />;
  if (pathname.startsWith("/admissions")) return <ApplicantsView onNotify={notify} />;
  return <AppPortalDispatcher onNotify={notify} />;
}

function AppContent() {
  const { isAuthenticated, isLoading, currentUser, requiresRoleSelection, loggedOutExplicitly, chooseRole, logout } = useAuth();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const location = useLocation();
  const addToast = useCallback<Notify>(
    (type, title, message) => setToasts((previous) => [...previous, { id: crypto.randomUUID(), type, title, message }]),
    [],
  );
  const removeToast = useCallback((id: string) => setToasts((previous) => previous.filter((item) => item.id !== id)), []);
  const notices = (
    <div className="fixed bottom-6 left-6 z-50 flex max-w-[calc(100vw-3rem)] flex-col gap-2">
      {toasts.map((item) => (
        <Toast key={item.id} toast={item} onDismiss={removeToast} />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3EBDD]" aria-busy="true" aria-label="در حال بارگذاری حساب">
        <LoadingState message="در حال بررسی نشست کاربری..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location.pathname !== "/login") {
      if (loggedOutExplicitly) return <Navigate replace to="/login" />;
      return <Navigate replace to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} />;
    }
    return (
      <div className="flex min-h-screen flex-col justify-center bg-[#F3EBDD]">
        <LoginForm />
        {notices}
      </div>
    );
  }

  if (currentUser && requiresRoleSelection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3EBDD] p-6">
        <section className="w-full max-w-xl rounded-3xl border border-[#214E3A]/15 bg-[#FFFCF5] p-8 shadow-md">
          <h1 className="text-xl font-bold text-[#214031]">انتخاب فضای کاری</h1>
          <p className="mt-2 text-sm text-[#4F6659]">یکی از نقش‌های مجاز حساب را انتخاب کنید.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {currentUser.roles?.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => chooseRole(role)}
                className="rounded-2xl border border-[#214E3A]/20 bg-[#F3EBDD]/60 p-4 text-right transition hover:border-[#214E3A] hover:bg-[#214E3A]/10"
              >
                <span className="block text-sm font-bold text-[#214031]">{getRoleLabel(role)}</span>
                <span className="mt-1 block text-xs text-[#4F6659]">{getNavigation(role)[0]?.label ?? role}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={logout} className="mt-5 text-sm font-semibold text-[#D94F3D] hover:underline">
            خروج از حساب
          </button>
        </section>
      </div>
    );
  }

  return (
    <NoticeContext.Provider value={addToast}>
      <div className="flex min-h-screen flex-col bg-[#F3EBDD] text-[#214031]">
        <AppHeader onNotify={addToast} />
        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 md:p-8">
          <Outlet />
        </main>
        <footer className="border-t border-[#214E3A]/15 bg-[#FFFCF5]/60 px-4 py-5 text-center text-xs text-[#4F6659]">
          TStaff · سامانه مدیریت و هدایت پژوهش
        </footer>
        {notices}
      </div>
    </NoticeContext.Provider>
  );
}

const paths = [
  "/",
  "/login",
  "/projects/new",
  "/projects",
  "/projects/:caseId",
  "/projects/:caseId/stages/:stageType",
  "/projects/:caseId/resources/:resourceId",
  "/supervision/users",
  "/supervision/users/:userId",
  "/supervision/reviews",
  "/supervision/evaluations",
  "/admissions/new",
  "/admissions",
  "/admissions/:applicantId",
  "/resource-bank",
  "/resource-bank/:resourceId",
  "/library",
  "/library/:documentId",
  "/messages",
  "/messages/:conversationId",
  "/province/metrics",
  "/tracking/:section",
  "/support/tickets",
  "/support/tickets/:ticketId",
  "/support/users",
  "/support/users/:userId",
  "/management/:section",
  "*",
];

export const appRoutes = [{ element: <AuthProvider><AppContent /></AuthProvider>, children: paths.map((path) => ({ path, element: <RouteContent /> })) }];

export const App: React.FC = () => {
  const [router] = useState(() => createBrowserRouter(appRoutes));
  return <RouterProvider router={router} />;
};
