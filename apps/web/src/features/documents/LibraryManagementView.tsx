import React, { useCallback, useEffect, useState } from "react";
import { Archive, Download, FileText, Plus, RefreshCw, Upload } from "lucide-react";
import type { LibraryDocumentDto } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
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
  const [documents, setDocuments] = useState<LibraryDocumentDto[]>([]);
  const [metadata, setMetadata] = useState<DocumentMetadata>(emptyMetadata);
  const [file, setFile] = useState<File | null>(null);
  const [versionDraft, setVersionDraft] = useState<(DocumentMetadata & { documentId: string; file: File | null }) | null>(null);
  const [requiredAtPublish, setRequiredAtPublish] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      setDocuments(await apiClient.get<LibraryDocumentDto[]>("/documents/management"));
    } catch (error) {
      setDocuments([]);
      onNotify("error", "مدیریت کتابخانه بارگذاری نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [onNotify]);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

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

  return (
    <section className="space-y-5" aria-labelledby="library-management-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="library-management-title" className="flex items-center gap-2 text-xl font-bold text-slate-100">
            <FileText className="h-5 w-5 text-apple-blue" /> کتابخانه منابع
          </h2>
          <p className="mt-1 text-xs text-slate-400">بارگذاری، انتشار نسخه پاک و بایگانی اسناد آموزشی</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} loading={isLoading} onClick={() => void loadDocuments()}>
          به‌روزرسانی
        </Button>
      </div>

      {demoMode && <Card variant="glass" className="border-apple-blue/20 bg-apple-blue/[0.04] p-4 text-xs leading-relaxed text-slate-300">
        اسناد زیر محتوای ساختگی دمو هستند. این نسخه‌ی استاتیک فایل تازه بارگذاری یا بایگانی را به سرور ثبت نمی‌کند.
      </Card>}

      {!demoMode && <Card variant="glass" className="border-white/10 p-5">
        <h3 className="mb-4 font-semibold text-slate-100">بارگذاری سند جدید</h3>
        <form onSubmit={(event) => void handleCreate(event)} className="grid gap-3 md:grid-cols-2">
          <MetadataFields metadata={metadata} onChange={setMetadata} />
          <FileField file={file} onChange={setFile} />
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" variant="primary" icon={<Upload className="h-4 w-4" />} loading={isBusy} disabled={!file}>
              بارگذاری پیش‌نویس
            </Button>
          </div>
        </form>
      </Card>}

      {isLoading ? (
        <Card variant="glass" className="p-8 text-center text-sm text-slate-400">در حال دریافت اسناد…</Card>
      ) : documents.length === 0 ? (
        <Card variant="glass" className="p-8 text-center text-sm text-slate-400">هنوز سندی در کتابخانه ثبت نشده است.</Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <Card key={document.id} variant="elevated" className="space-y-4 border-white/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-100">{document.currentVersion?.title ?? document.versions[0]?.title ?? "سند بدون عنوان"}</h3>
                    {document.archivedAt ? <Badge variant="neutral" size="sm">بایگانی‌شده</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{document.versions.length} نسخه</p>
                </div>
                {!demoMode && !document.archivedAt && (
                  <div className="flex gap-2">
                    {document.currentVersion && (
                      <Button variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => void apiClient.download(`/documents/${document.id}/download`, document.currentVersion!.fileName)}>
                        دریافت جاری
                      </Button>
                    )}
                    <Button
                      variant="ghost"
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
                <form onSubmit={(event) => void handleCreateVersion(event)} className="grid gap-3 rounded-apple-md border border-white/10 bg-white/[0.02] p-4 md:grid-cols-2">
                  <MetadataFields metadata={versionDraft} onChange={(value) => setVersionDraft((current) => current ? { ...current, ...value } : current)} />
                  <FileField file={versionDraft.file} onChange={(value) => setVersionDraft((current) => current ? { ...current, file: value } : current)} />
                  <div className="flex justify-end gap-2 md:col-span-2">
                    <Button type="button" variant="ghost" onClick={() => setVersionDraft(null)}>انصراف</Button>
                    <Button type="submit" variant="primary" loading={isBusy} disabled={!versionDraft.file}>بارگذاری نسخه</Button>
                  </div>
                </form>
              )}

              <div className="space-y-2 border-t border-white/10 pt-3">
                {document.versions.map((version) => (
                  <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-apple-md bg-white/[0.025] p-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
                        <span>نسخه {version.version}</span>
                        <Badge variant={version.status === "PUBLISHED" ? "success" : version.status === "DRAFT" ? "warning" : "neutral"} size="sm">{version.status === "PUBLISHED" ? "منتشرشده" : version.status === "DRAFT" ? "پیش‌نویس" : "نسخه پیشین"}</Badge>
                        {version.status === "PUBLISHED" && <Badge variant={version.isRequired ? "warning" : "neutral"} size="sm">{version.isRequired ? "الزامی" : "مرجع"}</Badge>}
                      </div>
                      <p className="text-[11px] text-slate-500">{version.fileName} · بارگذار {version.uploadedById}</p>
                    </div>
                    {version.status === "DRAFT" && (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[11px] text-slate-400">اسکن: {version.scanStatus === "AVAILABLE" ? "پاک" : version.scanStatus === "QUARANTINED" ? "در انتظار" : "ردشده"}</span>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
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
    <label className="block space-y-1 text-xs text-slate-300">
      عنوان
      <input required maxLength={200} value={metadata.title} onChange={(event) => onChange({ ...metadata, title: event.target.value })} className="w-full rounded-apple-md border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-100" />
    </label>
    <label className="block space-y-1 text-xs text-slate-300">
      دسته
      <input required maxLength={100} value={metadata.category} onChange={(event) => onChange({ ...metadata, category: event.target.value })} className="w-full rounded-apple-md border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-100" />
    </label>
    <label className="block space-y-1 text-xs text-slate-300 md:col-span-2">
      توضیح
      <textarea maxLength={2000} rows={2} value={metadata.description} onChange={(event) => onChange({ ...metadata, description: event.target.value })} className="w-full rounded-apple-md border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-100" />
    </label>
  </>
);

const FileField: React.FC<{ file: File | null; onChange: (file: File | null) => void }> = ({ file, onChange }) => (
  <label className="block space-y-1 text-xs text-slate-300">
    فایل PDF یا DOCX
    <input
      required
      type="file"
      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)}
      className="w-full text-xs text-slate-400 file:mr-3 file:rounded-apple-sm file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-slate-200"
    />
    {file && <span className="block text-[11px] text-slate-500">{file.name}</span>}
  </label>
);
