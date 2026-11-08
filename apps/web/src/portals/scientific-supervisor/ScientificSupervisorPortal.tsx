import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  GraduationCap,
  MessageSquare,
  Clock,
  CheckCircle2,
  RotateCcw,
  UserCheck,
  RefreshCw,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { ScientificReviewsView } from "../../features/reviews/ScientificReviewsView.js";
import { DirectChatView } from "../../features/messaging/DirectChatView.js";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Modal } from "../../shared/ui/Modal.js";
import { apiClient } from "../../shared/api-client.js";
import { ResearchCasesView } from "../../features/research/ResearchCasesView.js";
import { LibraryManagementView } from "../../features/documents/LibraryManagementView.js";
import type { StudyDocumentSnapshot } from "@tstaff/contracts";

interface ScientificSupervisorPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

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

interface AssignedTrainee { id: string; fullName: string; phoneNumber: string; stage: "APPRENTICE" | "INTERN" }

export const ScientificSupervisorPortal: React.FC<
  ScientificSupervisorPortalProps
> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<"trainees" | "reviews" | "evaluations" | "library" | "chat">("trainees");
  const [trainees, setTrainees] = useState<AssignedTrainee[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<AssignedTrainee | null>(null);
  const [isLoadingTrainees, setIsLoadingTrainees] = useState(false);

  const fetchTrainees = async () => {
    setIsLoadingTrainees(true);
    try { setTrainees(await apiClient.get<AssignedTrainee[]>("/scientific-supervisors/me/trainees")); }
    catch (error) { setTrainees([]); onNotify("error", "فهرست کارورزان بارگذاری نشد", error instanceof Error ? error.message : undefined); }
    finally { setIsLoadingTrainees(false); }
  };

  // Apprentice Evaluations State
  const [evaluations, setEvaluations] = useState<PendingEvaluationItem[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<PendingEvaluationItem | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);

  const fetchEvaluations = async () => {
    setIsLoadingEvaluations(true);
    try {
      const res = await apiClient.get<PendingEvaluationItem[]>(
        "/users/study-evaluations/pending",
      );
      setEvaluations(res);
    } catch {
      setEvaluations([]);
    } finally {
      setIsLoadingEvaluations(false);
    }
  };

  useEffect(() => {
    if (activeTab === "trainees") void fetchTrainees();
    if (activeTab === "evaluations") {
      fetchEvaluations();
    }
  }, [activeTab]);

  const handleDecide = async (decision: "APPROVED" | "REVISION_REQUIRED") => {
    if (!selectedEvaluation) return;

    setIsDeciding(true);
    try {
      await apiClient.post(
        `/users/study-evaluations/${selectedEvaluation.id}/decide`,
        {
          decision,
          feedback:
            feedbackNotes.trim() ||
            (decision === "APPROVED"
              ? "صلاحیت علمی و تسلط بر شیوه‌نامه‌ها احراز گردید. ارتقا به کارورز تایید شد."
              : "نیاز به بازبینی و مطالعه عمیق‌تر در بخش تبیین و تجویز."),
        },
      );

      onNotify(
        decision === "APPROVED" ? "success" : "warning",
        decision === "APPROVED"
          ? "کارآموز تایید و به کارورز ارتقا یافت"
          : "درخواست بازبینی به کارآموز ابلاغ شد",
        `تصمیم برای متقاضی «${selectedEvaluation.user?.fullName || selectedEvaluation.userId}» با موفقیت ثبت شد.`,
      );

      setSelectedEvaluation(null);
      setFeedbackNotes("");
      fetchEvaluations();
    } catch (err: unknown) {
      onNotify(
        "error",
        "خطا در ثبت تصمیم",
        err instanceof Error ? err.message : "امکان ثبت تصمیم وجود ندارد",
      );
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Supervisor Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <div className="flex items-center gap-2 p-1 rounded-apple-lg bg-white/[0.03] border border-white/5 overflow-x-auto">
          <button
            onClick={() => setActiveTab("trainees")}
            className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold whitespace-nowrap transition-all ${activeTab === "trainees" ? "bg-apple-blue text-white shadow-apple-glow" : "text-slate-400 hover:text-slate-200"}`}
          >
            <UserCheck className="w-4 h-4" />کارورزان منتسب‌شده
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "reviews"
                ? "bg-apple-blue text-white shadow-apple-glow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            داوری پرونده‌های پژوهشی (D-02 / D-03)
          </button>

          <button
            onClick={() => setActiveTab("evaluations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold whitespace-nowrap transition-all relative ${
              activeTab === "evaluations"
                ? "bg-apple-blue text-white shadow-apple-glow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            ارزیابی کارآموزان و تایید ارتقا به کارورز
            {evaluations.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-apple-amber text-slate-900 text-[10px] font-bold flex items-center justify-center mr-1">
                {evaluations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold whitespace-nowrap transition-all ${activeTab === "library" ? "bg-apple-blue text-white shadow-apple-glow" : "text-slate-400 hover:text-slate-200"}`}
          >
            <BookOpen className="w-4 h-4" />کتابخانه منابع
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "chat"
                ? "bg-apple-blue text-white shadow-apple-glow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            گفت‌وگوی مستقیم با پژوهشگران
          </button>
        </div>

        <div className="text-left">
          <Badge variant="success" size="sm">
            مدیر علمی (اختیار داوری و ارتقا)
          </Badge>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "trainees" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><div><h3 className="text-base font-bold text-slate-100">کارورزان زیر نظر شما</h3><p className="text-xs text-slate-400">با انتخاب کارورز، پرونده‌های او را می‌بینید و می‌توانید پژوهش جدید تعریف کنید.</p></div><Button variant="ghost" size="sm" loading={isLoadingTrainees} onClick={fetchTrainees}>به‌روزرسانی</Button></div>
            {isLoadingTrainees ? <Card variant="glass" className="p-8 text-center text-xs text-slate-400">در حال دریافت فهرست کارورزان…</Card> : trainees.length === 0 ? <Card variant="glass" className="p-8 text-center text-xs text-slate-400">کارورزی برای شما منتسب نشده است.</Card> : <div className="grid gap-3 md:grid-cols-2">{trainees.map((trainee) => <Card key={trainee.id} variant="glass" className={`cursor-pointer p-4 ${selectedTrainee?.id === trainee.id ? "border-apple-blue/50" : ""}`}><div className="flex items-center justify-between"><div><div className="font-semibold text-slate-100">{trainee.fullName}</div><div className="mt-1 text-xs text-slate-400">{trainee.phoneNumber} · {trainee.stage === "INTERN" ? "کارورز" : "کارآموز"}</div></div><Button size="sm" variant={selectedTrainee?.id === trainee.id ? "primary" : "secondary"} onClick={() => setSelectedTrainee(trainee)}>{selectedTrainee?.id === trainee.id ? "انتخاب شده" : "مشاهده پرونده‌ها"}</Button></div></Card>)}</div>}
            {selectedTrainee && <div className="border-t border-white/10 pt-5"><div className="mb-3 text-sm font-semibold text-slate-200">پرونده‌های {selectedTrainee.fullName}</div><ResearchCasesView onNotify={onNotify} researcherId={selectedTrainee.id} canManage={selectedTrainee.stage === "INTERN"} /></div>}
          </div>
        )}
        {/* Tab 1: Research Cases Scientific Reviews */}
        {activeTab === "reviews" && (
          <ScientificReviewsView onNotify={onNotify} />
        )}

        {/* Tab 2: Apprentice Evaluations Queue */}
        {activeTab === "evaluations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-apple-blue" />
                  صف ارزیابی شیوه‌نامه‌ها و تایید ارتقای کارآموزان
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  کارآموزانی که مطالعه منابع الزامی را تکمیل کرده و درخواست ارتقا به سطح کارورز ثبت نموده‌اند:
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={fetchEvaluations}
                loading={isLoadingEvaluations}
                className="text-xs"
              >
                به‌روزرسانی صف
              </Button>
            </div>

            {evaluations.length === 0 ? (
              <Card variant="glass" className="p-8 text-center border-white/10">
                <CheckCircle2 className="w-10 h-10 text-apple-green mx-auto mb-3 opacity-80" />
                <h4 className="text-sm font-semibold text-slate-200">
                  درخواست ارزیابی جدیدی در صف وجود ندارد
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  به محض ارسال درخواست مطالعه توسط کارآموزان، در این لیست نمایان خواهد شد.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {evaluations.map((ev) => (
                  <Card
                    key={ev.id}
                    variant="elevated"
                    className="p-5 border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-apple-blue" />
                          <span className="font-bold text-sm text-slate-100">
                            {ev.userFullName || ev.user?.fullName || "کارآموز پژوهشی"}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {ev.userPhone || ev.user?.phoneNumber || "-"}
                          </span>
                          <Badge variant="warning" size="sm">
                            در انتظار ارزیابی مدیر علمی
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-2.5 rounded-apple-md border border-white/5">
                          <strong className="text-slate-400">یادداشت کارآموز: </strong>
                          {ev.notes || "بدون توضیحات تکمیلی"}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            تاریخ ثبت: {new Date(ev.createdAt).toLocaleDateString("fa-IR")}
                          </span>
                          <span>•</span>
                          <span>{ev.completedDocuments.length} نسخه در snapshot مطالعه ثبت شده است</span>
                        </div>
                        {ev.completedDocuments.length > 0 && (
                          <ul className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                            {ev.completedDocuments.map((item) => (
                              <li key={item.versionId} className="rounded-apple-sm border border-white/10 px-2 py-1">
                                {item.title} · نسخه {item.version} · {item.isRequired ? "الزامی" : "مرجع"}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          variant="primary"
                          size="md"
                          icon={<Sparkles className="w-4 h-4" />}
                          onClick={() => {
                            setSelectedEvaluation(ev);
                            setFeedbackNotes("");
                          }}
                        >
                          بررسی و تصمیم‌گیری
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Direct Messaging */}
        {activeTab === "chat" && <DirectChatView onNotify={onNotify} />}
        {activeTab === "library" && <LibraryManagementView onNotify={onNotify} />}
      </div>

      {/* Modal: Evaluation Decision */}
      {selectedEvaluation && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvaluation(null)}
          title={`ارزیابی و تعیین صلاحیت علمی: ${selectedEvaluation.userFullName || selectedEvaluation.user?.fullName || "کارآموز"}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-right">
            <div className="p-3 rounded-apple-md bg-white/[0.03] border border-white/10 text-xs text-slate-300 space-y-1">
              <div>
                <strong>نام کارآموز: </strong>
                {selectedEvaluation.userFullName || selectedEvaluation.user?.fullName || "رضا میرزایی"}
              </div>
              <div>
                <strong>شماره تماس: </strong>
                <span className="font-mono">
                  {selectedEvaluation.userPhone || selectedEvaluation.user?.phoneNumber || "-"}
                </span>
              </div>
              <div>
                <strong>توضیحات و خلاصه یادگیری متقاضی: </strong>
                <p className="mt-1 text-slate-200 leading-relaxed bg-black/20 p-2 rounded">
                  {selectedEvaluation.notes || "توضیحاتی ثبت نشده است."}
                </p>
              </div>
              <div>
                <strong>نسخه‌های مطالعه‌شده هنگام ثبت درخواست: </strong>
                {selectedEvaluation.completedDocuments.length === 0 ? (
                  <p className="mt-1 text-slate-400">snapshot مطالعه خالی است.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-slate-300">
                    {selectedEvaluation.completedDocuments.map((item) => (
                      <li key={item.versionId}>
                        {item.title} · نسخه {item.version} · {item.isRequired ? "الزامی" : "مرجع"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                بازخورد و رهنمود علمی به پژوهشگر (اختیاری)
              </label>
              <textarea
                dir="rtl"
                rows={3}
                placeholder="توصیه‌ها، تذکرات پیرامون روش‌شناسی پرونده و..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Button
                variant="secondary"
                size="md"
                icon={<RotateCcw className="w-4 h-4 text-apple-amber" />}
                loading={isDeciding}
                onClick={() => handleDecide("REVISION_REQUIRED")}
                className="text-apple-amber hover:text-white"
              >
                نیازمند مطالعه مجدد
              </Button>

              <Button
                variant="primary"
                size="md"
                icon={<CheckCircle2 className="w-4 h-4" />}
                loading={isDeciding}
                onClick={() => handleDecide("APPROVED")}
              >
                تأیید و ارتقا به سطح کارورز
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
