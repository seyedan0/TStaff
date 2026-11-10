import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, FolderGit2, History, Lock, Plus, RotateCcw, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { ResearchChangeRequestDto, StageStatus, StageType, SupervisorWorkspaceUser } from "@tstaff/contracts";
import { ApiError, apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

const STAGE_LABELS: Record<StageType, string> = {
  SOURCES: "منابع و مصاحبه‌ها",
  EXPLANATION: "تبیین مسئله",
  PRESCRIPTION: "تجویز راهکار",
  SCENARIO: "سناریونویسی",
};

const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  PENDING: "شروع‌نشده",
  IN_PROGRESS: "در حال انجام",
  SUBMITTED: "در انتظار داوری",
  REVIEW_REQUIRED: "نیازمند بازبینی",
  APPROVED: "تأییدشده",
  REVISION_REQUESTED: "نیازمند اصلاح",
};

const ACTION_LABELS: Record<string, string> = {
  STAGE_ROLLED_BACK: "بازگشت مرحله و علامت‌گذاری بازبینی (D-05)",
  CHANGE_REQUEST_CREATED: "ثبت درخواست بازگشایی مرحله تأییدشده",
  CHANGE_REQUEST_APPROVED: "تأیید بازگشایی مرحله و انتقال به REVISION_REQUESTED",
  CHANGE_REQUEST_REJECTED: "رد درخواست بازگشایی مرحله",
  REVIEW_DECISION_RECORDED: "ثبت تصمیم داوری علمی",
  SCENARIO_DECISION_RECORDED: "ثبت تصمیم داوری سناریو",
  SUPERVISOR_ASSIGNED: "انتساب مدیر علمی به کاربر/پژوهش",
  SUPERVISOR_REVOKED: "لغو انتساب مدیر علمی",
  USER_PROMOTED_INTERN: "ارتقای کارآموز به کارورز",
  USER_SUSPENDED: "تعلیق حساب کاربری",
  USER_REACTIVATED: "فعال‌سازی مجدد حساب کاربری",
};

export const SupervisorUserProfileView: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<SupervisorWorkspaceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState("");
  const [changeReasons, setChangeReasons] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get<SupervisorWorkspaceUser>(
        `/scientific-supervisors/me/trainees/${encodeURIComponent(userId)}`,
      );
      setProfile(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "دریافت اطلاعات پژوهشگر ناموفق بود.";
      setProfile(null);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const decideEvaluation = async (decision: "APPROVED" | "REVISION_REQUIRED") => {
    if (!profile?.pendingStudyEvaluationId) return;
    setBusyKey("evaluation");
    try {
      await apiClient.post(`/users/study-evaluations/${profile.pendingStudyEvaluationId}/decide`, {
        decision,
        feedback:
          evalFeedback.trim() ||
          (decision === "APPROVED"
            ? "تسلط بر شیوه‌نامه‌ها تایید شد و ارتقا به سطح کارورز انجام گرفت."
            : "مطالعه مجدد منابع الزامی درخواست شد."),
      });
      onNotify(
        decision === "APPROVED" ? "success" : "warning",
        decision === "APPROVED" ? "ارتقا به کارورز ثبت شد" : "درخواست مطالعه مجدد ثبت شد",
      );
      setEvalFeedback("");
      await load();
    } catch (error) {
      onNotify("error", "ثبت تصمیم ارزیابی انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusyKey(null);
    }
  };

  const decideChangeRequest = async (req: ResearchChangeRequestDto, decision: "APPROVED" | "REJECTED") => {
    const targetCase = profile?.cases.find((c) => c.id === req.researchCaseId);
    if (!targetCase) return;
    const reasonText = (changeReasons[req.id] ?? "").trim();
    if (reasonText.length < 5) {
      onNotify("warning", "ثبت توضیح داوری الزامی است", "حداقل ۵ کاراکتر دلیل برای تأیید یا رد درخواست بنویسید.");
      return;
    }
    setBusyKey(req.id);
    try {
      await apiClient.post(
        `/research-cases/${encodeURIComponent(req.researchCaseId)}/change-requests/${encodeURIComponent(req.id)}/decide`,
        {
          decision,
          reason: reasonText,
          expectedVersion: req.version,
          caseVersion: targetCase.version,
        },
      );
      onNotify(
        decision === "APPROVED" ? "success" : "info",
        decision === "APPROVED" ? "بازگشایی مرحله تأیید شد" : "درخواست بازگشایی رد شد",
        decision === "APPROVED" ? "مراحل وابسته مطابق قاعده D-05 به وضعیت نیازمند بازبینی رفتند." : undefined,
      );
      setChangeReasons((prev) => ({ ...prev, [req.id]: "" }));
      await load();
    } catch (error) {
      if (error instanceof ApiError && (error.problem.status === 409 || error.problem.code === "STALE_REVISION")) {
        onNotify(
          "warning",
          "تضاد هم‌زمان (409 STALE_REVISION)",
          "این درخواست یا نسخه پژوهش پیش‌تر توسط مدیر علمی دیگر تصمیم‌گیری شده است. فهرست به‌روزرسانی می‌شود.",
        );
        await load();
      } else {
        onNotify("error", "ثبت تصمیم درخواست بازگشایی انجام نشد", error instanceof Error ? error.message : undefined);
      }
    } finally {
      setBusyKey(null);
    }
  };

  const pendingReviews = useMemo(() => {
    if (!profile) return [];
    return profile.cases.flatMap((c) =>
      c.canReview
        ? c.stages
            .filter((s) => s.status === "SUBMITTED")
            .map((s) => ({ caseItem: c, stage: s }))
        : [],
    );
  }, [profile]);

  if (loading) return <LoadingState message="در حال بارگذاری پروفایل کاربر..." />;
  if (loadError || !profile) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="پروفایل پژوهشگر"
          breadcrumbs={[{ label: "پژوهشگران", to: "/supervision/users" }, { label: "جزئیات" }]}
          backTo={{ label: "بازگشت به فهرست پژوهشگران", to: "/supervision/users" }}
        />
        <ErrorState message={loadError ?? "کاربر در محدوده دسترسی شما یافت نشد."} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.fullName}
        subtitle={`${profile.stage === "INTERN" ? "کارورز پژوهشگر" : "کارآموز"} · ${profile.phoneNumber}`}
        breadcrumbs={[
          { label: "پژوهشگران", to: "/supervision/users" },
          { label: profile.fullName },
        ]}
        backTo={{ label: "بازگشت به پژوهشگران", to: "/supervision/users" }}
        actions={
          profile.canCreateResearch && profile.stage === "INTERN" ? (
            <Link
              to={`/projects/new?researcherId=${encodeURIComponent(profile.id)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#214E3A] px-4 py-2 text-xs font-semibold text-[#FFFCF5] transition hover:bg-[#193C2C]"
            >
              <Plus className="h-4 w-4" />
              ایجاد پرونده پژوهش جدید
            </Link>
          ) : undefined
        }
      />

      {/* 1. Personal Profile Section */}
      <Card variant="default">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#214031]">
            <UserRound className="h-5 w-5 text-[#214E3A]" />
            مشخصات فردی
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant={profile.stage === "INTERN" ? "info" : "neutral"} size="sm">
              {profile.stage === "INTERN" ? "کارورز" : "کارآموز"}
            </Badge>
            {profile.pendingCount > 0 && (
              <Badge variant="danger" dot size="sm">
                {profile.pendingCount} مورد نیازمند اقدام
              </Badge>
            )}
          </div>
        </div>

        {!profile.canCreateResearch ? (
          <div className="flex items-start gap-3 rounded-xl border border-[#214E3A]/20 bg-[#F3EBDD]/70 p-4 text-xs leading-6 text-[#214031]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#214E3A]" />
            <div>
              شما صرفاً به پژوهش(های) منتسب‌شده دسترسی دارید و اطلاعات کامل پروفایل هویتی برای این نوع انتساب نمایش داده نمی‌شود.
            </div>
          </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">کد ملی</dt>
              <dd className="mt-1 font-mono font-semibold text-[#214031]">{profile.nationalId || "ثبت نشده"}</dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">سن (عدد صحیح)</dt>
              <dd className="mt-1 font-semibold text-[#214031]">{profile.age ? `${profile.age} سال` : "ثبت نشده"}</dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">استان</dt>
              <dd className="mt-1 font-semibold text-[#214031]">{profile.provinceName || "ثبت نشده"}</dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-xs text-[#4F6659]">شماره همراه</dt>
              <dd dir="ltr" className="mt-1 text-right font-mono font-semibold text-[#214031]">
                {profile.phoneNumber}
              </dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3 sm:col-span-2">
              <dt className="text-xs text-[#4F6659]">تحصیلات و رشته</dt>
              <dd className="mt-1 font-semibold text-[#214031]">
                {[profile.education, profile.fieldOfStudy].filter(Boolean).join(" · ") || "ثبت نشده"}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      {/* 2. Pending Actions Section */}
      {(profile.pendingStudyEvaluationId || pendingReviews.length > 0 || profile.changeRequests.length > 0) && (
        <section className="space-y-3" aria-label="درخواست‌ها و موارد نیازمند رسیدگی">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#B83B2B]">
            <AlertCircle className="h-5 w-5 text-[#D94F3D]" />
            درخواست‌های منتظر بررسی و تصمیم‌گیری
          </h2>

          {profile.pendingStudyEvaluationId && (
            <Card variant="elevated" className="border-[#D94F3D]/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#214031]">درخواست ارزیابی مطالعه و ارتقا به کارورز</h3>
                  <p className="mt-0.5 text-xs text-[#4F6659]">کارآموز مطالعه شیوه‌نامه‌ها را به پایان رسانده و منتظر ارزیابی علمی است.</p>
                </div>
                <Badge variant="danger" size="sm">نیازمند تصمیم</Badge>
              </div>
              <textarea
                rows={2}
                value={evalFeedback}
                onChange={(e) => setEvalFeedback(e.target.value)}
                placeholder="بازخورد علمی به کارآموز (اختیاری)..."
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-sm text-[#214031]"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  loading={busyKey === "evaluation"}
                  onClick={() => void decideEvaluation("REVISION_REQUIRED")}
                >
                  نیازمند مطالعه مجدد
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  loading={busyKey === "evaluation"}
                  onClick={() => void decideEvaluation("APPROVED")}
                >
                  تأیید و ارتقا به کارورز
                </Button>
              </div>
            </Card>
          )}

          {pendingReviews.map(({ caseItem, stage }) => (
            <Card key={stage.id} variant="elevated" className="border-[#D94F3D]/35 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" size="sm">{caseItem.code}</Badge>
                  <Badge variant="danger" size="sm">داوری {STAGE_LABELS[stage.stageType]}</Badge>
                </div>
                <p className="mt-1.5 text-sm font-bold text-[#214031]">{caseItem.title}</p>
                <p className="text-xs text-[#4F6659]">محتوای این مرحله ارسال شده و آماده داوری مدیر علمی است.</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/projects/${encodeURIComponent(caseItem.id)}/stages/${stage.stageType}?researcherId=${encodeURIComponent(profile.id)}`}
                  className="rounded-xl border border-[#214E3A]/25 px-3 py-2 text-xs font-semibold text-[#214E3A] hover:bg-[#214E3A]/10"
                >
                  مشاهده محتوا
                </Link>
                <Link
                  to="/supervision/reviews"
                  className="rounded-xl bg-[#D94F3D] px-3 py-2 text-xs font-semibold text-[#FFFCF5] hover:bg-[#C04130]"
                >
                  رفتن به کارتابل داوری
                </Link>
              </div>
            </Card>
          ))}

          {profile.changeRequests.map((req) => {
            const targetCase = profile.cases.find((c) => c.id === req.researchCaseId);
            const canDecideChange = req.status === "PENDING" && targetCase?.canReview === true;
            return (
              <Card
                key={req.id}
                variant="default"
                className={req.status === "PENDING" ? "border-[#D94F3D]/40 space-y-3" : "space-y-2"}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" size="sm">درخواست بازگشایی مرحله</Badge>
                      <Badge variant="info" size="sm">{STAGE_LABELS[req.targetStage]}</Badge>
                      <Badge
                        variant={req.status === "PENDING" ? "danger" : req.status === "APPROVED" ? "success" : "neutral"}
                        size="sm"
                      >
                        {req.status === "PENDING" ? "در انتظار بررسی" : req.status === "APPROVED" ? "تأییدشده" : "ردشده"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#214031]">
                      پرونده: {targetCase ? `${targetCase.code} · ${targetCase.title}` : req.researchCaseId}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-[#4F6659]">دلیل پژوهشگر: {req.reason}</p>
                    {req.decisionReason && (
                      <p className="mt-1 text-xs font-medium text-[#214E3A]">پاسخ مدیر علمی: {req.decisionReason}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#4F6659]">
                    نسخه درخواست: {req.version} · {new Date(req.createdAt).toLocaleString("fa-IR")}
                  </span>
                </div>

                {canDecideChange && (
                  <div className="space-y-2 border-t border-[#214E3A]/10 pt-3">
                    <input
                      type="text"
                      value={changeReasons[req.id] ?? ""}
                      onChange={(e) => setChangeReasons((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="توضیح تصمیم (حداقل ۵ کاراکتر؛ مثلاً دلیل بازگشت یا رد درخواست)..."
                      className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2 text-xs text-[#214031]"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busyKey === req.id}
                        onClick={() => void decideChangeRequest(req, "REJECTED")}
                      >
                        رد درخواست
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={busyKey === req.id}
                        onClick={() => void decideChangeRequest(req, "APPROVED")}
                      >
                        تأیید و بازگشایی مرحله (D-05)
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </section>
      )}

      {/* 3. Authorized Research Cases */}
      <section className="space-y-3" aria-label="پژوهش‌های مجاز">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#214031]">
          <FolderGit2 className="h-5 w-5 text-[#214E3A]" />
          پژوهش‌های مجاز ({profile.cases.length})
        </h2>

        {profile.cases.length === 0 ? (
          <EmptyState
            title="پرونده پژوهشی ثبت نشده است"
            description={
              profile.stage === "APPRENTICE"
                ? "پژوهش‌ها پس از ارتقای کارآموز به سطح کارورز ایجاد می‌شوند."
                : "برای شروع پژوهش جدید از دکمه «ایجاد پرونده پژوهش جدید» استفاده کنید."
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {profile.cases.map((c) => (
              <Card key={c.id} variant="default" className="flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="info" size="sm">{c.code}</Badge>
                    <div className="flex items-center gap-2 text-xs text-[#4F6659]">
                      <span>{c.canReview ? "اختیار داوری" : "فقط مشاهده"}</span>
                      <span>·</span>
                      <span>v{c.version}</span>
                    </div>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-[#214031]">{c.title}</h3>
                  <p className="mt-1 text-xs text-[#4F6659]">موضوع: {c.subject}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.stages.map((s) => (
                      <Badge
                        key={s.id}
                        size="sm"
                        variant={
                          s.status === "APPROVED"
                            ? "success"
                            : s.status === "SUBMITTED" || s.status === "REVIEW_REQUIRED"
                              ? "warning"
                              : s.status === "REVISION_REQUESTED"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {STAGE_LABELS[s.stageType]}: {STAGE_STATUS_LABELS[s.status]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end border-t border-[#214E3A]/10 pt-2">
                  <Link
                    to={`/projects/${encodeURIComponent(c.id)}?researcherId=${encodeURIComponent(profile.id)}`}
                    className="rounded-xl bg-[#214E3A] px-3 py-1.5 text-xs font-semibold text-[#FFFCF5] hover:bg-[#193C2C]"
                  >
                    مشاهده مراحل و محتوا
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 4. Combined Chronological History */}
      <section className="space-y-3" aria-label="تاریخچه مرتبط">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#214031]">
          <History className="h-5 w-5 text-[#214E3A]" />
          تاریخچه رخدادهای مرتبط ({profile.history?.length ?? 0})
        </h2>

        {!profile.history || profile.history.length === 0 ? (
          <Card variant="outlined" className="p-6 text-center text-xs text-[#4F6659]">
            هنوز رخداد ممیزی برای نمایش ثبت نشده است.
          </Card>
        ) : (
          <Card variant="default" padding="none">
            <ul className="divide-y divide-[#214E3A]/10">
              {profile.history.map((event) => (
                <li key={event.id} className="flex flex-col gap-1 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-[#214031]">
                      {ACTION_LABELS[event.action] ?? event.action}
                    </div>
                    <div className="text-[#4F6659]">
                      اقدام‌کننده: {event.actorName || "سامانه"} · موجودیت: {event.aggregateType}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#4F6659]">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(event.createdAt).toLocaleString("fa-IR")}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
};

