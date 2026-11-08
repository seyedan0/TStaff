import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileCheck2,
  Download,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  Sparkles,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Modal } from "../../shared/ui/Modal.js";
import { apiClient } from "../../shared/api-client.js";
import { useAuth } from "../../features/auth/AuthContext.js";

interface ApprenticePortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

interface StudyMaterial {
  id: string;
  title: string;
  summary: string;
  pages: number;
  duration: string;
  fileSize: string;
  category: string;
  content: string;
}

interface StudyEvaluationStatus {
  id: string;
  status: "PENDING" | "APPROVED" | "REVISION_REQUIRED";
  notes?: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

const STUDY_MATERIALS: StudyMaterial[] = [
  {
    id: "mat-1",
    title: "شیوه‌نامه استخراج منابع و مصاحبه با خبرگان (سیاست D-07)",
    summary:
      "اصول اعتبارسنجی منابع اسنادی، فرآیند مصاحبه تک‌باره، فرمت پیاده‌سازی صوت و ثبت گزارش نهایی منبع.",
    pages: 24,
    duration: "۴ ساعت",
    fileSize: "۲.۱ مگابایت",
    category: "مرحله منابع",
    content: `سند شیوه‌نامه جامع استخراج و اعتبارسنجی منابع (مصوب کارگروه علمی):
۱. هر پرونده پژوهشی باید مبتنی بر منابع معتبر اسنادی یا مصاحبه با خبرگان تراز اول حوزه موضوعی باشد.
۲. قاعده یکتایی منبع و مصاحبه (تصمیم D-07): برای هر منبع پژوهشی، در طول حیاتش حداکثر یک مصاحبه ثبت می‌شود.
۳. در مرحله خاتمه منابع، هر منبع باید دقیقاً دارای یک مصاحبه و یک گزارش مکتوب نسخه‌دار باشد.
۴. ضبط صوت مصاحبه با رضایت مصاحبه‌شونده و بارگذاری فایل فشرده صوتی در سامانه الزامی است.`,
  },
  {
    id: "mat-2",
    title: "راهنمای تحلیل علّی و تدوین بیانیه تبیین مسئله",
    summary:
      "روش‌شناسی تدوین ماتریس تبیین، ریشه‌یابی پدیده‌ها با رویکرد لایه‌ای و تفکیک علت از معلول.",
    pages: 32,
    duration: "۵ ساعت",
    fileSize: "۳.۴ مگابایت",
    category: "مرحله تبیین",
    content: `راهنمای گام‌به‌گام مرحله تبیین مسئله:
۱. پژوهشگر موظف است پس از تایید منابع، با تکیه بر یافته‌ها، درخت مشکلات و علل ریشه‌ای را ترسیم کند.
۲. ارجاع مستقیم به کدهای استخراج‌شده از مصاحبه‌ها در متن تبیین الزامی است.
۳. نگارش بیانیه تبیین باید به زبان شفاف، مستدل و عاری از کلی‌گویی و پیش‌داوری باشد.
۴. تبیین مسئله پیش‌نیاز قطعی ورود به مرحله ارائه راه‌کار و تجویز است.`,
  },
  {
    id: "mat-3",
    title: "اصول تدوین بسته‌های تجویزی و راهبردهای سیاستی",
    summary:
      "چگونگی تبدیل تحلیل‌های تبیینی به راه‌کارهای عملیاتی، زمان‌بندی‌شده و قابل ارزیابی در میدان.",
    pages: 28,
    duration: "۴ ساعت",
    fileSize: "۲.۸ مگابایت",
    category: "مرحله تجویز",
    content: `شیوه‌نامه تدوین راه‌کارهای تجویزی:
۱. راه‌کار تجویزی باید دارای مخاطب سازمانی مشخص، افق زمانی و منابع مورد نیاز باشد.
۲. تجویزها باید مستقیماً ناظر بر گره‌های تبیین‌شده در مرحله قبل باشند.
۳. هر راه‌کار باید در سه سطح کوتاه‌مدت، میان‌مدت و بلندمدت تفکیک شود.
۴. امکان‌سنجی حقوقی و اجرایی راه‌کارها الزامی است.`,
  },
  {
    id: "mat-4",
    title: "استانداردهای سناریونویسی و مدل‌سازی آینده‌پژوهی",
    summary:
      "روش تدوین سناریوهای باورپذیر، شاخص‌های هشدار زودهنگام و راهبردهای مواجهه با آینده‌های محتمل.",
    pages: 36,
    duration: "۶ ساعت",
    fileSize: "۴.۲ مگابایت",
    category: "مرحله سناریو",
    content: `دستورالعمل سناریونویسی نهایی:
۱. سناریو تصویر پیوسته و یکپارچه‌ای از آینده محتمل در صورت تحقق یا عدم تحقق تجویزهاست.
۲. هر پژوهشگر ملزم به ترسیم حداقل دو سناریوی مرجع (خوش‌بینانه و واقع‌بینانه) است.
۳. سناریوی نهایی پس از تایید مدیر علمی، در بانک سناریوی سازمانی نمایه می‌گردد.`,
  },
  {
    id: "mat-5",
    title: "منشور تعامل با مدیران علمی و داوری پرونده‌ها (D-02 / D-03)",
    summary:
      "حدود اختیارات علمی، فرآیند رفت‌وبرگشت اصلاحات و درک قاعده کفایت یک تصمیم معتبر.",
    pages: 18,
    duration: "۳ ساعت",
    fileSize: "۱.۶ مگابایت",
    category: "فرایندهای نظارتی",
    content: `منشور تعامل علمی:
۱. هر پرونده دارای یک مدیر علمی اصلی و حداکثر یک مدیر علمی همکار است.
۲. هر دو مدیر دارای اختیار داوری برابرند؛ تصمیم یکی از آن‌ها برای پیشبرد مرحله کافی است.
۳. در صورت اقدام همزمان، نخستین تصمیم معتبر ثبت می‌شود.
۴. پژوهشگر موظف است تمام بازخوردهای مدیر علمی را در بازه مجاز اعمال کند.`,
  },
  {
    id: "mat-6",
    title: "قوانین بازبینی چرخه‌ای و مدیریت نسخه‌ها (سیاست D-05)",
    summary:
      "رفتار سامانه در صورت بازگشت به مراحل قبل، حفظ نسخه‌ها و نحوه فعال‌سازی وضعیت REVIEW_REQUIRED.",
    pages: 16,
    duration: "۲ ساعت",
    fileSize: "۱.۲ مگابایت",
    category: "مدیریت تغییرات",
    content: `قوانین چرخه بازگشت:
۱. بازگشت به مرحله قبل نسخه‌های قبلی را حذف نمی‌کند و تاریخچه تغییرات دست‌نخورده باقی می‌ماند.
۲. با تغییر در پیش‌نیازها، خروجی مراحل بعدی به وضعیت REVIEW_REQUIRED منتقل می‌شود.
۳. پیش از انتشار سناریو، تایید مجدد تمامی مراحل وابسته الزامی است.`,
  },
];

export const ApprenticePortal: React.FC<ApprenticePortalProps> = ({
  onNotify,
}) => {
  const { currentUser } = useAuth();
  const [completedMaterials, setCompletedMaterials] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("tstaff_apprentice_completed_materials");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeReading, setActiveReading] = useState<StudyMaterial | null>(null);
  const [studyNotes, setStudyNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<StudyEvaluationStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Support Ticket Modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "tstaff_apprentice_completed_materials",
      JSON.stringify(completedMaterials),
    );
  }, [completedMaterials]);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await apiClient.get<StudyEvaluationStatus | null>(
        "/users/study-evaluations/my-status",
      );
      setEvaluation(res);
    } catch {
      // In offline/mock mode or no record yet
      setEvaluation(null);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const toggleMaterial = (id: string) => {
    setCompletedMaterials((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedCount = Object.values(completedMaterials).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / STUDY_MATERIALS.length) * 100);

  const handleSubmitEvaluationRequest = async () => {
    if (completedCount < STUDY_MATERIALS.length) {
      onNotify(
        "warning",
        "تکمیل مطالعه منابع",
        "لطفاً تمامی شیوه‌نامه‌ها و منابع را مطالعه و علامت‌گذاری نمایید سپس درخواست ارزیابی را ثبت کنید.",
      );
      return;
    }

    const completedTitles = STUDY_MATERIALS.filter(
      (m) => completedMaterials[m.id],
    ).map((m) => m.title);

    setIsSubmitting(true);
    try {
      const res = await apiClient.post<StudyEvaluationStatus>(
        "/users/study-evaluations/request",
        {
          completedGuidelines:
            completedTitles.length > 0
              ? completedTitles
              : ["شیوه‌نامه‌های آموزشی و فرآیندی"],
          notes:
            studyNotes.trim() ||
            "کلیه شیوه‌نامه‌های آموزشی و فرآیندی با موفقیت مطالعه گردید.",
        },
      );
      setEvaluation(res);
      onNotify(
        "success",
        "درخواست ارزیابی ثبت گردید",
        "درخواست شما در کارتابل مدیر علمی قرار گرفت. پس از بررسی و تایید، دسترسی شما به عنوان کارورز فعال خواهد شد.",
      );
    } catch (err: unknown) {
      onNotify(
        "error",
        "خطا در ثبت درخواست",
        err instanceof Error ? err.message : "ارتباط با سرور برقرار نشد",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setIsSubmittingTicket(true);
    try {
      await apiClient.post("/users/support-tickets", {
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
      });
      setShowSupportModal(false);
      setTicketSubject("");
      setTicketDescription("");
      onNotify(
        "success",
        "تیکت پشتیبانی ارسال شد",
        "پیام شما به مدیر پشتیبانی سامانه ارسال گردید و در اسرع وقت پاسخ داده خواهد شد.",
      );
    } catch (err: unknown) {
      onNotify(
        "error",
        "خطا در ارسال تیکت",
        err instanceof Error ? err.message : "امکان ارسال تیکت وجود ندارد",
      );
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Mission Card */}
      <Card
        variant="elevated"
        className="p-6 border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-apple-blue/10"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" size="sm">
                میز کارآموزی پژوهشی
              </Badge>
              <span className="text-xs text-slate-400">
                قانون AT-02: دسترسی ایزوله به متون آموزشی
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
              خوش‌آمدید، {currentUser?.fullName || "کارآموز گرامی"}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              شما هم‌اکنون در مرحله کارآموزی پژوهشی سامانه قرار دارید. طبق فرآیند
              رسمی، پژوهشگران پیش از تحویل پرونده و ورود به چرخه نگارش، باید
              شیوه‌نامه‌ها و استانداردهای روش‌شناسی پژوهشگاه را مطالعه نمایند.
            </p>
          </div>

          {/* Quick Actions & Progress */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="p-3 rounded-apple-lg bg-white/[0.04] border border-white/10 text-center min-w-[140px]">
              <div className="text-[11px] text-slate-400">پیشرفت مطالعه</div>
              <div className="text-xl font-bold text-apple-blue mt-0.5">
                {progressPercent}٪
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {completedCount} از {STUDY_MATERIALS.length} شیوه‌نامه
              </div>
            </div>

            <Button
              variant="secondary"
              size="md"
              icon={<HelpCircle className="w-4 h-4" />}
              onClick={() => setShowSupportModal(true)}
              className="text-xs"
            >
              ارسال پیام به پشتیبانی
            </Button>
          </div>
        </div>

        {/* Apple Progress Bar */}
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-6">
          <div
            className="bg-apple-blue h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Live Evaluation Status Banner */}
      {evaluation && (
        <Card
          variant="glass"
          className={`p-5 border ${
            evaluation.status === "PENDING"
              ? "border-apple-blue/30 bg-apple-blue/10"
              : evaluation.status === "APPROVED"
                ? "border-apple-green/30 bg-apple-green/10"
                : "border-apple-amber/30 bg-apple-amber/10"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-apple-md bg-white/10 shrink-0 mt-0.5">
              {evaluation.status === "PENDING" && (
                <Clock className="w-6 h-6 text-apple-blue animate-pulse" />
              )}
              {evaluation.status === "APPROVED" && (
                <CheckCircle2 className="w-6 h-6 text-apple-green" />
              )}
              {evaluation.status === "REVISION_REQUIRED" && (
                <AlertCircle className="w-6 h-6 text-apple-amber" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  {evaluation.status === "PENDING" &&
                    "درخواست ارزیابی شما در صف بررسی مدیران علمی قرار دارد"}
                  {evaluation.status === "APPROVED" &&
                    "تبریک! درخواست ارزیابی شما توسط مدیر علمی تایید گردید"}
                  {evaluation.status === "REVISION_REQUIRED" &&
                    "بازخورد مدیر علمی: نیاز به مطالعه تکمیلی و بازبینی"}
                </h3>
                <Badge
                  variant={
                    evaluation.status === "PENDING"
                      ? "info"
                      : evaluation.status === "APPROVED"
                        ? "success"
                        : "warning"
                  }
                  size="sm"
                >
                  {evaluation.status === "PENDING"
                    ? "در انتظار داوری"
                    : evaluation.status === "APPROVED"
                      ? "تایید و ارتقا یافته"
                      : "نیازمند اصلاح"}
                </Badge>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {evaluation.status === "PENDING" &&
                  "مدیر علمی پرونده‌ها خلاصه یادگیری شما را ارزیابی کرده و پس از احراز صلاحیت، سطح کاربری شما خودکار به «کارورز» ارتقا یافته و کارتابل پژوهش فعال خواهد شد."}
                {evaluation.status === "APPROVED" &&
                  "ارتقای شما به سطح کارورز در سامانه ثبت شد. در بارگذاری بعدی صفحه کارتابل کامل پژوهش در دسترس شما خواهد بود."}
                {evaluation.status === "REVISION_REQUIRED" &&
                  (evaluation.feedback ||
                    "لطفاً منابع مشخص‌شده را مجدداً با دقت بررسی فرمایید و سپس درخواست بازبینی ثبت نمایید.")}
              </p>

              {evaluation.status === "PENDING" && (
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={fetchStatus}
                    loading={isLoadingStatus}
                    className="text-xs"
                  >
                    بررسی آخرین وضعیت
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Grid of Study Guidelines */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-apple-blue" />
            <h3 className="text-base font-bold text-slate-100">
              شیوه‌نامه‌ها و منابع آموزشی الزامی
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            برای باز کردن متن شیوه‌نامه روی دکمه مشاهده کلیک کنید
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STUDY_MATERIALS.map((mat) => {
            const isDone = !!completedMaterials[mat.id];
            return (
              <Card
                key={mat.id}
                variant="elevated"
                className={`p-5 transition-all border ${
                  isDone
                    ? "border-apple-green/30 bg-apple-green/[0.02]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-apple-blue uppercase tracking-wider">
                        {mat.category}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-100 leading-snug">
                        {mat.title}
                      </h4>
                    </div>
                    <Badge variant={isDone ? "success" : "neutral"} size="sm">
                      {isDone ? "مطالعه شد" : "در انتظار مطالعه"}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {mat.summary}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      {mat.pages} صفحه
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {mat.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      {mat.fileSize}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMaterial(mat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-apple-md text-xs font-medium transition-all ${
                        isDone
                          ? "bg-apple-green/20 text-apple-green border border-apple-green/30"
                          : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isDone ? "مطالعه شد ✓" : "علامت‌گذاری به عنوان مطالعه‌شده"}
                    </button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setActiveReading(mat)}
                      className="text-xs"
                    >
                      مشاهده و مطالعه
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Completion & Submit Section */}
      <Card
        variant="elevated"
        className="p-6 border-white/10 bg-slate-900/60 backdrop-blur-xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-apple-lg bg-apple-blue/20 border border-apple-blue/40 flex items-center justify-center text-apple-blue">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                پایان مطالعه و ارسال درخواست ارتقا به کارورز
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                پس از مطالعه کامل شیوه‌نامه‌ها، خلاصه و یادداشت‌های یادگیری خود را وارد کرده و درخواست ارزیابی را به مدیر علمی ارسال فرمایید.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              خلاصه یادگیری و توضیحات تکمیلی (اختیاری)
            </label>
            <textarea
              dir="rtl"
              rows={3}
              placeholder="نکات کلیدی فراگرفته‌شده از شیوه‌نامه‌ها، آمادگی برای ورود به فاز عملیاتی پژوهش و..."
              value={studyNotes}
              onChange={(e) => setStudyNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50 focus:ring-1 focus:ring-apple-blue/50"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              وضعیت شرط احراز:{" "}
              <span
                className={`font-semibold ${
                  completedCount === STUDY_MATERIALS.length
                    ? "text-apple-green"
                    : "text-apple-amber"
                }`}
              >
                {completedCount === STUDY_MATERIALS.length
                  ? "همه شیوه‌نامه‌ها مطالعه شده‌اند (آماده ارسال)"
                  : `${STUDY_MATERIALS.length - completedCount} شیوه‌نامه باقی مانده است`}
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              icon={<Send className="w-4 h-4" />}
              loading={isSubmitting}
              disabled={
                completedCount < STUDY_MATERIALS.length ||
                evaluation?.status === "PENDING"
              }
              onClick={handleSubmitEvaluationRequest}
            >
              {evaluation?.status === "PENDING"
                ? "درخواست ارزیابی در حال بررسی است"
                : "مطالعه کلیه شیوه‌نامه‌ها را به پایان رساندم - ارسال به مدیر علمی"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal: Full Reading Reader */}
      {activeReading && (
        <Modal
          isOpen={true}
          onClose={() => setActiveReading(null)}
          title={activeReading.title}
          maxWidth="lg"
        >
          <div className="space-y-4 text-right">
            <div className="flex items-center justify-between p-3 rounded-apple-md bg-white/[0.03] border border-white/5 text-xs text-slate-400">
              <span>دسته‌بندی: {activeReading.category}</span>
              <span>حجم فایل شیوه‌نامه: {activeReading.fileSize}</span>
              <span>زمان مطالعه تخمینی: {activeReading.duration}</span>
            </div>

            <div className="p-4 rounded-apple-md bg-slate-950/70 border border-white/10 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line max-h-[380px] overflow-y-auto">
              {activeReading.content}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  onNotify(
                    "info",
                    "دانلود فایل شیوه‌نامه",
                    `فایل ${activeReading.title} با موفقیت دریافت گردید.`,
                  );
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-apple-md bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-all"
              >
                <Download className="w-4 h-4 text-apple-blue" />
                دریافت نسخه PDF کامل
              </button>

              <Button
                variant="primary"
                size="md"
                icon={<FileCheck2 className="w-4 h-4" />}
                onClick={() => {
                  toggleMaterial(activeReading.id);
                  setActiveReading(null);
                  onNotify(
                    "success",
                    "ثبت مطالعه",
                    `شیوه‌نامه «${activeReading.title}» به عنوان مطالعه‌شده ثبت گردید.`,
                  );
                }}
              >
                مطالعه این بخش به پایان رسید
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Support Ticket */}
      {showSupportModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowSupportModal(false)}
          title="ارسال تیکت به مدیر پشتیبانی"
          maxWidth="md"
        >
          <form onSubmit={handleCreateSupportTicket} className="space-y-4 text-right">
            <p className="text-xs text-slate-400 leading-relaxed">
              در صورت بروز هرگونه ابهام درباره منابع، دسترسی‌ها یا فرایند کارآموزی، پیام خود را ثبت فرمایید:
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                موضوع تیکت
              </label>
              <input
                type="text"
                dir="rtl"
                required
                placeholder="مثال: سوال پیرامون قاعده تک‌باره مصاحبه در شیوه‌نامه D-07"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                شرح پیام
              </label>
              <textarea
                dir="rtl"
                rows={4}
                required
                placeholder="شرح کامل پرسش یا درخواست..."
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowSupportModal(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmittingTicket}
                icon={<Send className="w-4 h-4" />}
              >
                ارسال تیکت به پشتیبانی
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
