import React, { useCallback, useEffect, useState } from "react";
import type { StageStatus } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { useUnsavedChanges } from "../../shared/useUnsavedChanges.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { EmptyState, LoadingState } from "../../shared/ui/StateFeedback.js";
import { UnsavedChangesDialog } from "../../shared/ui/UnsavedChangesDialog.js";

interface StageSubmission {
  id: string;
  version: number;
  content: string;
  storedObjectId?: string | null;
  status: string;
  submittedAt: string;
}

interface UploadResponse {
  id: string;
  originalName: string;
  scanStatus: "AVAILABLE" | "QUARANTINED" | "REJECTED";
}

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

export const StageSubmissionWorkspace: React.FC<{
  caseTitle: string;
  caseVersion: number;
  stageId: string;
  stageType: "EXPLANATION" | "PRESCRIPTION";
  stageStatus: StageStatus;
  canEdit: boolean;
  onWorkflowChanged: () => Promise<void>;
  onNotify: Notice;
}> = ({ caseTitle, caseVersion, stageId, stageType, stageStatus, canEdit, onWorkflowChanged, onNotify }) => {
  const [items, setItems] = useState<StageSubmission[]>([]);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const blocker = useUnsavedChanges(canEdit && !busy && (!!content.trim() || !!file || !!uploaded));
  const label = stageType === "EXPLANATION" ? "تبیین مسئله" : "تجویز راهکار";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiClient.get<StageSubmission[]>(`/stages/${stageId}/submissions`));
    } catch (error) {
      setItems([]);
      onNotify("error", "تاریخچه ارسال‌ها بارگذاری نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [onNotify, stageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim() || (!file && !uploaded)) return;
    setBusy(true);
    try {
      const fileInfo = uploaded ?? (await apiClient.upload<UploadResponse>("/files", file!));
      setUploaded(fileInfo);
      if (fileInfo.scanStatus !== "AVAILABLE") {
        onNotify("warning", "فایل در قرنطینه است", "پس از پایان اسکن امنیتی، فرم را دوباره ارسال کنید.");
        return;
      }
      await apiClient.post(`/stages/${stageId}/submissions`, {
        content: content.trim(),
        fileId: fileInfo.id,
        expectedVersion: caseVersion,
      });
      setContent("");
      setFile(null);
      setUploaded(null);
      onNotify("success", "گزارش برای مدیر علمی ارسال شد", "نسخه جدید ثبت و به کارتابل مدیران علمی منتسب منتقل شد.");
      await load();
      await onWorkflowChanged();
    } catch (error) {
      onNotify("error", "ارسال گزارش انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const retryScan = async () => {
    if (!uploaded) return;
    setBusy(true);
    try {
      const result = await apiClient.post<UploadResponse>(`/files/${uploaded.id}/rescan`);
      setUploaded(result);
      onNotify(
        result.scanStatus === "AVAILABLE" ? "success" : "warning",
        result.scanStatus === "AVAILABLE" ? "اسکن فایل تأیید شد" : "فایل هنوز در قرنطینه است",
      );
    } catch (error) {
      onNotify("error", "اسکن دوباره انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <UnsavedChangesDialog blocker={blocker} />
      <div>
        <h3 className="text-lg font-bold text-[#214031]">{label}</h3>
        <p className="mt-1 text-xs text-[#4F6659]">{caseTitle} · ارسال نسخه‌دار با فایل PDF/DOCX (سقف ۲۵ مگابایت)</p>
      </div>

      {canEdit && (
        <Card variant="default">
          <form onSubmit={submit} className="space-y-3 text-right">
            <label className="block text-xs font-medium text-[#214031]">
              توضیحات این نسخه
              <textarea
                required
                minLength={5}
                rows={5}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
                placeholder="خلاصه و توضیح نسخه ارسالی را بنویسید..."
              />
            </label>
            <label className="block text-xs font-medium text-[#214031]">
              فایل سند (PDF یا DOCX)
              <input
                type="file"
                required={!uploaded}
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setUploaded(null);
                }}
                className="mt-2 block w-full text-xs text-[#214031] file:ml-3 file:rounded-xl file:border-0 file:bg-[#214E3A] file:px-3 file:py-2 file:text-[#FFFCF5]"
              />
            </label>
            {uploaded?.scanStatus === "QUARANTINED" && (
              <div className="flex items-center justify-between rounded-xl border border-[#D94F3D]/30 bg-[#D94F3D]/10 p-2.5 text-xs text-[#B83B2B]">
                <span>فایل تا تکمیل اسکن امنیتی قرنطینه است.</span>
                <Button type="button" variant="ghost" size="sm" loading={busy} onClick={() => void retryScan()}>
                  بررسی دوباره
                </Button>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" variant="primary" loading={busy} disabled={stageStatus === "PENDING"}>
                ارسال برای داوری
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <LoadingState message="در حال دریافت سابقه نسخه‌ها..." />
      ) : items.length === 0 ? (
        <EmptyState title="هنوز گزارشی در این مرحله ثبت نشده است" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} variant="default" className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <strong className="text-[#214031]">نسخه {item.version}</strong>
                <span className="text-[#4F6659]">
                  {item.status} · {new Date(item.submittedAt).toLocaleString("fa-IR")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-[#214031]">{item.content}</p>
              {item.storedObjectId && (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void apiClient.download(`/files/${item.storedObjectId}/download`, `${label}-v${item.version}`)}
                  >
                    دریافت فایل پیوست
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
