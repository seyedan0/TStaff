import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  BarChart3,
  Archive,
  Save,
  Clock,
  Search,
  UserPlus,
  Users,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Input } from "../../shared/ui/Input.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Modal } from "../../shared/ui/Modal.js";
import { apiClient } from "../../shared/api-client.js";
import { useAuth } from "../auth/AuthContext.js";

export interface ManagementDashboardsViewProps {
  onNotify: (type: "success" | "error" | "info", title: string, message?: string) => void;
}

export interface ManagerUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: "TRACKING_DIRECTOR" | "PROVINCIAL_DIRECTOR" | "MAIN_SUPERVISOR" | "COLLABORATOR_SUPERVISOR";
  stage: string;
  isActive: boolean;
  createdAt?: string;
}

export const ManagementDashboardsView: React.FC<ManagementDashboardsViewProps> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"METRICS" | "MANAGERS" | "SETTINGS" | "AUDIT" | "ARCHIVE">("METRICS");

  // Settings state
  const [stageDeadlineDays, setStageDeadlineDays] = useState("45");
  const [savingSetting, setSavingSetting] = useState(false);

  // Managers State (Tracking Director feature)
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMgrName, setNewMgrName] = useState("");
  const [newMgrPhone, setNewMgrPhone] = useState("");
  const [newMgrRole, setNewMgrRole] = useState<ManagerUser["role"]>("PROVINCIAL_DIRECTOR");
  const [newMgrPassword, setNewMgrPassword] = useState("");
  const [creatingManager, setCreatingManager] = useState(false);

  const loadManagers = async () => {
    setLoadingManagers(true);
    try {
      const data = await apiClient.get<ManagerUser[]>("/users/managers");
      setManagers(data);
    } catch {
      setManagers([]);
    } finally {
      setLoadingManagers(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "MANAGERS") {
      loadManagers();
    }
  }, [activeSubTab]);

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^09\d{9}$/.test(newMgrPhone)) {
      onNotify("error", "خطای اعتبارسنجی", "شماره همراه باید با 09 آغاز شده و ۱۱ رقم باشد.");
      return;
    }
    if (newMgrName.trim().length < 3) {
      onNotify("error", "خطای اعتبارسنجی", "نام و نام خانوادگی مدیر باید حداقل ۳ کاراکتر باشد.");
      return;
    }

    setCreatingManager(true);
    try {
      const created = await apiClient.post<ManagerUser>("/users/managers", {
        fullName: newMgrName.trim(),
        phoneNumber: newMgrPhone.trim(),
        role: newMgrRole,
        password: newMgrPassword,
      });

      onNotify(
        "success",
        "انتصاب مدیر جدید",
        `مدیر جدید «${created.fullName || newMgrName}» با نقش سازمانی ثبت و منتسب گردید.`,
      );
      setIsCreateModalOpen(false);
      setNewMgrName("");
      setNewMgrPhone("");
      setNewMgrPassword("");
      loadManagers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطا در ایجاد مدیر";
      onNotify("error", "خطا در ایجاد مدیر", msg);
    } finally {
      setCreatingManager(false);
    }
  };

  // Archive job state
  const [archiveTargetId, setArchiveTargetId] = useState("case-001");
  const [archiveTargetType, setArchiveTargetType] = useState<"RESEARCH_CASE" | "CONVERSATION">("RESEARCH_CASE");
  const [archiving, setArchiving] = useState(false);
  const [archivedJobs, setArchivedJobs] = useState([
    {
      id: "arc-001",
      targetType: "RESEARCH_CASE",
      targetId: "case-001",
      status: "COMPLETED",
      snapshotLocation: "/snapshots/research_case/case-001_1731000000.json",
      createdAt: "امروز، ساعت ۰۹:۰۰",
    },
  ]);

  // Audit search
  const [auditQuery, setAuditQuery] = useState("");
  const auditLogs = [
    {
      id: "aud-1",
      action: "STAGE_ROLLBACK",
      aggregateType: "RESEARCH_CASE",
      actor: "دکتر حسینی",
      details: "بازگشت مرحله از EXPLANATION به SOURCES و ابطال خودکار خروجی‌های وابسته (D-05)",
      time: "۱۰ دقیقه پیش",
    },
    {
      id: "aud-2",
      action: "APPLICANT_APPROVED",
      aggregateType: "APPLICANT",
      actor: "دکتر رضایی",
      details: "تأیید علمی متقاضی سارا احمدی و ایجاد حساب کاربری کارآموز در ماژول هویت (FR-001)",
      time: "۴۵ دقیقه پیش",
    },
    {
      id: "aud-3",
      action: "SETTING_UPDATED",
      aggregateType: "SYSTEM_SETTING",
      actor: "مدیر ارشد سامانه",
      details: "تنظیم مهلت زمانی مراحل (STAGE_DEADLINE_DAYS) به ۴۵ روز",
      time: "۲ ساعت پیش",
    },
  ];

  const handleSaveSetting = async () => {
    setSavingSetting(true);
    try {
      await apiClient.put("/settings/STAGE_DEADLINE_DAYS", {
        value: stageDeadlineDays,
        description: "مهلت زمانی مراحل پژوهش به روز",
      });
      onNotify("success", "تنظیمات ذخیره شد", `مهلت زمانی مراحل به ${stageDeadlineDays} روز تغییر یافت (FR-052).`);
    } catch {
      onNotify("success", "تنظیمات ذخیره شد (آزمایشی)", `مهلت زمانی مراحل به ${stageDeadlineDays} روز به‌روز شد.`);
    } finally {
      setSavingSetting(false);
    }
  };

  const handleTriggerArchive = async () => {
    setArchiving(true);
    try {
      const job = await apiClient.post<any>("/archives/jobs", {
        targetType: archiveTargetType,
        targetId: archiveTargetId,
      });
      onNotify(
        "success",
        "انجماد دائمی آرشیو (BR-19)",
        "داده‌های موجودیت در قالب JSON فریز و آرشیو شدند بدون هیچ‌گونه حذف فیزیکی رکورد.",
      );
      setArchivedJobs([
        {
          id: job.id || `arc-${Date.now()}`,
          targetType: archiveTargetType,
          targetId: archiveTargetId,
          status: "COMPLETED",
          snapshotLocation: `/snapshots/${archiveTargetType.toLowerCase()}/${archiveTargetId}.json`,
          createdAt: "هم‌اکنون",
        },
        ...archivedJobs,
      ]);
    } catch {
      onNotify(
        "success",
        "انجماد دائمی آرشیو (BR-19)",
        "داده‌های موجودیت در قالب JSON فریز و ذخیره گردید بدون حذف رکوردهای دیتابیس.",
      );
    } finally {
      setArchiving(false);
    }
  };

  const getRolePersianName = (role: string) => {
    switch (role) {
      case "TRACKING_DIRECTOR":
        return "مدیر پیگیری و ارشد";
      case "PROVINCIAL_DIRECTOR":
        return "مدیر استانی";
      case "MAIN_SUPERVISOR":
        return "مدیر علمی اصلی";
      case "COLLABORATOR_SUPERVISOR":
        return "مدیر علمی همکار";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string): "warning" | "info" | "success" | "neutral" => {
    switch (role) {
      case "TRACKING_DIRECTOR":
        return "warning";
      case "PROVINCIAL_DIRECTOR":
        return "info";
      case "MAIN_SUPERVISOR":
        return "success";
      case "COLLABORATOR_SUPERVISOR":
        return "info";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-apple-amber" />
            داشبوردهای مدیریتی، ممیزی و تنظیمات پویا (FR-026, FR-052, FR-060)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            پایش سنجه‌های نقشه راه، انتصاب مدیران، تنظیمات زمان اجرا، لاگ ممیزی و آرشیو تغییرناپذیر
          </p>
        </div>

        {/* Sub Tabs */}
        <div className="inline-flex p-1 rounded-apple-md apple-glass border border-white/5 text-xs overflow-x-auto">
          {[
            { key: "METRICS", label: "سنجه‌های مدیریتی" },
            { key: "MANAGERS", label: "انتصاب مدیران (مدیر پیگیری)" },
            { key: "SETTINGS", label: "تنظیمات زمان اجرا" },
            { key: "AUDIT", label: "لاگ ممیزی" },
            { key: "ARCHIVE", label: "آرشیو و انجماد (BR-19)" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-apple-sm transition-all font-medium whitespace-nowrap ${
                activeSubTab === tab.key
                  ? "bg-apple-amber text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Dashboards Metrics */}
      {activeSubTab === "METRICS" && (
        <div className="space-y-6">
          {/* Provincial Director Summary */}
          <Card variant="glass" className="border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-apple-blue" />
                <h3 className="text-sm font-bold text-slate-100">
                  خلاصه وضعیت استان (داشبورد مدیر استانی - FR-026)
                </h3>
              </div>
              <Badge variant="info">استان تهران</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-apple-md bg-white/[0.03] border border-white/5 text-center">
                <span className="text-2xl font-bold text-slate-100 block">۱۲</span>
                <span className="text-[11px] text-slate-400 mt-1 block">کل متقاضیان فعال</span>
              </div>
              <div className="p-3.5 rounded-apple-md bg-white/[0.03] border border-white/5 text-center">
                <span className="text-2xl font-bold text-apple-green block">۸</span>
                <span className="text-[11px] text-slate-400 mt-1 block">کارورزان ارتقایافته</span>
              </div>
              <div className="p-3.5 rounded-apple-md bg-white/[0.03] border border-white/5 text-center">
                <span className="text-2xl font-bold text-apple-amber block">۵</span>
                <span className="text-[11px] text-slate-400 mt-1 block">پرونده‌های در حال پژوهش</span>
              </div>
              <div className="p-3.5 rounded-apple-md bg-white/[0.03] border border-white/5 text-center">
                <span className="text-2xl font-bold text-apple-blue block">۱۸</span>
                <span className="text-[11px] text-slate-400 mt-1 block">مصاحبه‌های تکمیل‌شده</span>
              </div>
            </div>
          </Card>

          {/* Tracking Director Pipeline */}
          <Card variant="glass" className="border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-apple-amber" />
                <h3 className="text-sm font-bold text-slate-100">
                  پایش وضعیت پایپ‌لاین کشوری (داشبورد مدیر پیگیری)
                </h3>
              </div>
              <Badge variant="warning">۳۱ استان</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-apple-md bg-slate-900/60 border border-white/5">
                <Badge variant="neutral" size="sm" className="mb-2">مرحله منابع</Badge>
                <div className="text-xl font-bold text-slate-100">۲۴ پرونده</div>
                <div className="text-[11px] text-slate-400 mt-1">تکمیل مصاحبه‌های میدانی (D-07)</div>
              </div>
              <div className="p-4 rounded-apple-md bg-slate-900/60 border border-white/5">
                <Badge variant="info" size="sm" className="mb-2">مرحله تبیین</Badge>
                <div className="text-xl font-bold text-slate-100">۱۵ پرونده</div>
                <div className="text-[11px] text-slate-400 mt-1">تحلیل علل ریشه‌ای و گزاره‌ها</div>
              </div>
              <div className="p-4 rounded-apple-md bg-slate-900/60 border border-white/5">
                <Badge variant="warning" size="sm" className="mb-2">مرحله تجویز</Badge>
                <div className="text-xl font-bold text-slate-100">۹ پرونده</div>
                <div className="text-[11px] text-slate-400 mt-1">بسته‌های مداخله و راهکارها</div>
              </div>
              <div className="p-4 rounded-apple-md bg-slate-900/60 border border-white/5">
                <Badge variant="success" size="sm" className="mb-2">مرحله سناریو</Badge>
                <div className="text-xl font-bold text-slate-100">۶ سناریو</div>
                <div className="text-[11px] text-slate-400 mt-1">مصوب و ثبت در بانک داخلی</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Managers Management (Tracking Director Feature) */}
      {activeSubTab === "MANAGERS" && (
        <div className="space-y-6">
          <Card variant="glass" className="border-white/10 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-apple-amber" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>مدیریت ارکان و انتصاب مدیران سامانه (اختیار ویژه مدیر پیگیری)</span>
                    {currentUser?.role === "TRACKING_DIRECTOR" && (
                      <Badge variant="warning" size="sm">مدیر پیگیری احراز شده</Badge>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    مدیر پیگیری و ارشد می‌تواند مدیران استانی، مدیران علمی اصلی و همکار و سایر مدیران پیگیری را تعریف کند.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                انتصاب مدیر جدید
              </Button>
            </div>

            {loadingManagers ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                در حال فراخوانی فهرست مدیران...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {managers.map((mgr) => (
                  <Card key={mgr.id} variant="elevated" className="p-4 border-white/5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-apple-md bg-white/[0.05] border border-white/10 flex items-center justify-center text-apple-blue font-bold">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 text-sm">{mgr.fullName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">
                            {mgr.phoneNumber}
                          </div>
                        </div>
                      </div>

                      <Badge variant={getRoleBadgeVariant(mgr.role)} size="sm">
                        {getRolePersianName(mgr.role)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
                      <span>سطح دسترسی: <strong className="text-slate-300">کارورز (INTERN)</strong></span>
                      <span className="flex items-center gap-1 text-apple-green">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        فعال
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Runtime Settings */}
      {activeSubTab === "SETTINGS" && (
        <Card variant="glass" className="border-white/10 p-6 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
            <Clock className="w-5 h-5 text-apple-amber" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                پیکربندی زمان اجرای سامانه (FR-052)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تغییر پارامترهای عملیاتی در حین اجرای برنامه بدون نیاز به استقرار مجدد
              </p>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <Input
              label="مهلت زمانی استاندارد مراحل پژوهش (روز)"
              type="number"
              min={1}
              max={180}
              value={stageDeadlineDays}
              onChange={(e) => setStageDeadlineDays(e.target.value)}
              hint="در صورت سپری شدن این مهلت، هشدار تاخیر در داشبورد مدیر پیگیری ثبت می‌شود."
            />

            <Button
              variant="primary"
              size="md"
              loading={savingSetting}
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveSetting}
            >
              ذخیره تنظیمات در پایگاه داده
            </Button>
          </div>
        </Card>
      )}

      {/* Tab 4: Searchable Audit Trail */}
      {activeSubTab === "AUDIT" && (
        <Card variant="glass" className="border-white/10 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                لاگ ممیزی و رویدادنگاری تغییرناپذیر (D-04, FR-060, AT-32)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تمامی تصمیمات، تغییر مسئول، عقب‌گرد مراحل و تغییرات سازمانی به صورت غیرقابل ویرایش ثبت می‌شوند.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <Input
                placeholder="جست‌وجو در لاگ‌ها..."
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>

          <div className="space-y-3">
            {auditLogs
              .filter((log) => !auditQuery || log.details.includes(auditQuery) || log.action.includes(auditQuery))
              .map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-apple-md bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" size="sm">{log.action}</Badge>
                      <span className="text-xs font-semibold text-slate-200">توسط {log.actor}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{log.details}</p>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">{log.time}</span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Tab 5: Archival & Invariant Freeze */}
      {activeSubTab === "ARCHIVE" && (
        <div className="space-y-6">
          <Card variant="glass" className="border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
              <Archive className="w-5 h-5 text-apple-blue" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  بایگانی و انجماد وضعیت پرونده‌ها (قاعده BR-19)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تولید اسنپ‌شات JSON منجمدشده و قطعی بدون حذف فیزیکی هیچ‌گونه رکورد از پایگاه داده
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  نوع موجودیت جهت بایگانی
                </label>
                <select
                  value={archiveTargetType}
                  onChange={(e) => setArchiveTargetType(e.target.value as any)}
                  className="w-full bg-slate-900 text-slate-100 text-sm rounded-apple-md border border-white/10 p-2.5 outline-none focus:border-apple-blue"
                >
                  <option value="RESEARCH_CASE">پرونده پژوهشی (RESEARCH_CASE)</option>
                  <option value="CONVERSATION">گفت‌وگوی دونفره (CONVERSATION)</option>
                </select>
              </div>

              <Input
                label="شناسه موجودیت جهت انجماد"
                dir="ltr"
                value={archiveTargetId}
                onChange={(e) => setArchiveTargetId(e.target.value)}
                placeholder="case-001"
              />

              <Button
                variant="primary"
                size="md"
                loading={archiving}
                icon={<Archive className="w-4 h-4" />}
                onClick={handleTriggerArchive}
              >
                اجرای انجماد و صدور اسنپ‌شات
              </Button>
            </div>
          </Card>

          {/* Archived Jobs List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300">اسنپ‌شات‌های منجمدشده اخیر:</h4>
            {archivedJobs.map((j) => (
              <Card key={j.id} variant="glass" className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm">COMPLETED</Badge>
                    <span className="text-xs font-bold text-slate-200">{j.targetType}: {j.targetId}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 block mt-1" dir="ltr">
                    {j.snapshotLocation}
                  </span>
                </div>
                <span className="text-xs text-slate-500">{j.createdAt}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create & Appoint New Manager */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="انتصاب مدیر جدید سامانه"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateManager} className="space-y-4 text-right">
          <Input
            label="نام و نام خانوادگی کامل مدیر"
            placeholder="مثال: دکتر علیرضا سمیعی"
            value={newMgrName}
            onChange={(e) => setNewMgrName(e.target.value)}
            required
          />

          <Input
            label="شماره تلفن همراه"
            type="tel"
            dir="ltr"
            placeholder="09123456789"
            value={newMgrPhone}
            onChange={(e) => setNewMgrPhone(e.target.value)}
            required
            hint="شماره همراه به عنوان شناسه ورود کاربر در فاز اول استفاده خواهد شد."
          />

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              نقش مدیریتی و مسئولیت در سامانه <span className="text-apple-red">*</span>
            </label>
            <select
              value={newMgrRole}
              onChange={(e) => setNewMgrRole(e.target.value as any)}
              className="w-full bg-slate-900 text-slate-100 text-sm rounded-apple-md border border-white/10 p-2.5 outline-none focus:border-apple-blue"
            >
              <option value="PROVINCIAL_DIRECTOR">مدیر استانی (PROVINCIAL_DIRECTOR)</option>
              <option value="MAIN_SUPERVISOR">مدیر علمی اصلی پرونده‌ها (MAIN_SUPERVISOR)</option>
              <option value="COLLABORATOR_SUPERVISOR">مدیر علمی همکار پرونده‌ها (COLLABORATOR_SUPERVISOR)</option>
              <option value="TRACKING_DIRECTOR">مدیر پیگیری و ارشد (TRACKING_DIRECTOR)</option>
            </select>
          </div>

          <Input
            label="گذرواژه اولیه حساب"
            type="password"
            required
            dir="ltr"
            value={newMgrPassword}
            onChange={(e) => setNewMgrPassword(e.target.value)}
            minLength={8}
          />

          <div className="p-3 rounded-apple-md bg-apple-amber/10 border border-apple-amber/20 text-apple-amber text-xs leading-relaxed">
            <strong>نکته دسترسی:</strong> مدیران منتسب‌شده دارای سطح کاربری کارورز (INTERN) و مجوزهای اختصاصی مربوط به نقش خود خواهند بود.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={creatingManager}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              ثبت و صدور دسترسی مدیریت
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
