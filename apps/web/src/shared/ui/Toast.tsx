import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import type { ToastMessage } from "../types.js";

export interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-apple-green shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-apple-red shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-apple-amber shrink-0" />,
    info: <Info className="w-5 h-5 text-apple-blue shrink-0" />,
  }[toast.type];

  return (
    <div className="apple-glass-card border border-white/10 shadow-apple-elevated rounded-apple-lg p-4 flex items-start gap-3 w-80 max-w-full animate-spring-slide text-right">
      {icons}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-100">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs text-slate-300 mt-0.5 line-clamp-3">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

