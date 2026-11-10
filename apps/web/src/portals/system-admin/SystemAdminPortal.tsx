import React, { useCallback, useEffect, useState } from "react";
import { Activity, Archive, Clock, Database, RefreshCw, Save, Search, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ArchiveJobDto, ArchiveTargetType, HealthResponse, SystemSetting } from "@tstaff/contracts";
import { getRoleLabel } from "../../app/navigation.js";
import { usePortalSection } from "../../app/usePortalSection.js";
import { useAuth } from "../../features/auth/AuthContext.js";
import { apiClient } from "../../shared/api-client.js";
import type { ResearchCaseItem } from "../../shared/types.js";
import { useUnsavedChanges } from "../../shared/useUnsavedChanges.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { Modal } from "../../shared/ui/Modal.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";
import { UnsavedChangesDialog } from "../../shared/ui/UnsavedChangesDialog.js";

interface SystemAdminPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

interface ManagerRow {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  stage: string;
  isActive: boolean;
}

const DEADLINE_KEYS = [
  { key: "deadline_days.SOURCES", label: "مهلت مرحله ۱: منابع و مصاحبه‌ها (روز)", fallback: "14" },
  { key: "deadline_days.EXPLANATION", label: "مهلت مرحله ۲: تبیین مسئله (روز)", fallback: "21" },
  { key: "deadline_days.PRESCRIPTION", label: "مهلت مرحله ۳: تجویز راهکار (روز)", fallback: "21" },
  { key: "deadline_days.SCENARIO", label: "مهلت مرحله ۴: سناریونویسی (روز)", fallback: "14" },
] as const;

export const SystemAdminPortal: React.FC<SystemAdminPortalProps> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const activeTab = usePortalSection<"settings" | "archive" | "managers" | "health">(
    { "/management/settings": "settings", "/management/archive": "archive", "/management/managers": "managers", "/management/health": "health" },
    "settings",
  );
  const [query] = useSearchParams();
  const navigate = useNavigate();

  const [deadlines, setDeadlines] = useState<Record<string, string>>({
    "deadline_days.SOURCES": "14",
    "deadline_days.EXPLANATION": "21",
    "deadline_days.PRESCRIPTION": "21",
    "deadline_days.SCENARIO": "14",
  });
  const [savedDeadlines, setSavedDeadlines] = useState<Record<string, string>>({ ...deadlines });
  const [extraSettings, setExtraSettings] = useState<SystemSetting[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  const [archiveJobs, setArchiveJobs] = useState<ArchiveJobDto[]>([]);
  const [caseOptions, setCaseOptions] = useState<ResearchCaseItem[]>([]);
  const [archiveTargetType, setArchiveTargetType] = useState<ArchiveTargetType>("RESEARCH_CASE");
  const [archiveTargetId, setArchiveTargetId] = useState("");
  const [runningArchive, setRunningArchive] = useState(false);

  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMgrName, setNewMgrName] = useState("");
  const [newMgrPhone, setNewMgrPhone] = useState("");
  const [newMgrRole, setNewMgrRole] = useState("SCIENTIFIC_SUPERVISOR");
  const [newMgrPassword, setNewMgrPassword] = useState("");
  const [creatingMgr, setCreatingMgr] = useState(false);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const settingsDirty =
    activeTab === "settings" && JSON.stringify(deadlines) !== JSON.stringify(savedDeadlines);
  const blocker = useUnsavedChanges(settingsDirty);

  const loadTab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "settings") {
        const list = await apiClient.get<SystemSetting[]>("/settings");
        const next: Record<string, string> = {};
        for (const item of DEADLINE_KEYS) {
          next[item.key] = list.find((s) => s.key === item.key)?.value ?? item.fallback;
        }
        setDeadlines(next);
        setSavedDeadlines(next);
        setExtraSettings(list.filter((s) => !DEADLINE_KEYS.some((k) => k.key === s.key)));
      } else if (activeTab === "archive") {
        const [jobs, cases] = await Promise.all([
          apiClient.get<ArchiveJobDto[]>("/archives/jobs"),
          apiClient.get<ResearchCaseItem[]>("/research-cases/directory").catch(() => []),
        ]);
        setArchiveJobs(jobs);
        setCaseOptions(cases);
        if (!archiveTargetId && cases[0]) setArchiveTargetId(cases[0].id);
      } else if (activeTab === "managers") {
        setManagers(await apiClient.get<ManagerRow[]>("/users/managers"));
      } else if (activeTab === "health") {
        setHealth(await apiClient.get<HealthResponse>("/health"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت داده‌های مدیریتی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  const handleSaveDeadlines = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingSettings(true);
    try {
      await Promise.all(
        DEADLINE_KEYS.map((item) =>
          apiClient.put(`/settings/${encodeURIComponent(item.key)}`, {
            value: String(deadlines[item.key] ?? item.fallback),
            description: item.label,
          }),
        ),
      );
      setSavedDeadlines({ ...deadlines });
      onNotify("success", "تنظیمات زمان‌بندی ذخیره شد", "مقادیر مهلت مراحل در پایگاه‌داده ثبت گردید (FR-052).");
    } catch (err) {
      onNotify("error", "ذخیره تنظیمات ناموفق بود", err instanceof Error ? err.message : undefined);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunArchive = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!archiveTargetId.trim()) return;
    setRunningArchive(true);
    try {
      await apiClient.post("/archives/jobs", {
        targetType: archiveTargetType,
        targetId: archiveTargetId.trim(),
      });
      onNotify("success", "فرایند آرشیو اجرا شد", "اسنپ‌شات تغییرناپذیر بدون حذف فیزیکی رکورد ذخیره گردید (BR-19).");
      await loadTab();
    } catch (err) {
      onNotify("error", "اجرای آرشیو ناموفق بود", err instanceof Error ? err.message : undefined);
    } finally {
      setRunningArchive(false);
    }
  };

  const handleCreateManager = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMgrName.trim() || !newMgrPhone.trim()) return;
    setCreatingMgr(true);
    try {
      await apiClient.post("/users/managers", {
        fullName: newMgrName.trim(),
        phoneNumber: newMgrPhone.trim(),
        role: newMgrRole,
        password: newMgrPassword,
      });
      onNotify("success", "حساب مدیر جدید ایجاد شد", `کاربر «${newMgrName}» فعال گردید.`);
      setIsCreateOpen(false);
      setNewMgrName("");
      setNewMgrPhone("");
      setNewMgrPassword("");
      await loadTab();
    } catch (err) {
      onNotify("error", "ایجاد حساب مدیر انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setCreatingMgr(false);
    }
  };

  const searchTerm = (query.get("q") ?? "").trim().toLowerCase();
  const filteredManagers = managers.filter(
    (m) => !searchTerm || `${m.fullName} ${m.phoneNumber} ${m.role}`.toLowerCase().includes(searchTerm),
  );

  return (
    <div className="space-y-5">
      <UnsavedChangesDialog blocker={blocker} />
      <PageHeader
        title={`مدیریت سامانه · ${currentUser?.fullName || "مدیر کل"}`}
        subtitle="تنظیمات پویای مهلت‌ها، بایگانی و اسنپ‌شات تغییرناپذیر (BR-19)، مدیران و پایش سلامت زیرساخت"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} loading={loading} onClick={() => void loadTab()}>
              به‌روزرسانی
            </Button>
            {activeTab === "managers" && (
              <Button variant="primary" size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setIsCreateOpen(true)}>
                تعریف مدیر جدید
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <LoadingState message="در حال دریافت داده‌های مدیریتی..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadTab()} />
      ) : activeTab === "settings" ? (
        <div className="space-y-4">
          <Card variant="default" title="پیکربندی مهلت استاندارد مراحل پژوهش (FR-052)">
            <form onSubmit={(e) => void handleSaveDeadlines(e)} className="max-w-2xl space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {DEADLINE_KEYS.map((item) => (
                  <Input
                    key={item.key}
                    label={item.label}
                    type="number"
                    min={1}
                    max={365}
                    dir="ltr"
                    required
                    value={deadlines[item.key] ?? item.fallback}
                    onChange={(e) => setDeadlines((prev) => ({ ...prev, [item.key]: e.target.value }))}
                  />
                ))}
              </div>
              <Button type="submit" variant="primary" loading={savingSettings} icon={<Save className="h-4 w-4" />}>
                ذخیره تنظیمات در سرور
              </Button>
            </form>
          </Card>

          {extraSettings.length > 0 && (
            <Card variant="default" title="سایر تنظیمات ثبت‌شده">
              <div className="divide-y divide-[#214E3A]/10 text-xs">
                {extraSettings.map((setting) => (
                  <div key={setting.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <div dir="ltr" className="font-mono font-semibold text-[#214031]">{setting.key}</div>
                      {setting.description && <div className="text-[#4F6659]">{setting.description}</div>}
                    </div>
                    <Badge variant="neutral" size="sm">{setting.value}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : activeTab === "archive" ? (
        <div className="space-y-4">
          <Card variant="default" title="انجماد و آرشیو داده‌ها بدون حذف فیزیکی (BR-19)">
            <form onSubmit={(e) => void handleRunArchive(e)} className="grid gap-3 md:grid-cols-3 md:items-end">
              <label className="block space-y-1 text-xs font-medium text-[#214031]">
                نوع موجودیت
                <select
                  value={archiveTargetType}
                  onChange={(e) => setArchiveTargetType(e.target.value as ArchiveTargetType)}
                  className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-xs text-[#214031]"
                >
                  <option value="RESEARCH_CASE">پرونده پژوهش</option>
                  <option value="APPLICANT">پرونده متقاضی</option>
                  <option value="CONVERSATION">گفت‌وگو</option>
                </select>
              </label>

              {archiveTargetType === "RESEARCH_CASE" && caseOptions.length > 0 ? (
                <label className="block space-y-1 text-xs font-medium text-[#214031]">
                  انتخاب پرونده پژوهشی
                  <select
                    value={archiveTargetId}
                    onChange={(e) => setArchiveTargetId(e.target.value)}
                    className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-xs text-[#214031]"
                  >
                    {caseOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} · {c.title}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <Input
                  label="شناسه UUID هدف"
                  dir="ltr"
                  required
                  value={archiveTargetId}
                  onChange={(e) => setArchiveTargetId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              )}

              <Button type="submit" variant="primary" loading={runningArchive} icon={<Archive className="h-4 w-4" />}>
                ثبت کار آرشیو
              </Button>
            </form>
          </Card>

          {archiveJobs.length === 0 ? (
            <EmptyState title="سابقه آرشیوی ثبت نشده است" description="هنوز عملیات انجمادی در سرور اجرا نشده است." />
          ) : (
            <Card variant="default" title={`تاریخچه اسنپ‌شات‌ها (${archiveJobs.length})`}>
              <div className="space-y-2.5">
                {archiveJobs.map((job) => (
                  <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/45 p-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={job.status === "COMPLETED" ? "success" : job.status === "FAILED" ? "danger" : "warning"} size="sm">
                          {job.status}
                        </Badge>
                        <span className="font-semibold text-[#214031]">{job.targetType}</span>
                        <span dir="ltr" className="font-mono text-[11px] text-[#4F6659]">{job.targetId}</span>
                      </div>
                      {job.storageLocation && (
                        <div dir="ltr" className="font-mono text-[11px] text-[#4F6659]">{job.storageLocation}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#4F6659]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(job.createdAt).toLocaleString("fa-IR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : activeTab === "managers" ? (
        <div className="space-y-4">
          <Card variant="default" padding="sm">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B8073]" />
              <input
                type="search"
                aria-label="جست‌وجوی مدیران"
                value={query.get("q") ?? ""}
                onChange={(e) => {
                  const next = new URLSearchParams(query);
                  e.target.value ? next.set("q", e.target.value) : next.delete("q");
                  navigate({ search: next.toString() }, { replace: true });
                }}
                placeholder="جست‌وجوی نام، شماره همراه یا نقش..."
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] py-2 pr-9 pl-3 text-sm text-[#214031]"
              />
            </div>
          </Card>

          {filteredManagers.length === 0 ? (
            <EmptyState title="مدیری یافت نشد" description="عبارت جست‌وجو را تغییر دهید یا مدیر جدید بسازید." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredManagers.map((m) => (
                <Card key={m.id} variant="default" className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#214031]">{m.fullName}</h3>
                      <div dir="ltr" className="mt-0.5 text-right font-mono text-xs text-[#4F6659]">{m.phoneNumber}</div>
                    </div>
                    <Badge variant="info" size="sm">{getRoleLabel(m.role as never)}</Badge>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#214E3A]/10 pt-2 text-[11px] text-[#4F6659]">
                    <span>وضعیت: <strong className={m.isActive ? "text-[#214E3A]" : "text-[#D94F3D]"}>{m.isActive ? "فعال" : "معلق"}</strong></span>
                    <span>سطح: {m.stage}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card variant="default" className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[#214E3A]" />
              <h3 className="text-sm font-bold text-[#214031]">وضعیت پایگاه‌داده و هسته API</h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>وضعیت سرویس:</span>
              <Badge variant={health?.status === "ok" ? "success" : "danger"} size="sm">
                {health?.status === "ok" ? "سالم و فعال" : "نیازمند بررسی"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>پایگاه‌داده PostgreSQL:</span>
              <Badge variant={health?.database === "connected" ? "success" : "danger"} size="sm">
                {health?.database === "connected" ? "متصل" : "قطع"}
              </Badge>
            </div>
          </Card>

          <Card variant="default" className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#214E3A]" />
              <h3 className="text-sm font-bold text-[#214031]">مشخصات اجرا</h3>
            </div>
            <dl className="space-y-1.5 text-xs text-[#4F6659]">
              <div className="flex justify-between">
                <dt>نسخه سرویس:</dt>
                <dd className="font-mono font-semibold text-[#214031]">{health?.version ?? "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>مدت کارکرد پیوسته (ثانیه):</dt>
                <dd className="font-mono font-semibold text-[#214031]">{health?.uptime ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt>آخرین بررسی:</dt>
                <dd className="font-semibold text-[#214031]">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleString("fa-IR") : "-"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      )}

      {isCreateOpen && (
        <Modal isOpen onClose={() => setIsCreateOpen(false)} title="تعریف مدیر سیستمی جدید" maxWidth="md">
          <form onSubmit={(e) => void handleCreateManager(e)} className="space-y-4 text-right">
            <Input label="نام و نام خانوادگی" required value={newMgrName} onChange={(e) => setNewMgrName(e.target.value)} />
            <Input label="شماره همراه" type="tel" dir="ltr" required value={newMgrPhone} onChange={(e) => setNewMgrPhone(e.target.value)} placeholder="09121234567" />
            <label className="block space-y-1 text-xs font-medium text-[#214031]">
              نقش سازمانی
              <select
                value={newMgrRole}
                onChange={(e) => setNewMgrRole(e.target.value)}
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-xs text-[#214031]"
              >
                <option value="SCIENTIFIC_SUPERVISOR">مدیر علمی</option>
                <option value="PROVINCIAL_DIRECTOR">مدیر استانی</option>
                <option value="SUPPORT_DIRECTOR">مدیر پشتیبانی</option>
                <option value="TRACKING_DIRECTOR">مدیر پیگیری</option>
                <option value="SYSTEM_ADMIN">مدیر سامانه</option>
              </select>
            </label>
            <Input label="گذرواژه اولیه (حداقل ۸ کاراکتر)" type="password" dir="ltr" required minLength={8} value={newMgrPassword} onChange={(e) => setNewMgrPassword(e.target.value)} />
            <div className="flex justify-end gap-2 border-t border-[#214E3A]/10 pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>انصراف</Button>
              <Button type="submit" variant="primary" loading={creatingMgr} icon={<UserPlus className="h-4 w-4" />}>
                ایجاد حساب
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
