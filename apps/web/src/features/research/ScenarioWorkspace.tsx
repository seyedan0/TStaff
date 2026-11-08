import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../shared/api-client.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import type { ScenarioAudience, StageStatus } from "@tstaff/contracts";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
interface ScenarioItem { id: string; version: number; title: string; summary: string; content: string; status: string }
interface ScenarioFields { audience: ScenarioAudience; province: string; category: string; keywords: string; implementationSteps: string }
const empty: ScenarioFields = { audience: "OTHER", province: "", category: "", keywords: "", implementationSteps: "" };
const audienceLabel: Record<ScenarioAudience, string> = { TEACHER: "معلم", STUDENT: "دانش‌آموز", MENTOR: "مربی", OTHER: "سایر" };

const parseContent = (content?: string): ScenarioFields => {
  try {
    const value = JSON.parse(content || "{}") as { audience?: ScenarioAudience; province?: string; category?: string; keywords?: string[]; implementationSteps?: string[] };
    return { audience: value.audience ?? "OTHER", province: value.province ?? "", category: value.category ?? "", keywords: value.keywords?.join(", ") ?? "", implementationSteps: value.implementationSteps?.join("\n") ?? "" };
  } catch { return empty; }
};

const toContent = (fields: ScenarioFields) => JSON.stringify({
  audience: fields.audience,
  province: fields.province.trim(),
  category: fields.category.trim(),
  keywords: fields.keywords.split(",").map((item) => item.trim()).filter(Boolean),
  implementationSteps: fields.implementationSteps.split("\n").map((item) => item.trim()).filter(Boolean),
});

export const ScenarioWorkspace: React.FC<{
  caseId: string;
  caseTitle: string;
  stageStatus: StageStatus;
  canEdit: boolean;
  onNotify: Notice;
}> = ({ caseId, caseTitle, stageStatus, canEdit, onNotify }) => {
  const [scenario, setScenario] = useState<ScenarioItem | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [fields, setFields] = useState<ScenarioFields>(empty);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiClient.get<ScenarioItem[]>(`/research-cases/${caseId}/scenarios`);
      const current = list.at(-1) ?? null;
      setScenario(current); setTitle(current?.title ?? ""); setSummary(current?.summary ?? ""); setFields(parseContent(current?.content));
    } catch (error) { setScenario(null); onNotify("error", "سناریو بارگذاری نشد", error instanceof Error ? error.message : undefined); }
    finally { setLoading(false); }
  }, [caseId, onNotify]);
  useEffect(() => { void load(); }, [load]);

  const save = async (submit: boolean) => {
    setBusy(true);
    try {
      const data = { title: title.trim(), summary: summary.trim(), content: toContent(fields) };
      let saved: ScenarioItem;
      if (!scenario) saved = await apiClient.post<ScenarioItem>(`/research-cases/${caseId}/scenarios`, data);
      else saved = await apiClient.patch<ScenarioItem>(`/scenarios/${scenario.id}`, { ...data, expectedVersion: scenario.version });
      if (submit) {
        const submitted = await apiClient.post<ScenarioItem>(`/scenarios/${saved.id}/submit`, { expectedVersion: saved.version });
        setScenario(submitted);
        onNotify("success", "سناریو برای بررسی ارسال شد", "پس از تأیید مدیر علمی، به بانک داخلی سناریوها افزوده می‌شود.");
      } else {
        setScenario(saved);
        onNotify("success", "پیش‌نویس سناریو ذخیره شد");
      }
    } catch (error) { onNotify("error", "ذخیره سناریو انجام نشد", error instanceof Error ? error.message : undefined); }
    finally { setBusy(false); }
  };

  const field = (key: keyof ScenarioFields, label: string, rows = 3) => <label className="block text-xs text-slate-300">{label}<textarea rows={rows} value={fields[key]} onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-100" /></label>;

  return <div className="space-y-4">
    <div><h3 className="text-lg font-bold text-slate-100">سناریونویسی</h3><p className="mt-1 text-xs text-slate-400">{caseTitle} · عنوان، شرح، مخاطب، استان، دسته‌بندی، کلیدواژه و مراحل اجرا (FR-021 / AT-08)</p></div>
    {loading ? <p className="p-6 text-center text-xs text-slate-400">در حال دریافت سناریو…</p> : scenario && !canEdit ? <Card variant="glass" className="space-y-3 p-5"><div className="flex justify-between"><h4 className="font-semibold">{scenario.title}</h4><span className="text-xs text-slate-400">{scenario.status} · نسخه {scenario.version}</span></div><p className="text-sm text-slate-300">{scenario.summary}</p><pre className="whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(parseContent(scenario.content), null, 2)}</pre></Card> : null}
    {!loading && canEdit && <Card variant="glass" className="p-4"><div className="space-y-3 text-right">
      <Input label="عنوان سناریو" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <label className="block text-xs text-slate-300">شرح کامل سناریو<textarea required minLength={10} maxLength={2000} rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-100" /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs text-slate-300">مخاطب<select value={fields.audience} onChange={(event) => setFields((current) => ({ ...current, audience: event.target.value as ScenarioAudience }))} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-100">{Object.entries(audienceLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <Input label="استان" required value={fields.province} onChange={(event) => setFields((current) => ({ ...current, province: event.target.value }))} />
        <Input label="دسته‌بندی" required value={fields.category} onChange={(event) => setFields((current) => ({ ...current, category: event.target.value }))} />
        <Input label="کلیدواژه‌ها (با ویرگول جدا کنید)" required value={fields.keywords} onChange={(event) => setFields((current) => ({ ...current, keywords: event.target.value }))} />
      </div>
      {field("implementationSteps", "مراحل پیشنهادی اجرا (هر مرحله در یک خط)", 6)}
      {scenario?.status === "UNDER_REVIEW" ? <p className="text-xs text-apple-amber">سناریو در کارتابل مدیر علمی و منتظر داوری است.</p> : <div className="flex justify-end gap-2"><Button variant="secondary" loading={busy} onClick={() => void save(false)}>ذخیره پیش‌نویس</Button><Button variant="primary" loading={busy} disabled={stageStatus === "PENDING"} onClick={() => void save(true)}>ثبت و ارسال برای تأیید</Button></div>}
    </div></Card>}
  </div>;
};
