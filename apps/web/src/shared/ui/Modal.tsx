import React, { useEffect, useId, useRef } from "react";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    dialog.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement;
      if (
        !controls.includes(active as HTMLElement) ||
        active === (event.shiftKey ? first : last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    dialog.addEventListener("keydown", handleKey);
    return () => {
      dialog.removeEventListener("keydown", handleKey);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [isOpen]);

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
        className="fixed inset-0 bg-[#112A43]/45 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full ${maxWidthClasses} animate-scale-up overflow-hidden rounded-apple-2xl border border-[#087674]/20 bg-[#FFFFFF] p-6 text-[#162F48] shadow-apple-elevated`}
        ref={dialogRef}
        tabIndex={-1}
        aria-labelledby={title ? titleId : undefined}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#087674]/12 pb-3">
          <div>
            {title && (
              <h3
                id={titleId}
                className="flex items-center gap-2 text-lg font-bold text-[#162F48]"
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-[#3D576C]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#3D576C] transition-all hover:bg-[#087674]/10 hover:text-[#162F48] active:scale-95"
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
