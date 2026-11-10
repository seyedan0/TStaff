import React, { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle, RotateCcw, XCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { provinceNameFromId, type ApplicantStatus } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import type { ApplicantItem } from "../../shared/types.js";
import { useAuth } from "../auth/AuthContext.js";
import { isDemoMode } from "../demo/demo-mode.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Modal } from "../../shared/ui/Modal.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

const STATUS_BADGES: Record<ApplicantStatus, { label: string; variant: "success" | "warning" | "neutral" | "danger" | "info" }> = {
  APPROVED: { label: "تأیید علمی (کارآموز فعال)", variant: "success" },
  IN_REVIEW: { label: "در انتظار داوری علمی", variant: "warning" },
  PENDING: { label: "پیش‌نویس استانی", variant: "neutral" },
  REJECTED: { label: "ردشده (بدون حساب)", variant: "danger" },
  ARCHIVED: { label: "بایگانی‌شده", variant: "neutral" },
  REOPEN_REQUESTED: { label: "درخواست بازگشایی", variant: "info" },
};

export const ApplicantDetailPage: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const { applicantId } = useParams();
  const { currentUser } = useAuth();
  const demoMode = isDemoMode();
  const canProvinceAct = !demoMode && (currentUser?.role === "PROVINCIAL_DIRECTOR" || currentUser?.role === "SYSTEM_ADMIN");
  const canDecide = !demoMode && (currentUser?.role === "SCIENTIFIC_SUPERVISOR" || currentUser?.role === "SYSTEM_ADMIN");

  const [applicant, setApplicant] = useState<ApplicantItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionOpen, setDecisionOpen] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!applicantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ApplicantItem>(`/applicants/${encodeURIComponent(applicantId)}`);
      setApplicant(data);
    } catch (err) {
      setApplicant(null);
      setError(err instanceof Error ? err.message : "دریافت جزئیات پرونده متقاضی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [applicantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitForReview = async () => {
    if (!applicant) return;
    setBusy(true);
    try {
      await apiClient.post(`/applicants/${encodeURIComponent(applicant.id)}/submit`);
      onNotify("success", "ارسال به داوری علمی", "پرونده به کارتابل داور علمی منتسب ارسال شد.");
      await load();
    } catch (err) {
      onNotify("error", "ارسال انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const submitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicant || !decisionOpen) return;
    const reasonText =
      decisionReason.trim() ||
      (decisionOpen === "APPROVED" ? "تأیید صلاحیت علمی و تشکیل حساب کارآموز" : "");
    if (decisionOpen === "REJECTED" && reasonText.length < 3) {
      onNotify("warning", "ذکر دلیل رد الزامی است");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/applicants/${encodeURIComponent(applicant.id)}/decisions`, {
        decision: decisionOpen,
        reason: reasonText,
      });
      onNotify(
        decisionOpen === "APPROVED" ? "success" : "info",
        decisionOpen === "APPROVED" ? "متقاضی تأیید شد" : "پرونده متقاضی رد شد",
      );
      setDecisionOpen(null);
      setDecisionReason("");
      await load();
    } catch (err) {
      onNotify("error", "ثبت تصمیم انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const submitReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicant || reopenReason.trim().length < 10) {
      onNotify("warning", "دلیل درخواست بازگشایی باید حداقل ۱۰ کاراکتر باشد");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/applicants/${encodeURIComponent(applicant.id)}/reopen`, { reason: reopenReason.trim() });
      onNotify("success", "درخواست بازگشایی ثبت شد");
      setReopenOpen(false);
      setReopenReason("");
      await load();
    } catch (err) {
      onNotify("error", "ثبت درخواست انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="در حال بارگذاری پرونده متقاضی..." />;
  if (error || !applicant) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="جزئیات متقاضی"
          breadcrumbs={[{ label: "پذیرش متقاضیان", to: "/admissions" }, { label: "جزئیات" }]}
          backTo={{ label: "بازگشت به فهرست پذیرش", to: "/admissions" }}
        />
        <ErrorState message={error ?? "پرونده یافت نشد یا دسترسی ندارید."} onRetry={() => void load()} />
      </div>
    );
  }

  const badge = STATUS_BADGES[applicant.status];

  return (
    <div className="space-y-5">
      <PageHeader
        title={applicant.fullName}
        subtitle={`کد ملی: ${applicant.nationalId} · سن: ${applicant.age} سال`}
        breadcrumbs={[{ label: "پذیرش متقاضیان", to: "/admissions" }, { label: applicant.fullName }]}
        backTo={{ label: "بازگشت به فهرست پذیرش", to: "/admissions" }}
        actions={<Badge variant={badge.variant} dot>{badge.label}</Badge>}
      />

      <Card variant="default" className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
            <dt className="text-xs text-[#4F6659]">کد ملی</dt>
            <dd className="mt-1 font-mono font-semibold text-[#214031]">{applicant.nationalId}</dd>
          </div>
          <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
            <dt className="text-xs text-[#4F6659]">شماره همراه</dt>
            <dd dir="ltr" className="mt-1 text-right font-mono font-semibold text-[#214031]">{applicant.phoneNumber}</dd>
          </div>
          <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
            <dt className="text-xs text-[#4F6659]">سن (عدد صحیح D-01)</dt>
            <dd className="mt-1 font-semibold text-[#214031]">{applicant.age} سال</dd>
          </div>
          <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
            <dt className="text-xs text-[#4F6659]">استان</dt>
            <dd className="mt-1 font-semibold text-[#214031]">{provinceNameFromId(applicant.provinceId) ?? applicant.provinceId}</dd>
          </div>
          <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
            <dt className="text-xs text-[#4F6659]">مقطع و رشته</dt>
            <dd className="mt-1 font-semibold text-[#214031]">
              {applicant.educationLevel ?? applicant.education ?? "-"} · {applicant.fieldOfStudy}
            </dd>
          </div>
          <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
            <dt className="text-xs text-[#4F6659]">تاریخ ثبت پرونده</dt>
            <dd className="mt-1 font-semibold text-[#214031]">
              {applicant.createdAt ? new Date(applicant.createdAt).toLocaleString("fa-IR") : "-"}
            </dd>
          </div>
        </dl>

        {applicant.notes && (
          <div className="rounded-xl border border-[#214E3A]/15 bg-[#FFFCF5] p-3 text-xs leading-6 text-[#214031]">
            <strong className="text-[#4F6659]">یادداشت ثبت‌شده: </strong>
            {applicant.notes}
          </div>
        )}

        {applicant.rejectionReason && (
          <div className="rounded-xl border border-[#D94F3D]/30 bg-[#D94F3D]/10 p-3 text-xs leading-6 text-[#B83B2B]">
            <strong>دلیل / وضعیت داوری: </strong>
            {applicant.rejectionReason}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#214E3A]/10 pt-3">
          {canProvinceAct && (applicant.status === "PENDING" || applicant.status === "REOPEN_REQUESTED") && (
            <Button variant="primary" loading={busy} icon={<ArrowUpRight className="h-4 w-4" />} onClick={() => void submitForReview()}>
              ارسال برای داوری علمی
            </Button>
          )}
          {canDecide && applicant.status === "IN_REVIEW" && (
            <>
              <Button variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setDecisionOpen("REJECTED")}>
                رد پرونده (بدون ساخت کاربر)
              </Button>
              <Button variant="primary" icon={<CheckCircle className="h-4 w-4" />} onClick={() => setDecisionOpen("APPROVED")}>
                تأیید علمی (ایجاد حساب کارآموز)
              </Button>
            </>
          )}
          {canProvinceAct && applicant.status === "REJECTED" && (
            <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setReopenOpen(true)}>
              درخواست بازگشایی پرونده
            </Button>
          )}
        </div>
      </Card>

      <Modal
        isOpen={!!decisionOpen}
        onClose={() => setDecisionOpen(null)}
        title={decisionOpen === "APPROVED" ? "تأیید علمی متقاضی" : "رد پرونده متقاضی"}
      >
        <form onSubmit={submitDecision} className="space-y-4 text-right">
          <label className="block text-xs font-medium text-[#214031]">
            {decisionOpen === "REJECTED" ? "دلیل رد پرونده (الزامی)" : "توضیح ارزیابی (اختیاری)"}
            <textarea
              rows={3}
              required={decisionOpen === "REJECTED"}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDecisionOpen(null)}>انصراف</Button>
            <Button type="submit" variant={decisionOpen === "REJECTED" ? "danger" : "primary"} loading={busy}>
              ثبت تصمیم
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={reopenOpen} onClose={() => setReopenOpen(false)} title="درخواست بازگشایی پرونده">
        <form onSubmit={submitReopen} className="space-y-4 text-right">
          <label className="block text-xs font-medium text-[#214031]">
            دلیل درخواست (حداقل ۱۰ کاراکتر)
            <textarea
              rows={3}
              required
              minLength={10}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setReopenOpen(false)}>انصراف</Button>
            <Button type="submit" variant="primary" loading={busy}>ارسال درخواست</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

