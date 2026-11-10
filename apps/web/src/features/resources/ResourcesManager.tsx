import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Building2, FileCheck2, FileText, Mic, Plus, UserRound } from "lucide-react";
import { IRAN_PROVINCES, provinceIdFromName, provinceNameFromId, type StageStatus } from "@tstaff/contracts";
import { useUnsavedChanges } from "../../shared/useUnsavedChanges.js";
import { UnsavedChangesDialog } from "../../shared/ui/UnsavedChangesDialog.js";
import { apiClient } from "../../shared/api-client.js";
import type { ResourceItem } from "../../shared/types.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { EmptyState, LoadingState } from "../../shared/ui/StateFeedback.js";

type Notice = (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
type WizardStep = 1 | 2 | 3 | 4;

interface UploadedFile {
  id: string;
  originalName: string;
  size: number;
  scanStatus: "AVAILABLE" | "QUARANTINED" | "REJECTED";
}

export interface ResourcesManagerProps {
  caseId: string;
  caseTitle: string;
  onBack: () => void;
  onNotify: Notice;
  canEdit?: boolean;
  caseVersion: number;
  stageStatus: StageStatus;
  onWorkflowChanged: () => Promise<void>;
}

const steps = ["اطلاعات فردی", "مجموعه وابسته", "اطلاعات مصاحبه", "گزارش مکتوب"] as const;

export const ResourcesManager: React.FC<ResourcesManagerProps> = ({
  caseId,
  caseTitle,
  onBack,
  onNotify,
  canEdit = true,
  caseVersion,
  stageStatus,
  onWorkflowChanged,
}) => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { resourceId } = useParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useSearchParams();
  const wizardOpen = !!resourceId;
  const wizardStep = Math.min(4, Math.max(1, Number(query.get("step")) || 1)) as WizardStep;
  const setWizardStep = (step: WizardStep) => {
    const next = new URLSearchParams(query);
    next.set("step", String(step));
    setQuery(next);
  };
  const resourcePath = (id: string, step = 1) =>
    `/projects/${caseId}/resources/${id}?${new URLSearchParams({
      ...(query.get("researcherId") ? { researcherId: query.get("researcherId")! } : {}),
      step: String(step),
    })}`;
  const sourcePath = `/projects/${caseId}/stages/SOURCES${query.get("researcherId") ? `?researcherId=${query.get("researcherId")}` : ""}`;

  const loadedResource = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const skipNextBlockRef = useRef(false);
  const blocker = useUnsavedChanges(dirty && !skipNextBlockRef.current);

  useEffect(() => {
    skipNextBlockRef.current = false;
  }, [pathname, search]);

  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personAge, setPersonAge] = useState("");
  const [position, setPosition] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [county, setCounty] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [personDescription, setPersonDescription] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationEducation, setOrganizationEducation] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [interviewMode, setInterviewMode] = useState("حضوری");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().slice(0, 16));
  const [interviewDuration, setInterviewDuration] = useState("60");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const submitSources = async () => {
    setBusy(true);
    try {
      await apiClient.post(`/research-cases/${caseId}/resources/complete`, { expectedVersion: caseVersion });
      await onWorkflowChanged();
      onNotify("success", "منابع برای داوری ارسال شد", "مرحله بعد پس از تأیید مدیر علمی باز می‌شود.");
    } catch (error) {
      onNotify("error", "اتمام منابع انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<ResourceItem[]>(`/research-cases/${caseId}/resources`);
      setResources(data);
    } catch (error) {
      setResources([]);
      onNotify("error", "بارگذاری منابع انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [caseId, onNotify]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const resetPersonForm = () => {
    setSelectedResource(null);
    setPersonName("");
    setPersonAge("");
    setPosition("");
    setProvinceId("");
    setCounty("");
    setContactInfo("");
    setPersonDescription("");
    setOrganizationName("");
    setOrganizationEducation("");
    setOrganizationType("");
    setOrganizationDescription("");
    setInterviewMode("حضوری");
    setInterviewLocation("");
    setInterviewDate(new Date().toISOString().slice(0, 16));
    setInterviewDuration("60");
    setInterviewNotes("");
    setReportTitle("");
    setReportFile(null);
    setUploadedFile(null);
  };

  const startNew = () => navigate(resourcePath("new"));

  const populate = (resource: ResourceItem) => {
    resetPersonForm();
    setSelectedResource(resource);
    setPersonName(resource.title);
    setPersonAge(String(resource.personAge ?? ""));
    setPosition(resource.position ?? "");
    setProvinceId(resource.provinceId || provinceIdFromName(resource.province) || "");
    setCounty(resource.county ?? "");
    setContactInfo(resource.contactInfo ?? "");
    setPersonDescription(resource.description ?? "");
    setOrganizationName(resource.organization?.name ?? "");
    setOrganizationEducation(resource.organization?.educationLevel ?? "");
    setOrganizationType(resource.organization?.organizationType ?? "");
    setOrganizationDescription(resource.organization?.description ?? "");
    setInterviewMode(resource.interview?.mode ?? "حضوری");
    setInterviewLocation(resource.interview?.location ?? "");
    setInterviewNotes(resource.interview?.notes ?? "");
    setInterviewDate(
      resource.interview?.conductedAt
        ? new Date(resource.interview.conductedAt).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    );
    setInterviewDuration(String(resource.interview?.durationMinutes ?? 60));
  };

  const resume = (resource: ResourceItem) =>
    navigate(resourcePath(resource.id, !resource.organization ? 1 : !resource.interview ? 3 : 4));

  useEffect(() => {
    if (!resourceId) {
      loadedResource.current = null;
      return;
    }
    if (loading || loadedResource.current === resourceId) return;
    if (resourceId === "new") {
      resetPersonForm();
      loadedResource.current = resourceId;
      setDirty(false);
    } else {
      const resource = resources.find((item) => item.id === resourceId);
      if (resource) {
        populate(resource);
        loadedResource.current = resourceId;
        setDirty(false);
      }
    }
  }, [resourceId, loading, resources]);

  const savePerson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!personAge || !Number.isInteger(Number(personAge)) || Number(personAge) < 1) {
      onNotify("error", "سن نامعتبر است", "سن باید عدد صحیح مثبت باشد.");
      return;
    }
    setBusy(true);
    try {
      const resolvedProvinceName = provinceNameFromId(provinceId) ?? undefined;
      const data = {
        type: "INDIVIDUAL",
        title: personName.trim(),
        personAge: Number(personAge),
        position: position.trim(),
        ...(provinceId ? { provinceId, province: resolvedProvinceName } : {}),
        county: county.trim() || undefined,
        contactInfo: contactInfo.trim() || undefined,
        description: personDescription.trim() || undefined,
      };
      const resource = selectedResource
        ? await apiClient.patch<ResourceItem>(`/resources/${selectedResource.id}`, data)
        : await apiClient.post<ResourceItem>(`/research-cases/${caseId}/resources`, data);
      setSelectedResource((current) => (current ? { ...current, ...resource } : resource));
      setDirty(false);
      skipNextBlockRef.current = true;
      navigate(resourcePath(resource.id, 2), { replace: resourceId === "new" });
      await loadResources();
      await onWorkflowChanged();
      onNotify("success", "اطلاعات فرد ذخیره شد", "منبع به فهرست منابع پژوهش و بانک منابع افزوده شد.");
    } catch (error) {
      onNotify("error", "ذخیره اطلاعات فرد انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const saveOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedResource) return;
    setBusy(true);
    try {
      if (organizationName.trim()) {
        await apiClient.patch(`/resources/${selectedResource.id}/organization`, {
          name: organizationName.trim(),
          educationLevel: organizationEducation.trim(),
          organizationType: organizationType.trim(),
          description: organizationDescription.trim(),
        });
      }
      setDirty(false);
      skipNextBlockRef.current = true;
      setWizardStep(3);
      await loadResources();
      await onWorkflowChanged();
      onNotify("success", organizationName.trim() ? "مجموعه ذخیره شد" : "از ثبت مجموعه عبور شد");
    } catch (error) {
      onNotify("error", "ذخیره مجموعه انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const saveInterview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedResource) return;
    setBusy(true);
    try {
      const interviewData = {
        intervieweeName: personName.trim(),
        intervieweeAge: Number(personAge),
        conductedAt: new Date(interviewDate).toISOString(),
        durationMinutes: Number(interviewDuration),
        mode: interviewMode,
        location: interviewLocation.trim(),
        notes: interviewNotes.trim(),
      };
      const interview = selectedResource.interview?.id
        ? await apiClient.patch<NonNullable<ResourceItem["interview"]>>(`/interviews/${selectedResource.interview.id}`, interviewData)
        : await apiClient.post<NonNullable<ResourceItem["interview"]>>(`/resources/${selectedResource.id}/interview`, interviewData);
      setSelectedResource((current) =>
        current
          ? {
              ...current,
              interview: {
                ...interview,
                hasReport: current.interview?.hasReport ?? false,
                reportsCount: current.interview?.reportsCount ?? 0,
                latestReport: current.interview?.latestReport ?? null,
              },
            }
          : current,
      );
      setDirty(false);
      skipNextBlockRef.current = true;
      setWizardStep(4);
      await loadResources();
      await onWorkflowChanged();
      onNotify("success", "اطلاعات مصاحبه ذخیره شد", "برای هر منبع حداکثر یک مصاحبه ثبت می‌شود (D-07).");
    } catch (error) {
      onNotify("error", "ثبت مصاحبه انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const uploadReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedResource?.interview?.id || !reportFile) return;
    setBusy(true);
    try {
      const uploaded =
        uploadedFile?.scanStatus === "QUARANTINED"
          ? await apiClient.post<UploadedFile>(`/files/${uploadedFile.id}/rescan`)
          : await apiClient.upload<UploadedFile>("/files", reportFile);
      setUploadedFile(uploaded);
      if (uploaded.scanStatus !== "AVAILABLE") {
        onNotify("warning", "فایل در قرنطینه است", "تا پایان اسکن امنیتی، گزارش برای داوری یا دانلود قابل استفاده نیست.");
        return;
      }
      await apiClient.post(`/interviews/${selectedResource.interview.id}/reports`, {
        title: reportTitle.trim() || reportFile.name,
        fileId: uploaded.id,
      });
      await loadResources();
      await onWorkflowChanged();
      setDirty(false);
      skipNextBlockRef.current = true;
      navigate(sourcePath);
      onNotify("success", "گزارش مکتوب ثبت شد", "گزارش نسخه‌دار و به‌صورت خصوصی به مصاحبه پیوست شد.");
    } catch (error) {
      onNotify("error", "بارگذاری گزارش انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={wizardOpen ? () => navigate(sourcePath) : onBack} className="mb-1 text-xs font-semibold text-[#214E3A] hover:underline">
            ← بازگشت
          </button>
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#214031]">
            <FileText className="h-5 w-5 text-[#214E3A]" />
            منابع و مصاحبه‌ها
          </h3>
          <p className="mt-1 text-xs text-[#4F6659]">
            {caseTitle} · ثبت مرحله‌ای منابع (D-07: حداکثر یک مصاحبه برای هر منبع)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={!canEdit || resources.length === 0 || busy} onClick={() => void submitSources()}>
            اتمام منابع و ارسال برای تأیید
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} disabled={!canEdit} onClick={startNew}>
            افزودن منبع
          </Button>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-xs text-[#4F6659]">
          {stageStatus === "SUBMITTED"
            ? "منابع برای داوری ارسال شده و در کارتابل مدیر علمی قرار دارد."
            : stageStatus === "APPROVED"
              ? "مرحله منابع تأیید شده است و برای مشاهده سابقه فقط خواندنی است."
              : "این مرحله فعلاً فقط برای مشاهده در دسترس است."}
        </div>
      )}

      {!wizardOpen && (
        loading ? (
          <LoadingState message="در حال بارگذاری منابع..." />
        ) : resources.length === 0 ? (
          <EmptyState title="هنوز منبعی ثبت نشده است" description="برای شروع، روی دکمه «افزودن منبع» کلیک کنید." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {resources.map((resource) => (
              <Card key={resource.id} variant="default" className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <UserRound className="mt-0.5 h-4 w-4 text-[#214E3A]" />
                    <div>
                      <h4 className="font-bold text-[#214031]">{resource.title}</h4>
                      <p className="mt-1 text-xs text-[#4F6659]">
                        {resource.position || "سمت ثبت نشده"}
                        {resource.personAge ? ` · ${resource.personAge} سال` : ""}
                        {resource.province ? ` · ${resource.province}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant={resource.interview?.hasReport ? "success" : resource.interview ? "warning" : "neutral"} size="sm">
                    {resource.interview?.hasReport ? "تکمیل" : resource.interview ? "گزارش ناقص" : "در حال تکمیل"}
                  </Badge>
                </div>

                {resource.organization && (
                  <div className="flex items-center gap-2 text-xs text-[#4F6659]">
                    <Building2 className="h-3.5 w-3.5 text-[#214E3A]" />
                    <span>
                      {resource.organization.name} · {resource.organization.educationLevel || resource.organization.organizationType || ""}
                    </span>
                  </div>
                )}

                {resource.interview && (
                  <div className="flex items-center gap-2 text-xs text-[#4F6659]">
                    <Mic className="h-3.5 w-3.5 text-[#214E3A]" />
                    <span>
                      مصاحبه {resource.interview.hasReport ? "و گزارش ثبت شده" : "ثبت شده؛ گزارش در انتظار"}
                      {resource.interview.latestReport ? ` · نسخه ${resource.interview.latestReport.version}` : ""}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-[#214E3A]/10 pt-2">
                  {resource.interview?.latestReport?.storedObjectId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<FileCheck2 className="h-3.5 w-3.5" />}
                      onClick={() =>
                        void apiClient.download(
                          `/files/${resource.interview!.latestReport!.storedObjectId}/download`,
                          resource.interview!.latestReport!.title,
                        )
                      }
                    >
                      دانلود گزارش
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => resume(resource)}>
                    {!canEdit ? "مشاهده منبع" : resource.interview?.hasReport ? "ویرایش / نسخه جدید" : "ادامه فرم"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      <UnsavedChangesDialog blocker={blocker} />

      {wizardOpen && (
        <Card variant="elevated" className="space-y-4" onChange={() => setDirty(true)}>
          <div>
            <Link to={sourcePath} className="mb-2 inline-block text-xs font-semibold text-[#214E3A] underline">
              بازگشت به منابع پژوهش
            </Link>
            <h4 className="text-lg font-bold text-[#214031]">{selectedResource?.title ?? "ثبت منبع پژوهشی"}</h4>
            <p className="mt-1 text-xs text-[#4F6659]">
              {steps[wizardStep - 1]} · گام {wizardStep} از ۴
            </p>
          </div>

          {!loading && resourceId !== "new" && !selectedResource && (
            <p role="alert" className="text-xs font-semibold text-[#B83B2B]">
              منبع پیدا نشد یا دسترسی به آن مجاز نیست.
            </p>
          )}

          {!canEdit && selectedResource && (
            <dl className="grid gap-3 rounded-2xl bg-[#F3EBDD]/60 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-[#4F6659]">سن</dt><dd className="font-semibold text-[#214031]">{selectedResource.personAge ?? "ثبت نشده"}</dd></div>
              <div><dt className="text-xs text-[#4F6659]">سمت</dt><dd className="font-semibold text-[#214031]">{selectedResource.position || "ثبت نشده"}</dd></div>
              <div><dt className="text-xs text-[#4F6659]">استان / شهرستان</dt><dd className="font-semibold text-[#214031]">{selectedResource.province || "-"} / {selectedResource.county || "-"}</dd></div>
              <div><dt className="text-xs text-[#4F6659]">تماس</dt><dd className="font-semibold text-[#214031]">{selectedResource.contactInfo || "ثبت نشده"}</dd></div>
              <div><dt className="text-xs text-[#4F6659]">مجموعه</dt><dd className="font-semibold text-[#214031]">{selectedResource.organization?.name || "ثبت نشده"}</dd></div>
              <div><dt className="text-xs text-[#4F6659]">مصاحبه</dt><dd className="font-semibold text-[#214031]">{selectedResource.interview ? new Date(selectedResource.interview.conductedAt).toLocaleString("fa-IR") : "ثبت نشده"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-[#4F6659]">یادداشت مصاحبه</dt><dd className="text-xs leading-6 text-[#214031]">{selectedResource.interview?.notes || "ثبت نشده"}</dd></div>
              {selectedResource.interview?.latestReport?.storedObjectId && (
                <div className="sm:col-span-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void apiClient.download(
                        `/files/${selectedResource.interview!.latestReport!.storedObjectId}/download`,
                        selectedResource.interview!.latestReport!.title,
                      )
                    }
                  >
                    دریافت گزارش مکتوب
                  </Button>
                </div>
              )}
            </dl>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map((step, index) => {
              const target = (index + 1) as WizardStep;
              const available = canEdit && (target === 1 || !!selectedResource) && (target < 4 || !!selectedResource?.interview?.id);
              return (
                <button
                  type="button"
                  key={step}
                  disabled={!available}
                  onClick={() => {
                    skipNextBlockRef.current = true;
                    setWizardStep(target);
                  }}
                  className={`rounded-xl px-2 py-2 text-center text-xs font-medium disabled:opacity-40 ${
                    target === wizardStep
                      ? "bg-[#214E3A] text-[#FFFCF5]"
                      : target < wizardStep
                        ? "bg-[#214E3A]/15 text-[#214E3A]"
                        : "border border-[#214E3A]/15 bg-[#F3EBDD]/50 text-[#4F6659]"
                  }`}
                >
                  {index + 1}. {step}
                </button>
              );
            })}
          </div>

          {wizardStep === 1 && canEdit && (
            <form onSubmit={savePerson} className="grid gap-3 text-right md:grid-cols-2">
              <Input label="نام و نام خانوادگی" required value={personName} onChange={(event) => setPersonName(event.target.value)} />
              <Input label="سن (عدد صحیح مثبت)" required type="number" min="1" step="1" value={personAge} onChange={(event) => setPersonAge(event.target.value)} />
              <Input label="سمت / شغل" required value={position} onChange={(event) => setPosition(event.target.value)} placeholder="مثلاً معلم ریاضی" />
              <label className="block text-xs font-medium text-[#214031]">
                استان
                <select
                  value={provinceId}
                  onChange={(event) => setProvinceId(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2.5 text-sm text-[#214031]"
                >
                  <option value="">انتخاب استان...</option>
                  {IRAN_PROVINCES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="شهرستان" value={county} onChange={(event) => setCounty(event.target.value)} />
              <Input label="راه ارتباطی" value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} />
              <label className="block text-xs font-medium text-[#214031] md:col-span-2">
                توضیحات فرد
                <textarea
                  rows={3}
                  value={personDescription}
                  onChange={(event) => setPersonDescription(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
                />
              </label>
              <div className="flex justify-end md:col-span-2">
                <Button type="submit" variant="primary" loading={busy}>ذخیره فرد و ادامه</Button>
              </div>
            </form>
          )}

          {wizardStep === 2 && canEdit && (
            <form onSubmit={saveOrganization} className="space-y-3 text-right">
              <p className="text-xs text-[#4F6659]">اطلاعات مجموعه اختیاری است. اگر فرد در مجموعه‌ای کار می‌کند، مشخصات آن را ثبت کنید.</p>
              <Input label="نام مجموعه" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="مثلاً دبیرستان علامه" />
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="مقطع / دوره" value={organizationEducation} onChange={(event) => setOrganizationEducation(event.target.value)} placeholder="دوره اول متوسطه" />
                <Input label="نوع مجموعه" value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} placeholder="مدرسه هیئت امنایی" />
              </div>
              <label className="block text-xs font-medium text-[#214031]">
                توضیحات مجموعه
                <textarea
                  rows={3}
                  value={organizationDescription}
                  onChange={(event) => setOrganizationDescription(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
                />
              </label>
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setWizardStep(1)}>بازگشت</Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => setWizardStep(3)}>بدون مجموعه، ادامه</Button>
                  <Button type="submit" variant="primary" loading={busy}>ذخیره مجموعه و ادامه</Button>
                </div>
              </div>
            </form>
          )}

          {wizardStep === 3 && canEdit && (
            <form onSubmit={saveInterview} className="space-y-3 text-right">
              <p className="text-xs text-[#4F6659]">برای هر منبع یک مصاحبه ثبت می‌شود؛ ویرایش اطلاعات همان مصاحبه را به‌روزرسانی می‌کند.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="نام مصاحبه‌شونده" required value={personName} onChange={(event) => setPersonName(event.target.value)} />
                <Input label="سن" required type="number" min="1" step="1" value={personAge} onChange={(event) => setPersonAge(event.target.value)} />
                <Input label="شیوه مصاحبه" required value={interviewMode} onChange={(event) => setInterviewMode(event.target.value)} />
                <Input label="مدت (دقیقه)" required type="number" min="1" step="1" value={interviewDuration} onChange={(event) => setInterviewDuration(event.target.value)} />
                <Input label="تاریخ و ساعت" required type="datetime-local" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} />
                <Input label="مکان / پیوند" value={interviewLocation} onChange={(event) => setInterviewLocation(event.target.value)} />
              </div>
              <label className="block text-xs font-medium text-[#214031]">
                یادداشت مصاحبه
                <textarea
                  rows={3}
                  value={interviewNotes}
                  onChange={(event) => setInterviewNotes(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
                />
              </label>
              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setWizardStep(2)}>بازگشت</Button>
                <Button type="submit" variant="primary" loading={busy}>ثبت مصاحبه و ادامه</Button>
              </div>
            </form>
          )}

          {wizardStep === 4 && canEdit && (
            <form onSubmit={uploadReport} className="space-y-3 text-right">
              {selectedResource?.interview?.hasReport && (
                <p className="text-xs font-semibold text-[#B83B2B]">
                  نسخه {selectedResource.interview.latestReport?.version} قبلاً ثبت شده است؛ فایل جدید به‌عنوان نسخه بعدی نگهداری می‌شود.
                </p>
              )}
              <p className="text-xs text-[#4F6659]">
                گزارش مکتوب با محدودیت ۲۵ مگابایت و صرفاً در قالب PDF یا DOCX پذیرفته می‌شود. فایل تا تأیید اسکن در دسترس دانلود نیست.
              </p>
              <Input label="عنوان گزارش" value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} placeholder="گزارش مصاحبه با ..." />
              <label className="block text-xs font-medium text-[#214031]">
                فایل گزارش (PDF یا DOCX)
                <input
                  required
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setReportFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-xs text-[#214031] file:ml-3 file:rounded-xl file:border-0 file:bg-[#214E3A] file:px-3 file:py-2 file:text-[#FFFCF5]"
                />
              </label>
              {uploadedFile?.scanStatus === "QUARANTINED" && (
                <p className="text-xs font-medium text-[#B83B2B]">
                  فایل در انتظار اسکن امنیتی است؛ پس از پایان اسکن دوباره ادامه دهید.
                </p>
              )}
              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setWizardStep(3)}>بازگشت</Button>
                <Button type="submit" variant="primary" loading={busy} disabled={!reportFile}>بارگذاری و ثبت گزارش</Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
};
