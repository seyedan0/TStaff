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
    success: <CheckCircle2 className="h-5 w-5 shrink-0 text-[#087674]" />,
    error: <AlertCircle className="h-5 w-5 shrink-0 text-[#B43A31]" />,
    warning: <AlertTriangle className="h-5 w-5 shrink-0 text-[#A65D31]" />,
    info: <Info className="h-5 w-5 shrink-0 text-[#087674]" />,
  }[toast.type];

  return (
    <div
      role="status"
      className="animate-spring-slide flex w-80 max-w-full items-start gap-3 rounded-apple-lg border border-[#087674]/20 bg-[#FFFFFF] p-4 text-right shadow-apple-elevated"
    >
      {icons}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold text-[#162F48]">{toast.title}</h4>
        {toast.message && (
          <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-[#3D576C]">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="بستن اعلان"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-full p-1 text-[#50677A] transition-all hover:bg-[#087674]/10 hover:text-[#162F48] active:scale-90"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
