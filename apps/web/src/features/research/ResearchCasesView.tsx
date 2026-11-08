import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FolderGit2, Plus, RotateCcw } from "lucide-react";
import type { StageStatus, StageType } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { useAuth } from "../../features/auth/AuthContext.js";
import type { ResearchCaseItem, StageInstanceItem } from "../../shared/types.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Modal } from "../../shared/ui/Modal.js";
import { CreateResearchCaseModal } from "./CreateResearchCaseModal.js";
import { ResourcesManager } from "../resources/ResourcesManager.js";
import { StageSubmissionWorkspace } from "./StageSubmissionWorkspace.js";
import { ScenarioWorkspace } from "./ScenarioWorkspace.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
const stages: Array<{ type: StageType; label: string }> = [
  { type: "SOURCES", label: "منابع و مصاحبه‌ها" },
  { type: "EXPLANATION", label: "تبیین مسئله" },
  { type: "PRESCRIPTION", label: "تجویز راهکار" },
  { type: "SCENARIO", label: "سناریونویسی" },
];

const statusLabel: Record<StageStatus, string> = {
  PENDING: "شروع‌نشده", IN_PROGRESS: "در حال انجام", SUBMITTED: "در انتظار داوری", REVIEW_REQUIRED: "نیازمند بازبینی", APPROVED: "تأییدشده", REVISION_REQUESTED: "نیازمند اصلاح",
};

export interface ResearchCasesViewProps {
  onNotify: Notice;
  researcherId?: string;
  canManage?: boolean;
}

export const ResearchCasesView: React.FC<ResearchCasesViewProps> = ({ onNotify, researcherId, canManage = false }) => {
  const { currentUser } = useAuth();
  const ownerId = researcherId ?? currentUser?.id;
  const [cases, setCases] = useState<ResearchCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<ResearchCaseItem | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageInstanceItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<StageType>("SOURCES");
  const [rollbackReason, setRollbackReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCases = useCallback(async () => {
    if (!ownerId) { setCases([]); setLoading(false); return; }
    setLoading(true);
    try {
      const updatedCases = await apiClient.get<ResearchCaseItem[]>(`/research-cases?researcherId=${encodeURIComponent(ownerId)}`);
      setCases(updatedCases);
      setSelectedCase((current) => current ? updatedCases.find((item) => item.id === current.id) ?? current : null);
    } catch (error) {
      setCases([]);
      onNotify("error", "پرونده‌ها بارگذاری نشدند", error instanceof Error ? error.message : undefined);
    } finally { setLoading(false); }
  }, [onNotify, ownerId]);
  useEffect(() => { void loadCases(); }, [loadCases]);
  useEffect(() => {
    if (!selectedCase || !selectedStage) return;
    const currentCase = cases.find((item) => item.id === selectedCase.id);
    const updatedStage = currentCase?.stages.find((item) => item.stageType === selectedStage.stageType);
    if (updatedStage) setSelectedStage(updatedStage);
  }, [cases, selectedCase?.id]);

  const submitRollback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCase) return;
    setBusy(true);
    try {
      await apiClient.post(`/research-cases/${selectedCase.id}/rollback-stage`, { targetStage: rollbackTarget, reason: rollbackReason, expectedVersion: selectedCase.version });
      onNotify("success", "بازگشت مرحله ثبت شد", "نسخه‌های گذشته حفظ شدند و مراحل وابسته برای بازبینی علامت خوردند (D-05 / AT-33).");
      setRollbackOpen(false); setRollbackReason(""); setSelectedCase(null); setSelectedStage(null); await loadCases();
    } catch (error) { onNotify("error", "بازگشت مرحله انجام نشد", error instanceof Error ? error.message : undefined); }
    finally { setBusy(false); }
  };

  if (selectedCase && selectedStage) {
    const canEdit = !canManage && ["IN_PROGRESS", "REVIEW_REQUIRED", "REVISION_REQUESTED"].includes(selectedStage.status);
    const back = () => setSelectedStage(null);
    return <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><button onClick={back} className="mb-2 flex items-center gap-1 text-xs text-apple-blue hover:underline"><ArrowLeft className="h-3 w-3" />بازگشت به مراحل پرونده</button><h2 className="text-lg font-bold text-slate-100">{stages.find((stage) => stage.type === selectedStage.stageType)?.label}</h2><p className="mt-1 text-xs text-slate-400">{selectedCase.code} · {selectedCase.title} · {statusLabel[selectedStage.status]}</p></div>{canManage && <Button variant="secondary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setRollbackOpen(true)}>بازگشت به مرحله قبلی</Button>}</div>
      {selectedStage.stageType === "SOURCES" && <ResourcesManager caseId={selectedCase.id} caseTitle={selectedCase.title} caseVersion={selectedCase.version} canEdit={canEdit} stageStatus={selectedStage.status} onWorkflowChanged={loadCases} onBack={back} onNotify={onNotify} />}
      {(selectedStage.stageType === "EXPLANATION" || selectedStage.stageType === "PRESCRIPTION") && <StageSubmissionWorkspace caseTitle={selectedCase.title} caseVersion={selectedCase.version} stageId={selectedStage.id} stageType={selectedStage.stageType} stageStatus={selectedStage.status} canEdit={canEdit} onWorkflowChanged={loadCases} onNotify={onNotify} />}
      {selectedStage.stageType === "SCENARIO" && <ScenarioWorkspace caseId={selectedCase.id} caseTitle={selectedCase.title} stageStatus={selectedStage.status} canEdit={canEdit} onNotify={onNotify} />}
      <Modal isOpen={rollbackOpen} onClose={() => setRollbackOpen(false)} title="بازگردانی مرحله و بازبینی خروجی‌های وابسته" subtitle="تاریخچه نسخه‌ها حذف نمی‌شود (D-05 / FR-061 / AT-33).">
        <form onSubmit={submitRollback} className="space-y-4 text-right">
          <label className="block text-xs text-slate-300">مرحله مقصد<select value={rollbackTarget} onChange={(event) => setRollbackTarget(event.target.value as StageType)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900 p-2.5 text-sm">{stages.slice(0, 3).map((stage) => <option key={stage.type} value={stage.type}>{stage.label}</option>)}</select></label>
          <label className="block text-xs text-slate-300">دلیل بازگشت<textarea required minLength={5} rows={3} value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900 p-3 text-sm" /></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setRollbackOpen(false)}>انصراف</Button><Button type="submit" variant="primary" loading={busy}>ثبت بازگشت</Button></div>
        </form>
      </Modal>
    </div>;
  }

  if (selectedCase) return <div className="space-y-5">
    <button onClick={() => setSelectedCase(null)} className="flex items-center gap-1 text-xs text-apple-blue hover:underline"><ArrowLeft className="h-3 w-3" />بازگشت به پرونده‌ها</button>
    <Card variant="glass" className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Badge variant="info" size="sm">{selectedCase.code}</Badge><h2 className="mt-2 text-lg font-bold text-slate-100">{selectedCase.title}</h2><p className="mt-1 text-xs text-slate-400">موضوع: {selectedCase.subject}</p></div><span className="text-xs text-slate-400">نسخه {selectedCase.version}</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stages.map(({ type, label }) => {
        const stage = selectedCase.stages.find((item) => item.stageType === type);
        if (!stage) return null;
        return <button type="button" key={stage.id} onClick={() => setSelectedStage(stage)} className={`rounded-apple-md border p-4 text-right transition hover:-translate-y-0.5 hover:border-apple-blue/40 ${stage.status === "APPROVED" ? "border-apple-green/30 bg-apple-green/5" : stage.status === "IN_PROGRESS" ? "border-apple-blue/40 bg-apple-blue/10" : stage.status === "SUBMITTED" || stage.status === "REVIEW_REQUIRED" || stage.status === "REVISION_REQUESTED" ? "border-apple-amber/30 bg-apple-amber/5" : "border-white/10 bg-white/[0.02]"}`}>
          <div className="text-xs font-semibold text-slate-100">{label}</div><div className="mt-2 text-[11px] text-slate-400">{statusLabel[stage.status]}</div><div className="mt-1 text-[10px] text-slate-500">نسخه {stage.version}</div>
        </button>;
      })}</div>
      <p className="border-t border-white/5 pt-3 text-xs text-slate-400">برای بازکردن هر مرحله روی کارت آن بزنید. مرحله جاری قابل ویرایش است؛ تأیید مدیر علمی، مرحله بعد را باز می‌کند. مراحل تأییدشده برای مشاهده تاریخچه در دسترس‌اند.</p>
      {canManage && <div className="flex justify-end"><Button variant="secondary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setRollbackOpen(true)}>بازگشت به مرحله قبلی</Button></div>}
    </Card>
    <Modal isOpen={rollbackOpen} onClose={() => setRollbackOpen(false)} title="بازگردانی مرحله و بازبینی خروجی‌های وابسته" subtitle="تاریخچه نسخه‌ها حذف نمی‌شود (D-05 / FR-061 / AT-33).">
      <form onSubmit={submitRollback} className="space-y-4 text-right">
        <label className="block text-xs text-slate-300">مرحله مقصد<select value={rollbackTarget} onChange={(event) => setRollbackTarget(event.target.value as StageType)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900 p-2.5 text-sm">{stages.slice(0, 3).map((stage) => <option key={stage.type} value={stage.type}>{stage.label}</option>)}</select></label>
        <label className="block text-xs text-slate-300">دلیل بازگشت<textarea required minLength={5} rows={3} value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900 p-3 text-sm" /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setRollbackOpen(false)}>انصراف</Button><Button type="submit" variant="primary" loading={busy}>ثبت بازگشت</Button></div>
      </form>
    </Modal>
  </div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold text-slate-100"><FolderGit2 className="h-5 w-5 text-apple-blue" />پرونده‌های پژوهش</h2><p className="mt-1 text-xs text-slate-400">چرخه منابع، تبیین، تجویز و سناریو · حرکت بین مراحل با تأیید مدیر علمی</p></div>{canManage && ownerId && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>ایجاد پرونده برای کارورز</Button>}</div>
    {!ownerId && canManage ? <Card variant="glass" className="p-8 text-center text-sm text-slate-400">ابتدا یک کارورز منتسب‌شده را انتخاب کنید.</Card> : loading ? <div className="p-10 text-center text-sm text-slate-400">در حال بارگذاری پرونده‌ها…</div> : cases.length === 0 ? <Card variant="glass" className="p-10 text-center text-sm text-slate-400">برای این کارورز هنوز پرونده‌ای ثبت نشده است.</Card> : <div className="grid gap-3 md:grid-cols-2">{cases.map((item) => <Card key={item.id} variant="glass" className="flex flex-col justify-between gap-4 p-5">
      <div><div className="flex items-center justify-between gap-2"><Badge variant="info" size="sm">{item.code}</Badge><span className="text-xs text-slate-500">v{item.version}</span></div><h3 className="mt-3 font-bold text-slate-100">{item.title}</h3><p className="mt-1 text-xs text-slate-400">{item.subject}</p><div className="mt-4 flex flex-wrap gap-1.5">{item.stages.map((stage) => <span key={stage.id} title={statusLabel[stage.status]} className={`h-2 w-8 rounded-full ${stage.status === "APPROVED" ? "bg-apple-green" : stage.status === "IN_PROGRESS" ? "bg-apple-blue" : stage.status === "SUBMITTED" || stage.status === "REVIEW_REQUIRED" || stage.status === "REVISION_REQUESTED" ? "bg-apple-amber" : "bg-white/10"}`} />)}</div></div>
      <Button variant="secondary" size="sm" onClick={() => { setSelectedCase(item); setSelectedStage(null); }}>مشاهده چهار مرحله</Button>
    </Card>)}</div>}
    {canManage && ownerId && <CreateResearchCaseModal isOpen={createOpen} onClose={() => setCreateOpen(false)} researcherId={ownerId} onSuccess={() => void loadCases()} onNotify={onNotify} />}
  </div>;
};
