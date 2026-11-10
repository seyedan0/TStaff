import React from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Card } from "./Card.js";
import { Button } from "./Button.js";

export const LoadingState: React.FC<{ label?: string; message?: string }> = ({
  label,
  message,
}) => (
  <Card className="p-8 text-center" aria-busy="true">
    <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#214E3A]/20 border-t-[#214E3A]" />
    <p className="text-sm font-medium text-[#43584A]">{message ?? label ?? "در حال دریافت اطلاعات..."}</p>
  </Card>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <Card className="p-8 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAE5D7] text-[#214E3A]">
      {icon ?? <Inbox className="h-6 w-6" />}
    </div>
    <h3 className="text-sm font-bold text-[#214031]">{title}</h3>
    {description && <p className="mt-1.5 text-xs leading-relaxed text-[#59675A]">{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </Card>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}> = ({ title = "خطا در دریافت اطلاعات", message, onRetry, action }) => (
  <Card role="alert" className="border-[#D94F3D]/30 bg-[#D94F3D]/5 p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#D94F3D]" />
        <div>
          <h3 className="text-sm font-bold text-[#B53727]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#214031]">{message}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {action}
        {onRetry && (
          <Button size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRetry}>
            تلاش مجدد
          </Button>
        )}
      </div>
    </div>
  </Card>
);
