import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileCheck2, FolderGit2, RefreshCw, RotateCcw, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Modal } from "../../shared/ui/Modal.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, LoadingState } from "../../shared/ui/StateFeedback.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

interface PendingReview {
  id: string;
  kind: "SUBMISSION" | "SOURCE_STAGE";
  submissionId?: string;
  caseId: string;
  caseCode: string;
  caseTitle: string;
  researcherId: string;
  internName: string;
  stageId: string;
  stageType: string;
  stageName: string;
  caseVersion: number;
  version?: number;
  submittedAt: string;
  summary: string;
  storedObjectId?: string | null;
}

interface ScenarioReview {
  id: string;
  version: number;
  caseVersion: number;
  title: string;
  summary: string;
  content: string;
  caseId: string;
  caseCode: string;
  caseTitle: string;
  internName: string;
}

export const ScientificReviewsView: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const [items, setItems] = useState<PendingReview[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "SCENARIOS" ? "SCENARIOS" : "WORKLIST";
  const q = searchParams.get("q") ?? "";

  const [activeReview, setActiveReview] = useState<PendingReview | null>(null);
  const [activeScenario, setActiveScenario] = useState<ScenarioReview | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiClient.get<PendingReview[]>("/scientific-supervisors/me/reviews");
      setItems(list);
    } catch (error) {
      setItems([]);
      onNotify("error", "کارتابل داوری بارگذاری نشد", error instanceof Error ? error.message : undefined);
    }
    try {
      setScenarios(await apiClient.get<ScenarioReview[]>("/scientific-supervisors/me/scenarios"));
    } catch {
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void load();
  }, [load]);

  const setTabAndQuery = (tab: "WORKLIST" | "SCENARIOS", nextQ: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "SCENARIOS") next.set("tab", "SCENARIOS");
    else next.delete("tab");
    if (nextQ.trim()) next.set("q", nextQ);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const handleReviewError = async (error: unknown, fallbackTitle: string) => {
    if (error instanceof ApiError && (error.problem.status === 409 || error.problem.code === "STALE_REVISION")) {
      onNotify(
        "warning",
        "تضاد نسخه در داوری هم‌زمان (409 STALE_REVISION)",
        error.problem.detail || "مدیر علمی دیگر پیش‌تر درباره این نسخه تصمیم ثبت کرده است. کارتابل به‌روزرسانی شد.",
      );
      setActiveReview(null);
      setActiveScenario(null);
      await load();
      return;
    }
    onNotify("error", fallbackTitle, error instanceof Error ? error.message : undefined);
  };

  const decide = async (decision: "APPROVED" | "REVISION_REQUIRED") => {
    if (!activeReview) return;
    if (decision === "REVISION_REQUIRED" && notes.trim().length < 5) {
      onNotify("warning", "دلیل اصلاح را بنویسید", "برای درخواست اصلاح، دست‌کم ۵ نویسه لازم است.");
      return;
    }
    setBusy(true);
    try {
      if (activeReview.kind === "SOURCE_STAGE") {
        await apiClient.post(`/research-cases/${activeReview.caseId}/stages/SOURCES/review`, {
          decision: decision === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED",
          notes: notes.trim(),
          expectedVersion: activeReview.caseVersion,
        });
      } else {
        await apiClient.post(`/submissions/${activeReview.submissionId}/review`, {
          decision: decision === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED",
          reason: notes.trim() || "محتوا تأیید شد",
          expectedVersion: activeReview.version,
          caseVersion: activeReview.caseVersion,
          idempotencyKey: crypto.randomUUID(),
        });
      }
      onNotify(
        decision === "APPROVED" ? "success" : "warning",
        decision === "APPROVED" ? "مرحله تأیید شد" : "اصلاح برای کارورز ثبت شد",
        "تغییر وضعیت در پرونده و کارتابل ثبت شد.",
      );
      setActiveReview(null);
      setNotes("");
      await load();
    } catch (error) {
      await handleReviewError(error, "ثبت داوری انجام نشد");
    } finally {
      setBusy(false);
    }
  };

  const decideScenario = async (decision: "APPROVED" | "CHANGES_REQUESTED") => {
    if (!activeScenario || notes.trim().length < 5) {
      onNotify("warning", "دلیل داوری را بنویسید", "حداقل ۵ نویسه لازم است.");
      return;
    }
    setBusy(true);
    try {
      await apiClient.post(`/scenarios/${activeScenario.id}/review`, {
        decision,
        reason: notes.trim(),
        expectedVersion: activeScenario.version,
        caseVersion: activeScenario.caseVersion,
        idempotencyKey: crypto.randomUUID(),
      });
      onNotify(
        decision === "APPROVED" ? "success" : "warning",
        decision === "APPROVED" ? "سناریو تأیید شد" : "اصلاح سناریو درخواست شد",
        decision === "APPROVED" ? "سناریو در سابقه پرونده با وضعیت تأیید داخلی ثبت شد." : undefined,
      );
      setActiveScenario(null);
      setNotes("");
      await load();
    } catch (error) {
      await handleReviewError(error, "داوری سناریو انجام نشد");
    } finally {
      setBusy(false);
    }
  };

  const filteredItems = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => `${i.caseTitle} ${i.caseCode} ${i.internName} ${i.stageName}`.toLowerCase().includes(needle));
  }, [items, q]);

  const filteredScenarios = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return scenarios;
    return scenarios.filter((s) => `${s.title} ${s.caseTitle} ${s.caseCode} ${s.internName}`.toLowerCase().includes(needle));
  }, [scenarios, q]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="کارتابل داوری علمی"
        subtitle="بررسی مراحل ارسالی پژوهشگران منتسب و ثبت تصمیم هم‌سطح مدیران علمی (D-02 / D-03 / AT-29)"
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
              aria-label="جست‌وجوی کارتابل داوری"
              placeholder="جست‌وجو بر اساس کد پرونده، عنوان یا نام پژوهشگر..."
              value={q}
              onChange={(e) => setTabAndQuery(activeTab, e.target.value)}
              className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] py-2 pr-9 pl-3 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
            />
          </div>
          <div className="flex rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/60 p-1">
            <button
              type="button"
              onClick={() => setTabAndQuery("WORKLIST", q)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "WORKLIST" ? "bg-[#214E3A] text-[#FFFCF5]" : "text-[#4F6659] hover:text-[#214031]"
              }`}
            >
              مراحل پژوهش ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setTabAndQuery("SCENARIOS", q)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "SCENARIOS" ? "bg-[#214E3A] text-[#FFFCF5]" : "text-[#4F6659] hover:text-[#214031]"
              }`}
            >
              سناریوها ({scenarios.length})
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState message="در حال دریافت صف داوری..." />
      ) : activeTab === "WORKLIST" ? (
        filteredItems.length === 0 ? (
          <EmptyState
            title="موردی در انتظار داوری نیست"
            description="تمام مراحل ارسالی بررسی شده‌اند یا فیلتر جست‌وجو نتیجه‌ای نداشت."
            icon={<CheckCircle2 className="h-8 w-8 text-[#214E3A]" />}
          />
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card key={item.id} variant="default" className="space-y-3 border-[#D94F3D]/35">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info" size="sm">{item.caseCode}</Badge>
                      <Badge variant={item.kind === "SOURCE_STAGE" ? "danger" : "warning"} size="sm">
                        {item.stageName}
                      </Badge>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-[#214031]">{item.caseTitle}</h2>
                    <p className="mt-1 text-xs text-[#4F6659]">
                      پژوهشگر: {item.internName} · {new Date(item.submittedAt).toLocaleString("fa-IR")}
                      {item.version ? ` · نسخه ${item.version}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/projects/${encodeURIComponent(item.caseId)}/stages/${item.stageType}?researcherId=${encodeURIComponent(item.researcherId)}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#214E3A]/20 px-3 py-1.5 text-xs font-medium text-[#214E3A] hover:bg-[#214E3A]/10"
                    >
                      <FolderGit2 className="h-3.5 w-3.5" />
                      مشاهده در پرونده
                    </Link>
                    <Button variant="primary" size="sm" icon={<FileCheck2 className="h-3.5 w-3.5" />} onClick={() => { setActiveReview(item); setNotes(""); }}>
                      بررسی و تصمیم
                    </Button>
                  </div>
                </div>
                <p className="rounded-xl border border-[#214E3A]/10 bg-[#F3EBDD]/55 p-3 text-xs leading-6 text-[#214031]">
                  {item.summary}
                </p>
                {item.storedObjectId && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void apiClient.download(`/files/${item.storedObjectId}/download`, `${item.stageName}-v${item.version}`)}
                    >
                      دریافت فایل پیوست
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      ) : filteredScenarios.length === 0 ? (
        <EmptyState
          title="سناریویی در انتظار داوری نیست"
          description="پس از ارسال سناریو توسط پژوهشگران منتسب، برای داوری در اینجا قرار می‌گیرد."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredScenarios.map((scenario) => (
            <Card key={scenario.id} variant="default" className="space-y-3 border-[#D94F3D]/35">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">{scenario.caseCode}</Badge>
                  <Badge variant="neutral" size="sm">نسخه {scenario.version}</Badge>
                </div>
                <h2 className="mt-2 text-base font-bold text-[#214031]">{scenario.title}</h2>
                <p className="mt-1 text-xs text-[#4F6659]">
                  {scenario.caseTitle} · {scenario.internName}
                </p>
              </div>
              <p className="text-xs leading-6 text-[#214031]">{scenario.summary}</p>
              <div className="flex justify-end">
                <Button variant="primary" size="sm" onClick={() => { setActiveScenario(scenario); setNotes(""); }}>
                  بررسی سناریو
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!activeReview}
        onClose={() => setActiveReview(null)}
        title="داوری مرحله پژوهش"
        subtitle="تصمیم معتبر هر مدیر علمی منتسب کافی است؛ تصمیم مبتنی بر نسخه قدیمی با خطای 409 STALE_REVISION رد می‌شود."
      >
        {activeReview && (
          <div className="space-y-4 text-right">
            <div className="rounded-xl bg-[#F3EBDD]/60 p-3 text-xs font-medium text-[#214031]">
              {activeReview.caseTitle} · {activeReview.stageName}
            </div>
            <label className="block text-xs font-medium text-[#214031]">
              نظر داوری
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
                placeholder="نکته‌های علمی یا دلیل نیاز به اصلاح..."
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setActiveReview(null)}>انصراف</Button>
              <Button variant="secondary" loading={busy} icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => void decide("REVISION_REQUIRED")}>
                درخواست اصلاح
              </Button>
              <Button variant="primary" loading={busy} onClick={() => void decide("APPROVED")}>
                تأیید مرحله
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!activeScenario}
        onClose={() => setActiveScenario(null)}
        title="داوری سناریو"
        subtitle="در صورت تأیید نهایی، وضعیت سناریو در پرونده ثبت می‌شود و تاریخچه نسخه‌ها باقی می‌ماند."
      >
        {activeScenario && (
          <div className="space-y-4 text-right">
            <div>
              <h3 className="font-semibold text-[#214031]">{activeScenario.title}</h3>
              <p className="mt-2 text-xs text-[#4F6659]">{activeScenario.summary}</p>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/55 p-3 text-xs text-[#214031]">
                {activeScenario.content}
              </pre>
            </div>
            <label className="block text-xs font-medium text-[#214031]">
              نظر داوری
              <textarea
                rows={3}
                required
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setActiveScenario(null)}>انصراف</Button>
              <Button variant="secondary" loading={busy} onClick={() => void decideScenario("CHANGES_REQUESTED")}>
                درخواست اصلاح
              </Button>
              <Button variant="primary" loading={busy} onClick={() => void decideScenario("APPROVED")}>
                تأیید سناریو
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
