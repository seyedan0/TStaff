import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CreateResearchCaseDto, SupervisorWorkspaceUser } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { useUnsavedChanges } from "../../shared/useUnsavedChanges.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { UnsavedChangesDialog } from "../../shared/ui/UnsavedChangesDialog.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

export const ProjectCreatePage: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedResearcherId = searchParams.get("researcherId") ?? "";

  const [interns, setInterns] = useState<SupervisorWorkspaceUser[]>([]);
  const [researcherId, setResearcherId] = useState(preselectedResearcherId);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState(() => `CASE-${Math.floor(100 + Math.random() * 900)}`);
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowRedirect, setAllowRedirect] = useState(false);

  const isDirty = !allowRedirect && !busy && (title.trim().length > 0 || subject.trim().length > 0);
  const blocker = useUnsavedChanges(isDirty);

  const loadInterns = useCallback(async () => {
    try {
      const workspace = await apiClient.get<{ users: SupervisorWorkspaceUser[]; total: number }>(
        "/scientific-supervisors/me/workspace",
      );
      const eligible = workspace.users.filter((u) => u.canCreateResearch && u.stage === "INTERN");
      setInterns(eligible);
      if (preselectedResearcherId && eligible.some((u) => u.id === preselectedResearcherId)) {
        setResearcherId(preselectedResearcherId);
      } else if (!preselectedResearcherId && eligible.length === 1) {
        setResearcherId(eligible[0]!.id);
      }
    } catch {
      setInterns([]);
    }
  }, [preselectedResearcherId]);

  useEffect(() => {
    void loadInterns();
  }, [loadInterns]);

  const backTarget = preselectedResearcherId
    ? `/supervision/users/${encodeURIComponent(preselectedResearcherId)}`
    : "/supervision/users";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researcherId) {
      onNotify("error", "انتخاب پژوهشگر الزامی است", "پژوهشگر مجاز دارای انتساب مستقیم را انتخاب کنید.");
      return;
    }
    if (title.trim().length < 3 || subject.trim().length < 2) {
      onNotify("error", "خطای اعتبارسنجی", "عنوان (حداقل ۳ حرف) و موضوع پژوهش الزامی است.");
      return;
    }

    setBusy(true);
    try {
      const payload: CreateResearchCaseDto = {
        title: title.trim(),
        code: code.trim(),
        subject: subject.trim(),
        researcherId,
      };
      const created = await apiClient.post<{ id: string }>("/research-cases", payload);
      setAllowRedirect(true);
      onNotify(
        "success",
        "پرونده پژوهشی ایجاد شد",
        `پرونده با کد ${payload.code} در مرحله آغازین منابع ایجاد گردید.`,
      );
      navigate(`/projects/${encodeURIComponent(created.id)}?researcherId=${encodeURIComponent(researcherId)}`, { replace: true });
    } catch (err) {
      onNotify("error", "خطا در ایجاد پرونده", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <UnsavedChangesDialog blocker={blocker} />
      <PageHeader
        title="ایجاد پرونده پژوهش جدید"
        subtitle="تعریف پژوهش برای کارورز دارای انتساب مستقیم و شروع چرخه چهارمرحله‌ای علمی"
        breadcrumbs={[
          { label: "پژوهشگران", to: "/supervision/users" },
          ...(preselectedResearcherId ? [{ label: "پروفایل پژوهشگر", to: backTarget }] : []),
          { label: "پرونده جدید" },
        ]}
        backTo={{ label: "بازگشت", to: backTarget }}
      />

      <Card variant="default" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <label className="block text-xs font-medium text-[#214031]">
            پژوهشگر (کارورز دارای انتساب مستقیم)
            <select
              required
              value={researcherId}
              onChange={(e) => setResearcherId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2.5 text-sm text-[#214031] focus:border-[#214E3A] focus:outline-none"
            >
              <option value="">انتخاب پژوهشگر...</option>
              {interns.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.phoneNumber})
                </option>
              ))}
            </select>
          </label>

          <Input
            label="عنوان پرونده پژوهشی"
            placeholder="مثال: بررسی تحولات زیست‌بوم آموزش محلی"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="کد یکتای پرونده"
              dir="ltr"
              placeholder="CASE-204"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Input
              label="حوزه و موضوع کلی"
              placeholder="مثال: آسیب‌شناسی آموزش"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#214E3A]/10 pt-4">
            <Button type="button" variant="ghost" onClick={() => navigate(backTarget)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              ثبت و ایجاد پرونده پژوهش
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

