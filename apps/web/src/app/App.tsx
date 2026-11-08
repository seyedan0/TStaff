import React, { useState } from "react";
import { AuthProvider, useAuth } from "../features/auth/AuthContext.js";
import { LoginForm } from "../features/auth/LoginForm.js";
import { AppHeader } from "./AppHeader.js";
import { AppNavigation } from "./AppNavigation.js";
import { ResearchCasesView } from "../features/research/ResearchCasesView.js";
import { ApplicantsView } from "../features/applicants/ApplicantsView.js";
import { ScientificReviewsView } from "../features/reviews/ScientificReviewsView.js";
import { DirectChatView } from "../features/messaging/DirectChatView.js";
import { ManagementDashboardsView } from "../features/admin/ManagementDashboardsView.js";
import { Toast } from "../shared/ui/Toast.js";
import type { NavigationTab, ToastMessage } from "../shared/types.js";

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>("research");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex flex-col justify-center">
        <LoginForm />
        {/* Floating Toasts */}
        <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={removeToast} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-apple-blue selection:text-white">
      {/* Apple Frosted Glass Header */}
      <AppHeader onNotify={(type, title, msg) => addToast(type, title, msg)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Floating Apple Navigation Pill */}
        <AppNavigation currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* Tab Pages */}
        <div className="animate-fade-in">
          {currentTab === "research" && (
            <ResearchCasesView
              onNotify={(type, title, msg) => addToast(type, title, msg)}
            />
          )}

          {currentTab === "applicants" && (
            <ApplicantsView
              onNotify={(type, title, msg) => addToast(type, title, msg)}
            />
          )}

          {currentTab === "reviews" && (
            <ScientificReviewsView
              onNotify={(type, title, msg) => addToast(type, title, msg)}
            />
          )}

          {currentTab === "messages" && (
            <DirectChatView
              onNotify={(type, title, msg) => addToast(type, title, msg)}
            />
          )}

          {currentTab === "admin" && (
            <ManagementDashboardsView
              onNotify={(type, title, msg) => addToast(type, title, msg)}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-500">
        سامانه پژوهشگران TStaff • منطبق با نیازمندی‌های نسخه ۱.۰ (RFP v1.0) • طراحی مبتنی بر اصول تعاملی اپل (WWDC Fluid Interfaces)
      </footer>

      {/* Floating Apple Toasts Container */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-auto">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
