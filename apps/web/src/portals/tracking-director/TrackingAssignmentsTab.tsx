import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react";
import type { CaseSupervisorDto, DirectoryUserDto, SupervisorRole } from "@tstaff/contracts";
import { getRoleLabel } from "../../app/navigation.js";
import { apiClient } from "../../shared/api-client.js";
import type { ResearchCaseItem } from "../../shared/types.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { LoadingState } from "../../shared/ui/StateFeedback.js";

interface TrackingAssignmentsTabProps {
  managers: Array<{ id: string; fullName: string; phoneNumber: string; role: string; isActive: boolean }>;
  onNotify: (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
}

interface UserSupervisorRow {
  id: string;
  supervisorId: string;
  supervisorName: string;
  phoneNumber: string;
  isPrimary: boolean;
  assignedAt: string;
}

interface UserGrantRow {
  managerId: string;
  userId: string;
  assignedAt: string;
}

export const TrackingAssignmentsTab: React.FC<TrackingAssignmentsTabProps> = ({ managers, onNotify }) => {
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUserDto[]>([]);
  const [cases, setCases] = useState<ResearchCaseItem[]>([]);
  const [grants, setGrants] = useState<UserGrantRow[]>([]);
  const [loading, setLoading] = useState(true);

  // User-level scientific supervisors
  const [selectedTraineeId, setSelectedTraineeId] = useState("");
  const [userSupervisors, setUserSupervisors] = useState<UserSupervisorRow[]>([]);
  const [newUserSupId, setNewUserSupId] = useState("");

  // Case-level scientific supervisors & atomic main replacement
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [caseSupervisors, setCaseSupervisors] = useState<CaseSupervisorDto[]>([]);
  const [newCaseSupId, setNewCaseSupId] = useState("");
  const [newCaseSupRole, setNewCaseSupRole] = useState<SupervisorRole>("COLLABORATOR_SUPERVISOR");
  const [replacementMainSupId, setReplacementMainSupId] = useState("");

  // Specific user-manager access grant
  const [grantManagerId, setGrantManagerId] = useState("");
  const [grantUserId, setGrantUserId] = useState("");

  const [busy, setBusy] = useState(false);

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, casesRes, grantsRes] = await Promise.all([
        apiClient.get<DirectoryUserDto[]>("/users"),
        apiClient.get<ResearchCaseItem[]>("/research-cases/directory"),
        apiClient.get<UserGrantRow[]>("/organization/user-grants").catch(() => []),
      ]);
      setDirectoryUsers(usersRes);
      setCases(casesRes);
      setGrants(grantsRes);
    } catch (err) {
      onNotify("error", "بارگذاری اطلاعات انتساب ناموفق بود", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const loadUserSupervisors = useCallback(async (userId: string) => {
    if (!userId) {
      setUserSupervisors([]);
      return;
    }
    try {
      setUserSupervisors(await apiClient.get<UserSupervisorRow[]>(`/users/${encodeURIComponent(userId)}/scientific-supervisors`));
    } catch (err) {
      setUserSupervisors([]);
      onNotify("error", "دریافت انتساب‌های کاربر ناموفق بود", err instanceof Error ? err.message : undefined);
    }
  }, [onNotify]);

  const loadCaseSupervisors = useCallback(async (caseId: string) => {
    if (!caseId) {
      setCaseSupervisors([]);
      return;
    }
    try {
      setCaseSupervisors(await apiClient.get<CaseSupervisorDto[]>(`/research-cases/${encodeURIComponent(caseId)}/supervisors`));
    } catch (err) {
      setCaseSupervisors([]);
      onNotify("error", "دریافت مدیران پرونده ناموفق بود", err instanceof Error ? err.message : undefined);
    }
  }, [onNotify]);

  const supervisors = managers.filter((m) => m.role === "SCIENTIFIC_SUPERVISOR" && m.isActive);
  const trainees = directoryUsers.filter((u) => u.roles.includes("APPRENTICE") || u.roles.includes("INTERN"));

  const addUserSupervisor = async () => {
    if (!selectedTraineeId || !newUserSupId) return;
    setBusy(true);
    try {
      await apiClient.post(`/users/${encodeURIComponent(selectedTraineeId)}/scientific-supervisors`, {
        supervisorId: newUserSupId,
      });
      setNewUserSupId("");
      onNotify("success", "مدیر علمی به کاربر منتسب شد");
      await loadUserSupervisors(selectedTraineeId);
    } catch (err) {
      onNotify("error", "ثبت انتساب کاربر انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const revokeUserSupervisor = async (supervisorId: string) => {
    if (!selectedTraineeId) return;
    setBusy(true);
    try {
      await apiClient.delete(`/users/${encodeURIComponent(selectedTraineeId)}/scientific-supervisors/${encodeURIComponent(supervisorId)}`);
      onNotify("info", "انتساب مدیر علمی لغو شد");
      await loadUserSupervisors(selectedTraineeId);
    } catch (err) {
      onNotify("error", "لغو انتساب انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const addCaseSupervisor = async () => {
    if (!selectedCaseId || !newCaseSupId) return;
    setBusy(true);
    try {
      await apiClient.post(`/research-cases/${encodeURIComponent(selectedCaseId)}/supervisors`, {
        userId: newCaseSupId,
        role: newCaseSupRole,
      });
      setNewCaseSupId("");
      onNotify("success", "مدیر علمی به پرونده اضافه شد");
      await loadCaseSupervisors(selectedCaseId);
    } catch (err) {
      onNotify("error", "انتساب به پرونده انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const replaceMainSupervisor = async () => {
    if (!selectedCaseId || !replacementMainSupId) return;
    setBusy(true);
    try {
      await apiClient.put(`/research-cases/${encodeURIComponent(selectedCaseId)}/supervisors/main`, {
        supervisorId: replacementMainSupId,
      });
      setReplacementMainSupId("");
      onNotify("success", "مدیر علمی اصلی جایگزین شد", "تغییر به‌صورت اتمی و با ثبت ممیزی انجام شد (D-02 / D-04).");
      await loadCaseSupervisors(selectedCaseId);
    } catch (err) {
      onNotify("error", "تعویض مدیر علمی اصلی انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const revokeCaseSupervisor = async (supervisorId: string) => {
    if (!selectedCaseId) return;
    setBusy(true);
    try {
      await apiClient.delete(`/research-cases/${encodeURIComponent(selectedCaseId)}/supervisors/${encodeURIComponent(supervisorId)}`);
      onNotify("info", "انتساب مدیر از پرونده حذف شد", "سوابق داوری پیشین همچنان حفظ می‌شوند.");
      await loadCaseSupervisors(selectedCaseId);
    } catch (err) {
      onNotify("error", "لغو انتساب پرونده انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const assignUserGrant = async () => {
    if (!grantManagerId || !grantUserId) return;
    setBusy(true);
    try {
      await apiClient.post("/organization/user-grants", { managerId: grantManagerId, userId: grantUserId });
      setGrantManagerId("");
      setGrantUserId("");
      onNotify("success", "مجوز دسترسی موردی به کاربر ثبت شد");
      setGrants(await apiClient.get<UserGrantRow[]>("/organization/user-grants"));
    } catch (err) {
      onNotify("error", "ثبت مجوز دسترسی انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const revokeUserGrant = async (managerId: string, userId: string) => {
    setBusy(true);
    try {
      await apiClient.delete(`/organization/user-grants/${encodeURIComponent(managerId)}/${encodeURIComponent(userId)}`);
      onNotify("info", "مجوز دسترسی لغو شد");
      setGrants(await apiClient.get<UserGrantRow[]>("/organization/user-grants"));
    } catch (err) {
      onNotify("error", "لغو مجوز دسترسی انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="در حال بارگذاری اطلاعات انتساب..." />;

  const findName = (id: string) =>
    directoryUsers.find((u) => u.id === id)?.fullName ?? managers.find((m) => m.id === id)?.fullName ?? id;

  return (
    <div className="space-y-5">
      {/* Section 1: User-Level Supervisor Assignments */}
      <Card
        variant="default"
        title={
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#214E3A]" />
            انتساب مدیر علمی در سطح کاربر (کارآموز / کارورز)
          </span>
        }
        subtitle="انتساب به کاربر، دسترسی مشاهده پروفایل فرد و پژوهش‌های او را فعال می‌کند."
        action={
          <Button variant="ghost" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void loadBase()}>
            به‌روزرسانی
          </Button>
        }
      >
        <div className="space-y-4">
          <label className="block max-w-xl text-xs font-medium text-[#214031]">
            انتخاب کاربر (کارآموز / کارورز)
            <select
              value={selectedTraineeId}
              onChange={(e) => {
                setSelectedTraineeId(e.target.value);
                void loadUserSupervisors(e.target.value);
              }}
              className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-sm text-[#214031]"
            >
              <option value="">انتخاب کنید...</option>
              {trainees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} · {u.phoneNumber} ({u.stage === "INTERN" ? "کارورز" : "کارآموز"})
                </option>
              ))}
            </select>
          </label>

          {selectedTraineeId && (
            <div className="space-y-3 border-t border-[#214E3A]/10 pt-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-60 flex-1 text-xs font-medium text-[#214031]">
                  افزودن مدیر علمی
                  <select
                    value={newUserSupId}
                    onChange={(e) => setNewUserSupId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-xs text-[#214031]"
                  >
                    <option value="">انتخاب مدیر علمی...</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName} · {s.phoneNumber}</option>
                    ))}
                  </select>
                </label>
                <Button variant="primary" size="sm" loading={busy} disabled={!newUserSupId} onClick={() => void addUserSupervisor()}>
                  افزودن مدیر علمی
                </Button>
              </div>

              {userSupervisors.length === 0 ? (
                <p className="text-xs text-[#4F6659]">هنوز مدیر علمی برای این کاربر ثبت نشده است.</p>
              ) : (
                <div className="space-y-2">
                  {userSupervisors.map((sup) => (
                    <div key={sup.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/45 p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-[#214031]">{sup.supervisorName}</strong>
                        <span dir="ltr" className="font-mono text-[#4F6659]">{sup.phoneNumber}</span>
                        <Badge variant={sup.isPrimary ? "info" : "neutral"} size="sm">
                          {sup.isPrimary ? "مدیر اصلی" : "مدیر همکار"}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5 text-[#D94F3D]" />} loading={busy} onClick={() => void revokeUserSupervisor(sup.supervisorId)}>
                        لغو
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Section 2: Case-Level Supervisor Assignment & Atomic Main Replacement */}
      <Card
        variant="default"
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#214E3A]" />
            انتساب و تعویض مدیر علمی در سطح پرونده پژوهشی (D-02)
          </span>
        }
        subtitle="هر پژوهش دقیقاً یک مدیر اصلی فعال و حداکثر یک همکار فعال دارد. تعویض مدیر اصلی اتمی است."
      >
        <div className="space-y-4">
          <label className="block max-w-xl text-xs font-medium text-[#214031]">
            انتخاب پرونده پژوهشی
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                void loadCaseSupervisors(e.target.value);
              }}
              className="mt-1.5 w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-sm text-[#214031]"
            >
              <option value="">انتخاب پرونده...</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.code} · {c.title}</option>
              ))}
            </select>
          </label>

          {selectedCaseId && (
            <div className="space-y-4 border-t border-[#214E3A]/10 pt-3">
              {caseSupervisors.length === 0 ? (
                <p className="text-xs text-[#4F6659]">مدیر فعالی برای این پرونده ثبت نشده است.</p>
              ) : (
                <div className="space-y-2">
                  {caseSupervisors.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/45 p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-[#214031]">{entry.fullName}</strong>
                        <span dir="ltr" className="font-mono text-[#4F6659]">{entry.phoneNumber}</span>
                        <Badge variant={entry.role === "MAIN_SUPERVISOR" ? "success" : "info"} size="sm">
                          {entry.role === "MAIN_SUPERVISOR" ? "مدیر علمی اصلی" : "مدیر علمی همکار"}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5 text-[#D94F3D]" />} loading={busy} onClick={() => void revokeCaseSupervisor(entry.userId)}>
                        حذف از پرونده
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/30 p-3">
                  <div className="text-xs font-bold text-[#214031]">افزودن مدیر به پرونده</div>
                  <select
                    value={newCaseSupId}
                    onChange={(e) => setNewCaseSupId(e.target.value)}
                    className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2 text-xs text-[#214031]"
                  >
                    <option value="">انتخاب مدیر علمی...</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                  <select
                    value={newCaseSupRole}
                    onChange={(e) => setNewCaseSupRole(e.target.value as SupervisorRole)}
                    className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2 text-xs text-[#214031]"
                  >
                    <option value="COLLABORATOR_SUPERVISOR">مدیر علمی همکار</option>
                    <option value="MAIN_SUPERVISOR">مدیر علمی اصلی</option>
                  </select>
                  <Button variant="secondary" size="sm" loading={busy} disabled={!newCaseSupId} onClick={() => void addCaseSupervisor()}>
                    ثبت در پرونده
                  </Button>
                </div>

                <div className="space-y-2 rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/30 p-3">
                  <div className="text-xs font-bold text-[#214031]">تعویض اتمی مدیر اصلی</div>
                  <select
                    value={replacementMainSupId}
                    onChange={(e) => setReplacementMainSupId(e.target.value)}
                    className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2 text-xs text-[#214031]"
                  >
                    <option value="">انتخاب مدیر علمی جایگزین...</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                  <Button variant="primary" size="sm" loading={busy} disabled={!replacementMainSupId} onClick={() => void replaceMainSupervisor()}>
                    جایگزینی مدیر اصلی
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Section 3: Explicit User-Manager Grants */}
      <Card
        variant="default"
        title={
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#214E3A]" />
            مجوزهای دسترسی موردی بین مدیران و کاربران
          </span>
        }
        subtitle="اعطا یا لغو دسترسی مستقیم یک مدیر به کاربر مشخص (علاوه بر قلمرو استان یا انتساب پرونده)"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 md:items-end">
            <label className="block space-y-1 text-xs font-medium text-[#214031]">
              مدیر هدف
              <select
                value={grantManagerId}
                onChange={(e) => setGrantManagerId(e.target.value)}
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-xs text-[#214031]"
              >
                <option value="">انتخاب مدیر...</option>
                {managers.filter((m) => m.isActive).map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName} ({getRoleLabel(m.role as never)})</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-[#214031]">
              کاربر
              <select
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-2.5 text-xs text-[#214031]"
              >
                <option value="">انتخاب کاربر...</option>
                {directoryUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} · {u.phoneNumber}</option>
                ))}
              </select>
            </label>
            <Button variant="primary" size="sm" loading={busy} disabled={!grantManagerId || !grantUserId} onClick={() => void assignUserGrant()}>
              اعطای مجوز دسترسی
            </Button>
          </div>

          {grants.length > 0 && (
            <div className="space-y-2 border-t border-[#214E3A]/10 pt-3">
              {grants.map((grant) => (
                <div key={`${grant.managerId}-${grant.userId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/45 p-3 text-xs">
                  <span>
                    <strong className="text-[#214031]">{findName(grant.managerId)}</strong>
                    <span className="mx-1.5 text-[#4F6659]">←</span>
                    <strong className="text-[#214031]">{findName(grant.userId)}</strong>
                  </span>
                  <Button variant="ghost" size="sm" loading={busy} onClick={() => void revokeUserGrant(grant.managerId, grant.userId)}>
                    لغو مجوز
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

