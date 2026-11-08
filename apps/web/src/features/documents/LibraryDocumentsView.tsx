import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Download, FileText, RefreshCw } from "lucide-react";
import type { PublishedLibraryDocumentDto, StudyEvaluationStatus } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { getStudyProgress } from "./study-progress.js";

interface LibraryDocumentsViewProps {
  isApprentice: boolean;
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const LibraryDocumentsView: React.FC<LibraryDocumentsViewProps> = ({ isApprentice, onNotify }) => {
  const [documents, setDocuments] = useState<PublishedLibraryDocumentDto[]>([]);
  const [evaluation, setEvaluation] = useState<StudyEvaluationStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const progress = useMemo(() => getStudyProgress(documents), [documents]);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      setDocuments(await apiClient.get<PublishedLibraryDocumentDto[]>("/documents"));
    } catch (error) {
      setDocuments([]);
      onNotify("error", "کتابخانه منابع بارگذاری نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [onNotify]);

  const loadEvaluation = useCallback(async () => {
    if (!isApprentice) return;
    try {
      setEvaluation(await apiClient.get<StudyEvaluationStatus | null>("/users/study-evaluations/my-status"));
    } catch {
      setEvaluation(null);
    }
  }, [isApprentice]);

  useEffect(() => {
    void loadDocuments();
    void loadEvaluation();
  }, [loadDocuments, loadEvaluation]);

  const markRead = async (document: PublishedLibraryDocumentDto) => {
    const { id: documentId, currentVersion } = document;
    setBusyVersionId(currentVersion.id);
    try {
      await apiClient.post(`/documents/${documentId}/versions/${currentVersion.id}/read`);
      await loadDocuments();
      onNotify("success", "مطالعه ثبت شد", `نسخه ${currentVersion.version} با شناسه «${currentVersion.title}» ثبت شد.`);
    } catch (error) {
      onNotify("error", "ثبت مطالعه انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusyVersionId(null);
    }
  };

  const download = async (document: PublishedLibraryDocumentDto) => {
    try {
      await apiClient.download(`/documents/${document.id}/download`, document.currentVersion.fileName);
    } catch (error) {
      onNotify("error", "دریافت فایل انجام نشد", error instanceof Error ? error.message : undefined);
    }
  };

  const submitEvaluation = async () => {
    if (!progress.canRequestEvaluation || evaluation?.status === "PENDING" || evaluation?.status === "APPROVED") return;
    setIsSubmitting(true);
    try {
      const result = await apiClient.post<StudyEvaluationStatus>("/users/study-evaluations/request", {
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setEvaluation(result);
      onNotify("success", "درخواست ارزیابی ثبت شد", "مدیران علمی منتسب نسخه‌های مطالعه‌شده را در کارتابل می‌بینند.");
    } catch (error) {
      onNotify("error", "ارسال درخواست ارزیابی انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-5" aria-labelledby="library-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="library-title" className="flex items-center gap-2 text-xl font-bold text-slate-100">
            <BookOpen className="h-5 w-5 text-apple-blue" /> منابع آموزشی
          </h2>
          <p className="mt-1 text-xs text-slate-400">نسخه جاری اسناد منتشرشده و پاک‌اسکن‌شده</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void loadDocuments()} loading={isLoading}>
          به‌روزرسانی
        </Button>
      </div>

      {isApprentice && (
        <Card variant="glass" className="space-y-4 border-white/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-100">پیشرفت مطالعه برای ارزیابی ارتقا</h3>
              <p className="mt-1 text-xs text-slate-400">
                {progress.requiredCount > 0
                  ? `${progress.readRequiredCount} از ${progress.requiredCount} سند الزامیِ نسخه جاری مطالعه شده است.`
                  : "مدیر علمی هنوز سند الزامی برای ارزیابی منتشر نکرده است."}
              </p>
            </div>
            <Badge variant={progress.canRequestEvaluation ? "success" : "neutral"} size="sm">
              {progress.requiredCount > 0 ? `${Math.round((progress.readRequiredCount / progress.requiredCount) * 100)}٪` : "بدون سند الزامی"}
            </Badge>
          </div>
          {evaluation && (
            <div className="rounded-apple-md border border-white/10 bg-white/[0.03] p-3 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-apple-blue" />
                {evaluation.status === "PENDING" && "درخواست ارزیابی در کارتابل مدیران علمی است."}
                {evaluation.status === "APPROVED" && "درخواست تأیید شده است."}
                {evaluation.status === "REVISION_REQUIRED" && "مدیر علمی مطالعه یا بازبینی بیشتری خواسته است."}
              </div>
              {evaluation.feedback && <p className="mt-2 text-slate-400">{evaluation.feedback}</p>}
            </div>
          )}
          {evaluation?.status !== "PENDING" && evaluation?.status !== "APPROVED" && (
            <div className="space-y-3">
              <label className="block text-xs text-slate-300">
                یادداشت برای مدیر علمی (اختیاری)
                <textarea
                  dir="rtl"
                  rows={2}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 w-full rounded-apple-md border border-white/10 bg-white/[0.04] p-2.5 text-xs text-slate-100 focus:border-apple-blue/50 focus:outline-none"
                />
              </label>
              <Button variant="primary" disabled={!progress.canRequestEvaluation} loading={isSubmitting} onClick={() => void submitEvaluation()}>
                مطالعه کردم و درخواست ارزیابی می‌دهم
              </Button>
            </div>
          )}
        </Card>
      )}

      {isLoading ? (
        <Card variant="glass" className="p-10 text-center text-sm text-slate-400">در حال دریافت منابع…</Card>
      ) : documents.length === 0 ? (
        <Card variant="glass" className="p-10 text-center text-sm text-slate-400">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          هنوز سندی برای نمایش منتشر نشده است.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((document) => {
            const version = document.currentVersion;
            return (
              <Card key={document.id} variant="elevated" className="space-y-3 border-white/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-apple-blue">{version.category}</span>
                    <h3 className="font-semibold text-slate-100">{version.title}</h3>
                    <p className="text-xs leading-relaxed text-slate-400">{version.description}</p>
                  </div>
                  <Badge variant={version.isRead ? "success" : version.isRequired ? "warning" : "neutral"} size="sm">
                    {version.isRead ? "مطالعه‌شده" : version.isRequired ? "الزامی" : "مرجع"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <span className="text-[11px] text-slate-500">نسخه {version.version} · {version.fileName}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => void download(document)}>
                      دریافت
                    </Button>
                    {isApprentice && !version.isRead && (
                      <Button variant="ghost" size="sm" loading={busyVersionId === version.id} onClick={() => void markRead(document)}>
                        مطالعه کردم
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
