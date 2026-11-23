import React, { useCallback, useEffect, useState } from "react";
import { Archive, Download, FileText, Plus, RefreshCw, Search, Upload } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { LibraryDocumentDto } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";
import { isDemoMode } from "../demo/demo-mode.js";

interface LibraryManagementViewProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

interface DocumentMetadata {
  title: string;
  description: string;
  category: string;
}

const emptyMetadata: DocumentMetadata = { title: "", description: "", category: "" };

export const LibraryManagementView: React.FC<LibraryManagementViewProps> = ({ onNotify }) => {
  const demoMode = isDemoMode();
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const [documents, setDocuments] = useState<LibraryDocumentDto[]>([]);
  const [metadata, setMetadata] = useState<DocumentMetadata>(emptyMetadata);
  const [file, setFile] = useState<File | null>(null);
  const [versionDraft, setVersionDraft] = useState<(DocumentMetadata & { documentId: string; file: File | null }) | null>(null);
  const [requiredAtPublish, setRequiredAtPublish] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setDocuments(await apiClient.get<LibraryDocumentDto[]>("/documents/management"));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "دریافت کتابخانه ناموفق بود.";
      setDocuments([]);
      setLoadError(msg);
      onNotify("error", "مدیریت کتابخانه بارگذاری نشد", msg);
    } finally {
      setIsLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const upload = async (endpoint: string, fileToUpload: File, fields: DocumentMetadata) => {
    await apiClient.upload<LibraryDocumentDto>(endpoint, fileToUpload, {
      title: fields.title,
      description: fields.description,
      category: fields.category,
    });
    await loadDocuments();
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setIsBusy(true);
    try {
      await upload("/documents", file, metadata);
      setMetadata(emptyMetadata);
      setFile(null);
      onNotify("success", "سند بارگذاری شد", "نسخه تا زمان انتشار در پیش‌نویس می‌ماند.");
    } catch (error) {
      onNotify("error", "بارگذاری سند انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateVersion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!versionDraft?.file) return;
    setIsBusy(true);
    try {
      await upload(`/documents/${versionDraft.documentId}/versions`, versionDraft.file, {
        title: versionDraft.title,
        description: versionDraft.description,
        category: versionDraft.category,
      });
      setVersionDraft(null);
      onNotify("success", "نسخه تازه بارگذاری شد", "پس از اسکن پاک می‌توانید آن را منتشر کنید.");
    } catch (error) {
      onNotify("error", "بارگذاری نسخه انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setIsBusy(false);
    }
  };

  const publishVersion = async (documentId: string, versionId: string) => {
    setIsBusy(true);
    try {
      await apiClient.post(`/documents/${documentId}/versions/${versionId}/publish`, {
        isRequired: requiredAtPublish[versionId] ?? true,
      });
      await loadDocuments();
      onNotify("success", "نسخه منتشر شد", "کاربران نسخه جاری را از کتابخانه دریافت می‌کنند.");
    } catch (error) {
      onNotify("error", "انتشار نسخه انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setIsBusy(false);
    }
  };

  const archiveDocument = async (documentId: string) => {
    setIsBusy(true);
    try {
      await apiClient.post(`/documents/${documentId}/archive`);
      await loadDocuments();
      onNotify("success", "سند بایگانی شد", "نسخه‌ها حفظ شدند و دیگر در کتابخانه نمایش داده نمی‌شوند.");
    } catch (error) {
      onNotify("error", "بایگانی سند انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setIsBusy(false);
    }
  };

  const searchTerm = (query.get("q") ?? "").trim().toLowerCase();
  const filteredDocuments = documents.filter((doc) => {
    const title = doc.currentVersion?.title ?? doc.versions[0]?.title ?? "";
    const category = doc.currentVersion?.category ?? doc.versions[0]?.category ?? "";
    return !searchTerm || `${title} ${category}`.toLowerCase().includes(searchTerm);
  });

  return (
    <section className="space-y-5" aria-labelledby="library-management-title">
      <PageHeader
        title={
          <span id="library-management-title" className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#087674]" />
            مدیریت کتابخانه منابع
          </span>
        }
        subtitle="بارگذاری PDF/DOCX، اسکن امنیتی، انتشار نسخه پاک و بایگانی اسناد آموزشی"
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} loading={isLoading} onClick={() => void loadDocuments()}>
            به‌روزرسانی
          </Button>
        }
      />

      {demoMode && (
        <Card variant="outlined" className="border-[#087674]/30 bg-[#EAF3FA]/70 p-4 text-xs leading-relaxed text-[#162F48]">
          اسناد زیر محتوای نمونه در نسخه نمایشی هستند. بارگذاری فایل تازه و بایگانی در نسخه متصل به سرور فعال است.
        </Card>
      )}

      {!demoMode && (
        <Card variant="default" title="بارگذاری سند جدید">
          <form onSubmit={(event) => void handleCreate(event)} className="grid gap-3 md:grid-cols-2">
            <MetadataFields metadata={metadata} onChange={setMetadata} />
            <FileField file={file} onChange={setFile} />
            <div className="flex justify-end md:col-span-2">
              <Button type="submit" variant="primary" icon={<Upload className="h-4 w-4" />} loading={isBusy} disabled={!file}>
                بارگذاری پیش‌نویس
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card variant="default" padding="sm">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#536E84]" />
          <input
            type="search"
            aria-label="جست‌وجوی اسناد کتابخانه"
            placeholder="جست‌وجو بر اساس عنوان یا دسته‌بندی..."
            value={query.get("q") ?? ""}
            onChange={(event) => {
              const next = new URLSearchParams(query);
              event.target.value ? next.set("q", event.target.value) : next.delete("q");
              navigate({ search: next.toString() }, { replace: true });
            }}
            className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] py-2 pr-9 pl-3 text-sm text-[#162F48] placeholder:text-[#536E84] focus:border-[#087674] focus:outline-none"
          />
        </div>
      </Card>

      {isLoading ? (
        <LoadingState message="در حال دریافت اسناد..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void loadDocuments()} />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState title="سندی در کتابخانه یافت نشد" description="سند تازه‌ای بارگذاری کنید یا جست‌وجو را تغییر دهید." />
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((document) => (
            <Card key={document.id} variant="default" className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#162F48]">
                      {document.currentVersion?.title ?? document.versions[0]?.title ?? "سند بدون عنوان"}
                    </h3>
                    {document.archivedAt ? <Badge variant="neutral" size="sm">بایگانی‌شده</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-[#496479]">{document.versions.length} نسخه ثبت‌شده</p>
                </div>
                {!demoMode && !document.archivedAt && (
                  <div className="flex flex-wrap gap-2">
                    {document.currentVersion && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Download className="h-3.5 w-3.5" />}
                        onClick={() => void apiClient.download(`/documents/${document.id}/download`, document.currentVersion!.fileName)}
                      >
                        دریافت جاری
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => setVersionDraft({
                        documentId: document.id,
                        title: document.currentVersion?.title ?? document.versions[0]?.title ?? "",
                        description: document.currentVersion?.description ?? document.versions[0]?.description ?? "",
                        category: document.currentVersion?.category ?? document.versions[0]?.category ?? "",
                        file: null,
                      })}
                    >
                      نسخه تازه
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Archive className="h-3.5 w-3.5" />} onClick={() => void archiveDocument(document.id)} loading={isBusy}>
                      بایگانی
                    </Button>
                  </div>
                )}
              </div>

              {versionDraft?.documentId === document.id && (
                <form onSubmit={(event) => void handleCreateVersion(event)} className="grid gap-3 rounded-xl border border-[#087674]/20 bg-[#EAF3FA]/60 p-4 md:grid-cols-2">
                  <MetadataFields metadata={versionDraft} onChange={(value) => setVersionDraft((current) => current ? { ...current, ...value } : current)} />
                  <FileField file={versionDraft.file} onChange={(value) => setVersionDraft((current) => current ? { ...current, file: value } : current)} />
                  <div className="flex justify-end gap-2 md:col-span-2">
                    <Button type="button" variant="ghost" onClick={() => setVersionDraft(null)}>انصراف</Button>
                    <Button type="submit" variant="primary" loading={isBusy} disabled={!versionDraft.file}>بارگذاری نسخه</Button>
                  </div>
                </form>
              )}

              <div className="space-y-2 border-t border-[#087674]/10 pt-3">
                {document.versions.map((version) => (
                  <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#087674]/10 bg-[#EAF3FA]/40 p-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[#162F48]">
                        <span className="font-semibold">نسخه {version.version}</span>
                        <Badge variant={version.status === "PUBLISHED" ? "success" : version.status === "DRAFT" ? "warning" : "neutral"} size="sm">
                          {version.status === "PUBLISHED" ? "منتشرشده" : version.status === "DRAFT" ? "پیش‌نویس" : "نسخه پیشین"}
                        </Badge>
                        {version.status === "PUBLISHED" && (
                          <Badge variant={version.isRequired ? "warning" : "neutral"} size="sm">
                            {version.isRequired ? "الزامی" : "مرجع"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-[#496479]">{version.fileName}</p>
                    </div>
                    {version.status === "DRAFT" && (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[11px] text-[#496479]">
                          اسکن: {version.scanStatus === "AVAILABLE" ? "پاک" : version.scanStatus === "QUARANTINED" ? "در انتظار" : "ردشده"}
                        </span>
                        <label className="flex items-center gap-2 text-xs text-[#162F48]">
                          <input
                            type="checkbox"
                            checked={requiredAtPublish[version.id] ?? true}
                            onChange={(event) => setRequiredAtPublish((current) => ({ ...current, [version.id]: event.target.checked }))}
                          />
                          الزامی برای ارزیابی
                        </label>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={version.scanStatus !== "AVAILABLE"}
                          loading={isBusy}
                          onClick={() => void publishVersion(document.id, version.id)}
                        >
                          انتشار
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

const MetadataFields: React.FC<{
  metadata: DocumentMetadata;
  onChange: (value: DocumentMetadata) => void;
}> = ({ metadata, onChange }) => (
  <>
    <label className="block space-y-1 text-xs font-medium text-[#162F48]">
      عنوان
      <input
        required
        maxLength={200}
        value={metadata.title}
        onChange={(event) => onChange({ ...metadata, title: event.target.value })}
        className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] px-3 py-2 text-sm text-[#162F48]"
      />
    </label>
    <label className="block space-y-1 text-xs font-medium text-[#162F48]">
      دسته
      <input
        required
        maxLength={100}
        value={metadata.category}
        onChange={(event) => onChange({ ...metadata, category: event.target.value })}
        className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] px-3 py-2 text-sm text-[#162F48]"
      />
    </label>
    <label className="block space-y-1 text-xs font-medium text-[#162F48] md:col-span-2">
      توضیح
      <textarea
        maxLength={2000}
        rows={2}
        value={metadata.description}
        onChange={(event) => onChange({ ...metadata, description: event.target.value })}
        className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] px-3 py-2 text-sm text-[#162F48]"
      />
    </label>
  </>
);

const FileField: React.FC<{ file: File | null; onChange: (file: File | null) => void }> = ({ file, onChange }) => (
  <label className="block space-y-1 text-xs font-medium text-[#162F48]">
    فایل PDF یا DOCX (حداکثر ۲۵ مگابایت)
    <input
      required
      type="file"
      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)}
      className="w-full text-xs text-[#496479] file:ml-3 file:rounded-lg file:border file:border-[#087674]/20 file:bg-[#EAF3FA] file:px-3 file:py-2 file:font-medium file:text-[#162F48]"
    />
    {file && <span className="block text-[11px] text-[#496479]">{file.name}</span>}
  </label>
);
