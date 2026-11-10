import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "lg",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#183B2D]/45 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full ${maxWidthClasses} animate-scale-up overflow-hidden rounded-apple-2xl border border-[#214E3A]/20 bg-[#FFFCF5] p-6 text-[#214031] shadow-apple-elevated`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#214E3A]/12 pb-3">
          <div>
            {title && (
              <h3 className="flex items-center gap-2 text-lg font-bold text-[#214031]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-[#43584A]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#43584A] transition-all hover:bg-[#214E3A]/10 hover:text-[#214031] active:scale-95"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="-mr-1 max-h-[75vh] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};
