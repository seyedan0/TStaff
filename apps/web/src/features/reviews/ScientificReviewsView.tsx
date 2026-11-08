import React, { useState } from "react";
import {
  FileSignature,
  CheckCircle2,
  Scale,
  Sparkles,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Modal } from "../../shared/ui/Modal.js";
import { apiClient } from "../../shared/api-client.js";

export interface ScientificReviewsViewProps {
  onNotify: (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
}

interface PendingReviewItem {
  id: string;
  caseId: string;
  caseCode: string;
  caseTitle: string;
  stageType: string;
  stageName: string;
  internName: string;
  submittedAt: string;
  version: number;
  summary: string;
}

export const ScientificReviewsView: React.FC<ScientificReviewsViewProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<"WORKLIST" | "SCENARIOS">("WORKLIST");

  const [reviews, setReviews] = useState<PendingReviewItem[]>([
    {
      id: "rev-1",
      caseId: "case-001",
      caseCode: "CASE-101",
      caseTitle: "مطالعه تحلیلی زیست‌بوم شرکت‌های دانش‌بنیان",
      stageType: "EXPLANATION",
      stageName: "مرحله دوم: تبیین مسئله",
      internName: "پژوهشگر علی حسینی",
      submittedAt: "امروز، ساعت ۱۰:۳۰",
      version: 2,
      summary: "تحلیل میدانی مصاحبه‌ها و استخراج مدل علّی چالش‌های زیست‌بوم نوآوری کشور",
    },
    {
      id: "rev-2",
      caseId: "case-002",
      caseCode: "CASE-102",
      caseTitle: "واکاوی آسیب‌های فرهنگی رسانه‌های نوین",
      stageType: "SOURCES",
      stageName: "مرحله اول: منابع و مصاحبه‌ها",
      internName: "پژوهشگر سارا رضوانی",
      submittedAt: "دیروز، ساعت ۱۶:۴۵",
      version: 1,
      summary: "ثبت ۳ مصاحبه تخصصی نخبگانی همراه با گزارش‌های مکتوب نسخه‌دار (D-07)",
    },
  ]);

  // Decision Modal
  const [activeReview, setActiveReview] = useState<PendingReviewItem | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Scenarios Bank (Internal MVP only)
  const scenarios = [
    {
      id: "sc-1",
      code: "SCN-2026-A",
      title: "سناریوی آینده‌نگاری اشتغال و هوش مصنوعی در ایران",
      caseCode: "CASE-088",
      approvedBy: "دکتر رضایی (مدیر علمی)",
      status: "APPROVED_INTERNAL",
      approvedAt: "۱۴۰۵/۰۸/۱۵",
      summary: "سناریوی سه‌گانه مواجهه با تحول بازار کار تا افق ۱۴۱۰ با تمرکز بر بهره‌وری.",
    },
    {
      id: "sc-2",
      code: "SCN-2026-B",
      title: "سناریوی بازآفرینی حکمرانی داده در دستگاه‌های اجرایی",
      caseCode: "CASE-074",
      approvedBy: "دکتر حسینی (مدیر همکار)",
      status: "APPROVED_INTERNAL",
      approvedAt: "۱۴۰۵/۰۸/۱۰",
      summary: "چارچوب سیاستی یکپارچه‌سازی سامانه‌ها و تبادل امن اطلاعات میان‌بخشی.",
    },
  ];

  const handleDecision = async (decision: "APPROVED" | "REVISION_REQUIRED") => {
    if (!activeReview) return;
    setLoading(true);

    try {
      // Rule D-02 & D-03: Single valid decision is sufficient.
      // If another supervisor has submitted concurrently, 409 STALE_REVISION is returned.
      await apiClient.post(`/research-cases/${activeReview.caseId}/reviews/decisions`, {
        decision,
        comments: decisionNotes || (decision === "APPROVED" ? "مورد تأیید است" : "نیازمند اصلاح"),
        expectedVersion: activeReview.version,
      });

      onNotify(
        decision === "APPROVED" ? "success" : "info",
        `داوری علمی ثبت شد (D-02)`,
        `تصمیم ${decision === "APPROVED" ? "تأیید" : "اصلاح"} برای پرونده ${activeReview.caseCode} اعمال گردید.`,
      );
      setReviews(reviews.filter((r) => r.id !== activeReview.id));
      setActiveReview(null);
      setDecisionNotes("");
    } catch (err: any) {
      if (err.problem?.code === "STALE_REVISION" || err.problem?.status === 409) {
        onNotify(
          "error",
          "تعارض همزمانی داوران (D-03 / AT-29)",
          "مدیر علمی دیگر در همین لحظه تصمیم دیگری را برای این نسخه ثبت کرده است (409 STALE_REVISION). صفحه به‌روزرسانی شد.",
        );
      } else {
        onNotify("error", "خطا در ثبت داوری", err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-apple-indigo" />
            کارتابل داوری علمی و بانک سناریوها (D-02, D-03, FR-027)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            اختیار داوری برابر مدیر اصلی و همکار، کنترل همزمانی نسخه (CAS) و بانک داخلی سناریوهای مصوب
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 rounded-apple-md apple-glass border border-white/5 text-xs">
          <button
            onClick={() => setActiveTab("WORKLIST")}
            className={`px-3.5 py-1.5 rounded-apple-sm transition-all font-medium ${
              activeTab === "WORKLIST"
                ? "bg-apple-indigo text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            کارتابل داوری ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab("SCENARIOS")}
            className={`px-3.5 py-1.5 rounded-apple-sm transition-all font-medium ${
              activeTab === "SCENARIOS"
                ? "bg-apple-indigo text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            بانک سناریوها ({scenarios.length})
          </button>
        </div>
      </div>

      {activeTab === "WORKLIST" ? (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card variant="glass" className="text-center p-12">
              <CheckCircle2 className="w-8 h-8 text-apple-green mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-200">
                تمام پرونده‌های ارجاع‌شده داوری شده‌اند.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                کارتابل داوری علمی شما در حال حاضر خالی است.
              </p>
            </Card>
          ) : (
            reviews.map((item) => (
              <Card key={item.id} variant="glass" className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-apple-sm bg-apple-indigo/15 text-apple-indigo border border-apple-indigo/30 font-bold">
                        {item.caseCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-100">{item.caseTitle}</h3>
                      <Badge variant="indigo" size="sm">{item.stageName}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>ارائه‌دهنده: {item.internName}</span>
                      <span>•</span>
                      <span>زمان ثبت: {item.submittedAt}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-apple-indigo hover:bg-apple-indigo/90"
                    icon={<FileSignature className="w-4 h-4" />}
                    onClick={() => setActiveReview(item)}
                  >
                    بررسی و ثبت رأی داوری
                  </Button>
                </div>

                <div className="p-3 rounded-apple-md bg-white/[0.03] border border-white/5 text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block mb-1">خلاصه یافته‌های این مرحله:</span>
                  <p className="leading-relaxed">{item.summary}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Scenarios Bank View */
        <div className="space-y-4">
          <div className="p-3 rounded-apple-md bg-apple-blue/10 border border-apple-blue/20 text-xs text-apple-blue flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              نکته محدوده MVP: بانک سناریو صرفاً داخلی و برای کاربران مجاز در دسترس است؛ اکسپلور عمومی سناریوها خارج از محدوده فاز اول است.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((sc) => (
              <Card key={sc.id} variant="glass" className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-apple-sm bg-apple-green/15 text-apple-green border border-apple-green/30">
                      {sc.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-2">{sc.title}</h3>
                  </div>
                  <Badge variant="success" size="sm">سناریوی نهایی مصوب</Badge>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{sc.summary}</p>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>تأیید توسط: {sc.approvedBy}</span>
                  <span>تاریخ: {sc.approvedAt}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Review Decision Modal */}
      <Modal
        isOpen={!!activeReview}
        onClose={() => setActiveReview(null)}
        title="ثبت تصمیم داوری علمی مرحله (D-02 / D-03 / AT-29)"
        subtitle="کفایت یک تصمیم معتبر: تصمیم هر یک از مدیران علمی فعال (اصلی یا همکار) برای این مرحله نافذ است."
      >
        {activeReview && (
          <div className="space-y-4 text-right">
            <div className="p-3 rounded-apple-md bg-white/[0.03] border border-white/5 text-xs space-y-1">
              <div>
                <span className="text-slate-400">پرونده:</span>{" "}
                <strong className="text-slate-200">{activeReview.caseTitle}</strong> ({activeReview.caseCode})
              </div>
              <div>
                <span className="text-slate-400">مرحله ارزیابی:</span>{" "}
                <span className="text-apple-indigo font-semibold">{activeReview.stageName}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                یادداشت داوری و نکات علمی:
              </label>
              <textarea
                className="w-full bg-slate-900/60 text-slate-100 placeholder-slate-500 text-sm rounded-apple-md border border-white/10 p-3 outline-none focus:border-apple-indigo"
                rows={4}
                placeholder="ارزیابی روش‌شناسی، کیفیت منابع، قوت استدلال و اصلاحات لازم..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-apple-md bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-semibold">قانون همزمانی D-03:</span> اگر مدیر علمی همکار زودتر رأی داده باشد، تصمیم وی ثبت و این اقدام با پیام تعارض رد می‌شود تا تکرار تصمیم پیش نیاید.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={() => setActiveReview(null)}>
                انصراف
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={loading}
                className="text-apple-amber hover:text-white"
                onClick={() => handleDecision("REVISION_REQUIRED")}
              >
                نیازمند اصلاح
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={loading}
                className="bg-apple-green hover:bg-apple-green/90 text-white"
                onClick={() => handleDecision("APPROVED")}
              >
                تأیید علمی مرحله
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
