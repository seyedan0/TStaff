import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, GraduationCap, RefreshCw, RotateCcw, Sparkles, UserCheck } from "lucide-react";
import type { StudyDocumentSnapshot } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Modal } from "../../shared/ui/Modal.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, LoadingState } from "../../shared/ui/StateFeedback.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

interface PendingEvaluationItem {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REVISION_REQUIRED";
  notes?: string;
  feedback?: string;
  completedDocuments: StudyDocumentSnapshot[];
  createdAt: string;
  userFullName?: string;
  userPhone?: string;
  user?: {
    id: string;
    fullName?: string;
    phoneNumber: string;
  };
}

export const StudyEvaluationsView: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const [evaluations, setEvaluations] = useState<PendingEvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<PendingEvaluationItem | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PendingEvaluationItem[]>("/users/study-evaluations/pending");
      setEvaluations(res);
    } catch {
      setEvaluations([]);
      onNotify("error", "بارگذاری صف ارزیابی ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void fetchEvaluations();
  }, [fetchEvaluations]);

  const handleDecide = async (decision: "APPROVED" | "REVISION_REQUIRED") => {
    if (!selectedEvaluation) return;
    setIsDeciding(true);
    try {
      await apiClient.post(`/users/study-evaluations/${selectedEvaluation.id}/decide`, {
        decision,
        feedback:
          feedbackNotes.trim() ||
          (decision === "APPROVED"
            ? "صلاحیت علمی و تسلط بر شیوه‌نامه‌ها احراز گردید. ارتقا به کارورز تایید شد."
            : "نیاز به بازبینی و مطالعه عمیق‌تر در بخش تبیین و تجویز."),
      });

      onNotify(
        decision === "APPROVED" ? "success" : "warning",
        decision === "APPROVED" ? "کارآموز تایید و به کارورز ارتقا یافت" : "درخواست بازبینی به کارآموز ابلاغ شد",
        `تصمیم برای متقاضی «${selectedEvaluation.userFullName || selectedEvaluation.user?.fullName || selectedEvaluation.userId}» ثبت شد.`,
      );
      setSelectedEvaluation(null);
      setFeedbackNotes("");
      await fetchEvaluations();
    } catch (err: unknown) {
      onNotify("error", "خطا در ثبت تصمیم", err instanceof Error ? err.message : "امکان ثبت تصمیم وجود ندارد");
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="ارزیابی مطالعه کارآموزان و ارتقا به کارورز"
        subtitle="کارآموزانی که منابع آموزشی الزامی را مطالعه کرده‌اند و منتظر ارزیابی علمی هستند."
        actions={
          <Button variant="secondary" size="sm" loading={loading} icon={<RefreshCw className="h-4 w-4" />} onClick={() => void fetchEvaluations()}>
            به‌روزرسانی صف
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="در حال دریافت درخواست‌های ارزیابی..." />
      ) : evaluations.length === 0 ? (
        <EmptyState
          title="درخواست ارزیابی جدیدی در صف نیست"
          description="به محض ثبت درخواست مطالعه توسط کارآموزان منتسب، در این صفحه نمایش داده می‌شود."
          icon={<CheckCircle2 className="h-8 w-8 text-[#214E3A]" />}
        />
      ) : (
        <div className="space-y-3">
          {evaluations.map((ev) => (
            <Card key={ev.id} variant="elevated">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#214E3A]" />
                    <span className="text-sm font-bold text-[#214031]">
                      {ev.userFullName || ev.user?.fullName || "کارآموز پژوهشی"}
                    </span>
                    <span className="font-mono text-xs text-[#4F6659]">
                      {ev.userPhone || ev.user?.phoneNumber || "-"}
                    </span>
                    <Badge variant="danger" size="sm">در انتظار ارزیابی علمی</Badge>
                  </div>

                  <p className="rounded-xl border border-[#214E3A]/10 bg-[#F3EBDD]/55 p-2.5 text-xs leading-relaxed text-[#214031]">
                    <strong className="text-[#4F6659]">یادداشت کارآموز: </strong>
                    {ev.notes || "بدون توضیحات تکمیلی"}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#4F6659]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      تاریخ ثبت: {new Date(ev.createdAt).toLocaleDateString("fa-IR")}
                    </span>
                    <span>·</span>
                    <span>{ev.completedDocuments.length} نسخه در سابقه مطالعه ثبت شده است</span>
                  </div>

                  {ev.completedDocuments.length > 0 && (
                    <ul className="flex flex-wrap gap-2 text-[11px] text-[#4F6659]">
                      {ev.completedDocuments.map((item) => (
                        <li key={item.versionId} className="rounded-lg border border-[#214E3A]/15 bg-[#FFFCF5] px-2 py-1">
                          {item.title} · نسخه {item.version} · {item.isRequired ? "الزامی" : "مرجع"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Sparkles className="h-4 w-4" />}
                  onClick={() => {
                    setSelectedEvaluation(ev);
                    setFeedbackNotes("");
                  }}
                >
                  بررسی و تصمیم‌گیری
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedEvaluation && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvaluation(null)}
          title={`ارزیابی علمی: ${selectedEvaluation.userFullName || selectedEvaluation.user?.fullName || "کارآموز"}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-right">
            <div className="space-y-1.5 rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/55 p-3 text-xs text-[#214031]">
              <div>
                <strong>نام کارآموز: </strong>
                {selectedEvaluation.userFullName || selectedEvaluation.user?.fullName || "-"}
              </div>
              <div>
                <strong>شماره تماس: </strong>
                <span className="font-mono">{selectedEvaluation.userPhone || selectedEvaluation.user?.phoneNumber || "-"}</span>
              </div>
              <div>
                <strong>خلاصه یادگیری متقاضی:</strong>
                <p className="mt-1 rounded-lg bg-[#FFFCF5] p-2 leading-relaxed">
                  {selectedEvaluation.notes || "توضیحاتی ثبت نشده است."}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#214031]">
                بازخورد علمی به پژوهشگر (اختیاری)
              </label>
              <textarea
                dir="rtl"
                rows={3}
                placeholder="توصیه‌های علمی و روش‌شناختی..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2 text-xs text-[#214031] focus:border-[#214E3A] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#214E3A]/15 pt-4">
              <Button
                variant="secondary"
                size="md"
                icon={<RotateCcw className="h-4 w-4" />}
                loading={isDeciding}
                onClick={() => void handleDecide("REVISION_REQUIRED")}
              >
                نیازمند مطالعه مجدد
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<GraduationCap className="h-4 w-4" />}
                loading={isDeciding}
                onClick={() => void handleDecide("APPROVED")}
              >
                تأیید و ارتقا به کارورز
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

