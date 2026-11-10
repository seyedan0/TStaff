import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Building2, Database, MapPin, Phone, Search, Send, Trash2, UserPlus, UserRound } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { IRAN_PROVINCES, type ResourceBankItem, type ResourceBankPage } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { useAuth } from "../auth/AuthContext.js";
import { isDemoMode } from "../demo/demo-mode.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

interface ManagerOption {
  id: string;
  fullName?: string | null;
  phoneNumber: string;
  role?: string | null;
  roles?: string[];
}

interface ScopeRecord {
  provinceId: string;
  revokedAt?: string | null;
}

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "ارجاع فعال",
  REFERRED: "ارجاع فعال",
  CONVERTING: "در حال تبدیل به پرونده",
  CONVERTED: "تبدیل به پرونده پذیرش",
  REVOKED: "لغوشده",
};

const isActiveReferral = (status: string) => status === "PENDING" || status === "REFERRED";

export const ResourceBankView: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const { resourceId } = useParams();
  const { currentUser } = useAuth();
  const demoMode = isDemoMode();
  const isTracking = currentUser?.role === "TRACKING_DIRECTOR";
  const isProvincial = currentUser?.role === "PROVINCIAL_DIRECTOR";

  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const provinceId = searchParams.get("provinceId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [pageData, setPageData] = useState<ResourceBankPage | null>(null);
  const [detail, setDetail] = useState<ResourceBankItem | null>(null);
  const [allowedProvinceIds, setAllowedProvinceIds] = useState<string[]>([]);
  const [provincialManagers, setProvincialManagers] = useState<ManagerOption[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [referralNotes, setReferralNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadScopesAndManagers = useCallback(async () => {
    try {
      const scopes = await apiClient.get<ScopeRecord[]>("/organization/scopes");
      setAllowedProvinceIds(scopes.filter((s) => !s.revokedAt).map((s) => s.provinceId));
    } catch {
      setAllowedProvinceIds([]);
    }
    if (isTracking) {
      try {
        const managers = await apiClient.get<ManagerOption[]>("/users/managers");
        setProvincialManagers(
          managers.filter((m) => (m.roles ?? (m.role ? [m.role] : [])).includes("PROVINCIAL_DIRECTOR")),
        );
      } catch {
        setProvincialManagers([]);
      }
    }
  }, [isTracking]);

  useEffect(() => {
    void loadScopesAndManagers();
  }, [loadScopesAndManagers]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (resourceId) {
        const item = await apiClient.get<ResourceBankItem>(`/resource-bank/${encodeURIComponent(resourceId)}`);
        setDetail(item);
        setPageData(null);
      } else {
        const params = new URLSearchParams({ page: String(page), limit: "12" });
        if (q.trim()) params.set("q", q.trim());
        if (provinceId) params.set("provinceId", provinceId);
        const list = await apiClient.get<ResourceBankPage>(`/resource-bank?${params.toString()}`);
        setPageData(list);
        setDetail(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "دریافت اطلاعات بانک منابع ناموفق بود.";
      setError(msg);
      onNotify("error", "خطا در بانک منابع", msg);
    } finally {
      setLoading(false);
    }
  }, [resourceId, page, q, provinceId, onNotify]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateFilter = (nextQ: string, nextProvince: string, nextPage = 1) => {
    const next = new URLSearchParams(searchParams);
    if (nextQ) next.set("q", nextQ);
    else next.delete("q");
    if (nextProvince) next.set("provinceId", nextProvince);
    else next.delete("provinceId");
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const referResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !recipientId) return;
    setBusy(true);
    try {
      await apiClient.post(`/resource-bank/${encodeURIComponent(detail.id)}/referrals`, {
        recipientId,
        ...(referralNotes.trim() ? { notes: referralNotes.trim() } : {}),
      });
      setRecipientId("");
      setReferralNotes("");
      onNotify("success", "ارجاع بین‌استانی ثبت شد", "این منبع اکنون در بانک منابع مدیر استانی مقصد نیز دیده می‌شود.");
      await loadData();
    } catch (err) {
      onNotify("error", "ثبت ارجاع انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const revokeReferral = async (refId: string) => {
    setBusy(true);
    try {
      await apiClient.delete(`/resource-bank/referrals/${encodeURIComponent(refId)}`);
      onNotify("info", "ارجاع لغو شد");
      await loadData();
    } catch (err) {
      onNotify("error", "لغو ارجاع انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const managerName = (id: string) => {
    const m = provincialManagers.find((item) => item.id === id);
    return m ? `${m.fullName || m.phoneNumber}` : id;
  };

  const provinceFilterOptions = isTracking
    ? IRAN_PROVINCES
    : IRAN_PROVINCES.filter((p) => allowedProvinceIds.length === 0 || allowedProvinceIds.includes(p.id));

  if (resourceId) {
    if (loading) return <LoadingState message="در حال بارگذاری مشخصات منبع..." />;
    if (error || !detail) {
      return (
        <div className="space-y-4">
          <PageHeader
            title="جزئیات منبع"
            breadcrumbs={[{ label: "بانک منابع", to: "/resource-bank" }, { label: "جزئیات" }]}
            backTo={{ label: "بازگشت به بانک منابع", to: "/resource-bank" }}
          />
          <ErrorState message={error ?? "منبع در محدوده دسترسی شما یافت نشد."} onRetry={() => void loadData()} />
        </div>
      );
    }

    const convertedReferral = detail.referrals.find((r) => r.applicantId);

    return (
      <div className="space-y-5">
        <PageHeader
          title={detail.fullName}
          subtitle={`${detail.position || "بدون سمت"} ${detail.province ? `· استان ${detail.province}` : ""}`}
          breadcrumbs={[{ label: "بانک منابع", to: "/resource-bank" }, { label: detail.fullName }]}
          backTo={{ label: "بازگشت به بانک منابع", to: "/resource-bank" }}
          actions={
            isProvincial && !demoMode ? (
              convertedReferral?.applicantId ? (
                <Link
                  to={`/admissions/${encodeURIComponent(convertedReferral.applicantId)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#214E3A] px-4 py-2 text-xs font-semibold text-[#FFFCF5] hover:bg-[#193C2C]"
                >
                  مشاهده پرونده پذیرش ثبت‌شده
                </Link>
              ) : (
                <Link
                  to={`/admissions/new?fromResourceId=${encodeURIComponent(detail.id)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#214E3A] px-4 py-2 text-xs font-semibold text-[#FFFCF5] hover:bg-[#193C2C]"
                >
                  <UserPlus className="h-4 w-4" />
                  معرفی و ثبت در پذیرش
                </Link>
              )
            ) : undefined
          }
        />

        <Card variant="default" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#214031]">
              <UserRound className="h-5 w-5 text-[#214E3A]" />
              مشخصات فرد و مجموعه (نمای بانک منابع)
            </h2>
            {convertedReferral ? (
              <Badge variant="success" size="sm">معرفی‌شده به پذیرش</Badge>
            ) : detail.referrals.some((r) => isActiveReferral(r.status)) ? (
              <Badge variant="warning" size="sm">ارجاع بین‌استانی فعال</Badge>
            ) : (
              <Badge variant="neutral" size="sm">آماده معرفی</Badge>
            )}
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">نام و نام خانوادگی</dt>
              <dd className="mt-1 font-bold text-[#214031]">{detail.fullName}</dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">سن (عدد صحیح)</dt>
              <dd className="mt-1 font-semibold text-[#214031]">{detail.age ? `${detail.age} سال` : "ثبت نشده"}</dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">شغل / سمت</dt>
              <dd className="mt-1 font-semibold text-[#214031]">{detail.position || "ثبت نشده"}</dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">راه ارتباطی</dt>
              <dd dir="ltr" className="mt-1 text-right font-mono font-semibold text-[#214031]">
                {detail.contactInfo || "ثبت نشده"}
              </dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">موقعیت جغرافیایی</dt>
              <dd className="mt-1 font-semibold text-[#214031]">
                {[detail.province, detail.county].filter(Boolean).join(" · ") || "ثبت نشده"}
              </dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">مجموعه وابسته</dt>
              <dd className="mt-1 font-semibold text-[#214031]">
                {detail.organization
                  ? `${detail.organization.name} (${[detail.organization.organizationType, detail.organization.educationLevel].filter(Boolean).join(" / ") || "ثبت‌شده"})`
                  : "ثبت نشده"}
              </dd>
            </div>
          </dl>

          <p className="rounded-xl border border-[#214E3A]/15 bg-[#FFFCF5] p-3 text-xs text-[#4F6659]">
            دسترسی به بانک منابع صرفاً شامل مشخصات فرد، مجموعه، تماس، موقعیت و وضعیت معرفی است و دسترسی به گزارش‌ها یا فایل‌های پژوهشی را شامل نمی‌شود.
          </p>
        </Card>

        {isTracking && !convertedReferral && !demoMode && (
          <Card variant="default" className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#214031]">
              <Send className="h-4 w-4 text-[#214E3A]" />
              ارجاع بین‌استانی به مدیر استانی
            </h2>
            <form onSubmit={referResource} className="grid gap-3 md:grid-cols-3">
              <label className="block text-xs font-medium text-[#214031]">
                مدیر استانی مقصد
                <select
                  required
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2.5 text-sm text-[#214031]"
                >
                  <option value="">انتخاب مدیر استانی...</option>
                  {provincialManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName || m.phoneNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-[#214031] md:col-span-2">
                یادداشت ارجاع (اختیاری)
                <input
                  type="text"
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  placeholder="توضیح جهت پیگیری مدیر استانی..."
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2.5 text-sm text-[#214031]"
                />
              </label>
              <div className="flex justify-end md:col-span-3">
                <Button type="submit" variant="primary" loading={busy} icon={<Send className="h-3.5 w-3.5" />}>
                  ثبت ارجاع بین‌استانی
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card variant="default" className="space-y-3">
          <h2 className="text-sm font-bold text-[#214031]">سوابق معرفی و ارجاع ({detail.referrals.length})</h2>
          {detail.referrals.length === 0 ? (
            <p className="text-xs text-[#4F6659]">هنوز ارجاع یا معرفی برای این منبع ثبت نشده است.</p>
          ) : (
            <ul className="divide-y divide-[#214E3A]/10 text-xs">
              {detail.referrals.map((ref) => (
                <li key={ref.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={ref.status === "CONVERTED" ? "success" : isActiveReferral(ref.status) ? "warning" : "neutral"}
                        size="sm"
                      >
                        {REFERRAL_STATUS_LABELS[ref.status] ?? ref.status}
                      </Badge>
                      <span className="font-semibold text-[#214031]">گیرنده: {managerName(ref.recipientId)}</span>
                    </div>
                    <div className="text-[#4F6659]">تاریخ ثبت: {new Date(ref.createdAt).toLocaleString("fa-IR")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ref.applicantId && isProvincial && (
                      <Link
                        to={`/admissions/${encodeURIComponent(ref.applicantId)}`}
                        className="rounded-lg bg-[#214E3A]/10 px-2.5 py-1 font-semibold text-[#214E3A] hover:bg-[#214E3A]/20"
                      >
                        مشاهده پرونده پذیرش
                      </Link>
                    )}
                    {isTracking && isActiveReferral(ref.status) && !demoMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy}
                        icon={<Trash2 className="h-3.5 w-3.5 text-[#D94F3D]" />}
                        onClick={() => void revokeReferral(ref.id)}
                      >
                        لغو ارجاع
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  const totalPages = pageData ? Math.max(1, Math.ceil(pageData.total / pageData.limit)) : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title="بانک منابع شبکه"
        subtitle={
          isTracking
            ? "مشاهده کشوری منابع ثبت‌شده در پژوهش‌ها و مدیریت ارجاعات بین‌استانی"
            : "مشاهده منابع استان‌های تحت قلمرو و موارد ارجاع‌شده جهت معرفی به پذیرش"
        }
      />

      <Card variant="default" padding="sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B8073]" />
            <input
              type="search"
              aria-label="جست‌وجوی بانک منابع"
              placeholder="جست‌وجو بر اساس نام فرد، سمت، سازمان یا شهرستان..."
              value={q}
              onChange={(e) => updateFilter(e.target.value, provinceId, 1)}
              className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] py-2.5 pr-9 pl-3 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
            />
          </div>
          <select
            aria-label="فیلتر استان"
            value={provinceId}
            onChange={(e) => updateFilter(q, e.target.value, 1)}
            className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2.5 text-sm text-[#214031] focus:border-[#214E3A] focus:outline-none"
          >
            <option value="">همه استان‌های مجاز</option>
            {provinceFilterOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <LoadingState message="در حال بارگذاری بانک منابع..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadData()} />
      ) : !pageData || pageData.items.length === 0 ? (
        <EmptyState
          title="منبعی در محدوده دسترسی یافت نشد"
          description="یا هنوز منبعی در استان‌های مجاز ثبت نشده یا فیلتر جست‌وجو نتیجه‌ای نداشت."
          icon={<Database className="h-8 w-8 text-[#214E3A]" />}
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {pageData.items.map((item) => {
              const converted = item.referrals.find((r) => r.applicantId);
              const activeReferral = item.referrals.find((r) => isActiveReferral(r.status));
              return (
                <Card key={item.id} variant="default" className="flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-[#214031]">{item.fullName}</h2>
                        <p className="mt-0.5 text-xs text-[#4F6659]">
                          {item.position || "بدون سمت"} {item.age ? `· ${item.age} سال` : ""}
                        </p>
                      </div>
                      {converted ? (
                        <Badge variant="success" size="sm">ثبت‌شده در پذیرش</Badge>
                      ) : activeReferral ? (
                        <Badge variant="warning" size="sm">ارجاع‌شده</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">قابل معرفی</Badge>
                      )}
                    </div>

                    <div className="space-y-1 rounded-xl bg-[#F3EBDD]/55 p-3 text-xs text-[#214031]">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#214E3A]" />
                        <span>{[item.province, item.county].filter(Boolean).join(" · ") || "موقعیت نامشخص"}</span>
                      </div>
                      {item.organization && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-[#214E3A]" />
                          <span>{item.organization.name}</span>
                        </div>
                      )}
                      {item.contactInfo && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-[#214E3A]" />
                          <span dir="ltr" className="font-mono">{item.contactInfo}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#214E3A]/10 pt-2">
                    <span className="text-[11px] text-[#4F6659]">{new Date(item.createdAt).toLocaleDateString("fa-IR")}</span>
                    <Link
                      to={`/resource-bank/${encodeURIComponent(item.id)}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#214E3A] px-3 py-1.5 text-xs font-semibold text-[#FFFCF5] hover:bg-[#193C2C]"
                    >
                      <span>مشاهده و اقدام</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => updateFilter(q, provinceId, page - 1)}>
                صفحه قبل
              </Button>
              <span className="text-xs font-medium text-[#214031]">
                صفحه {page} از {totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => updateFilter(q, provinceId, page + 1)}>
                صفحه بعد
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
