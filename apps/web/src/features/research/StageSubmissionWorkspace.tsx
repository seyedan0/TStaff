import { useUnsavedChanges } from "../../shared/useUnsavedChanges.js";
import { UnsavedChangesDialog } from "../../shared/ui/UnsavedChangesDialog.js";
import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../shared/api-client.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import type { StageStatus } from "@tstaff/contracts";

interface StageSubmission {
  id: string;
  version: number;
  content: string;
  storedObjectId?: string | null;
  status: string;
  submittedAt: string;
}

interface UploadResponse { id: string; originalName: string; scanStatus: "AVAILABLE" | "QUARANTINED" | "REJECTED" }
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
    try { setItems(await apiClient.get<StageSubmission[]>(`/stages/${stageId}/submissions`)); }
    catch (error) { setItems([]); onNotify("error", "تاریخچه ارسال‌ها بارگذاری نشد", error instanceof Error ? error.message : undefined); }
    finally { setLoading(false); }
  }, [onNotify, stageId]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim() || (!file && !uploaded)) return;
    setBusy(true);
    try {
      const fileInfo = uploaded ?? await apiClient.upload<UploadResponse>("/files", file!);
      setUploaded(fileInfo);
      if (fileInfo.scanStatus !== "AVAILABLE") {
        onNotify("warning", "فایل در قرنطینه است", "پس از پایان اسکن امنیتی، فرم را دوباره ارسال کنید.");
        return;
      }
      await apiClient.post(`/stages/${stageId}/submissions`, { content: content.trim(), fileId: fileInfo.id, expectedVersion: caseVersion });
      setContent(""); setFile(null); setUploaded(null);
      onNotify("success", "گزارش برای مدیر علمی ارسال شد", "نسخه جدید ثبت و به کارتابل مدیران علمی منتسب منتقل شد.");
      await load();
      await onWorkflowChanged();
    } catch (error) { onNotify("error", "ارسال گزارش انجام نشد", error instanceof Error ? error.message : undefined); }
    finally { setBusy(false); }
  };

  const retryScan = async () => {
    if (!uploaded) return;
    setBusy(true);
    try {
      const result = await apiClient.post<UploadResponse>(`/files/${uploaded.id}/rescan`);
      setUploaded(result);
      onNotify(result.scanStatus === "AVAILABLE" ? "success" : "warning", result.scanStatus === "AVAILABLE" ? "اسکن فایل تأیید شد" : "فایل هنوز در قرنطینه است");
    } catch (error) { onNotify("error", "اسکن دوباره انجام نشد", error instanceof Error ? error.message : undefined); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5"><UnsavedChangesDialog blocker={blocker} />
    <div><h3 className="text-lg font-bold text-slate-100">{label}</h3><p className="mt-1 text-xs text-slate-400">{caseTitle} · ارسال نسخه‌دار با فایل PDF/DOCX</p></div>
    {canEdit && <Card variant="glass" className="p-4">
      <form onSubmit={submit} className="space-y-3 text-right">
        <label className="block text-xs text-slate-300">توضیحات این نسخه<textarea required minLength={5} rows={5} value={content} onChange={(event) => setContent(event.target.value)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-100" placeholder="خلاصه و توضیح نسخه ارسالی را بنویسید…" /></label>
        <label className="block text-xs text-slate-300">فایل سند<input type="file" required={!uploaded} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setUploaded(null); }} className="mt-2 block w-full text-xs file:ml-3 file:rounded-apple-sm file:border-0 file:bg-white/10 file:px-3 file:py-2" /></label>
        {uploaded?.scanStatus === "QUARANTINED" && <div className="flex items-center justify-between rounded-apple-sm bg-apple-amber/10 p-2 text-xs text-apple-amber"><span>فایل تا تکمیل اسکن امنیتی قرنطینه است.</span><Button type="button" variant="ghost" size="sm" loading={busy} onClick={() => void retryScan()}>بررسی دوباره</Button></div>}
        <div className="flex justify-end"><Button type="submit" variant="primary" loading={busy} disabled={stageStatus === "PENDING"}>ارسال برای داوری</Button></div>
      </form>
    </Card>}
    {loading ? <p className="p-6 text-center text-xs text-slate-400">در حال دریافت سابقه…</p> : items.length === 0 ? <Card variant="glass" className="p-6 text-center text-xs text-slate-400">هنوز گزارشی در این مرحله ثبت نشده است.</Card> : <div className="space-y-3">{items.map((item) => <Card key={item.id} variant="glass" className="space-y-2 p-4">
      <div className="flex items-center justify-between text-xs"><strong className="text-slate-200">نسخه {item.version}</strong><span className="text-slate-400">{item.status} · {new Date(item.submittedAt).toLocaleString("fa-IR")}</span></div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{item.content}</p>
      {item.storedObjectId && <Button variant="ghost" size="sm" onClick={() => void apiClient.download(`/files/${item.storedObjectId}/download`, `${label}-v${item.version}`)}>دریافت فایل پیوست</Button>}
    </Card>)}</div>}
  </div>;
};
