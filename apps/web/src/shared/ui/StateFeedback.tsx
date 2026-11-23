import React from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Card } from "./Card.js";
import { Button } from "./Button.js";

export const LoadingState: React.FC<{ label?: string; message?: string }> = ({
  label,
  message,
}) => (
  <Card className="atlas-loading p-8 text-center" aria-busy="true">
    <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#087674]/20 border-t-[#087674]" />
    <p className="text-sm font-medium text-[#3D576C]">
      {message ?? label ?? "در حال دریافت اطلاعات..."}
    </p>
  </Card>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <Card className="p-8 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E1EEF7] text-[#087674]">
      {icon ?? <Inbox className="h-6 w-6" />}
    </div>
    <h3 className="text-sm font-bold text-[#162F48]">{title}</h3>
    {description && (
      <p className="mt-1.5 text-xs leading-relaxed text-[#50677A]">
        {description}
      </p>
    )}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </Card>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}> = ({ title = "خطا در دریافت اطلاعات", message, onRetry, action }) => (
  <Card role="alert" className="border-[#B43A31]/30 bg-[#B43A31]/5 p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B43A31]" />
        <div>
          <h3 className="text-sm font-bold text-[#B53727]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#162F48]">
            {message}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {action}
        {onRetry && (
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={onRetry}
          >
            تلاش مجدد
          </Button>
        )}
      </div>
    </div>
  </Card>
);
