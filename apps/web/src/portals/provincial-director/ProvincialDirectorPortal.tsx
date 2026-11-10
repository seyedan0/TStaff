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

export const ProvincialDirectorPortal: React.FC<ProvincialDirectorPortalProps> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const activeTab = usePortalSection<"applicants" | "kpis">(
    { "/admissions": "applicants", "/province/metrics": "kpis" },
    "applicants",
  );
  const [query] = useSearchParams();
  const navigate = useNavigate();

  const [scopes, setScopes] = useState<ScopeRow[]>([]);
  const [metrics, setMetrics] = useState<ProvincialDirectorMetrics | null>(null);
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

      const targetProvince = selectedProvinceId || activeScopes[0]?.provinceId || "";
      const endpoint = targetProvince
        ? `/reporting/provincial-director?provinceId=${encodeURIComponent(targetProvince)}`
        : "/reporting/provincial-director";
      setMetrics(await apiClient.get<ProvincialDirectorMetrics>(endpoint));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "دریافت آمار استان ناموفق بود.";
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
            <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} loading={loading} onClick={() => void loadMetrics()}>
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
        <Card variant="default" padding="sm" className="flex flex-wrap items-center justify-between gap-3">
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
                e.target.value ? next.set("provinceId", e.target.value) : next.delete("provinceId");
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
        <Card variant="outlined" className="border-[#D94F3D]/35 bg-[#D94F3D]/5 p-4 text-xs leading-relaxed text-[#214031]">
          هنوز قلمرو استانی فعالی برای حساب شما ثبت نشده است. برای مشاهده داده‌های استان و بانک منابع، مدیر پیگیری باید استان شما را تعیین کند.
        </Card>
      )}

      {loading ? (
        <LoadingState message="در حال دریافت آمار زنده استان..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadMetrics()} />
      ) : metrics ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card variant="default" className="space-y-1">
            <span className="text-xs text-[#4F6659]">کل متقاضیان استان</span>
            <div className="text-2xl font-bold text-[#214031]">{metrics.totalApplicants}</div>
            <span className="text-[11px] text-[#59675A]">پرونده‌های ثبت‌شده در پذیرش</span>
          </Card>

          <Card variant="default" className="space-y-1">
            <span className="text-xs text-[#4F6659]">متقاضیان تأییدشده</span>
            <div className="text-2xl font-bold text-[#214E3A]">{metrics.approvedApplicants}</div>
            <span className="text-[11px] text-[#59675A]">دارای حساب کاربری فعال (FR-001)</span>
          </Card>

          <Card variant="default" className="space-y-1">
            <span className="text-xs text-[#4F6659]">کارآموزان فعال</span>
            <div className="text-2xl font-bold text-[#214031]">{metrics.totalApprentices}</div>
            <span className="text-[11px] text-[#59675A]">در مرحله مطالعه شیوه‌نامه‌ها</span>
          </Card>

          <Card variant="default" className="space-y-1">
            <span className="text-xs text-[#4F6659]">کارورزان فعال</span>
            <div className="text-2xl font-bold text-[#214E3A]">{metrics.totalInterns}</div>
            <span className="text-[11px] text-[#59675A]">مجاز به اجرای پژوهش چهارمرحله‌ای</span>
          </Card>

          <Card variant="default" className="space-y-1">
            <span className="text-xs text-[#4F6659]">پژوهش‌های فعال استان</span>
            <div className="text-2xl font-bold text-[#D94F3D]">{metrics.activeResearchCases}</div>
            <span className="text-[11px] text-[#59675A]">در حال اجرا یا بررسی</span>
          </Card>
        </div>
      ) : null}

      <Card variant="default" className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#214031]">
          <ShieldAlert className="h-4 w-4 text-[#214E3A]" />
          قواعد پذیرش و دسترسی استانی
        </h3>
        <ul className="list-inside list-disc space-y-1.5 text-xs leading-6 text-[#43584A]">
          <li>
            <strong>FR-001 و FR-002:</strong> تا پیش از تأیید نهایی علمی، حساب کاربری ساخته نمی‌شود و متقاضی ردشده آرشیو می‌گردد.
          </li>
          <li>
            <strong>D-01:</strong> سن متقاضی عدد صحیح مثبت است و از تاریخ تولد محاسبه نمی‌شود.
          </li>
          <li>
            <strong>قلمرو بانک منابع:</strong> فهرست بانک منابع فقط شامل اطلاعات استان‌های مجاز شما و موارد ارجاع‌شده به شماست.
          </li>
        </ul>
      </Card>
    </div>
  );
};
