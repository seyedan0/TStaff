import React, { useState, useEffect } from "react";
import {
  FolderGit2,
  Plus,
  Users,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Modal } from "../../shared/ui/Modal.js";
import { Input } from "../../shared/ui/Input.js";
import { apiClient } from "../../shared/api-client.js";
import { CreateResearchCaseModal } from "./CreateResearchCaseModal.js";
import { ResourcesManager } from "../resources/ResourcesManager.js";
import type {
  ResearchCaseItem,
  StageInstanceItem,
  SupervisorItem,
} from "../../shared/types.js";
import type {
  StageType,
  StageStatus,
} from "@tstaff/contracts";

export interface ResearchCasesViewProps {
  onNotify: (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
}

export const ResearchCasesView: React.FC<ResearchCasesViewProps> = ({ onNotify }) => {
  const [cases, setCases] = useState<ResearchCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Drilldown to resources
  const [selectedCaseForResources, setSelectedCaseForResources] = useState<ResearchCaseItem | null>(null);

  // Modals for rollback & supervisor assignment
  const [rollbackCase, setRollbackCase] = useState<ResearchCaseItem | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<StageType>("SOURCES");
  const [rollbackReason, setRollbackReason] = useState("");

  const [assignCase, setAssignCase] = useState<ResearchCaseItem | null>(null);
  const [assignRole, setAssignRole] = useState<"MAIN_SUPERVISOR" | "COLLABORATOR_SUPERVISOR">("MAIN_SUPERVISOR");
  const [assignUserId, setAssignUserId] = useState("22222222-2222-2222-2222-222222222222");

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<ResearchCaseItem[]>("/research-cases");
      setCases(data);
    } catch {
      // Fallback demo cases showcasing 4 stages and cascading rollback states
      setCases([
        {
          id: "case-001",
          code: "CASE-101",
          title: "مطالعه تحلیلی زیست‌بوم شرکت‌های دانش‌بنیان",
          subject: "اقتصاد دانش‌بنیان و حکمرانی فناوری",
          status: "EXPLANATION_STAGE",
          version: 2,
          stages: [
            { id: "st-1", stageType: "SOURCES", status: "APPROVED", version: 2 },
            { id: "st-2", stageType: "EXPLANATION", status: "IN_PROGRESS", version: 1 },
            { id: "st-3", stageType: "PRESCRIPTION", status: "PENDING", version: 1 },
            { id: "st-4", stageType: "SCENARIO", status: "PENDING", version: 1 },
          ],
          supervisors: [
            { id: "as-1", userId: "22222222-2222-2222-2222-222222222222", role: "MAIN_SUPERVISOR", isActive: true },
            { id: "as-2", userId: "33333333-3333-3333-3333-333333333333", role: "COLLABORATOR_SUPERVISOR", isActive: true },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "case-002",
          code: "CASE-102",
          title: "واکاوی آسیب‌های فرهنگی رسانه‌های نوین",
          subject: "جامعه‌شناسی فضای مجازی",
          status: "SOURCES_STAGE",
          version: 1,
          stages: [
            { id: "st-5", stageType: "SOURCES", status: "IN_PROGRESS", version: 1 },
            { id: "st-6", stageType: "EXPLANATION", status: "PENDING", version: 1 },
            { id: "st-7", stageType: "PRESCRIPTION", status: "PENDING", version: 1 },
            { id: "st-8", stageType: "SCENARIO", status: "PENDING", version: 1 },
          ],
          supervisors: [
            { id: "as-3", userId: "22222222-2222-2222-2222-222222222222", role: "MAIN_SUPERVISOR", isActive: true },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleAdvanceStage = async (rCase: ResearchCaseItem) => {
    try {
      await apiClient.post(`/research-cases/${rCase.id}/advance-stage`, {
        expectedVersion: rCase.version,
      });
      onNotify("success", "پیشبرد مرحله انجام شد", "پرونده به مرحله علمی بعدی ارتقا یافت.");
      loadCases();
    } catch (err: any) {
      onNotify("error", "خطا در ارتقای مرحله", err.message);
    }
  };

  const handleRollbackStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollbackCase) return;

    try {
      await apiClient.post(`/research-cases/${rollbackCase.id}/rollback-stage`, {
        targetStage: rollbackTarget,
        reason: rollbackReason || "اصلاح و بازبینی داده‌های مراحل پیشین",
        expectedVersion: rollbackCase.version,
      });
      onNotify(
        "warning",
        "عقب‌گرد مرحله و ابطال وابستگی‌ها (D-05 / AT-33)",
        `پرونده به مرحله ${rollbackTarget} بازگشت؛ تمام مراحل وابسته خودکار به وضعیت REVIEW_REQUIRED رفتند.`,
      );
      setRollbackCase(null);
      setRollbackReason("");
      loadCases();
    } catch (err: any) {
      onNotify("error", "خطا در عقب‌گرد مرحله", err.message);
    }
  };

  const handleAssignSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCase) return;

    try {
      await apiClient.post(`/research-cases/${assignCase.id}/assignments/supervisors`, {
        userId: assignUserId,
        role: assignRole,
      });
      onNotify(
        "success",
        "انتساب مدیر علمی",
        `مدیر علمی با موفقیت به عنوان ${assignRole === "MAIN_SUPERVISOR" ? "مدیر اصلی" : "مدیر همکار"} انتساب یافت (D-02).`,
      );
      setAssignCase(null);
      loadCases();
    } catch (err: any) {
      onNotify("error", "تعارض انتساب (D-02)", err.message);
    }
  };

  const getStageStatusBadge = (status: StageStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success" size="sm" dot>تأییدشده</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="info" size="sm" dot>در حال انجام</Badge>;
      case "REVIEW_REQUIRED":
        return <Badge variant="warning" size="sm" dot>نیازمند بازبینی (D-05)</Badge>;
      default:
        return <Badge variant="neutral" size="sm">شروع‌نشده</Badge>;
    }
  };

  if (selectedCaseForResources) {
    return (
      <ResourcesManager
        caseId={selectedCaseForResources.id}
        caseTitle={selectedCaseForResources.title}
        onBack={() => setSelectedCaseForResources(null)}
        onNotify={onNotify}
      />
    );
  }

  const stageLabels: Record<StageType, string> = {
    SOURCES: "۱. منابع و مصاحبه‌ها",
    EXPLANATION: "۲. تبیین مسئله",
    PRESCRIPTION: "۳. تجویز راهکار",
    SCENARIO: "۴. سناریونویسی",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-apple-blue" />
            پرونده‌های پژوهش و چرخه علمی (AT-04 الی AT-08)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مدیریت ۴ مرحله پژوهش، داوری دوگانه علمی (D-02) و بازگشت مرحله با ابطال خودکار وابستگی‌ها (D-05)
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          ایجاد پرونده جدید
        </Button>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">در حال بارگذاری پرونده‌ها...</div>
      ) : cases.length === 0 ? (
        <Card variant="glass" className="text-center p-12">
          <p className="text-sm text-slate-400">پرونده پژوهشی فعالی یافت نشد.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <Card key={c.id} variant="glass" className="space-y-4">
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-apple-sm bg-apple-blue/15 text-apple-blue border border-apple-blue/30 font-bold">
                      {c.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-100">{c.title}</h3>
                    <span className="text-xs text-slate-400">نسخه: v{c.version}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">موضوع: {c.subject}</p>
                </div>

                {/* Supervisors Badges (D-02) */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-apple-indigo" /> مدیران علمی (D-02):
                  </span>
                  {c.supervisors?.filter((s: SupervisorItem) => s.isActive).map((s: SupervisorItem) => (
                    <Badge
                      key={s.id}
                      variant={s.role === "MAIN_SUPERVISOR" ? "info" : "indigo"}
                      size="sm"
                    >
                      {s.role === "MAIN_SUPERVISOR" ? "مدیر اصلی" : "مدیر همکار"}
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-apple-blue hover:text-white"
                    onClick={() => {
                      setAssignCase(c);
                    }}
                  >
                    + انتساب
                  </Button>
                </div>
              </div>

              {/* 4-Stage Timeline (Apple Connected Steps) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {c.stages.map((st: StageInstanceItem) => (
                  <div
                    key={st.id}
                    className={`p-3 rounded-apple-md border transition-all ${
                      st.status === "IN_PROGRESS"
                        ? "bg-apple-blue/10 border-apple-blue/40 shadow-sm"
                        : st.status === "REVIEW_REQUIRED"
                        ? "bg-apple-amber/10 border-apple-amber/40"
                        : st.status === "APPROVED"
                        ? "bg-white/[0.03] border-apple-green/30"
                        : "bg-white/[0.02] border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-200">
                        {stageLabels[st.stageType]}
                      </span>
                      {getStageStatusBadge(st.status)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      نسخه محتوا: v{st.version}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileSpreadsheet className="w-4 h-4 text-apple-blue" />}
                  onClick={() => setSelectedCaseForResources(c)}
                >
                  مدیریت منابع و مصاحبه‌ها (D-07)
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5 text-apple-amber" />}
                    onClick={() => {
                      setRollbackCase(c);
                      setRollbackTarget("SOURCES");
                    }}
                  >
                    بازگشت به مرحله قبل (D-05)
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => handleAdvanceStage(c)}
                  >
                    ارتقا به مرحله بعد
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      <CreateResearchCaseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadCases}
        onNotify={onNotify}
      />

      {/* Rollback Stage Modal (D-05) */}
      <Modal
        isOpen={!!rollbackCase}
        onClose={() => setRollbackCase(null)}
        title="عقب‌گرد مرحله پژوهش و ابطال وابستگی‌ها (D-05 / FR-061 / AT-33)"
        subtitle="با بازگشت به مرحله قبل، تمام خروجی‌های مراحلی که پیش‌نیاز آنها تغییر یافته خودکار به وضعیت REVIEW_REQUIRED می‌روند."
      >
        <form onSubmit={handleRollbackStage} className="space-y-4 text-right">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              مرحله مقصد برای عقب‌گرد:
            </label>
            <select
              value={rollbackTarget}
              onChange={(e) => setRollbackTarget(e.target.value as StageType)}
              className="w-full bg-slate-900 text-slate-100 text-sm rounded-apple-md border border-white/10 p-2.5 outline-none focus:border-apple-blue"
            >
              <option value="SOURCES">۱. مرحله منابع (SOURCES)</option>
              <option value="EXPLANATION">۲. مرحله تبیین (EXPLANATION)</option>
              <option value="PRESCRIPTION">۳. مرحله تجویز (PRESCRIPTION)</option>
            </select>
          </div>

          <div className="text-right">
            <label className="text-xs font-medium text-slate-300 block mb-1">
              علت علمی بازگشت مرحله (الزامی):
            </label>
            <textarea
              className="w-full bg-slate-900/60 text-slate-100 placeholder-slate-500 text-sm rounded-apple-md border border-white/10 p-3 outline-none focus:border-apple-blue"
              rows={3}
              placeholder="شرح دلایل داوری و اشکالات نیازمند اصلاح..."
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              required
            />
          </div>

          <div className="p-3 rounded-apple-md bg-apple-amber/10 border border-apple-amber/20 text-xs text-apple-amber flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              نکته D-05: نسخه‌های پیشین حفظ می‌شوند و هیچ داده‌ای پاک نمی‌شود، اما تا تأیید مجدد مرحله، خروجی‌های وابسته قابل انتشار نخواهند بود.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setRollbackCase(null)}>
              انصراف
            </Button>
            <Button type="submit" variant="danger">
              تأیید عقب‌گرد مرحله
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Supervisor Modal (D-02) */}
      <Modal
        isOpen={!!assignCase}
        onClose={() => setAssignCase(null)}
        title="انتساب مدیر علمی به پرونده پژوهشی (D-02 / FR-045)"
        subtitle="هر پرونده دقیقاً ۱ مدیر علمی اصلی فعال و حداکثر ۱ مدیر علمی همکار فعال دارد."
      >
        <form onSubmit={handleAssignSupervisor} className="space-y-4 text-right">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              نقش نظارتی (D-02):
            </label>
            <select
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value as any)}
              className="w-full bg-slate-900 text-slate-100 text-sm rounded-apple-md border border-white/10 p-2.5 outline-none focus:border-apple-blue"
            >
              <option value="MAIN_SUPERVISOR">مدیر علمی اصلی (MAIN)</option>
              <option value="COLLABORATOR_SUPERVISOR">مدیر علمی همکار (COLLABORATOR)</option>
            </select>
          </div>

          <Input
            label="شناسه کاربری مدیر علمی"
            dir="ltr"
            placeholder="uuid"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
            required
          />

          <div className="p-3 rounded-apple-md bg-white/[0.03] border border-white/5 text-[11px] text-slate-400">
            قاعده D-02: هر دو مدیر علمی اختیار داوری برابر دارند؛ ثبت همزمان تصمیم با خطای 409 STALE_REVISION مواجه می‌شود.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setAssignCase(null)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary">
              ثبت انتساب
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
