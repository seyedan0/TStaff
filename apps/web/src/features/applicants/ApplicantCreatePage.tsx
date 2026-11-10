import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Database } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { IRAN_PROVINCES, type CreateApplicantDto, type ResourceBankItem } from "@tstaff/contracts";
import { ApiError, apiClient } from "../../shared/api-client.js";
import { useAuth } from "../auth/AuthContext.js";
import { useUnsavedChanges } from "../../shared/useUnsavedChanges.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { LoadingState } from "../../shared/ui/StateFeedback.js";
import { UnsavedChangesDialog } from "../../shared/ui/UnsavedChangesDialog.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;

interface SupervisorOption {
  id: string;
  fullName?: string | null;
  phoneNumber: string;
  role?: string | null;
  roles?: string[];
}

interface ScopeRecord {
  provinceId: string;
  revokedAt?: string | null;
}

export const ApplicantCreatePage: React.FC<{ onNotify: Notice }> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fromResourceId = searchParams.get("fromResourceId");

  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [allowedProvinceIds, setAllowedProvinceIds] = useState<string[]>([]);
  const [sourceResource, setSourceResource] = useState<ResourceBankItem | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [ageRaw, setAgeRaw] = useState("25");
  const [provinceId, setProvinceId] = useState("");
  const [education, setEducation] = useState("کارشناسی ارشد");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [initialSupervisorId, setInitialSupervisorId] = useState("");
  const [notes, setNotes] = useState("");
  const [ageError, setAgeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [allowRedirect, setAllowRedirect] = useState(false);

  const dirty = !allowRedirect && !busy && (fullName.trim().length > 0 || nationalId.trim().length > 0 || phoneNumber.trim().length > 0);
  const blocker = useUnsavedChanges(dirty);

  const loadInitial = useCallback(async () => {
    setLoadingInit(true);
    try {
      const managers = await apiClient.get<SupervisorOption[]>("/users/managers");
      setSupervisors(
        managers.filter((m) => (m.roles ?? (m.role ? [m.role] : [])).includes("SCIENTIFIC_SUPERVISOR")),
      );
    } catch {
      setSupervisors([]);
    }

    let scopedIds: string[] = [];
    if (currentUser?.role === "PROVINCIAL_DIRECTOR") {
      try {
        const scopes = await apiClient.get<ScopeRecord[]>("/organization/scopes");
        scopedIds = scopes.filter((s) => !s.revokedAt).map((s) => s.provinceId);
        setAllowedProvinceIds(scopedIds);
      } catch {
        setAllowedProvinceIds([]);
      }
    }

    if (fromResourceId) {
      try {
        const res = await apiClient.get<ResourceBankItem>(`/resource-bank/${encodeURIComponent(fromResourceId)}`);
        setSourceResource(res);
        setFullName(res.fullName);
        if (res.age && Number.isInteger(res.age)) setAgeRaw(String(res.age));
        if (res.contactInfo && /^09\d{9}$/.test(res.contactInfo.trim())) {
          setPhoneNumber(res.contactInfo.trim());
        }
        if (res.provinceId) {
          setProvinceId(res.provinceId);
        } else if (scopedIds[0]) {
          setProvinceId(scopedIds[0]);
        }
        setNotes(`معرفی‌شده از بانک منابع (${res.position || "بدون سمت"})`);
      } catch (err) {
        onNotify("error", "دریافت منبع جهت معرفی ناموفق بود", err instanceof Error ? err.message : undefined);
      }
    } else if (scopedIds.length > 0) {
      setProvinceId(scopedIds[0]!);
    }

    setLoadingInit(false);
  }, [currentUser?.role, fromResourceId, onNotify]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const provinceOptions = useMemo(() => {
    if (currentUser?.role !== "PROVINCIAL_DIRECTOR" || allowedProvinceIds.length === 0) {
      return IRAN_PROVINCES;
    }
    const allowedSet = new Set(allowedProvinceIds);
    if (sourceResource?.provinceId) allowedSet.add(sourceResource.provinceId);
    return IRAN_PROVINCES.filter((p) => allowedSet.has(p.id));
  }, [currentUser?.role, allowedProvinceIds, sourceResource?.provinceId]);

  const convertedReferral = sourceResource?.referrals.find((r) => r.applicantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgeError(null);

    if (!/^\d+$/.test(ageRaw.trim())) {
      setAgeError("سن باید فقط یک عدد صحیح مثبت باشد (اعشار پذیرفته نمی‌شود).");
      return;
    }
    const age = Number.parseInt(ageRaw.trim(), 10);
    if (!Number.isInteger(age) || age < 18 || age > 99) {
      setAgeError("سن معتبر متقاضی باید بین ۱۸ تا ۹۹ سال (عدد صحیح) باشد.");
      return;
    }
    if (!/^\d{10}$/.test(nationalId.trim())) {
      onNotify("error", "کد ملی نامعتبر است", "کد ملی باید دقیقاً ۱۰ رقم باشد.");
      return;
    }
    if (!/^09\d{9}$/.test(phoneNumber.trim())) {
      onNotify("error", "شماره تماس نامعتبر است", "شماره همراه باید با 09 شروع شده و ۱۱ رقم باشد.");
      return;
    }
    if (!provinceId || !initialSupervisorId) {
      onNotify("error", "تکمیل انتخاب‌ها الزامی است", "استان و مدیر علمی اولیه را انتخاب کنید.");
      return;
    }

    setBusy(true);
    try {
      const payload: CreateApplicantDto = {
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        phoneNumber: phoneNumber.trim(),
        age,
        provinceId,
        education: education.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        initialSupervisorId,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      const endpoint = fromResourceId
        ? `/resource-bank/${encodeURIComponent(fromResourceId)}/applicants`
        : "/applicants";
      const created = await apiClient.post<{ id: string }>(endpoint, payload);
      setAllowRedirect(true);
      onNotify("success", "پرونده متقاضی ایجاد شد", "پرونده بدون ساخت حساب کاربری در سامانه ثبت گردید (FR-001).");
      navigate(`/admissions/${encodeURIComponent(created.id)}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.problem.status === 409) {
        onNotify("warning", "ثبت تکراری مسدود شد (409)", err.problem.detail);
      } else {
        onNotify("error", "ثبت متقاضی انجام نشد", err instanceof Error ? err.message : undefined);
      }
    } finally {
      setBusy(false);
    }
  };

  const backTarget = fromResourceId ? `/resource-bank/${encodeURIComponent(fromResourceId)}` : "/admissions";

  if (loadingInit) return <LoadingState message="در حال آماده‌سازی فرم پذیرش..." />;

  return (
    <div className="space-y-5">
      <UnsavedChangesDialog blocker={blocker} />
      <PageHeader
        title="ثبت پرونده متقاضی جدید"
        subtitle="مطابق مصوبه D-01 و FR-001، سن فقط عدد صحیح است و تا پیش از تأیید علمی هیچ حساب کاربری ایجاد نمی‌شود."
        breadcrumbs={[
          { label: fromResourceId ? "بانک منابع" : "پذیرش متقاضیان", to: fromResourceId ? "/resource-bank" : "/admissions" },
          { label: "ثبت متقاضی جدید" },
        ]}
        backTo={{ label: "بازگشت", to: backTarget }}
      />

      {sourceResource && (
        <Card variant="outlined" className="max-w-2xl border-[#214E3A]/35 bg-[#FFFCF5] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#214E3A]">
            <Database className="h-4 w-4" />
            <span>پیش‌پرکردن اطلاعات از بانک منابع: {sourceResource.fullName}</span>
          </div>
          <p className="text-xs text-[#4F6659]">
            {sourceResource.position || "بدون سمت"} {sourceResource.province ? `· استان ${sourceResource.province}` : ""}
          </p>
          {convertedReferral?.applicantId && (
            <div className="rounded-xl bg-[#D94F3D]/10 p-2.5 text-xs font-semibold text-[#B83B2B]">
              این منبع قبلاً به پرونده پذیرش تبدیل شده است.{" "}
              <Link className="underline" to={`/admissions/${encodeURIComponent(convertedReferral.applicantId)}`}>
                مشاهده پرونده موجود
              </Link>
            </div>
          )}
        </Card>
      )}

      <Card variant="default" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <Input label="نام و نام خانوادگی" required value={fullName} onChange={(e) => setFullName(e.target.value)} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-xs font-medium text-[#214031]">
              استان
              <select
                required
                value={provinceId}
                onChange={(e) => setProvinceId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2.5 text-sm text-[#214031]"
              >
                <option value="">انتخاب استان...</option>
                {provinceOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-[#214031]">
              مدیر علمی اولیه برای مصاحبه و ارزیابی
              <select
                required
                value={initialSupervisorId}
                onChange={(e) => setInitialSupervisorId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2.5 text-sm text-[#214031]"
              >
                <option value="">انتخاب مدیر علمی...</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName || s.phoneNumber}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="کد ملی (۱۰ رقم)"
              dir="ltr"
              placeholder="1234567890"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              required
            />
            <Input
              label="شماره تلفن همراه"
              dir="ltr"
              placeholder="09121234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="سن (فقط عدد صحیح مثبت - D-01)"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={ageRaw}
              onChange={(e) => {
                setAgeRaw(e.target.value);
                setAgeError(null);
              }}
              error={ageError || undefined}
              hint="اعشار و متن پذیرفته نمی‌شود."
              required
            />
            <Input
              label="مقطع تحصیلی"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              required
            />
          </div>

          <Input
            label="رشته تحصیلی"
            placeholder="مثال: جامعه‌شناسی / مهندسی صنایع"
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            required
          />

          <label className="block text-xs font-medium text-[#214031]">
            توضیحات پذیرش (اختیاری)
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#214E3A]/10 pt-4">
            <Button type="button" variant="ghost" onClick={() => navigate(backTarget)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!!convertedReferral?.applicantId}>
              ثبت پیش‌نویس پرونده پذیرش
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

