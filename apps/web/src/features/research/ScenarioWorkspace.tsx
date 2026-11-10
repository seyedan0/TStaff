import React, { useCallback, useEffect, useState } from "react";
import {
  IRAN_PROVINCES,
  type ScenarioAudience,
  type ScenarioDecisionDto,
  type ScenarioVersionDto,
  type StageStatus,
} from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { useUnsavedChanges } from "../../shared/useUnsavedChanges.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { LoadingState } from "../../shared/ui/StateFeedback.js";
import { UnsavedChangesDialog } from "../../shared/ui/UnsavedChangesDialog.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

interface ScenarioItem {
  id: string;
  version: number;
  title: string;
  summary: string;
  content: string;
  status: string;
  createdById?: string | null;
  versions?: ScenarioVersionDto[];
  decisions?: ScenarioDecisionDto[];
}

interface ScenarioFields {
  audience: ScenarioAudience;
  province: string;
  category: string;
  keywords: string;
  implementationSteps: string;
}

const empty: ScenarioFields = {
  audience: "OTHER",
  province: "",
  category: "",
  keywords: "",
  implementationSteps: "",
};

const audienceLabel: Record<ScenarioAudience, string> = {
  TEACHER: "معلم",
  STUDENT: "دانش‌آموز",
  MENTOR: "مربی",
  OTHER: "سایر",
};

const parseContent = (content?: string): ScenarioFields => {
  try {
    const value = JSON.parse(content || "{}") as {
      audience?: ScenarioAudience;
      province?: string;
      category?: string;
      keywords?: string[];
      implementationSteps?: string[];
    };
    return {
      audience: value.audience ?? "OTHER",
      province: value.province ?? "",
      category: value.category ?? "",
      keywords: value.keywords?.join(", ") ?? "",
      implementationSteps: value.implementationSteps?.join("\n") ?? "",
    };
  } catch {
    return empty;
  }
};

const toContent = (fields: ScenarioFields) =>
  JSON.stringify({
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

  const dirty =
    canEdit &&
    !busy &&
    !loading &&
    (title !== (scenario?.title ?? "") ||
      summary !== (scenario?.summary ?? "") ||
      JSON.stringify(fields) !== JSON.stringify(parseContent(scenario?.content)));
  const blocker = useUnsavedChanges(dirty);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiClient.get<ScenarioItem[]>(`/research-cases/${caseId}/scenarios`);
      const current = list.at(-1) ?? null;
      setScenario(current);
      setTitle(current?.title ?? "");
      setSummary(current?.summary ?? "");
      setFields(parseContent(current?.content));
    } catch (error) {
      setScenario(null);
      onNotify("error", "سناریو بارگذاری نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [caseId, onNotify]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (submit: boolean) => {
    setBusy(true);
    try {
      const data = { title: title.trim(), summary: summary.trim(), content: toContent(fields) };
      let saved: ScenarioItem;
      if (!scenario) saved = await apiClient.post<ScenarioItem>(`/research-cases/${caseId}/scenarios`, data);
      else saved = await apiClient.patch<ScenarioItem>(`/scenarios/${scenario.id}`, { ...data, expectedVersion: scenario.version });
      if (submit) {
        await apiClient.post<ScenarioItem>(`/scenarios/${saved.id}/submit`, { expectedVersion: saved.version });
        onNotify("success", "سناریو برای بررسی ارسال شد", "پس از تأیید مدیر علمی، وضعیت آن در سابقه پرونده ثبت می‌شود.");
      } else {
        onNotify("success", "پیش‌نویس سناریو ذخیره شد");
      }
      await load();
    } catch (error) {
      onNotify("error", "ذخیره سناریو انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const parsedCurrent = parseContent(scenario?.content);

  return (
    <div className="space-y-4">
      <UnsavedChangesDialog blocker={blocker} />
      <div>
        <h3 className="text-lg font-bold text-[#214031]">سناریونویسی</h3>
        <p className="mt-1 text-xs text-[#4F6659]">
          {caseTitle} · عنوان، شرح، مخاطب، استان، دسته‌بندی، کلیدواژه‌ها، مراحل اجرا، تاریخچه نسخه‌ها و تصمیم‌ها (FR-021 / AT-08)
        </p>
      </div>

      {loading ? (
        <LoadingState message="در حال دریافت سناریو..." />
      ) : scenario && !canEdit ? (
        <Card variant="default" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-base font-bold text-[#214031]">{scenario.title}</h4>
            <Badge variant={scenario.status === "APPROVED_INTERNAL" ? "success" : "warning"} size="sm">
              {scenario.status} · نسخه {scenario.version}
            </Badge>
          </div>
          <p className="text-sm leading-6 text-[#214031]">{scenario.summary}</p>
          <dl className="grid gap-3 rounded-xl bg-[#F3EBDD]/60 p-4 text-xs sm:grid-cols-2">
            <div><dt className="text-[#4F6659]">مخاطب</dt><dd className="mt-1 font-semibold text-[#214031]">{audienceLabel[parsedCurrent.audience]}</dd></div>
            <div><dt className="text-[#4F6659]">استان</dt><dd className="mt-1 font-semibold text-[#214031]">{parsedCurrent.province || "-"}</dd></div>
            <div><dt className="text-[#4F6659]">دسته‌بندی</dt><dd className="mt-1 font-semibold text-[#214031]">{parsedCurrent.category || "-"}</dd></div>
            <div><dt className="text-[#4F6659]">کلیدواژه‌ها</dt><dd className="mt-1 font-semibold text-[#214031]">{parsedCurrent.keywords || "-"}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-[#4F6659]">مراحل اجرا</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-6 text-[#214031]">{parsedCurrent.implementationSteps || "-"}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {!loading && canEdit && (
        <Card variant="default">
          <div className="space-y-3 text-right">
            <Input label="عنوان سناریو" required value={title} onChange={(event) => setTitle(event.target.value)} />
            <label className="block text-xs font-medium text-[#214031]">
              شرح کامل سناریو
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-medium text-[#214031]">
                مخاطب
                <select
                  value={fields.audience}
                  onChange={(event) => setFields((current) => ({ ...current, audience: event.target.value as ScenarioAudience }))}
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-sm text-[#214031]"
                >
                  {Object.entries(audienceLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-[#214031]">
                استان
                <select
                  required
                  value={fields.province}
                  onChange={(event) => setFields((current) => ({ ...current, province: event.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-sm text-[#214031]"
                >
                  <option value="">انتخاب استان...</option>
                  {IRAN_PROVINCES.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </label>

              <Input
                label="دسته‌بندی"
                required
                value={fields.category}
                onChange={(event) => setFields((current) => ({ ...current, category: event.target.value }))}
              />
              <Input
                label="کلیدواژه‌ها (با ویرگول جدا کنید)"
                required
                value={fields.keywords}
                onChange={(event) => setFields((current) => ({ ...current, keywords: event.target.value }))}
              />
            </div>
            <label className="block text-xs font-medium text-[#214031]">
              مراحل پیشنهادی اجرا (هر مرحله در یک خط)
              <textarea
                rows={5}
                value={fields.implementationSteps}
                onChange={(event) => setFields((current) => ({ ...current, implementationSteps: event.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            {scenario?.status === "UNDER_REVIEW" ? (
              <p className="text-xs font-semibold text-[#B83B2B]">سناریو در کارتابل مدیر علمی و منتظر داوری است.</p>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" loading={busy} onClick={() => void save(false)}>ذخیره پیش‌نویس</Button>
                <Button variant="primary" loading={busy} disabled={stageStatus === "PENDING"} onClick={() => void save(true)}>
                  ثبت و ارسال برای تأیید
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {scenario?.versions && scenario.versions.length > 0 && (
        <Card variant="default" className="space-y-2">
          <h4 className="text-xs font-bold text-[#214031]">تاریخچه نسخه‌های سناریو ({scenario.versions.length})</h4>
          <ul className="divide-y divide-[#214E3A]/10 text-xs">
            {scenario.versions.map((v) => (
              <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-semibold text-[#214031]">نسخه {v.version}: {v.title}</span>
                <span className="text-[#4F6659]">{v.status} · {new Date(v.createdAt).toLocaleString("fa-IR")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {scenario?.decisions && scenario.decisions.length > 0 && (
        <Card variant="default" className="space-y-2">
          <h4 className="text-xs font-bold text-[#214031]">سوابق داوری علمی سناریو ({scenario.decisions.length})</h4>
          <ul className="divide-y divide-[#214E3A]/10 text-xs">
            {scenario.decisions.map((d) => (
              <li key={d.id} className="space-y-1 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={d.decision === "APPROVED" ? "success" : "warning"} size="sm">
                    {d.decision === "APPROVED" ? "تأییدشده" : "نیازمند اصلاح"} · نسخه {d.actualVersion}
                  </Badge>
                  <span className="text-[#4F6659]">
                    {d.reviewerName || "مدیر علمی"} · {new Date(d.decidedAt).toLocaleString("fa-IR")}
                  </span>
                </div>
                <p className="text-[#214031]">{d.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
