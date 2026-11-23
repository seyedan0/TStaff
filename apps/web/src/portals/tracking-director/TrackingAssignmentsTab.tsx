import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, ShieldCheck, UserCheck, Users } from "lucide-react";
import type { CaseSupervisorDto, DirectoryUserDto } from "@tstaff/contracts";
import { getRoleLabel } from "../../app/navigation.js";
import { apiClient } from "../../shared/api-client.js";
import type { ResearchCaseItem } from "../../shared/types.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { LoadingState } from "../../shared/ui/StateFeedback.js";

interface TrackingAssignmentsTabProps {
  managers: Array<{
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    isActive: boolean;
  }>;
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

interface UserSupervisorRow {
  id: string;
  supervisorId: string;
  supervisorName: string;
  phoneNumber: string;
  isPrimary: boolean;
  assignedAt: string;
  revokedAt?: string | null;
}

interface UserGrantRow {
  managerId: string;
  userId: string;
  assignedAt: string;
}

export const TrackingAssignmentsTab: React.FC<TrackingAssignmentsTabProps> = ({
  managers,
  onNotify,
}) => {
  const [searchParams] = useSearchParams();
  const requestedUserId = searchParams.get("userId");
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUserDto[]>([]);
  const [cases, setCases] = useState<ResearchCaseItem[]>([]);
  const [grants, setGrants] = useState<UserGrantRow[]>([]);
  const [loading, setLoading] = useState(true);

  // User-level scientific supervisors
  const [selectedTraineeId, setSelectedTraineeId] = useState("");
  const [userSupervisors, setUserSupervisors] = useState<UserSupervisorRow[]>(
    [],
  );
  const [newUserSupId, setNewUserSupId] = useState("");

  // Case-level scientific supervisors & atomic main replacement
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [caseSupervisors, setCaseSupervisors] = useState<CaseSupervisorDto[]>(
    [],
  );

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
        apiClient
          .get<UserGrantRow[]>("/organization/user-grants")
          .catch(() => []),
      ]);
      setDirectoryUsers(usersRes);
      setCases(casesRes);
      setGrants(grantsRes);
    } catch (err) {
      onNotify(
        "error",
        "بارگذاری اطلاعات انتساب ناموفق بود",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const loadUserSupervisors = useCallback(
    async (userId: string) => {
      if (!userId) {
        setUserSupervisors([]);
        return;
      }
      try {
        setUserSupervisors(
          await apiClient.get<UserSupervisorRow[]>(
            `/users/${encodeURIComponent(userId)}/scientific-supervisors`,
          ),
        );
      } catch (err) {
        setUserSupervisors([]);
        onNotify(
          "error",
          "دریافت انتساب‌های کاربر ناموفق بود",
          err instanceof Error ? err.message : undefined,
        );
      }
    },
    [onNotify],
  );

  useEffect(() => {
    if (
      !requestedUserId ||
      !directoryUsers.some((user) => user.id === requestedUserId)
    )
      return;
    setSelectedTraineeId(requestedUserId);
    void loadUserSupervisors(requestedUserId);
  }, [directoryUsers, loadUserSupervisors, requestedUserId]);

  const loadCaseSupervisors = useCallback(
    async (caseId: string) => {
      if (!caseId) {
        setCaseSupervisors([]);
        return;
      }
      try {
        setCaseSupervisors(
          await apiClient.get<CaseSupervisorDto[]>(
            `/research-cases/${encodeURIComponent(caseId)}/supervisors`,
          ),
        );
      } catch (err) {
        setCaseSupervisors([]);
        onNotify(
          "error",
          "دریافت مدیران پرونده ناموفق بود",
          err instanceof Error ? err.message : undefined,
        );
      }
    },
    [onNotify],
  );

  const supervisors = managers.filter(
    (m) => m.role === "SCIENTIFIC_SUPERVISOR" && m.isActive,
  );
  const trainees = directoryUsers.filter(
    (u) => u.roles.includes("APPRENTICE") || u.roles.includes("INTERN"),
  );

  const addUserSupervisor = async () => {
    if (!selectedTraineeId || !newUserSupId) return;
    setBusy(true);
    try {
      await apiClient.post(
        `/users/${encodeURIComponent(selectedTraineeId)}/scientific-supervisors`,
        {
          supervisorId: newUserSupId,
        },
      );
      setNewUserSupId("");
      onNotify("success", "مدیر علمی به کاربر منتسب شد");
      await loadUserSupervisors(selectedTraineeId);
    } catch (err) {
      onNotify(
        "error",
        "ثبت انتساب کاربر انجام نشد",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const assignUserGrant = async () => {
    if (!grantManagerId || !grantUserId) return;
    setBusy(true);
    try {
      await apiClient.post("/organization/user-grants", {
        managerId: grantManagerId,
        userId: grantUserId,
      });
      setGrantManagerId("");
      setGrantUserId("");
      onNotify("success", "مجوز دسترسی موردی به کاربر ثبت شد");
      setGrants(
        await apiClient.get<UserGrantRow[]>("/organization/user-grants"),
      );
    } catch (err) {
      onNotify(
        "error",
        "ثبت مجوز دسترسی انجام نشد",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const revokeUserGrant = async (managerId: string, userId: string) => {
    setBusy(true);
    try {
      await apiClient.delete(
        `/organization/user-grants/${encodeURIComponent(managerId)}/${encodeURIComponent(userId)}`,
      );
      onNotify("info", "مجوز دسترسی لغو شد");
      setGrants(
        await apiClient.get<UserGrantRow[]>("/organization/user-grants"),
      );
    } catch (err) {
      onNotify(
        "error",
        "لغو مجوز دسترسی انجام نشد",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return <LoadingState message="در حال بارگذاری اطلاعات انتساب..." />;

  const findName = (id: string) =>
    directoryUsers.find((u) => u.id === id)?.fullName ??
    managers.find((m) => m.id === id)?.fullName ??
    id;

  return (
    <div className="space-y-5">
      {/* Section 1: User-Level Supervisor Assignments */}
      <Card
        variant="default"
        title={
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#087674]" />
            انتساب مدیر علمی در سطح کاربر (کارآموز / کارورز)
          </span>
        }
        subtitle="انتساب به کاربر، دسترسی مشاهده پروفایل فرد و پژوهش‌های او را فعال می‌کند."
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => void loadBase()}
          >
            به‌روزرسانی
          </Button>
        }
      >
        <div className="space-y-4">
          <label className="block max-w-xl text-xs font-medium text-[#162F48]">
            انتخاب کاربر (کارآموز / کارورز)
            <select
              value={selectedTraineeId}
              onChange={(e) => {
                setSelectedTraineeId(e.target.value);
                void loadUserSupervisors(e.target.value);
              }}
              className="mt-1.5 w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] p-2.5 text-sm text-[#162F48]"
            >
              <option value="">انتخاب کنید...</option>
              {trainees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} · {u.phoneNumber} (
                  {u.stage === "INTERN" ? "کارورز" : "کارآموز"})
                </option>
              ))}
            </select>
          </label>

          {selectedTraineeId && (
            <div className="space-y-3 border-t border-[#087674]/10 pt-3">
              {userSupervisors.length === 0 ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-60 flex-1 text-xs font-medium text-[#162F48]">
                    تخصیص نخستین مدیر علمی
                    <select
                      value={newUserSupId}
                      onChange={(e) => setNewUserSupId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] p-2.5 text-xs text-[#162F48]"
                    >
                      <option value="">انتخاب مدیر علمی فعال...</option>
                      {supervisors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} · {s.phoneNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={busy}
                    disabled={!newUserSupId}
                    onClick={() => void addUserSupervisor()}
                  >
                    تخصیص نخستین مدیر
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {userSupervisors.map((sup) => (
                    <div
                      key={sup.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#087674]/15 bg-[#EAF3FA]/45 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <strong className="text-[#162F48]">
                          {sup.supervisorName}
                        </strong>
                        <span dir="ltr" className="font-mono text-[#496479]">
                          {sup.phoneNumber}
                        </span>
                        <Badge
                          variant={sup.revokedAt ? "warning" : "success"}
                          size="sm"
                        >
                          {sup.revokedAt
                            ? "انتساب پیشین لغوشده"
                            : "مدیر علمی یکتا"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-[#496479]">
                    این سابقه ثابت می‌ماند؛ مدیر دیگری برای این حساب جایگزین
                    نمی‌شود.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* D-09: case assignments are read-only and must match the owner's single supervisor. */}
      <Card
        variant="default"
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#087674]" />
            مدیر علمی ثبت‌شده در پرونده پژوهش (D-09)
          </span>
        }
        subtitle="مدیر پرونده باید همان مدیر علمی مادام‌العمر پژوهشگر باشد؛ افزودن همکار یا جایگزین ممکن نیست."
      >
        <div className="space-y-4">
          <label className="block max-w-xl text-xs font-medium text-[#162F48]">
            انتخاب پرونده پژوهشی
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                void loadCaseSupervisors(e.target.value);
              }}
              className="mt-1.5 w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] p-2.5 text-sm text-[#162F48]"
            >
              <option value="">انتخاب پرونده...</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title}
                </option>
              ))}
            </select>
          </label>

          {selectedCaseId && (
            <div className="space-y-4 border-t border-[#087674]/10 pt-3">
              {caseSupervisors.length === 0 ? (
                <p className="text-xs text-[#496479]">
                  برای این پرونده انتساب ثبت نشده است؛ مالک پرونده و سابقهٔ مدیر
                  او را بررسی کنید.
                </p>
              ) : (
                <div className="space-y-2">
                  {caseSupervisors.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#087674]/15 bg-[#EAF3FA]/45 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <strong className="text-[#162F48]">
                          {entry.fullName}
                        </strong>
                        <span dir="ltr" className="font-mono text-[#496479]">
                          {entry.phoneNumber}
                        </span>
                        <Badge
                          variant={
                            entry.role === "MAIN_SUPERVISOR"
                              ? "success"
                              : "info"
                          }
                          size="sm"
                        >
                          {entry.role === "MAIN_SUPERVISOR"
                            ? "مدیر علمی پرونده"
                            : "سابقهٔ همکار؛ نیازمند رسیدگی"}
                        </Badge>
                        {!entry.isActive && (
                          <Badge variant="warning" size="sm">
                            غیرفعال
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Section 3: Explicit User-Manager Grants */}
      <Card
        variant="default"
        title={
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#087674]" />
            مجوزهای دسترسی موردی بین مدیران و کاربران
          </span>
        }
        subtitle="اعطا یا لغو دسترسی مستقیم یک مدیر به کاربر مشخص (علاوه بر قلمرو استان یا انتساب پرونده)"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 md:items-end">
            <label className="block space-y-1 text-xs font-medium text-[#162F48]">
              مدیر هدف
              <select
                value={grantManagerId}
                onChange={(e) => setGrantManagerId(e.target.value)}
                className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] p-2.5 text-xs text-[#162F48]"
              >
                <option value="">انتخاب مدیر...</option>
                {managers
                  .filter((m) => m.isActive)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({getRoleLabel(m.role as never)})
                    </option>
                  ))}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-[#162F48]">
              کاربر
              <select
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] p-2.5 text-xs text-[#162F48]"
              >
                <option value="">انتخاب کاربر...</option>
                {directoryUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} · {u.phoneNumber}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              disabled={!grantManagerId || !grantUserId}
              onClick={() => void assignUserGrant()}
            >
              اعطای مجوز دسترسی
            </Button>
          </div>

          {grants.length > 0 && (
            <div className="space-y-2 border-t border-[#087674]/10 pt-3">
              {grants.map((grant) => (
                <div
                  key={`${grant.managerId}-${grant.userId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#087674]/15 bg-[#EAF3FA]/45 p-3 text-xs"
                >
                  <span>
                    <strong className="text-[#162F48]">
                      {findName(grant.managerId)}
                    </strong>
                    <span className="mx-1.5 text-[#496479]">←</span>
                    <strong className="text-[#162F48]">
                      {findName(grant.userId)}
                    </strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busy}
                    onClick={() =>
                      void revokeUserGrant(grant.managerId, grant.userId)
                    }
                  >
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
