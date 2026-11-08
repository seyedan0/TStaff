import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  User,
  Building2,
  Mic,
  FileCheck,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Modal } from "../../shared/ui/Modal.js";
import { Input } from "../../shared/ui/Input.js";
import { apiClient } from "../../shared/api-client.js";
import type { ResourceItem, InterviewItem } from "../../shared/types.js";

export interface ResourcesManagerProps {
  caseId: string;
  caseTitle: string;
  onBack: () => void;
  onNotify: (type: "success" | "error" | "info", title: string, message?: string) => void;
}

export const ResourcesManager: React.FC<ResourcesManagerProps> = ({
  caseId,
  caseTitle,
  onBack,
  onNotify,
}) => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeResource, setActiveResource] = useState<ResourceItem | null>(null);
  const [activeInterview, setActiveInterview] = useState<InterviewItem | null>(null);

  // Forms
  const [resourceType, setResourceType] = useState<"INDIVIDUAL" | "ORGANIZATION">("INDIVIDUAL");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDesc, setResourceDesc] = useState("");

  const [intervieweeName, setIntervieweeName] = useState("");
  const [intervieweeAge, setIntervieweeAge] = useState(45);

  const [reportTitle, setReportTitle] = useState("");
  const [reportContent, setReportContent] = useState("");

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<ResourceItem[]>(`/research-cases/${caseId}/resources`);
      setResources(data);
    } catch {
      // Fallback demo resources demonstrating single interview rule
      setResources([
        {
          id: "res-101",
          researchCaseId: caseId,
          type: "INDIVIDUAL",
          title: "مصاحبه با معاون فناوری و توسعه هوش مصنوعی",
          description: "بررسی الگوهای پذیرش فناوری در سازمان‌های حاکمیتی",
          hasInterview: true,
          interview: {
            id: "int-101",
            resourceId: "res-101",
            intervieweeName: "دکتر حسینی",
            intervieweeAge: 48,
            conductedAt: new Date().toISOString(),
            hasReport: true,
            reportsCount: 1,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "res-102",
          researchCaseId: caseId,
          type: "ORGANIZATION",
          title: "اندیشکده حکمرانی و مطالعات راهبردی فضای مجازی",
          description: "تحلیل اسناد بالادستی و گزارش‌های میدانی",
          hasInterview: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [caseId]);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/research-cases/${caseId}/resources`, {
        type: resourceType,
        title: resourceTitle,
        description: resourceDesc,
      });
      onNotify("success", "منبع ثبت شد", "منبع پژوهشی با موفقیت به پرونده افزوده شد.");
      setIsNewResourceOpen(false);
      setResourceTitle("");
      setResourceDesc("");
      loadResources();
    } catch (err: any) {
      onNotify("error", "خطا در ثبت منبع", err.message);
    }
  };

  const handleRecordInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResource) return;

    // Rule D-07 / FR-058 / AT-30: Check if resource already has an interview
    if (activeResource.hasInterview) {
      onNotify(
        "error",
        "تعارض D-07: مصاحبه تکراری",
        "برای هر منبع پژوهشی، در طول حیاتش حداکثر ۱ مصاحبه مجاز است. ثبت مصاحبه دوم مسدود است.",
      );
      return;
    }

    try {
      await apiClient.post(`/resources/${activeResource.id}/interview`, {
        intervieweeName,
        intervieweeAge: Number(intervieweeAge),
        conductedAt: new Date().toISOString(),
      });
      onNotify("success", "مصاحبه ثبت شد", "مصاحبه منبع پژوهشی با موفقیت ثبت شد (حداکثر ۱ مصاحبه D-07).");
      setIsInterviewModalOpen(false);
      loadResources();
    } catch (err: any) {
      onNotify("error", "خطا در ثبت مصاحبه", err.message);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterview) return;

    try {
      await apiClient.post(`/interviews/${activeInterview.id}/reports`, {
        title: reportTitle,
        content: reportContent,
      });
      onNotify("success", "گزارش مکتوب ثبت شد", "گزارش مصاحبه نسخه‌دار شد و الزامات مرحله منابع تکمیل گردید.");
      setIsReportModalOpen(false);
      setReportTitle("");
      setReportContent("");
      loadResources();
    } catch (err: any) {
      onNotify("error", "خطا در ثبت گزارش", err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-apple-blue hover:underline mb-2 flex items-center gap-1 font-medium"
          >
            ← بازگشت به فهرست پرونده‌ها
          </button>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-apple-blue" />
            منابع و مصاحبه‌های میدانی پرونده ({caseTitle})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            قاعده D-07 و AT-30: هر منبع حداکثر ۱ مصاحبه و ۱ گزارش مکتوب نسخه‌دار دارد.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewResourceOpen(true)}
        >
          افزودن منبع جدید
        </Button>
      </div>

      {/* Resources Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">در حال بارگذاری منابع...</div>
      ) : resources.length === 0 ? (
        <Card variant="glass" className="text-center p-12">
          <p className="text-sm text-slate-400">هیچ منبعی برای این پرونده ثبت نشده است.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((res) => (
            <Card key={res.id} variant="glass" className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {res.type === "INDIVIDUAL" ? (
                      <span className="p-2 rounded-apple-sm bg-apple-blue/15 text-apple-blue">
                        <User className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-2 rounded-apple-sm bg-apple-purple/15 text-apple-purple">
                        <Building2 className="w-4 h-4" />
                      </span>
                    )}
                    <h3 className="text-base font-bold text-slate-100">{res.title}</h3>
                  </div>
                  <Badge variant={res.type === "INDIVIDUAL" ? "info" : "indigo"} size="sm">
                    {res.type === "INDIVIDUAL" ? "فرد" : "سازمان/مجموعه"}
                  </Badge>
                </div>

                {res.description && (
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{res.description}</p>
                )}

                {/* Interview Section (Invariant D-07) */}
                <div className="p-3.5 rounded-apple-md bg-white/[0.03] border border-white/5 space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-apple-blue" />
                      وضعیت مصاحبه منبع (D-07):
                    </span>
                    {res.hasInterview ? (
                      <Badge variant="success" size="sm" dot>مصاحبه ثبت‌شده (یکتا)</Badge>
                    ) : (
                      <Badge variant="warning" size="sm" dot>بدون مصاحبه</Badge>
                    )}
                  </div>

                  {res.hasInterview && res.interview ? (
                    <div className="text-[11px] text-slate-300 pt-1 border-t border-white/5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">مصاحبه‌شونده:</span>
                        <span>{res.interview.intervieweeName} ({res.interview.intervieweeAge} سال)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">گزارش مکتوب نسخه‌دار:</span>
                        {res.interview.hasReport ? (
                          <span className="text-apple-green flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5" /> ثبت‌شده
                          </span>
                        ) : (
                          <span className="text-apple-amber">در انتظار ثبت گزارش</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      جهت خاتمه مرحله منابع، ثبت دقیقاً ۱ مصاحبه الزامی است.
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                {!res.hasInterview ? (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Mic className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setActiveResource(res);
                      setIntervieweeName("");
                      setIsInterviewModalOpen(true);
                    }}
                  >
                    ثبت مصاحبه یکتا (D-07)
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                      icon={<AlertCircle className="w-3.5 h-3.5 text-slate-500" />}
                    >
                      مصاحبه ثبت شده (مسدود D-07)
                    </Button>
                    {res.interview && !res.interview.hasReport && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<FileCheck className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setActiveInterview(res.interview!);
                          setIsReportModalOpen(true);
                        }}
                      >
                        ثبت گزارش مکتوب
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Resource Modal */}
      <Modal
        isOpen={isNewResourceOpen}
        onClose={() => setIsNewResourceOpen(false)}
        title="ثبت منبع پژوهشی جدید"
        subtitle="تعریف افراد کلیدی یا سازمان‌های مورد مصاحبه"
      >
        <form onSubmit={handleCreateResource} className="space-y-4 text-right">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="INDIVIDUAL"
                checked={resourceType === "INDIVIDUAL"}
                onChange={() => setResourceType("INDIVIDUAL")}
                className="accent-apple-blue"
              />
              فرد حقیقی (متخصص/مسئول)
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="ORGANIZATION"
                checked={resourceType === "ORGANIZATION"}
                onChange={() => setResourceType("ORGANIZATION")}
                className="accent-apple-blue"
              />
              سازمان / نهاد / اندیشکده
            </label>
          </div>

          <Input
            label="عنوان منبع"
            placeholder="مثال: کارشناس ارشد حکمرانی هوش مصنوعی"
            value={resourceTitle}
            onChange={(e) => setResourceTitle(e.target.value)}
            required
          />

          <div className="text-right">
            <label className="text-xs font-medium text-slate-300 block mb-1">
              توضیحات و زمینه مصاحبه
            </label>
            <textarea
              className="w-full bg-slate-900/60 text-slate-100 placeholder-slate-500 text-sm rounded-apple-md border border-white/10 p-3 outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/30"
              rows={3}
              placeholder="شرح مختصری از ارتباط این منبع با پرونده پژوهشی..."
              value={resourceDesc}
              onChange={(e) => setResourceDesc(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsNewResourceOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت منبع
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Interview Modal */}
      <Modal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        title="ثبت مصاحبه منبع پژوهشی"
        subtitle="قاعده D-07 و AT-30: برای هر منبع صرفاً یک مصاحبه ثبت می‌شود و امکان ثبت مصاحبه دوم وجود ندارد."
      >
        <form onSubmit={handleRecordInterview} className="space-y-4 text-right">
          <Input
            label="نام و نام خانوادگی مصاحبه‌شونده"
            placeholder="مثال: دکتر مهدی حسینی"
            value={intervieweeName}
            onChange={(e) => setIntervieweeName(e.target.value)}
            required
          />

          <Input
            label="سن مصاحبه‌شونده (فقط عدد صحیح مثبت - D-01)"
            type="number"
            step="1"
            min="18"
            max="99"
            dir="ltr"
            value={intervieweeAge}
            onChange={(e) => setIntervieweeAge(Number(e.target.value))}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsInterviewModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت نهایی مصاحبه (قفل دائم D-07)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="ثبت گزارش مکتوب نسخه‌دار مصاحبه (FR-058)"
        subtitle="تحلیل تفصیلی و داده‌های میدانی استخراج‌شده از مصاحبه"
      >
        <form onSubmit={handleCreateReport} className="space-y-4 text-right">
          <Input
            label="عنوان گزارش"
            placeholder="مثال: گزارش مصاحبه تحلیلی اولویت‌های تحول دیجیتال"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            required
          />

          <div className="text-right">
            <label className="text-xs font-medium text-slate-300 block mb-1">
              متن مشروح گزارش (حداقل ۱۰ کاراکتر)
            </label>
            <textarea
              className="w-full bg-slate-900/60 text-slate-100 placeholder-slate-500 text-sm rounded-apple-md border border-white/10 p-3 outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/30"
              rows={5}
              placeholder="متن کامل تحلیل و یافته‌های کلیدی حاصل از مصاحبه..."
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsReportModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت و الصاق گزارش
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
