import React, { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type {
  AuditEventDto,
  GeneralDirectorSummary,
  SupervisorHealth,
  TrackingDirectorBacklog,
  WorkflowMetrics,
} from "@tstaff/contracts";
import { IRAN_PROVINCES, provinceNameFromId } from "@tstaff/contracts";
import { getRoleLabel } from "../../app/navigation.js";
import { usePortalSection } from "../../app/usePortalSection.js";
import { useAuth } from "../../features/auth/AuthContext.js";
import { apiClient } from "../../shared/api-client.js";
import { supervisorIssueLabel } from "../../shared/supervisor-health.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { Modal } from "../../shared/ui/Modal.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../shared/ui/StateFeedback.js";
import { MetricStrip } from "../../shared/ui/MetricStrip.js";
import { TrackingAssignmentsTab } from "./TrackingAssignmentsTab.js";
import { ApplicantAllocationQueue } from "../../features/applicants/ApplicantAllocationQueue.js";

interface TrackingDirectorPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

interface ManagerRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  stage: string;
  isActive: boolean;
  createdAt?: string;
}

interface ProvincialScopeRow {
  managerId: string;
  provinceId: string;
  assignedAt: string;
  revokedAt?: string | null;
}

const STAGE_FA: Record<string, string> = {
  SOURCES: "منابع و مصاحبه‌ها",
  EXPLANATION: "تبیین مسئله",
  PRESCRIPTION: "تجویز راهکار",
  SCENARIO: "سناریو",
};

export const TrackingDirectorPortal: React.FC<TrackingDirectorPortalProps> = ({
  onNotify,
}) => {
  const { currentUser } = useAuth();
  const activeTab = usePortalSection<
    "pipeline" | "managers" | "assignments" | "audit"
  >(
    {
      "/tracking/pipeline": "pipeline",
      "/tracking/managers": "managers",
      "/tracking/assignments": "assignments",
      "/tracking/audit": "audit",
    },
    "pipeline",
  );
  const [query] = useSearchParams();
  const navigate = useNavigate();

  const [managers, setManagers] = useState<ManagerRecord[]>([]);
  const [scopes, setScopes] = useState<ProvincialScopeRow[]>([]);
  const [summary, setSummary] = useState<GeneralDirectorSummary | null>(null);
  const [backlog, setBacklog] = useState<TrackingDirectorBacklog | null>(null);
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [supervisorHealth, setSupervisorHealth] =
    useState<SupervisorHealth | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMgrName, setNewMgrName] = useState("");
  const [newMgrPhone, setNewMgrPhone] = useState("");
  const [newMgrRole, setNewMgrRole] = useState("SCIENTIFIC_SUPERVISOR");
  const [newMgrProvinceId, setNewMgrProvinceId] = useState("");
  const [newMgrPassword, setNewMgrPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const [scopePickByManager, setScopePickByManager] = useState<
    Record<string, string>
  >({});
  const [suspendTarget, setSuspendTarget] = useState<ManagerRecord | null>(
    null,
  );
  const [suspendReason, setSuspendReason] = useState("");

  const searchTerm = query.get("q") ?? "";

  const loadTabData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "pipeline") {
        const [sumRes, backRes, wfRes, supervisorHealthRes] = await Promise.all(
          [
            apiClient.get<GeneralDirectorSummary>(
              "/reporting/general-director-summary",
            ),
            apiClient.get<TrackingDirectorBacklog>(
              "/reporting/tracking-director-backlog",
            ),
            apiClient.get<WorkflowMetrics>("/reporting/workflow-metrics"),
            apiClient.get<SupervisorHealth>("/reporting/supervisor-health"),
          ],
        );
        setSummary(sumRes);
        setBacklog(backRes);
        setMetrics(wfRes);
        setSupervisorHealth(supervisorHealthRes);
      } else if (activeTab === "managers") {
        const [mgrRes, scopeRes] = await Promise.all([
          apiClient.get<ManagerRecord[]>("/users/managers"),
          apiClient.get<ProvincialScopeRow[]>("/organization/scopes"),
        ]);
        setManagers(mgrRes);
        setScopes(scopeRes.filter((s) => !s.revokedAt));
      } else if (activeTab === "assignments") {
        setManagers(await apiClient.get<ManagerRecord[]>("/users/managers"));
      } else if (activeTab === "audit") {
        const qs = new URLSearchParams({ limit: "50" });
        if (searchTerm.trim()) qs.set("q", searchTerm.trim());
        setAuditEvents(
          await apiClient.get<AuditEventDto[]>(
            `/audit-events?${qs.toString()}`,
          ),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "دریافت اطلاعات شبکه ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  useEffect(() => {
    void loadTabData();
  }, [loadTabData]);

  const setSearchQuery = (value: string) => {
    const next = new URLSearchParams(query);
    value ? next.set("q", value) : next.delete("q");
    navigate({ search: next.toString() }, { replace: true });
  };

  const handleCreateManager = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^09\d{9}$/.test(newMgrPhone.trim())) {
      onNotify(
        "error",
        "خطا در شماره همراه",
        "شماره همراه باید ۱۱ رقم بوده و با 09 آغاز شود.",
      );
      return;
    }
    setBusy(true);
    try {
      const created = await apiClient.post<{ id: string }>("/users/managers", {
        fullName: newMgrName.trim(),
        phoneNumber: newMgrPhone.trim(),
        role: newMgrRole,
        password: newMgrPassword,
      });
      if (newMgrRole === "PROVINCIAL_DIRECTOR" && newMgrProvinceId) {
        await apiClient.post("/organization/provincial-scopes", {
          managerId: created.id,
          provinceId: newMgrProvinceId,
        });
      }
      onNotify(
        "success",
        "مدیر جدید ایجاد شد",
        `حساب «${newMgrName}» فعال گردید.`,
      );
      setIsCreateModalOpen(false);
      setNewMgrName("");
      setNewMgrPhone("");
      setNewMgrPassword("");
      setNewMgrProvinceId("");
      await loadTabData();
    } catch (err) {
      onNotify(
        "error",
        "ایجاد مدیر انجام نشد",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAssignProvinceScope = async (managerId: string) => {
    const provinceId = scopePickByManager[managerId];
    if (!provinceId) return;
    setBusy(true);
    try {
      await apiClient.post("/organization/provincial-scopes", {
        managerId,
        provinceId,
      });
      setScopePickByManager((prev) => ({ ...prev, [managerId]: "" }));
      onNotify("success", "قلمرو استان ثبت شد");
      await loadTabData();
    } catch (err) {
      onNotify(
        "error",
        "ثبت قلمرو استان انجام نشد",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeProvinceScope = async (
    managerId: string,
    provinceId: string,
  ) => {
    setBusy(true);
    try {
      await apiClient.delete(
        `/organization/provincial-scopes/${encodeURIComponent(managerId)}/${encodeURIComponent(provinceId)}`,
      );
      onNotify("info", "قلمرو استان لغو شد");
      await loadTabData();
    } catch (err) {
      onNotify(
        "error",
        "لغو قلمرو انجام نشد",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleToggleManagerActive = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!suspendTarget || suspendReason.trim().length < 5) return;
    setBusy(true);
    try {
      if (suspendTarget.isActive) {
        await apiClient.post(
          `/users/${encodeURIComponent(suspendTarget.id)}/suspend`,
          { reason: suspendReason.trim() },
        );
        onNotify("warning", "حساب مدیر تعلیق شد");
      } else {
        await apiClient.post(
          `/users/${encodeURIComponent(suspendTarget.id)}/reactivate`,
          { reason: suspendReason.trim() },
        );
        onNotify("success", "حساب مدیر فعال شد");
      }
      setSuspendTarget(null);
      setSuspendReason("");
      await loadTabData();
    } catch (err) {
      onNotify(
        "error",
        "تغییر وضعیت حساب انجام نشد",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const filteredManagers = managers.filter((m) => {
    const q = searchTerm.trim().toLowerCase();
    return (
      !q ||
      `${m.fullName} ${m.phoneNumber} ${getRoleLabel(m.role as never)}`
        .toLowerCase()
        .includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <PageHeader
        roleLabel="مدیر پیگیری"
        title={`پایش و راهبری شبکه · ${currentUser?.fullName || "مدیر پیگیری"}`}
        subtitle="رصد زنده چرخه پژوهش، مدیریت قلمرو استان‌ها، انتساب مدیران علمی و تاریخچه نظارت (D-04)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "pipeline" && (
              <a className="atlas-cta" href="#allocation-queue">
                صف تخصیص
              </a>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              loading={loading}
              onClick={() => void loadTabData()}
            >
              به‌روزرسانی
            </Button>
            {activeTab === "managers" && (
              <Button
                variant="primary"
                size="sm"
                icon={<UserPlus className="h-3.5 w-3.5" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                تعریف مدیر جدید
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <LoadingState message="در حال دریافت داده‌های شبکه..." />
      ) : error ? (
        <>
          {activeTab === "pipeline" && (
            <div id="allocation-queue">
              <ApplicantAllocationQueue onNotify={onNotify} />
            </div>
          )}
          <ErrorState message={error} onRetry={() => void loadTabData()} />
        </>
      ) : activeTab === "pipeline" &&
        summary &&
        backlog &&
        metrics &&
        supervisorHealth ? (
        <div className="space-y-5">
          <div className="atlas-grid" id="allocation-queue">
            <ApplicantAllocationQueue onNotify={onNotify} />
            <MetricStrip
              label="شاخص‌های زنده شبکه"
              items={[
                {
                  label: "پرونده‌های پژوهش",
                  value: summary.totalResearchCases,
                  detail: "همه وضعیت‌ها",
                },
                {
                  label: "کاربران",
                  value: summary.totalUsers,
                  detail: `${summary.totalApplicants} پرونده پذیرش`,
                },
                {
                  label: "مدیران علمی فعال",
                  value: summary.activeSupervisorsCount,
                  detail: "با انتساب فعال",
                },
                {
                  label: "سناریوهای مصوب",
                  value: summary.completedScenariosCount,
                  detail: "در بانک داخلی",
                  tone: "success",
                },
                {
                  label: "نیازمند بازبینی",
                  value: backlog.reviewRequiredCasesCount,
                  detail: "پیش‌نیاز تغییر کرده",
                  tone: backlog.reviewRequiredCasesCount
                    ? "warning"
                    : "success",
                },
                {
                  label: "پرونده‌های معطل",
                  value: backlog.delayedCasesCount,
                  detail: "بیش از ۳۰ روز",
                  tone: backlog.delayedCasesCount ? "warning" : "success",
                },
              ]}
            />
          </div>

          <section
            aria-label="سلامت انتساب مدیران علمی"
            className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--ink)]">
                سلامت انتساب مدیران علمی
              </h2>
              <span className="text-xs text-[var(--muted)]">
                بازبینی ناسازگاری‌های قدیمی (D-09)
              </span>
            </div>
            <MetricStrip
              label="تعداد هشدارهای انتساب"
              items={[
                {
                  label: "مدیر غیرفعال یا بدون نقش",
                  value: supervisorHealth.inactiveSupervisorAssignmentsCount,
                  tone: supervisorHealth.inactiveSupervisorAssignmentsCount
                    ? "warning"
                    : "success",
                },
                {
                  label: "انتساب لغوشده",
                  value: supervisorHealth.revokedSupervisorAssignmentsCount,
                  tone: supervisorHealth.revokedSupervisorAssignmentsCount
                    ? "warning"
                    : "success",
                },
                {
                  label: "همکار قدیمی",
                  value: supervisorHealth.legacyCollaboratorAssignmentsCount,
                  tone: supervisorHealth.legacyCollaboratorAssignmentsCount
                    ? "warning"
                    : "success",
                },
                {
                  label: "پرونده ناسازگار",
                  value: supervisorHealth.caseSupervisorMismatchCount,
                  tone: supervisorHealth.caseSupervisorMismatchCount
                    ? "warning"
                    : "success",
                },
              ]}
            />
            {supervisorHealth.issues.length > 0 && (
              <div className="divide-y divide-[var(--line)] text-xs">
                {supervisorHealth.issues.slice(0, 8).map((issue, index) => (
                  <div
                    key={`${issue.type}-${issue.entityId}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span>{supervisorIssueLabel(issue.type)}</span>
                    {issue.type.startsWith("CASE_") ||
                    issue.type === "LEGACY_COLLABORATOR_ASSIGNMENT" ? (
                      <Link
                        className="font-mono text-[var(--forest)] underline"
                        to={`/projects/${encodeURIComponent(issue.entityId)}`}
                      >
                        {issue.caseCode ?? issue.entityId}
                      </Link>
                    ) : (
                      <Link
                        className="font-mono text-[var(--forest)] underline"
                        to={`/tracking/assignments?userId=${encodeURIComponent(issue.entityId)}`}
                      >
                        {issue.entityId}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              variant="default"
              title={
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#087674]" />
                  توزیع مراحل فعال
                </span>
              }
            >
              <div className="space-y-2.5 text-xs">
                {Object.entries(summary.casesByStage).map(
                  ([stageKey, count]) => (
                    <div
                      key={stageKey}
                      className="flex items-center justify-between rounded-xl border border-[#087674]/15 bg-[#EAF3FA]/45 px-3 py-2.5"
                    >
                      <span className="font-semibold text-[#162F48]">
                        {STAGE_FA[stageKey] ?? stageKey}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#496479]">
                          بازگشت مرحله:{" "}
                          {metrics.rollbackFrequencyByStage[stageKey] ?? 0}
                        </span>
                        <Badge variant="info" size="sm">
                          {count} پرونده
                        </Badge>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Card>

            <Card variant="default" title="صف پرونده‌های نیازمند پیگیری">
              {backlog.backlogItems.length === 0 ? (
                <p className="text-xs text-[#496479]">
                  در حال حاضر گلوگاه بازبینی در شبکه وجود ندارد.
                </p>
              ) : (
                <div className="space-y-2">
                  {backlog.backlogItems.map((item) => (
                    <Link
                      key={`${item.caseId}-${item.currentStage}`}
                      to={`/projects/${encodeURIComponent(item.caseId)}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#B43A31]/25 bg-[#B43A31]/5 p-3 text-xs hover:border-[#B43A31]/60"
                    >
                      <div>
                        <div className="font-bold text-[#162F48]">
                          {item.caseCode} · {item.subject}
                        </div>
                        <div className="text-[#496479]">
                          مرحله:{" "}
                          {STAGE_FA[item.currentStage] ?? item.currentStage}
                        </div>
                      </div>
                      <Badge variant="danger" size="sm">
                        {item.daysInCurrentStage} روز
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : activeTab === "managers" ? (
        <div className="space-y-4">
          <Card variant="default" padding="sm">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#536E84]" />
              <input
                type="search"
                aria-label="جست‌وجوی مدیران"
                value={searchTerm}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جست‌وجوی نام، شماره همراه یا نقش..."
                className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] py-2 pr-9 pl-3 text-sm text-[#162F48]"
              />
            </div>
          </Card>

          {filteredManagers.length === 0 ? (
            <EmptyState
              title="مدیری یافت نشد"
              description="عبارت جست‌وجو را تغییر دهید یا مدیر جدید بسازید."
              icon={<Users className="h-6 w-6" />}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredManagers.map((m) => {
                const mgrScopes = scopes.filter((s) => s.managerId === m.id);
                return (
                  <Card key={m.id} variant="default" className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#162F48]">
                          {m.fullName}
                        </h3>
                        <div
                          dir="ltr"
                          className="mt-0.5 text-right font-mono text-xs text-[#496479]"
                        >
                          {m.phoneNumber}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={m.isActive ? "success" : "danger"}
                          size="sm"
                        >
                          {m.isActive ? "فعال" : "معلق"}
                        </Badge>
                        <Badge variant="info" size="sm">
                          {getRoleLabel(m.role as never)}
                        </Badge>
                      </div>
                    </div>

                    {m.role === "PROVINCIAL_DIRECTOR" && (
                      <div className="space-y-2 border-t border-[#087674]/10 pt-2.5 text-xs">
                        <div className="font-semibold text-[#162F48]">
                          قلمرو استان‌ها:
                        </div>
                        {mgrScopes.length === 0 ? (
                          <p className="text-[#496479]">
                            استانی منتسب نشده است.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {mgrScopes.map((s) => (
                              <span
                                key={s.provinceId}
                                className="inline-flex items-center gap-1 rounded-full border border-[#087674]/20 bg-[#EAF3FA] px-2.5 py-1 text-[11px] font-medium text-[#162F48]"
                              >
                                {provinceNameFromId(s.provinceId) ??
                                  s.provinceId}
                                <button
                                  type="button"
                                  aria-label={`لغو قلمرو ${provinceNameFromId(s.provinceId) ?? ""}`}
                                  onClick={() =>
                                    void handleRevokeProvinceScope(
                                      m.id,
                                      s.provinceId,
                                    )
                                  }
                                  className="text-[#B43A31] hover:opacity-75"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <select
                            aria-label={`افزودن استان برای ${m.fullName}`}
                            value={scopePickByManager[m.id] ?? ""}
                            onChange={(e) =>
                              setScopePickByManager((prev) => ({
                                ...prev,
                                [m.id]: e.target.value,
                              }))
                            }
                            className="flex-1 rounded-xl border border-[#087674]/20 bg-[#FFFFFF] px-2.5 py-1.5 text-xs text-[#162F48]"
                          >
                            <option value="">انتخاب استان...</option>
                            {IRAN_PROVINCES.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={busy}
                            disabled={!scopePickByManager[m.id]}
                            onClick={() => void handleAssignProvinceScope(m.id)}
                          >
                            افزودن قلمرو
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end border-t border-[#087674]/10 pt-2">
                      <Button
                        variant={m.isActive ? "danger" : "primary"}
                        size="sm"
                        onClick={() => {
                          setSuspendTarget(m);
                          setSuspendReason("");
                        }}
                      >
                        {m.isActive ? "تعلیق مدیر" : "فعال‌سازی مجدد"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "assignments" ? (
        <TrackingAssignmentsTab managers={managers} onNotify={onNotify} />
      ) : (
        <div className="space-y-4">
          <Card variant="default" padding="sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-56">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#536E84]" />
                <input
                  type="search"
                  aria-label="جست‌وجو در تاریخچه نظارت"
                  value={searchTerm}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جست‌وجو بر اساس نوع رخداد یا شناسه..."
                  className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] py-2 pr-9 pl-3 text-sm text-[#162F48]"
                />
              </div>
              <Badge variant="info" size="sm">
                D-04 · ممیزی تغییرناپذیر
              </Badge>
            </div>
          </Card>

          {auditEvents.length === 0 ? (
            <EmptyState
              title="رخداد ممیزی یافت نشد"
              description="هنوز رخدادی مطابق فیلتر ثبت نشده است."
              icon={<ShieldCheck className="h-6 w-6" />}
            />
          ) : (
            <Card variant="default" padding="none">
              <ul className="divide-y divide-[#087674]/10 text-xs">
                {auditEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-col gap-1.5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="neutral" size="sm">
                          {ev.action}
                        </Badge>
                        <span className="font-semibold text-[#162F48]">
                          {ev.aggregateType}
                        </span>
                        <span
                          dir="ltr"
                          className="font-mono text-[11px] text-[#496479]"
                        >
                          {ev.aggregateId}
                        </span>
                      </div>
                      {ev.payload != null && (
                        <div
                          dir="ltr"
                          className="max-w-2xl truncate font-mono text-[11px] text-[#496479]"
                        >
                          {JSON.stringify(ev.payload)}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[11px] text-[#496479]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(ev.createdAt).toLocaleString("fa-IR")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {isCreateModalOpen && (
        <Modal
          isOpen
          onClose={() => setIsCreateModalOpen(false)}
          title="تعریف مدیر جدید در شبکه"
          maxWidth="md"
        >
          <form
            onSubmit={(e) => void handleCreateManager(e)}
            className="space-y-4 text-right"
          >
            <Input
              label="نام و نام خانوادگی"
              required
              value={newMgrName}
              onChange={(e) => setNewMgrName(e.target.value)}
            />
            <Input
              label="شماره همراه"
              type="tel"
              dir="ltr"
              required
              value={newMgrPhone}
              onChange={(e) => setNewMgrPhone(e.target.value)}
              placeholder="09123456789"
            />
            <label className="block space-y-1 text-xs font-medium text-[#162F48]">
              نقش سازمانی
              <select
                value={newMgrRole}
                onChange={(e) => setNewMgrRole(e.target.value)}
                className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] p-2.5 text-xs text-[#162F48]"
              >
                <option value="SCIENTIFIC_SUPERVISOR">مدیر علمی</option>
                <option value="PROVINCIAL_DIRECTOR">مدیر استانی</option>
                <option value="SUPPORT_DIRECTOR">مدیر پشتیبانی</option>
                <option value="TRACKING_DIRECTOR">مدیر پیگیری</option>
              </select>
            </label>
            {newMgrRole === "PROVINCIAL_DIRECTOR" && (
              <label className="block space-y-1 text-xs font-medium text-[#162F48]">
                استان قلمرو اولیه (اختیاری)
                <select
                  value={newMgrProvinceId}
                  onChange={(e) => setNewMgrProvinceId(e.target.value)}
                  className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] p-2.5 text-xs text-[#162F48]"
                >
                  <option value="">انتخاب پس از ایجاد...</option>
                  {IRAN_PROVINCES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Input
              label="گذرواژه اولیه (حداقل ۸ کاراکتر)"
              type="password"
              dir="ltr"
              required
              minLength={8}
              value={newMgrPassword}
              onChange={(e) => setNewMgrPassword(e.target.value)}
            />
            <div className="flex justify-end gap-2 border-t border-[#087674]/10 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={busy}
                icon={<UserPlus className="h-4 w-4" />}
              >
                ایجاد و فعال‌سازی
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {suspendTarget && (
        <Modal
          isOpen
          onClose={() => setSuspendTarget(null)}
          title={
            suspendTarget.isActive
              ? `تعلیق ${suspendTarget.fullName}`
              : `فعال‌سازی ${suspendTarget.fullName}`
          }
          maxWidth="md"
        >
          <form
            onSubmit={(e) => void handleToggleManagerActive(e)}
            className="space-y-4 text-right"
          >
            <label className="block space-y-1.5 text-xs font-medium text-[#162F48]">
              دلیل اقدام (حداقل ۵ کاراکتر · D-04)
              <textarea
                required
                minLength={5}
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] p-3 text-sm text-[#162F48]"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-[#087674]/10 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSuspendTarget(null)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant={suspendTarget.isActive ? "danger" : "primary"}
                loading={busy}
              >
                تأیید و ثبت
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
