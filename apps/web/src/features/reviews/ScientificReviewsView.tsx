import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, RotateCcw } from "lucide-react";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Modal } from "../../shared/ui/Modal.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
interface PendingReview {
  id: string;
  kind: "SUBMISSION" | "SOURCE_STAGE";
  submissionId?: string;
  caseId: string;
  caseCode: string;
  caseTitle: string;
  researcherId: string;
  internName: string;
  stageId: string;
  stageType: string;
  stageName: string;
  caseVersion: number;
  version?: number;
  submittedAt: string;
  summary: string;
  storedObjectId?: string | null;
}
interface ScenarioReview { id: string; version: number; caseVersion: number; title: string; summary: string; content: string; caseId: string; caseCode: string; caseTitle: string; internName: string }

export const ScientificReviewsView: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const [items, setItems] = useState<PendingReview[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioReview[]>([]);
  const [activeTab, setActiveTab] = useState<"WORKLIST" | "SCENARIOS">("WORKLIST");
  const [activeReview, setActiveReview] = useState<PendingReview | null>(null);
  const [activeScenario, setActiveScenario] = useState<ScenarioReview | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await apiClient.get<PendingReview[]>("/scientific-supervisors/me/reviews");
      setItems(list);
    } catch (error) { setItems([]); onNotify("error", "کارتابل داوری بارگذاری نشد", error instanceof Error ? error.message : undefined); }
    try {
      setScenarios(await apiClient.get<ScenarioReview[]>("/scientific-supervisors/me/scenarios"));
    } catch { setScenarios([]); }
  }, [onNotify]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (decision: "APPROVED" | "REVISION_REQUIRED") => {
    if (!activeReview) return;
    if (decision === "REVISION_REQUIRED" && notes.trim().length < 5) {
      onNotify("warning", "دلیل اصلاح را بنویسید", "برای درخواست اصلاح، دست‌کم ۵ نویسه لازم است."); return;
    }
    setBusy(true);
    try {
      if (activeReview.kind === "SOURCE_STAGE") {
        await apiClient.post(`/research-cases/${activeReview.caseId}/stages/SOURCES/review`, { decision: decision === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED", notes: notes.trim(), expectedVersion: activeReview.caseVersion });
      } else {
        await apiClient.post(`/submissions/${activeReview.submissionId}/review`, { decision: decision === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED", reason: notes.trim() || "محتوا تأیید شد", expectedVersion: activeReview.version, caseVersion: activeReview.caseVersion, idempotencyKey: crypto.randomUUID() });
      }
      onNotify(decision === "APPROVED" ? "success" : "warning", decision === "APPROVED" ? "مرحله تأیید شد" : "اصلاح برای کارورز ثبت شد", "تغییر وضعیت در پرونده و کارتابل ثبت شد.");
      setActiveReview(null); setNotes(""); await load();
    } catch (error) { onNotify("error", "ثبت داوری انجام نشد", error instanceof Error ? error.message : undefined); }
    finally { setBusy(false); }
  };

  const decideScenario = async (decision: "APPROVED" | "CHANGES_REQUESTED") => {
    if (!activeScenario || notes.trim().length < 5) { onNotify("warning", "دلیل داوری را بنویسید", "حداقل ۵ نویسه لازم است."); return; }
    setBusy(true);
    try {
      await apiClient.post(`/scenarios/${activeScenario.id}/review`, { decision, reason: notes.trim(), expectedVersion: activeScenario.version, caseVersion: activeScenario.caseVersion, idempotencyKey: crypto.randomUUID() });
      onNotify(decision === "APPROVED" ? "success" : "warning", decision === "APPROVED" ? "سناریو تأیید شد" : "اصلاح سناریو درخواست شد", decision === "APPROVED" ? "سناریو به بانک داخلی سامانه افزوده شد." : undefined);
      setActiveScenario(null); setNotes(""); await load();
    } catch (error) { onNotify("error", "داوری سناریو انجام نشد", error instanceof Error ? error.message : undefined); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold text-slate-100"><FileCheck2 className="h-5 w-5 text-apple-indigo" />کارتابل مدیر علمی</h2><p className="mt-1 text-xs text-slate-400">ارسال‌های کارورزان منتسب و تصمیم‌های هم‌سطح مدیران علمی (D-02 / AT-29)</p></div><div className="flex rounded-apple-md border border-white/10 p-1"><button onClick={() => setActiveTab("WORKLIST")} className={`rounded-apple-sm px-3 py-1.5 text-xs ${activeTab === "WORKLIST" ? "bg-apple-indigo text-white" : "text-slate-400"}`}>مراحل پژوهش ({items.length})</button><button onClick={() => setActiveTab("SCENARIOS")} className={`rounded-apple-sm px-3 py-1.5 text-xs ${activeTab === "SCENARIOS" ? "bg-apple-indigo text-white" : "text-slate-400"}`}>سناریوها ({scenarios.length})</button></div></div>
    {activeTab === "WORKLIST" ? items.length === 0 ? <Card variant="glass" className="p-10 text-center"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-apple-green"/><p className="text-sm text-slate-200">ارسالی در انتظار بررسی ندارید.</p></Card> : <div className="space-y-3">{items.map((item) => <Card key={item.id} variant="glass" className="space-y-3 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Badge variant="indigo" size="sm">{item.caseCode}</Badge><Badge variant={item.kind === "SOURCE_STAGE" ? "warning" : "info"} size="sm">{item.stageName}</Badge></div><h3 className="mt-2 font-semibold text-slate-100">{item.caseTitle}</h3><p className="mt-1 text-xs text-slate-400">کارورز: {item.internName} · {new Date(item.submittedAt).toLocaleString("fa-IR")}{item.version ? ` · نسخه ${item.version}` : ""}</p></div><Button variant="primary" size="sm" onClick={() => { setActiveReview(item); setNotes(""); }}>بررسی و تصمیم</Button></div><p className="rounded-apple-sm bg-white/[0.03] p-3 text-xs leading-6 text-slate-300">{item.summary}</p>{item.storedObjectId && <Button variant="ghost" size="sm" onClick={() => void apiClient.download(`/files/${item.storedObjectId}/download`, `${item.stageName}-v${item.version}`)}>دریافت فایل پیوست</Button>}</Card>)}</div> : scenarios.length === 0 ? <Card variant="glass" className="p-10 text-center text-sm text-slate-400">سناریویی در انتظار داوری نیست.</Card> : <div className="grid gap-3 md:grid-cols-2">{scenarios.map((scenario) => <Card key={scenario.id} variant="glass" className="space-y-3 p-4"><div><Badge variant="warning" size="sm">{scenario.caseCode}</Badge><h3 className="mt-2 font-semibold text-slate-100">{scenario.title}</h3><p className="mt-1 text-xs text-slate-400">{scenario.caseTitle} · {scenario.internName} · نسخه {scenario.version}</p></div><p className="text-xs leading-6 text-slate-300">{scenario.summary}</p><Button variant="primary" size="sm" onClick={() => { setActiveScenario(scenario); setNotes(""); }}>بررسی سناریو</Button></Card>)}</div>}

    <Modal isOpen={!!activeReview} onClose={() => setActiveReview(null)} title="داوری مرحله پژوهش" subtitle="تصمیم معتبر هر مدیر علمی منتسب کافی است؛ نسخه قدیمی با خطای STALE_REVISION رد می‌شود.">
      {activeReview && <div className="space-y-4 text-right"><div className="text-xs text-slate-300">{activeReview.caseTitle} · {activeReview.stageName}</div><label className="block text-xs text-slate-300">نظر داوری<textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900/70 p-3 text-sm" placeholder="نکته‌های علمی یا دلیل نیاز به اصلاح…" /></label><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setActiveReview(null)}>انصراف</Button><Button variant="secondary" loading={busy} icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => void decide("REVISION_REQUIRED")}>درخواست اصلاح</Button><Button variant="primary" loading={busy} onClick={() => void decide("APPROVED")}>تأیید مرحله</Button></div></div>}
    </Modal>
    <Modal isOpen={!!activeScenario} onClose={() => setActiveScenario(null)} title="داوری سناریو" subtitle="سناریوی تأییدشده در بانک داخلی سامانه ثبت می‌شود.">
      {activeScenario && <div className="space-y-4 text-right"><div><h3 className="font-semibold text-slate-100">{activeScenario.title}</h3><p className="mt-2 text-xs text-slate-300">{activeScenario.summary}</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-apple-sm bg-black/20 p-3 text-xs text-slate-300">{activeScenario.content}</pre></div><label className="block text-xs text-slate-300">نظر داوری<textarea rows={3} required value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900/70 p-3 text-sm" /></label><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setActiveScenario(null)}>انصراف</Button><Button variant="secondary" loading={busy} onClick={() => void decideScenario("CHANGES_REQUESTED")}>درخواست اصلاح</Button><Button variant="primary" loading={busy} onClick={() => void decideScenario("APPROVED")}>تأیید و ثبت در بانک</Button></div></div>}
    </Modal>
  </div>;
};
