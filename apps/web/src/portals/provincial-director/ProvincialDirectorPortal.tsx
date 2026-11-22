import React, { useCallback, useEffect, useState } from "react";
import { Building2, RefreshCw, ShieldAlert } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ProvincialDirectorMetrics } from "@tstaff/contracts";
import { provinceNameFromId } from "@tstaff/contracts";
import { usePortalSection } from "../../app/usePortalSection.js";
import { ApplicantsView } from "../../features/applicants/ApplicantsView.js";
import { useAuth } from "../../features/auth/AuthContext.js";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";
import { MetricStrip } from "../../shared/ui/MetricStrip.js";

interface ProvincialDirectorPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

interface ScopeRow {
  managerId: string;
  provinceId: string;
  assignedAt: string;
  revokedAt?: string | null;
}

export const ProvincialDirectorPortal: React.FC<
  ProvincialDirectorPortalProps
> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const activeTab = usePortalSection<"applicants" | "kpis">(
    { "/admissions": "applicants", "/province/metrics": "kpis" },
    "applicants",
  );
  const [query] = useSearchParams();
  const navigate = useNavigate();

  const [scopes, setScopes] = useState<ScopeRow[]>([]);
  const [metrics, setMetrics] = useState<ProvincialDirectorMetrics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedProvinceId = query.get("provinceId") ?? "";

  const loadMetrics = useCallback(async () => {
    if (activeTab !== "kpis") return;
    setLoading(true);
    setError(null);
    try {
      const scopeRows = await apiClient.get<ScopeRow[]>("/organization/scopes");
      const activeScopes = scopeRows.filter((row) => !row.revokedAt);
      setScopes(activeScopes);

      const targetProvince =
        selectedProvinceId || activeScopes[0]?.provinceId || "";
      const endpoint = targetProvince
        ? `/reporting/provincial-director?provinceId=${encodeURIComponent(targetProvince)}`
        : "/reporting/provincial-director";
      setMetrics(await apiClient.get<ProvincialDirectorMetrics>(endpoint));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "دریافت آمار استان ناموفق بود.";
      setError(msg);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedProvinceId]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  if (activeTab === "applicants") {
    return <ApplicantsView onNotify={onNotify} />;
  }

  const effectiveProvinceId = selectedProvinceId || scopes[0]?.provinceId || "";
  const effectiveProvinceName = provinceNameFromId(effectiveProvinceId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`وضعیت استان · ${currentUser?.fullName || "مدیر استانی"}`}
        subtitle={
          effectiveProvinceName
            ? `آمار زنده متقاضیان، کارآموزان و پژوهش‌های فعال استان ${effectiveProvinceName}`
            : "پایش متقاضیان، کارآموزان و پژوهشگران در استان‌های تحت قلمرو"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              loading={loading}
              onClick={() => void loadMetrics()}
            >
              به‌روزرسانی
            </Button>
            <Link
              to="/admissions/new"
              className="rounded-xl bg-[#214E3A] px-3.5 py-2 text-xs font-semibold text-[#FFFCF5] hover:bg-[#193C2C]"
            >
              ثبت متقاضی جدید
            </Link>
            <Link
              to="/resource-bank"
              className="rounded-xl border border-[#214E3A]/20 bg-[#EAE5D7] px-3.5 py-2 text-xs font-semibold text-[#214031] hover:bg-[#DDD5C3]"
            >
              بانک منابع
            </Link>
          </div>
        }
      />

      {scopes.length > 0 && (
        <Card
          variant="default"
          padding="sm"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#214031]">
            <Building2 className="h-4 w-4 text-[#214E3A]" />
            <span className="font-semibold">استان‌های تحت قلمرو:</span>
            {scopes.map((s) => (
              <Badge key={s.provinceId} variant="success" size="sm">
                {provinceNameFromId(s.provinceId) ?? s.provinceId}
              </Badge>
            ))}
          </div>

          {scopes.length > 1 && (
            <select
              aria-label="انتخاب استان"
              value={effectiveProvinceId}
              onChange={(e) => {
                const next = new URLSearchParams(query);
                e.target.value
                  ? next.set("provinceId", e.target.value)
                  : next.delete("provinceId");
                navigate({ search: next.toString() }, { replace: true });
              }}
              className="rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-1.5 text-xs text-[#214031]"
            >
              {scopes.map((s) => (
                <option key={s.provinceId} value={s.provinceId}>
                  {provinceNameFromId(s.provinceId) ?? s.provinceId}
                </option>
              ))}
            </select>
          )}
        </Card>
      )}

      {!loading && scopes.length === 0 && (
        <Card
          variant="outlined"
          className="border-[#D94F3D]/35 bg-[#D94F3D]/5 p-4 text-xs leading-relaxed text-[#214031]"
        >
          هنوز قلمرو استانی فعالی برای حساب شما ثبت نشده است. برای مشاهده
          داده‌های استان و بانک منابع، مدیر پیگیری باید استان شما را تعیین کند.
        </Card>
      )}

      {loading ? (
        <LoadingState message="در حال دریافت آمار زنده استان..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadMetrics()} />
      ) : metrics ? (
        <MetricStrip
          label="شاخص‌های زنده استان"
          items={[
            {
              label: "کل متقاضیان استان",
              value: metrics.totalApplicants,
              detail: "پرونده‌های پذیرش",
            },
            {
              label: "متقاضیان تأییدشده",
              value: metrics.approvedApplicants,
              detail: "حساب پس از تأیید (FR-001)",
              tone: "success",
            },
            {
              label: "کارآموزان فعال",
              value: metrics.totalApprentices,
              detail: "در حال مطالعه",
            },
            {
              label: "کارورزان فعال",
              value: metrics.totalInterns,
              detail: "مجاز به اجرای پژوهش",
            },
            {
              label: "پژوهش‌های فعال",
              value: metrics.activeResearchCases,
              detail: "در حال اجرا یا بررسی",
            },
            {
              label: "منتظر تخصیص مدیر",
              value: metrics.pendingSupervisorAllocation,
              detail: "پرونده‌های بدون مدیر",
              tone: metrics.pendingSupervisorAllocation ? "warning" : "success",
              to: "/admissions?status=PENDING",
            },
          ]}
        />
      ) : null}

      {!loading && !error && metrics && (
        <section aria-labelledby="applicant-status-title" className="space-y-2">
          <h2
            id="applicant-status-title"
            className="text-sm font-bold text-[#214031]"
          >
            توزیع وضعیت پرونده‌های پذیرش
          </h2>
          <div className="grid grid-cols-2 gap-x-6 border-y border-[#214E3A]/15 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["در انتظار تخصیص", metrics.applicantsByStatus.PENDING ?? 0],
              ["در بررسی علمی", metrics.applicantsByStatus.IN_REVIEW ?? 0],
              ["تأییدشده", metrics.applicantsByStatus.APPROVED ?? 0],
              ["ردشده", metrics.applicantsByStatus.REJECTED ?? 0],
              ["آرشیوشده", metrics.applicantsByStatus.ARCHIVED ?? 0],
              [
                "درخواست بازگشایی",
                metrics.applicantsByStatus.REOPEN_REQUESTED ?? 0,
              ],
            ].map(([label, count]) => (
              <div
                key={String(label)}
                className="flex items-baseline justify-between gap-2 border-b border-[#214E3A]/10 py-2 text-xs lg:border-0"
              >
                <span className="text-[#4F6659]">{label}</span>
                <strong className="text-[#214031]">{count}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && metrics && (
        <section
          aria-labelledby="provincial-actions-title"
          className="space-y-2"
        >
          <h2
            id="provincial-actions-title"
            className="text-sm font-bold text-[var(--ink)]"
          >
            اقدام‌های پذیرش در قلمرو شما
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to="/admissions?status=PENDING"
              className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-3 text-sm hover:text-[var(--forest)]"
            >
              <span>پرونده‌های نیازمند تخصیص یا ارسال به بررسی</span>
              <Badge
                variant={
                  metrics.pendingSupervisorAllocation ? "warning" : "success"
                }
                size="sm"
              >
                {metrics.pendingSupervisorAllocation} تخصیص
              </Badge>
            </Link>
            <Link
              to="/admissions?status=REOPEN_REQUESTED"
              className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-3 text-sm hover:text-[var(--forest)]"
            >
              <span>درخواست‌های بازگشایی پرونده ردشده</span>
              <Badge
                variant={
                  metrics.applicantsByStatus.REOPEN_REQUESTED
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {metrics.applicantsByStatus.REOPEN_REQUESTED ?? 0}
              </Badge>
            </Link>
          </div>
        </section>
      )}

      <Card variant="default" className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#214031]">
          <ShieldAlert className="h-4 w-4 text-[#214E3A]" />
          قواعد پذیرش و دسترسی استانی
        </h3>
        <ul className="list-inside list-disc space-y-1.5 text-xs leading-6 text-[#43584A]">
          <li>
            <strong>FR-001 و FR-002:</strong> تا پیش از تأیید نهایی علمی، حساب
            کاربری ساخته نمی‌شود و متقاضی ردشده آرشیو می‌گردد.
          </li>
          <li>
            <strong>D-01:</strong> سن متقاضی عدد صحیح مثبت است و از تاریخ تولد
            محاسبه نمی‌شود.
          </li>
          <li>
            <strong>قلمرو بانک منابع:</strong> فهرست بانک منابع فقط شامل اطلاعات
            استان‌های مجاز شما و موارد ارجاع‌شده به شماست.
          </li>
        </ul>
      </Card>
    </div>
  );
};
