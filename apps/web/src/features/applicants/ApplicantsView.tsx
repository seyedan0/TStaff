import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle, RotateCcw, Search, UserPlus, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { ApplicantStatus } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import type { ApplicantItem } from "../../shared/types.js";
import { useAuth } from "../auth/AuthContext.js";
import { isDemoMode } from "../demo/demo-mode.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Modal } from "../../shared/ui/Modal.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";

export interface ApplicantsViewProps {
  onNotify: (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
}

export const ApplicantsView: React.FC<ApplicantsViewProps> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const demoMode = isDemoMode();
  const canCreate = !demoMode && (currentUser?.role === "PROVINCIAL_DIRECTOR" || currentUser?.role === "SYSTEM_ADMIN");
  const canDecide = !demoMode && (currentUser?.role === "SCIENTIFIC_SUPERVISOR" || currentUser?.role === "SYSTEM_ADMIN");
  const canProvinceAct = !demoMode && (currentUser?.role === "PROVINCIAL_DIRECTOR" || currentUser?.role === "SYSTEM_ADMIN");

  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get("status") ?? "ALL";
  const q = searchParams.get("q") ?? "";

  const [decisionTarget, setDecisionTarget] = useState<{ item: ApplicantItem; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [reopenTarget, setReopenTarget] = useState<ApplicantItem | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ApplicantItem[]>("/applicants");
      setApplicants(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "دریافت متقاضیان ناموفق بود";
      setApplicants([]);
      setError(msg);
      onNotify("error", "دریافت متقاضیان ناموفق بود", "اتصال به سرویس را بررسی و دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadApplicants();
  }, [loadApplicants]);

  const setFilter = (nextStatus: string, nextQ: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextStatus && nextStatus !== "ALL") next.set("status", nextStatus);
    else next.delete("status");
    if (nextQ.trim()) next.set("q", nextQ);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const handleSubmitForReview = async (id: string) => {
    setBusy(true);
    try {
      await apiClient.post(`/applicants/${encodeURIComponent(id)}/submit`);
      onNotify("success", "ارسال به داوری علمی", "پرونده جهت ارزیابی به داور علمی ارجاع شد.");
      await loadApplicants();
    } catch (err) {
      onNotify("error", "خطا در ارجاع", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const submitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionTarget) return;
    const reasonText =
      decisionReason.trim() ||
      (decisionTarget.decision === "APPROVED" ? "تأیید صلاحیت بر اساس مصاحبه و مدارک علمی" : "");
    if (decisionTarget.decision === "REJECTED" && reasonText.length < 3) {
      onNotify("warning", "دلیل رد متقاضی الزامی است");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/applicants/${encodeURIComponent(decisionTarget.item.id)}/decisions`, {
        decision: decisionTarget.decision,
        reason: reasonText,
      });
      if (decisionTarget.decision === "APPROVED") {
        onNotify(
          "success",
          "تأیید علمی متقاضی",
          "حساب کاربری کارآموز با موفقیت در ماژول هویت ایجاد شد (FR-001/002).",
        );
      } else {
        onNotify("info", "رد متقاضی", "پرونده متقاضی رد شد و هیچ حساب کاربری ساخته نشد.");
      }
      setDecisionTarget(null);
      setDecisionReason("");
      await loadApplicants();
    } catch (err) {
      onNotify("error", "خطا در ثبت تصمیم داوری", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const submitReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenTarget) return;
    if (reopenReason.trim().length < 10) {
      onNotify("warning", "دلیل درخواست بازگشایی باید حداقل ۱۰ کاراکتر باشد");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/applicants/${encodeURIComponent(reopenTarget.id)}/reopen`, {
        reason: reopenReason.trim(),
      });
      onNotify("success", "درخواست بازگشایی", "درخواست بررسی مجدد پرونده ثبت گردید (FR-033).");
      setReopenTarget(null);
      setReopenReason("");
      await loadApplicants();
    } catch (err) {
      onNotify("error", "خطا در درخواست بازگشایی", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadge = (status: ApplicantStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success" dot>تأیید علمی (کارآموز فعال)</Badge>;
      case "IN_REVIEW":
        return <Badge variant="warning" dot>در انتظار داوری علمی</Badge>;
      case "PENDING":
        return <Badge variant="neutral">پیش‌نویس استانی</Badge>;
      case "REJECTED":
        return <Badge variant="danger">ردشده (بدون حساب)</Badge>;
      case "REOPEN_REQUESTED":
        return <Badge variant="info" dot>درخواست بازگشایی</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredApplicants = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return applicants.filter((a) => {
      if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
      if (!needle) return true;
      return `${a.fullName} ${a.nationalId} ${a.phoneNumber} ${a.fieldOfStudy}`.toLowerCase().includes(needle);
    });
  }, [applicants, filterStatus, q]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="پذیرش و ارزیابی علمی متقاضیان"
        subtitle="ثبت پرونده پیش از ساخت کاربر، اعتبارسنجی سن عدد صحیح (D-01) و ایجاد حساب کاربری فقط پس از تأیید علمی (FR-001/002)"
        actions={
          canCreate ? (
            <Link
              to="/admissions/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#214E3A] px-4 py-2 text-xs font-semibold text-[#FFFCF5] hover:bg-[#193C2C]"
            >
              <UserPlus className="h-4 w-4" />
              ثبت متقاضی جدید
            </Link>
          ) : undefined
        }
      />

      <Card variant="default" padding="sm" className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B8073]" />
          <input
            type="search"
            aria-label="جست‌وجوی متقاضی"
            placeholder="جست‌وجو بر اساس نام، کد ملی، شماره همراه یا رشته..."
            value={q}
            onChange={(e) => setFilter(filterStatus, e.target.value)}
            className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] py-2 pr-9 pl-3 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { key: "ALL", label: "همه پرونده‌ها" },
            { key: "IN_REVIEW", label: "در انتظار داوری" },
            { key: "APPROVED", label: "تأییدشده (کارآموز)" },
            { key: "PENDING", label: "پیش‌نویس استانی" },
            { key: "REJECTED", label: "ردشده" },
            { key: "REOPEN_REQUESTED", label: "درخواست بازگشایی" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key, q)}
              className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                filterStatus === tab.key
                  ? "bg-[#214E3A] text-[#FFFCF5]"
                  : "border border-[#214E3A]/15 bg-[#F3EBDD]/60 text-[#4F6659] hover:text-[#214031]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <LoadingState message="در حال بارگذاری متقاضیان..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadApplicants()} />
      ) : filteredApplicants.length === 0 ? (
        <EmptyState title="متقاضی با این مشخصات یافت نشد" description="فیلتر وضعیت یا عبارت جست‌وجو را بررسی کنید." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredApplicants.map((app) => (
            <Card key={app.id} variant="default" className="flex flex-col justify-between gap-4">
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#214031]">{app.fullName}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#4F6659]">
                      <span>کد ملی: <span className="font-mono text-[#214031]">{app.nationalId}</span></span>
                      <span>·</span>
                      <span>سن: <strong className="text-[#214031]">{app.age} سال</strong></span>
                    </div>
                  </div>
                  {getStatusBadge(app.status)}
                </div>

                <div className="space-y-1.5 rounded-xl bg-[#F3EBDD]/55 p-3 text-xs text-[#214031]">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#4F6659]">تحصیلات و رشته:</span>
                    <span>{app.educationLevel ?? app.education ?? "-"} - {app.fieldOfStudy}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#4F6659]">شماره همراه:</span>
                    <span dir="ltr" className="font-mono">{app.phoneNumber}</span>
                  </div>
                  {app.rejectionReason && (
                    <div className="border-t border-[#D94F3D]/20 pt-1.5 text-[#B83B2B]">
                      توضیح وضعیت: {app.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#214E3A]/10 pt-3">
                <Link
                  to={`/admissions/${encodeURIComponent(app.id)}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#214E3A] hover:underline"
                >
                  <span>جزئیات پرونده</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  {canProvinceAct && (app.status === "PENDING" || app.status === "REOPEN_REQUESTED") && (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={busy}
                      icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                      onClick={() => void handleSubmitForReview(app.id)}
                    >
                      ارسال برای داوری
                    </Button>
                  )}

                  {canDecide && app.status === "IN_REVIEW" && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<XCircle className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setDecisionTarget({ item: app, decision: "REJECTED" });
                          setDecisionReason("");
                        }}
                      >
                        رد پرونده
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setDecisionTarget({ item: app, decision: "APPROVED" });
                          setDecisionReason("");
                        }}
                      >
                        تأیید علمی
                      </Button>
                    </>
                  )}

                  {canProvinceAct && app.status === "REJECTED" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setReopenTarget(app);
                        setReopenReason("");
                      }}
                    >
                      درخواست بازگشایی
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!decisionTarget}
        onClose={() => setDecisionTarget(null)}
        title={decisionTarget?.decision === "APPROVED" ? "تأیید علمی متقاضی و ساخت حساب کارآموز" : "رد پرونده متقاضی"}
        subtitle={decisionTarget ? `متقاضی: ${decisionTarget.item.fullName}` : undefined}
      >
        {decisionTarget && (
          <form onSubmit={submitDecision} className="space-y-4 text-right">
            <label className="block text-xs font-medium text-[#214031]">
              {decisionTarget.decision === "REJECTED" ? "دلیل رد پرونده (الزامی)" : "توضیح ارزیابی علمی (اختیاری)"}
              <textarea
                rows={3}
                required={decisionTarget.decision === "REJECTED"}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={decisionTarget.decision === "APPROVED" ? "تایید بر اساس مصاحبه پذیرش و سوابق..." : "ذکر دلیل عدم احراز شرایط..."}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDecisionTarget(null)}>انصراف</Button>
              <Button type="submit" variant={decisionTarget.decision === "REJECTED" ? "danger" : "primary"} loading={busy}>
                {decisionTarget.decision === "APPROVED" ? "تأیید نهایی" : "ثبت رد پرونده"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!reopenTarget}
        onClose={() => setReopenTarget(null)}
        title="درخواست بازگشایی پرونده ردشده"
        subtitle={reopenTarget ? `متقاضی: ${reopenTarget.fullName}` : undefined}
      >
        <form onSubmit={submitReopen} className="space-y-4 text-right">
          <label className="block text-xs font-medium text-[#214031]">
            دلیل درخواست بازگشایی (حداقل ۱۰ کاراکتر)
            <textarea
              rows={3}
              required
              minLength={10}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="ارائه مستندات تکمیلی یا تغییر شرایط..."
              className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setReopenTarget(null)}>انصراف</Button>
            <Button type="submit" variant="primary" loading={busy}>ثبت درخواست بازگشایی</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
