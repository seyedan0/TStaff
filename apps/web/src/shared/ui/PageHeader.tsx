import React from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  backTo?: string | { to: string; label?: string };
  backLabel?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  backTo,
  backLabel = "بازگشت",
  actions,
}) => {
  const backHref = typeof backTo === "string" ? backTo : backTo?.to;
  const backText = typeof backTo === "object" && backTo?.label ? backTo.label : backLabel;

  return (
    <div className="apple-glass-card rounded-apple-xl p-5 md:p-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="مسیر راهنما" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-[#59675A]">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <ChevronLeft className="h-3.5 w-3.5 text-[#858E7F]" />}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="font-medium text-[#214E3A] hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-[#214031]" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-[#214031] md:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs leading-relaxed text-[#43584A] md:text-sm">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {backHref && (
            <Link
              to={backHref}
              className="apple-btn inline-flex items-center gap-1.5 rounded-apple-md border border-[#214E3A]/20 bg-[#EAE5D7] px-3.5 py-2 text-xs font-semibold text-[#214031] transition hover:bg-[#DDD5C3]"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>{backText}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
