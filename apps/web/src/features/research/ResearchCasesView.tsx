import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FolderGit2, Plus, RotateCcw, Search } from "lucide-react";
import type { ResearchChangeRequestDto, StageStatus, StageType } from "@tstaff/contracts";
import { ApiError, apiClient } from "../../shared/api-client.js";
import { useAuth } from "../../features/auth/AuthContext.js";
import type { ResearchCaseItem } from "../../shared/types.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Modal } from "../../shared/ui/Modal.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";
import { ResourcesManager } from "../resources/ResourcesManager.js";
import { StageSubmissionWorkspace } from "./StageSubmissionWorkspace.js";
import { ScenarioWorkspace } from "./ScenarioWorkspace.js";
import { isDemoMode } from "../demo/demo-mode.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

const stages: Array<{ type: StageType; label: string }> = [
  { type: "SOURCES", label: "منابع و مصاحبه‌ها" },
  { type: "EXPLANATION", label: "تبیین مسئله" },
  { type: "PRESCRIPTION", label: "تجویز راهکار" },
  { type: "SCENARIO", label: "سناریونویسی" },
];

const statusLabel: Record<StageStatus, string> = {
  PENDING: "شروع‌نشده",
  IN_PROGRESS: "در حال انجام",
  SUBMITTED: "در انتظار داوری",
  REVIEW_REQUIRED: "نیازمند بازبینی",
  APPROVED: "تأییدشده",
  REVISION_REQUESTED: "نیازمند اصلاح",
};

export interface ResearchCasesViewProps {
  onNotify: Notice;
  researcherId?: string;
  canManage?: boolean;
}

export const ResearchCasesView: React.FC<ResearchCasesViewProps> = ({ onNotify, researcherId, canManage = false }) => {
  const { currentUser } = useAuth();
  const { caseId, stageType, resourceId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useSearchParams();
  const context = researcherId ? `?researcherId=${encodeURIComponent(researcherId)}` : "";
  const casePath = (id: string) => `/projects/${encodeURIComponent(id)}${context}`;
  const demoMode = isDemoMode();
  const ownerId = researcherId ?? currentUser?.id;

  const [cases, setCases] = useState<ResearchCaseItem[]>([]);
  const [changeRequests, setChangeRequests] = useState<ResearchChangeRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedCase = cases.find((item) => item.id === caseId) ?? null;
  const selectedStage = selectedCase?.stages.find((item) => item.stageType === (resourceId ? "SOURCES" : stageType)) ?? null;
  const canReview = canManage && selectedCase?.canReview === true;
  const parentPath = researcherId ? `/supervision/users/${encodeURIComponent(researcherId)}` : "/projects";

  const [changeOpen, setChangeOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [changeTarget, setChangeTarget] = useState<StageType>("SOURCES");
  const [changeDecisionNotes, setChangeDecisionNotes] = useState<Record<string, string>>({});
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<StageType>("SOURCES");
  const [rollbackReason, setRollbackReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCases = useCallback(async () => {
    if (!ownerId && !caseId) {
      setCases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const updatedCases = caseId
        ? [await apiClient.get<ResearchCaseItem>(`/research-cases/${encodeURIComponent(caseId)}`)]
        : await apiClient.get<ResearchCaseItem[]>(`/research-cases?researcherId=${encodeURIComponent(ownerId!)}`);
      setCases(updatedCases);
      if (caseId && updatedCases[0]) {
        try {
          const reqs = await apiClient.get<ResearchChangeRequestDto[]>(
            `/research-cases/${encodeURIComponent(caseId)}/change-requests`,
          );
          setChangeRequests(reqs);
        } catch {
          setChangeRequests([]);
        }
      } else {
        setChangeRequests([]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "دریافت پرونده‌ها ناموفق بود.";
      setCases([]);
      setLoadError(msg);
      onNotify("error", "پرونده‌ها بارگذاری نشدند", msg);
    } finally {
      setLoading(false);
    }
  }, [onNotify, ownerId, caseId]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  const submitRollback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCase) return;
    setBusy(true);
    try {
      await apiClient.post(`/research-cases/${selectedCase.id}/rollback-stage`, {
        targetStage: rollbackTarget,
        reason: rollbackReason,
        expectedVersion: selectedCase.version,
      });
      onNotify(
        "success",
        "بازگشت مرحله ثبت شد",
        "نسخه‌های گذشته حفظ شدند و مراحل وابسته برای بازبینی علامت خوردند (D-05 / AT-33).",
      );
      setRollbackOpen(false);
      setRollbackReason("");
      navigate(casePath(selectedCase.id));
      await loadCases();
    } catch (error) {
      if (error instanceof ApiError && (error.problem.status === 409 || error.problem.code === "STALE_REVISION")) {
        onNotify("warning", "تضاد نسخه (409)", "نسخه پرونده تغییر کرده است. اطلاعات مجدداً بارگذاری می‌شود.");
        setRollbackOpen(false);
        await loadCases();
      } else {
        onNotify("error", "بازگشت مرحله انجام نشد", error instanceof Error ? error.message : undefined);
      }
    } finally {
      setBusy(false);
    }
  };

  const decideChangeRequest = async (req: ResearchChangeRequestDto, decision: "APPROVED" | "REJECTED") => {
    if (!selectedCase) return;
    const reasonText = (changeDecisionNotes[req.id] ?? "").trim();
    if (reasonText.length < 5) {
      onNotify("warning", "توضیح تصمیم الزامی است", "حداقل ۵ کاراکتر توضیح بنویسید.");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(
        `/research-cases/${encodeURIComponent(selectedCase.id)}/change-requests/${encodeURIComponent(req.id)}/decide`,
        {
          decision,
          reason: reasonText,
          expectedVersion: req.version,
          caseVersion: selectedCase.version,
        },
      );
      onNotify(
        decision === "APPROVED" ? "success" : "info",
        decision === "APPROVED" ? "درخواست بازگشایی تأیید شد" : "درخواست بازگشایی رد شد",
      );
      await loadCases();
    } catch (error) {
      if (error instanceof ApiError && (error.problem.status === 409 || error.problem.code === "STALE_REVISION")) {
        onNotify("warning", "تضاد هم‌زمان (409 STALE_REVISION)", "این درخواست قبلاً تصمیم‌گیری شده است.");
        await loadCases();
      } else {
        onNotify("error", "ثبت تصمیم انجام نشد", error instanceof Error ? error.message : undefined);
      }
    } finally {
      setBusy(false);
    }
  };

  if (selectedCase && selectedStage) {
    const canEdit =
      !demoMode &&
      selectedCase.researcherId === currentUser?.id &&
      ["IN_PROGRESS", "REVIEW_REQUIRED", "REVISION_REQUESTED"].includes(selectedStage.status);
    const back = () => navigate(casePath(selectedCase.id));
    const stageLabel = stages.find((stage) => stage.type === selectedStage.stageType)?.label ?? selectedStage.stageType;

    return (
      <div className="space-y-5">
        <PageHeader
          title={stageLabel}
          subtitle={`${selectedCase.code} · ${selectedCase.title} · ${statusLabel[selectedStage.status]}`}
          breadcrumbs={[
            ...(researcherId ? [{ label: "پژوهشگران", to: "/supervision/users" }, { label: "پروفایل پژوهشگر", to: parentPath }] : [{ label: "پژوهش‌ها", to: "/projects" }]),
            { label: selectedCase.title, to: casePath(selectedCase.id) },
            { label: stageLabel },
          ]}
          backTo={{ label: "بازگشت به مراحل پرونده", to: casePath(selectedCase.id) }}
          actions={
            canReview && !demoMode ? (
              <Button variant="secondary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setRollbackOpen(true)}>
                بازگشت به مرحله قبلی
              </Button>
            ) : undefined
          }
        />

        {selectedStage.stageType === "SOURCES" && (
          <ResourcesManager
            caseId={selectedCase.id}
            caseTitle={selectedCase.title}
            caseVersion={selectedCase.version}
            canEdit={canEdit}
            stageStatus={selectedStage.status}
            onWorkflowChanged={loadCases}
            onBack={back}
            onNotify={onNotify}
          />
        )}
        {(selectedStage.stageType === "EXPLANATION" || selectedStage.stageType === "PRESCRIPTION") && (
          <StageSubmissionWorkspace
            caseTitle={selectedCase.title}
            caseVersion={selectedCase.version}
            stageId={selectedStage.id}
            stageType={selectedStage.stageType}
            stageStatus={selectedStage.status}
            canEdit={canEdit}
            onWorkflowChanged={loadCases}
            onNotify={onNotify}
          />
        )}
        {selectedStage.stageType === "SCENARIO" && (
          <ScenarioWorkspace
            caseId={selectedCase.id}
            caseTitle={selectedCase.title}
            stageStatus={selectedStage.status}
            canEdit={canEdit}
            onNotify={onNotify}
          />
        )}

        <Modal
          isOpen={rollbackOpen}
          onClose={() => setRollbackOpen(false)}
          title="بازگردانی مرحله و بازبینی خروجی‌های وابسته"
          subtitle="تاریخچه نسخه‌ها حذف نمی‌شود (D-05 / FR-061 / AT-33)."
        >
          <form onSubmit={submitRollback} className="space-y-4 text-right">
            <label className="block text-xs font-medium text-[#214031]">
              مرحله مقصد
              <select
                value={rollbackTarget}
                onChange={(event) => setRollbackTarget(event.target.value as StageType)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-sm text-[#214031]"
              >
                {stages.slice(0, 3).map((stage) => (
                  <option key={stage.type} value={stage.type}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[#214031]">
              دلیل بازگشت
              <textarea
                required
                minLength={5}
                rows={3}
                value={rollbackReason}
                onChange={(event) => setRollbackReason(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRollbackOpen(false)}>انصراف</Button>
              <Button type="submit" variant="primary" loading={busy}>ثبت بازگشت</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  if (selectedCase) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={selectedCase.title}
          subtitle={`${selectedCase.code} · موضوع: ${selectedCase.subject} · نسخه ${selectedCase.version}`}
          breadcrumbs={[
            ...(researcherId ? [{ label: "پژوهشگران", to: "/supervision/users" }, { label: "پروفایل پژوهشگر", to: parentPath }] : [{ label: "پژوهش‌ها", to: "/projects" }]),
            { label: selectedCase.code },
          ]}
          backTo={{ label: researcherId ? "بازگشت به پروفایل پژوهشگر" : "بازگشت به پژوهش‌ها", to: parentPath }}
          actions={
            canReview && !demoMode ? (
              <Button variant="secondary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setRollbackOpen(true)}>
                بازگشت به مرحله قبلی
              </Button>
            ) : undefined
          }
        />

        <Card variant="default" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map(({ type, label }) => {
              const stage = selectedCase.stages.find((item) => item.stageType === type);
              if (!stage) return null;
              const tileStyle =
                stage.status === "APPROVED"
                  ? "border-[#214E3A]/40 bg-[#214E3A]/10"
                  : stage.status === "IN_PROGRESS"
                    ? "border-[#214E3A] bg-[#FFFCF5] shadow-sm"
                    : stage.status === "SUBMITTED" || stage.status === "REVIEW_REQUIRED" || stage.status === "REVISION_REQUESTED"
                      ? "border-[#D94F3D]/45 bg-[#D94F3D]/10"
                      : "border-[#214E3A]/15 bg-[#F3EBDD]/50";
              return (
                <button
                  type="button"
                  key={stage.id}
                  onClick={() => navigate(`/projects/${selectedCase.id}/stages/${stage.stageType}${context}`)}
                  className={`rounded-xl border p-4 text-right transition hover:-translate-y-0.5 hover:border-[#214E3A] ${tileStyle}`}
                >
                  <div className="text-xs font-bold text-[#214031]">{label}</div>
                  <div className="mt-2 text-xs font-medium text-[#4F6659]">{statusLabel[stage.status]}</div>
                  <div className="mt-1 text-[11px] text-[#6B8073]">نسخه {stage.version}</div>
                </button>
              );
            })}
          </div>

          <p className="border-t border-[#214E3A]/10 pt-3 text-xs text-[#4F6659]">
            {demoMode
              ? "این پرونده نمونه در نسخه نمایشی فقط برای مشاهده در دسترس است."
              : "برای بازکردن هر مرحله روی کارت آن کلیک کنید. مراحل تأییدشده با تمام نسخه‌ها برای مشاهده و پیگیری بازبینی باقی می‌مانند."}
          </p>
        </Card>

        {selectedCase.researcherId === currentUser?.id &&
          !demoMode &&
          selectedCase.stages.some((stage) => stage.status === "APPROVED") && (
            <div className="flex justify-start">
              <Button
                variant="secondary"
                onClick={() => {
                  setChangeTarget(selectedCase.stages.find((stage) => stage.status === "APPROVED")!.stageType);
                  setChangeOpen(true);
                }}
              >
                درخواست بازبینی و بازگشایی مرحله تأییدشده
              </Button>
            </div>
          )}

        {changeRequests.length > 0 && (
          <Card variant="default" className="space-y-3">
            <h2 className="text-sm font-bold text-[#214031]">درخواست‌های بازگشایی مراحل ({changeRequests.length})</h2>
            <div className="space-y-3">
              {changeRequests.map((req) => (
                <div key={req.id} className="rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/50 p-3 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="info" size="sm">
                        {stages.find((s) => s.type === req.targetStage)?.label ?? req.targetStage}
                      </Badge>
                      <Badge
                        variant={req.status === "PENDING" ? "danger" : req.status === "APPROVED" ? "success" : "neutral"}
                        size="sm"
                      >
                        {req.status === "PENDING" ? "در انتظار بررسی" : req.status === "APPROVED" ? "تأییدشده" : "ردشده"}
                      </Badge>
                    </div>
                    <span className="text-[#4F6659]">
                      نسخه {req.version} · {new Date(req.createdAt).toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <p className="text-[#214031]">دلیل درخواست: {req.reason}</p>
                  {req.decisionReason && <p className="font-medium text-[#214E3A]">پاسخ مدیر علمی: {req.decisionReason}</p>}

                  {canReview && req.status === "PENDING" && !demoMode && (
                    <div className="space-y-2 border-t border-[#214E3A]/10 pt-2">
                      <input
                        type="text"
                        placeholder="توضیح تصمیم مدیر علمی (حداقل ۵ کاراکتر)..."
                        value={changeDecisionNotes[req.id] ?? ""}
                        onChange={(e) => setChangeDecisionNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2 text-xs text-[#214031]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" loading={busy} onClick={() => void decideChangeRequest(req, "REJECTED")}>
                          رد درخواست
                        </Button>
                        <Button variant="primary" size="sm" loading={busy} onClick={() => void decideChangeRequest(req, "APPROVED")}>
                          تأیید و بازگشایی مرحله
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Modal isOpen={changeOpen} onClose={() => setChangeOpen(false)} title="درخواست بازگشایی مرحله تأییدشده">
          <form
            className="space-y-4 text-right"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              try {
                await apiClient.post(`/research-cases/${selectedCase.id}/change-requests`, {
                  targetStage: changeTarget,
                  reason: changeReason.trim(),
                  expectedVersion: selectedCase.version,
                });
                setChangeOpen(false);
                setChangeReason("");
                onNotify("success", "درخواست بازبینی ثبت شد", "پس از تصمیم مدیر علمی امکان اصلاح مرحله فراهم می‌شود.");
                await loadCases();
              } catch (error) {
                onNotify("error", "درخواست ثبت نشد", error instanceof Error ? error.message : undefined);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block text-xs font-medium text-[#214031]">
              مرحله مقصد
              <select
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
                value={changeTarget}
                onChange={(event) => setChangeTarget(event.target.value as StageType)}
              >
                {selectedCase.stages
                  .filter((stage) => stage.status === "APPROVED")
                  .map((stage) => (
                    <option key={stage.id} value={stage.stageType}>
                      {stages.find((item) => item.type === stage.stageType)?.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[#214031]">
              دلیل درخواست (حداقل ۵ کاراکتر)
              <textarea
                required
                minLength={5}
                maxLength={2000}
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
                value={changeReason}
                onChange={(event) => setChangeReason(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setChangeOpen(false)}>انصراف</Button>
              <Button type="submit" variant="primary" loading={busy}>ارسال برای مدیر علمی</Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={rollbackOpen}
          onClose={() => setRollbackOpen(false)}
          title="بازگردانی مرحله و بازبینی خروجی‌های وابسته"
          subtitle="تاریخچه نسخه‌ها حذف نمی‌شود (D-05 / FR-061 / AT-33)."
        >
          <form onSubmit={submitRollback} className="space-y-4 text-right">
            <label className="block text-xs font-medium text-[#214031]">
              مرحله مقصد
              <select
                value={rollbackTarget}
                onChange={(event) => setRollbackTarget(event.target.value as StageType)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-sm text-[#214031]"
              >
                {stages.slice(0, 3).map((stage) => (
                  <option key={stage.type} value={stage.type}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[#214031]">
              دلیل بازگشت
              <textarea
                required
                minLength={5}
                rows={3}
                value={rollbackReason}
                onChange={(event) => setRollbackReason(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRollbackOpen(false)}>انصراف</Button>
              <Button type="submit" variant="primary" loading={busy}>ثبت بازگشت</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  if (caseId && loading) return <LoadingState message="در حال دریافت پرونده..." />;
  if (caseId && !selectedCase) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="پرونده پژوهش"
          backTo={{ label: "بازگشت به فهرست", to: parentPath }}
        />
        <ErrorState
          title="پرونده در دسترس نیست"
          message={loadError ?? "پرونده پیدا نشد یا اجازه مشاهده آن را ندارید."}
          action={
            <Link className="text-xs font-semibold text-[#214E3A] underline" to={parentPath}>
              بازگشت به فهرست
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="پرونده‌های پژوهش"
        subtitle="چرخه منابع، تبیین، تجویز و سناریو · پیشرفت بین مراحل با تأیید مدیر علمی"
        actions={
          canManage && ownerId && !demoMode ? (
            <Link
              to={`/projects/new?researcherId=${encodeURIComponent(ownerId)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#214E3A] px-4 py-2 text-xs font-semibold text-[#FFFCF5] hover:bg-[#193C2C]"
            >
              <Plus className="h-4 w-4" />
              ایجاد پرونده جدید
            </Link>
          ) : undefined
        }
      />

      <Card variant="default" padding="sm">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B8073]" />
          <input
            type="search"
            aria-label="جست‌وجوی پژوهش"
            placeholder="جست‌وجو بر اساس عنوان، کد یا موضوع..."
            value={query.get("q") ?? ""}
            onChange={(event) => {
              const next = new URLSearchParams(query);
              event.target.value ? next.set("q", event.target.value) : next.delete("q");
              setQuery(next, { replace: true });
            }}
            className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] py-2.5 pr-9 pl-3 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
          />
        </div>
      </Card>

      {!ownerId && canManage ? (
        <EmptyState title="پژوهشگری انتخاب نشده است" description="ابتدا از کارتابل پژوهشگران یک فرد را انتخاب کنید." />
      ) : loading ? (
        <LoadingState message="در حال بارگذاری پرونده‌ها..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void loadCases()} />
      ) : cases.length === 0 ? (
        <EmptyState
          title="پرونده‌ای ثبت نشده است"
          description="هنوز پرونده پژوهشی فعالی برای این کاربر وجود ندارد."
          icon={<FolderGit2 className="h-8 w-8 text-[#214E3A]" />}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cases
            .filter((item) => `${item.title} ${item.code} ${item.subject}`.toLowerCase().includes((query.get("q") ?? "").toLowerCase()))
            .map((item) => (
              <Card key={item.id} variant="default" className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="info" size="sm">{item.code}</Badge>
                    <span className="text-xs text-[#4F6659]">v{item.version}</span>
                  </div>
                  <h2 className="mt-3 text-base font-bold text-[#214031]">{item.title}</h2>
                  <p className="mt-1 text-xs text-[#4F6659]">{item.subject}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.stages.map((stage) => (
                      <span
                        key={stage.id}
                        title={statusLabel[stage.status]}
                        className={`h-2 w-8 rounded-full ${
                          stage.status === "APPROVED"
                            ? "bg-[#214E3A]"
                            : stage.status === "IN_PROGRESS"
                              ? "bg-[#214E3A]/60"
                              : stage.status === "SUBMITTED" || stage.status === "REVIEW_REQUIRED" || stage.status === "REVISION_REQUESTED"
                                ? "bg-[#D94F3D]"
                                : "bg-[#214E3A]/15"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(casePath(item.id))}>
                  مشاهده چهار مرحله
                </Button>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
};
