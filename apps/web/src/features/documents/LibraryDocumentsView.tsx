import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Download, FileText, RefreshCw, Search } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { PublishedLibraryDocumentDto, StudyEvaluationStatus } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";
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
  const { documentId } = useParams();
  const [query, setQuery] = useSearchParams();
  const [documents, setDocuments] = useState<PublishedLibraryDocumentDto[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PublishedLibraryDocumentDto | null>(null);
  const [evaluation, setEvaluation] = useState<StudyEvaluationStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);

  const progress = useMemo(() => getStudyProgress(documents), [documents]);
  const searchTerm = (query.get("q") ?? "").trim().toLowerCase();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await apiClient.get<PublishedLibraryDocumentDto[]>("/documents");
      setDocuments(list);
      if (documentId) {
        const fromList = list.find((item) => item.id === documentId);
        if (fromList) {
          setSelectedDoc(fromList);
        } else {
          setSelectedDoc(await apiClient.get<PublishedLibraryDocumentDto>(`/documents/${encodeURIComponent(documentId)}`));
        }
      } else {
        setSelectedDoc(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "دریافت منابع آموزشی ناموفق بود.";
      setLoadError(message);
      setDocuments([]);
      setSelectedDoc(null);
      onNotify("error", "کتابخانه منابع بارگذاری نشد", message);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, onNotify]);

  const loadEvaluation = useCallback(async () => {
    if (!isApprentice) return;
    try {
      setEvaluation(await apiClient.get<StudyEvaluationStatus | null>("/users/study-evaluations/my-status"));
    } catch {
      setEvaluation(null);
    }
  }, [isApprentice]);

  useEffect(() => {
    void loadData();
    void loadEvaluation();
  }, [loadData, loadEvaluation]);

  const markRead = async (document: PublishedLibraryDocumentDto) => {
    const { id: targetId, currentVersion } = document;
    setBusyVersionId(currentVersion.id);
    try {
      await apiClient.post(`/documents/${targetId}/versions/${currentVersion.id}/read`);
      await loadData();
      onNotify("success", "مطالعه ثبت شد", `نسخه ${currentVersion.version} «${currentVersion.title}» ثبت شد.`);
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

  if (documentId) {
    if (isLoading) return <LoadingState message="در حال دریافت جزئیات سند..." />;
    if (loadError || !selectedDoc) {
      return (
        <div className="space-y-4">
          <PageHeader
            title="جزئیات سند آموزشی"
            breadcrumbs={[{ label: "منابع آموزشی", to: "/library" }, { label: "جزئیات سند" }]}
            backTo={{ to: "/library", label: "بازگشت به فهرست منابع" }}
          />
          <ErrorState message={loadError ?? "سند مورد نظر یافت نشد یا منتشر نشده است."} onRetry={() => void loadData()} />
        </div>
      );
    }
    const version = selectedDoc.currentVersion;
    return (
      <section className="space-y-5" aria-labelledby="doc-detail-title">
        <PageHeader
          title={version.title}
          subtitle={`${version.category} · نسخه ${version.version}`}
          breadcrumbs={[
            { label: "منابع آموزشی", to: "/library" },
            { label: version.title },
          ]}
          backTo={{ to: "/library", label: "بازگشت به منابع آموزشی" }}
        />

        <Card variant="default" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" size="sm">{version.category}</Badge>
              <Badge variant={version.isRead ? "success" : version.isRequired ? "warning" : "neutral"} size="sm">
                {version.isRead ? "مطالعه‌شده" : version.isRequired ? "الزامی برای ارزیابی" : "سند مرجع"}
              </Badge>
            </div>
            <span className="text-xs text-[#4F6659]">
              {version.publishedAt ? `انتشار: ${new Date(version.publishedAt).toLocaleDateString("fa-IR")}` : ""}
            </span>
          </div>

          <p className="text-sm leading-7 text-[#214031]">
            {version.description || "توضیحی برای این سند ثبت نشده است."}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#214E3A]/15 pt-4">
            <div className="text-xs text-[#4F6659]">
              نام فایل: <span dir="ltr" className="font-mono text-[#214031]">{version.fileName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="md" icon={<Download className="h-4 w-4" />} onClick={() => void download(selectedDoc)}>
                دریافت فایل سند
              </Button>
              {isApprentice && !version.isRead && (
                <Button variant="primary" size="md" loading={busyVersionId === version.id} onClick={() => void markRead(selectedDoc)}>
                  مطالعه کردم
                </Button>
              )}
            </div>
          </div>
        </Card>
      </section>
    );
  }

  const filteredDocuments = documents.filter((doc) =>
    !searchTerm ||
    `${doc.currentVersion.title} ${doc.currentVersion.category} ${doc.currentVersion.description}`
      .toLowerCase()
      .includes(searchTerm),
  );

  return (
    <section className="space-y-5" aria-labelledby="library-title">
      <PageHeader
        title={
          <span id="library-title" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#214E3A]" />
            منابع آموزشی
          </span>
        }
        subtitle="نسخه جاری اسناد منتشرشده و پاک‌اسکن‌شده"
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void loadData()} loading={isLoading}>
            به‌روزرسانی
          </Button>
        }
      />

      {isApprentice && (
        <Card variant="elevated" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#214031]">پیشرفت مطالعه برای ارزیابی ارتقا</h2>
              <p className="mt-1 text-xs text-[#4F6659]">
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
            <div className="rounded-xl border border-[#214E3A]/20 bg-[#F3EBDD]/70 p-3 text-xs text-[#214031]">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-[#214E3A]" />
                {evaluation.status === "PENDING" && "درخواست ارزیابی در کارتابل مدیران علمی است."}
                {evaluation.status === "APPROVED" && "درخواست تأیید شده است."}
                {evaluation.status === "REVISION_REQUIRED" && "مدیر علمی مطالعه یا بازبینی بیشتری خواسته است."}
              </div>
              {evaluation.feedback && <p className="mt-2 text-[#43584A]">{evaluation.feedback}</p>}
            </div>
          )}
          {evaluation?.status !== "PENDING" && evaluation?.status !== "APPROVED" && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-[#214031]">
                یادداشت برای مدیر علمی (اختیاری)
                <textarea
                  dir="rtl"
                  rows={2}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-xs text-[#214031] focus:border-[#214E3A] focus:outline-none"
                />
              </label>
              <Button variant="primary" disabled={!progress.canRequestEvaluation} loading={isSubmitting} onClick={() => void submitEvaluation()}>
                مطالعه کردم و درخواست ارزیابی می‌دهم
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card variant="default" padding="sm">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B8073]" />
          <input
            type="search"
            aria-label="جست‌وجوی اسناد کتابخانه"
            placeholder="جست‌وجو بر اساس عنوان، دسته‌بندی یا توضیح..."
            value={query.get("q") ?? ""}
            onChange={(event) => {
              const next = new URLSearchParams(query);
              event.target.value ? next.set("q", event.target.value) : next.delete("q");
              setQuery(next, { replace: true });
            }}
            className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] py-2 pr-9 pl-3 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
          />
        </div>
      </Card>

      {isLoading ? (
        <LoadingState message="در حال دریافت منابع..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void loadData()} />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          title="سندی برای نمایش یافت نشد"
          description="هنوز سندی منتشر نشده است یا با فیلتر جست‌وجو تطابق ندارد."
          icon={<FileText className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDocuments.map((document) => {
            const version = document.currentVersion;
            return (
              <Card key={document.id} variant="default" className="flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#214E3A]">{version.category}</span>
                    <h3 className="text-base font-bold text-[#214031]">
                      <Link to={`/library/${encodeURIComponent(document.id)}`} className="hover:underline">
                        {version.title}
                      </Link>
                    </h3>
                    <p className="text-xs leading-relaxed text-[#4F6659]">{version.description}</p>
                  </div>
                  <Badge variant={version.isRead ? "success" : version.isRequired ? "warning" : "neutral"} size="sm">
                    {version.isRead ? "مطالعه‌شده" : version.isRequired ? "الزامی" : "مرجع"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#214E3A]/10 pt-3">
                  <span className="text-[11px] text-[#59675A]">نسخه {version.version} · {version.fileName}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/library/${encodeURIComponent(document.id)}`}
                      className="rounded-xl border border-[#214E3A]/20 px-2.5 py-1.5 text-xs font-semibold text-[#214031] hover:bg-[#F3EBDD]"
                    >
                      جزئیات
                    </Link>
                    <Button variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => void download(document)}>
                      دریافت
                    </Button>
                    {isApprentice && !version.isRead && (
                      <Button variant="primary" size="sm" loading={busyVersionId === version.id} onClick={() => void markRead(document)}>
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
