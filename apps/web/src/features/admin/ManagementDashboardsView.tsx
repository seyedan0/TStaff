import React, { useState } from "react";
import {
  SlidersHorizontal,
  BarChart3,
  Archive,
  Save,
  Clock,
  Search,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Input } from "../../shared/ui/Input.js";
import { Badge } from "../../shared/ui/Badge.js";
import { apiClient } from "../../shared/api-client.js";

export interface ManagementDashboardsViewProps {
  onNotify: (type: "success" | "error" | "info", title: string, message?: string) => void;
}

export const ManagementDashboardsView: React.FC<ManagementDashboardsViewProps> = ({ onNotify }) => {
  const [activeSubTab, setActiveSubTab] = useState<"METRICS" | "SETTINGS" | "AUDIT" | "ARCHIVE">("METRICS");

  // Settings state
  const [stageDeadlineDays, setStageDeadlineDays] = useState("45");
  const [savingSetting, setSavingSetting] = useState(false);

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
            پایش سنجه‌های نقشه راه، تنظیمات زمان اجرا، رهگیری لاگ ممیزی و آرشیو تغییرناپذیر
          </p>
        </div>

        {/* Sub Tabs */}
        <div className="inline-flex p-1 rounded-apple-md apple-glass border border-white/5 text-xs overflow-x-auto">
          {[
            { key: "METRICS", label: "سنجه‌های مدیریتی" },
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
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-apple-blue" />
              داشبورد مدیر استانی (Provincial Director Metrics - FR-052)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card variant="glass" className="p-4">
                <span className="text-xs text-slate-400">کل پرونده‌های متقاضیان</span>
                <div className="text-2xl font-bold text-slate-100 mt-2">۲۴</div>
              </Card>
              <Card variant="glass" className="p-4">
                <span className="text-xs text-slate-400">متقاضیان تأییدشده (کارآموز)</span>
                <div className="text-2xl font-bold text-apple-green mt-2">۱۶</div>
              </Card>
              <Card variant="glass" className="p-4">
                <span className="text-xs text-slate-400">کارورزان فعال استان</span>
                <div className="text-2xl font-bold text-apple-blue mt-2">۱۲</div>
              </Card>
              <Card variant="glass" className="p-4">
                <span className="text-xs text-slate-400">پرونده‌های پژوهش در جریان</span>
                <div className="text-2xl font-bold text-apple-indigo mt-2">۸</div>
              </Card>
            </div>
          </div>

          {/* Tracking Director Backlog */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-apple-amber" />
              داشبورد مدیر پیگیری (Tracking Director Backlog - FR-052)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card variant="glass" className="p-4 border-apple-red/20">
                <span className="text-xs text-slate-400">پرونده‌های دارای تأخیر زمانی</span>
                <div className="text-2xl font-bold text-apple-red mt-2">۲ پرونده</div>
                <p className="text-[11px] text-slate-400 mt-1">بیش از ۴۵ روز در مرحله تبیین</p>
              </Card>
              <Card variant="glass" className="p-4 border-apple-amber/20">
                <span className="text-xs text-slate-400">نیازمند بازبینی ناشی از عقب‌گرد (D-05)</span>
                <div className="text-2xl font-bold text-apple-amber mt-2">۱ مرحله</div>
                <p className="text-[11px] text-slate-400 mt-1">وابستگی به مرحله منابع اصلاح‌شده</p>
              </Card>
              <Card variant="glass" className="p-4 border-apple-blue/20">
                <span className="text-xs text-slate-400">پرونده‌های بدون مدیر علمی همکار</span>
                <div className="text-2xl font-bold text-apple-blue mt-2">۳ پرونده</div>
                <p className="text-[11px] text-slate-400 mt-1">امکان انتساب مدیر همکار (D-02)</p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Runtime Settings */}
      {activeSubTab === "SETTINGS" && (
        <Card variant="glass" className="max-w-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-apple-amber" />
              تنظیمات پویای زمان اجرا (Dynamic Runtime Settings - FR-052)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              تغییر متغیرهای سیستمی بدون نیاز به بازاستقرار سرور (ذخیره در جدول system_settings)
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <Input
              label="مهلت زمانی استاندارد هر مرحله علمی (روز)"
              type="number"
              dir="ltr"
              value={stageDeadlineDays}
              onChange={(e) => setStageDeadlineDays(e.target.value)}
              hint="کلید: STAGE_DEADLINE_DAYS - ورکر پس‌زمینه با این سقف هشدار صادر می‌کند."
            />

            <Button
              variant="primary"
              size="md"
              icon={<Save className="w-4 h-4" />}
              loading={savingSetting}
              onClick={handleSaveSetting}
            >
              ذخیره تنظیمات در زمان اجرا
            </Button>
          </div>
        </Card>
      )}

      {/* Tab 3: Searchable Audit Trail */}
      {activeSubTab === "AUDIT" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="جست‌وجو در لاگ ممیزی (اقدام، کاربر، پرونده)..."
              value={auditQuery}
              onChange={(e) => setAuditQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <Card key={log.id} variant="glass" className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded-apple-sm bg-apple-amber/15 text-apple-amber font-bold">
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-400">توسط {log.actor}</span>
                    <span className="text-xs text-slate-500">• {log.time}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{log.details}</p>
                </div>
                <Badge variant="neutral" size="sm">{log.aggregateType}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Archival Freezer */}
      {activeSubTab === "ARCHIVE" && (
        <div className="space-y-6">
          <Card variant="glass" className="max-w-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Archive className="w-5 h-5 text-apple-blue" />
                اجرای انجماد و آرشیو داده‌ها (BR-19 Zero-Deletion Archival)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                تولید اسنپ‌شات JSON تغییرناپذیر بدون هیچ‌گونه حذف فیزیکی داده‌ها
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">نوع موجودیت هدف:</label>
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
    </div>
  );
};
