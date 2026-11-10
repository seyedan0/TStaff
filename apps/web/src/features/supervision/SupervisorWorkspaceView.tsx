import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, FolderGit2, RefreshCw, Search, UserCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { StageStatus, StageType, SupervisorWorkspaceUser } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

const STAGE_LABELS: Record<StageType, string> = {
  SOURCES: "منابع",
  EXPLANATION: "تبیین",
  PRESCRIPTION: "تجویز",
  SCENARIO: "سناریو",
};

const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  PENDING: "شروع‌نشده",
  IN_PROGRESS: "در حال انجام",
  SUBMITTED: "در انتظار داوری",
  REVIEW_REQUIRED: "نیازمند بازبینی",
  APPROVED: "تأییدشده",
  REVISION_REQUESTED: "نیازمند اصلاح",
};

function currentStageSummary(user: SupervisorWorkspaceUser): string {
  if (user.stage === "APPRENTICE") {
    return user.pendingStudyEvaluationId ? "کارآموز · در انتظار ارزیابی مطالعه" : "کارآموز · مطالعه شیوه‌نامه‌ها";
  }
  const latestCase = user.cases[0];
  if (!latestCase) return "کارورز · بدون پرونده فعال";
  const activeStage =
    latestCase.stages.find((s) => s.status !== "APPROVED" && s.status !== "PENDING") ??
    latestCase.stages.find((s) => s.status !== "APPROVED") ??
    latestCase.stages[latestCase.stages.length - 1];
  if (!activeStage) return `${latestCase.title}`;
  return `${STAGE_LABELS[activeStage.stageType]} (${STAGE_STATUS_LABELS[activeStage.status]})`;
}

export const SupervisorWorkspaceView: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const [users, setUsers] = useState<SupervisorWorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const pendingOnly = searchParams.get("pending") === "1";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiClient.get<{ users: SupervisorWorkspaceUser[]; total: number }>(
        "/scientific-supervisors/me/workspace",
      );
      setUsers(response.users);
    } catch (error) {
      const message = error instanceof Error ? error.message : "دریافت کارتابل مدیر علمی ناموفق بود.";
      setUsers([]);
      setLoadError(message);
      onNotify("error", "کارتابل بارگذاری نشد", message);
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilterQuery = (nextQ: string, nextPendingOnly: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (nextQ.trim()) next.set("q", nextQ);
    else next.delete("q");
    if (nextPendingOnly) next.set("pending", "1");
    else next.delete("pending");
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((user) => {
      if (pendingOnly && user.pendingCount === 0) return false;
      if (!needle) return true;
      const haystack = `${user.fullName} ${user.phoneNumber} ${user.cases.map((c) => `${c.title} ${c.code}`).join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [users, q, pendingOnly]);

  const totalPendingUsers = useMemo(() => users.filter((u) => u.pendingCount > 0).length, [users]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="کارتابل پژوهشگران و کارآموزان"
        subtitle="فهرست یکتای افراد تحت هدایت شما؛ موارد نیازمند اقدام بر اساس قدیمی‌ترین درخواست در صدر فهرست قرار دارند."
        actions={
          <Button variant="secondary" size="sm" loading={loading} icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
            به‌روزرسانی
          </Button>
        }
      />

      <Card variant="default" padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B8073]" />
            <input
              type="search"
              aria-label="جست‌وجوی پژوهشگر یا پرونده"
              placeholder="جست‌وجو بر اساس نام، شماره همراه یا عنوان/کد پژوهش..."
              value={q}
              onChange={(e) => setFilterQuery(e.target.value, pendingOnly)}
              className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] py-2.5 pr-9 pl-3 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterQuery(q, false)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                !pendingOnly ? "bg-[#214E3A] text-[#FFFCF5]" : "border border-[#214E3A]/20 bg-[#F3EBDD]/60 text-[#214031]"
              }`}
            >
              همه افراد ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterQuery(q, true)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                pendingOnly ? "bg-[#D94F3D] text-[#FFFCF5]" : "border border-[#D94F3D]/35 bg-[#D94F3D]/10 text-[#B83B2B]"
              }`}
            >
              نیازمند اقدام ({totalPendingUsers})
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState message="در حال بارگذاری کارتابل پژوهشگران..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="کاربری با این مشخصات یافت نشد"
          description={users.length === 0 ? "هنوز کارآموز یا پژوهشگری به شما منتسب نشده است." : "فیلتر جست‌وجو یا وضعیت را تغییر دهید."}
          action={
            (q || pendingOnly) ? (
              <Button variant="secondary" size="sm" onClick={() => setFilterQuery("", false)}>
                پاک‌کردن فیلترها
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => {
            const hasPending = user.pendingCount > 0;
            return (
              <Card
                key={user.id}
                variant="default"
                className={hasPending ? "border-[#D94F3D]/45 shadow-sm" : undefined}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#214E3A]/10 text-[#214E3A]">
                        <UserCheck className="h-4 w-4" />
                      </span>
                      <h2 className="text-base font-bold text-[#214031]">{user.fullName}</h2>
                      <Badge variant={user.stage === "INTERN" ? "info" : "neutral"} size="sm">
                        {user.stage === "INTERN" ? "کارورز (پژوهشگر)" : "کارآموز"}
                      </Badge>
                      {!user.canCreateResearch && (
                        <Badge variant="neutral" size="sm">
                          فقط انتساب پژوهش
                        </Badge>
                      )}
                      {hasPending ? (
                        <Badge variant="danger" dot size="sm">
                          <AlertCircle className="h-3 w-3" />
                          نیازمند اقدام ({user.pendingCount})
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          به‌روز
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#4F6659]">
                      <span dir="ltr" className="font-mono">
                        {user.phoneNumber}
                      </span>
                      <span>·</span>
                      <span>
                        پژوهش‌های مجاز: <strong className="text-[#214031]">{user.cases.length}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        وضعیت جاری: <strong className="text-[#214031]">{currentStageSummary(user)}</strong>
                      </span>
                    </div>

                    {hasPending && user.oldestPendingAt && (
                      <p className="text-xs font-medium text-[#B83B2B]">
                        قدیمی‌ترین مورد منتظر بررسی: {new Date(user.oldestPendingAt).toLocaleString("fa-IR")}
                      </p>
                    )}

                    {user.cases.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {user.cases.map((c) => (
                          <Link
                            key={c.id}
                            to={`/projects/${encodeURIComponent(c.id)}?researcherId=${encodeURIComponent(user.id)}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#214E3A]/20 bg-[#F3EBDD]/65 px-2.5 py-1 text-[11px] font-medium text-[#214E3A] transition hover:bg-[#214E3A]/15"
                          >
                            <FolderGit2 className="h-3 w-3" />
                            <span>{c.code} · {c.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <Link
                      to={`/supervision/users/${encodeURIComponent(user.id)}`}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                        hasPending
                          ? "bg-[#D94F3D] text-[#FFFCF5] hover:bg-[#C04130]"
                          : "bg-[#214E3A] text-[#FFFCF5] hover:bg-[#193C2C]"
                      }`}
                    >
                      <span>مشاهده پروفایل و اقدام</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

