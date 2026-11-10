import { usePortalSection } from "../../app/usePortalSection.js";
import React, { useState, useEffect } from "react";
import {
  Compass,
  UserPlus,
  Users,
  ShieldCheck,
  Clock,
  BarChart3,
  Building2,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Modal } from "../../shared/ui/Modal.js";
import { Input } from "../../shared/ui/Input.js";
import { apiClient } from "../../shared/api-client.js";
import { useAuth } from "../../features/auth/AuthContext.js";

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

interface InternRecord { id: string; fullName: string | null; phoneNumber: string; stage: "APPRENTICE" | "INTERN" }
interface SupervisorAssignment { id: string; supervisorId: string; supervisorName: string; phoneNumber: string; isPrimary: boolean; assignedAt: string }

export const TrackingDirectorPortal: React.FC<TrackingDirectorPortalProps> = ({
  onNotify,
}) => {
  const { currentUser } = useAuth();
  const activeTab = usePortalSection<"pipeline" | "managers" | "assignments" | "audit">({ "/tracking/pipeline": "pipeline", "/tracking/managers": "managers", "/tracking/assignments": "assignments", "/tracking/audit": "audit" }, "pipeline");

  // Managers State
  const [managers, setManagers] = useState<ManagerRecord[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMgrName, setNewMgrName] = useState("");
  const [newMgrPhone, setNewMgrPhone] = useState("");
  const [newMgrRole, setNewMgrRole] = useState("SCIENTIFIC_SUPERVISOR");
  const [newMgrPassword, setNewMgrPassword] = useState("");
  const [isCreatingManager, setIsCreatingManager] = useState(false);
  const [interns, setInterns] = useState<InternRecord[]>([]);
  const [selectedInternId, setSelectedInternId] = useState("");
  const [supervisorAssignments, setSupervisorAssignments] = useState<SupervisorAssignment[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchManagers = async () => {
    try {
      const data = await apiClient.get<ManagerRecord[]>("/users/managers");
      setManagers(data);
    } catch { setManagers([]); }
  };

  const fetchInterns = async () => {
    try { setInterns(await apiClient.get<InternRecord[]>("/users/interns")); }
    catch (error) { setInterns([]); onNotify("error", "فهرست کارورزان بارگذاری نشد", error instanceof Error ? error.message : undefined); }
  };

  const fetchAssignments = async (userId: string) => {
    if (!userId) { setSupervisorAssignments([]); return; }
    try { setSupervisorAssignments(await apiClient.get<SupervisorAssignment[]>(`/users/${userId}/scientific-supervisors`)); }
    catch (error) { setSupervisorAssignments([]); onNotify("error", "انتساب‌های مدیران دریافت نشد", error instanceof Error ? error.message : undefined); }
  };

  const handleAssignSupervisor = async () => {
    if (!selectedInternId || !selectedSupervisorId) return;
    setIsSavingAssignment(true);
    try {
      await apiClient.post(`/users/${selectedInternId}/scientific-supervisors`, { supervisorId: selectedSupervisorId });
      await fetchAssignments(selectedInternId);
      setSelectedSupervisorId("");
      onNotify("success", "مدیر علمی به کارورز منتسب شد", "انتساب برای همه پرونده‌های فعلی و بعدی کارورز اعمال شد.");
    } catch (error) { onNotify("error", "انتساب مدیر علمی انجام نشد", error instanceof Error ? error.message : undefined); }
    finally { setIsSavingAssignment(false); }
  };

  useEffect(() => {
    fetchManagers();
    fetchInterns();
  }, []);

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMgrName.trim() || !newMgrPhone.trim()) return;

    if (!/^09\d{9}$/.test(newMgrPhone)) {
      onNotify("error", "خطا در شماره همراه", "شماره همراه باید ۱۱ رقم بوده و با 09 آغاز شود.");
      return;
    }

    setIsCreatingManager(true);
    try {
      await apiClient.post("/users/managers", {
        fullName: newMgrName.trim(),
        phoneNumber: newMgrPhone.trim(),
        role: newMgrRole,
        password: newMgrPassword,
      });

      onNotify(
        "success",
        "مدیر جدید با موفقیت ایجاد شد",
        `حساب کاربری برای «${newMgrName}» با نقش انتخاب‌شده فعال گردید.`,
      );

      setIsCreateModalOpen(false);
      setNewMgrName("");
      setNewMgrPhone("");
      setNewMgrPassword("");
      fetchManagers();
    } catch (err: unknown) {
      onNotify(
        "error",
        "خطا در ایجاد مدیر",
        err instanceof Error ? err.message : "امکان ثبت مدیر وجود ندارد",
      );
    } finally {
      setIsCreatingManager(false);
    }
  };

  const filteredManagers = managers.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phoneNumber.includes(searchQuery) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card
        variant="elevated"
        className="p-6 border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-apple-blue/15"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">
                پنل مدیر پیگیری و معاونین
              </Badge>
              <span className="text-xs text-slate-400">
                پایش ۳۱ استان و انتصاب مدیران علمی و استانی
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              سامانه پایش کلان پرونده‌ها و انتصاب مدیران ({currentUser?.fullName || "مهندس علوی"})
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              مشاهده گلوگاه‌های چرخه ۴ مرحله‌ای، رصد پیشرفت استان‌ها، تعریف مدیران علمی، استانی و پشتیبانی جدید و ثبت و ممیزی رویدادهای حساس (D-04).
            </p>
          </div>
        </div>
      </Card>

      {/* Main Views */}
      <div className="animate-fade-in">
        {/* Tab 1: National Pipeline */}
        {activeTab === "pipeline" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="glass" className="p-4 border-white/10">
                <span className="text-xs text-slate-400">کل پرونده‌های فعال کشور</span>
                <div className="text-2xl font-bold text-slate-100 mt-1">۲۴ پرونده</div>
                <div className="text-[11px] text-slate-500 mt-1">توزیع در ۸ استان برتر</div>
              </Card>

              <Card variant="glass" className="p-4 border-white/10">
                <span className="text-xs text-slate-400">مرحله منابع و مصاحبه‌ها (D-07)</span>
                <div className="text-2xl font-bold text-apple-blue mt-1">۱۱ پرونده</div>
                <div className="text-[11px] text-slate-500 mt-1">قاعده یکتایی مصاحبه فعال است</div>
              </Card>

              <Card variant="glass" className="p-4 border-white/10">
                <span className="text-xs text-slate-400">مرحله تبیین و تجویز</span>
                <div className="text-2xl font-bold text-apple-amber mt-1">۸ پرونده</div>
                <div className="text-[11px] text-slate-500 mt-1">۲ پرونده در انتظار داوری مدیر علمی</div>
              </Card>

              <Card variant="glass" className="p-4 border-white/10">
                <span className="text-xs text-slate-400">سناریوهای نهایی مصوب</span>
                <div className="text-2xl font-bold text-apple-green mt-1">۵ سناریو</div>
                <div className="text-[11px] text-slate-500 mt-1">نمایه‌شده در بانک سناریو</div>
              </Card>
            </div>

            <Card variant="elevated" className="p-6 border-white/10">
              <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-apple-blue" />
                وضعیت پیشرفت به تفکیک استان‌ها:
              </h3>
              <div className="space-y-3">
                {[
                  { province: "تهران", active: 8, done: 3, bottleneck: "منابع" },
                  { province: "اصفهان", active: 5, done: 1, bottleneck: "تبیین" },
                  { province: "خراسان رضوی", active: 4, done: 1, bottleneck: "تجویز" },
                  { province: "فارس", active: 3, done: 0, bottleneck: "منابع" },
                  { province: "آذربایجان شرقی", active: 2, done: 0, bottleneck: "منابع" },
                  { province: "خوزستان", active: 2, done: 0, bottleneck: "تبیین" },
                ].map((item) => (
                  <div
                    key={item.province}
                    className="flex items-center justify-between p-3 rounded-apple-md bg-white/[0.02] border border-white/5 text-xs"
                  >
                    <span className="font-semibold text-slate-200 w-28">
                      استان {item.province}
                    </span>
                    <span className="text-slate-400">
                      پرونده‌های فعال: <strong className="text-slate-200">{item.active}</strong>
                    </span>
                    <span className="text-slate-400">
                      سناریوهای تکمیل‌شده:{" "}
                      <strong className="text-apple-green">{item.done}</strong>
                    </span>
                    <Badge variant="neutral" size="sm">
                      بیشترین تراکم: {item.bottleneck}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Managers Appointment */}
        {activeTab === "managers" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-apple-blue" />
                  فهرست مدیران شبکه و امکان انتصاب مدیران جدید
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  مدیر پیگیری اختیار ایجاد و انتصاب مدیران استانی، علمی، پشتیبانی و همکار را دارد:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  dir="rtl"
                  placeholder="جست‌وجوی نام، شماره یا نقش..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50 w-52"
                />

                <Button
                  variant="primary"
                  size="md"
                  icon={<UserPlus className="w-4 h-4" />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  تعریف مدیر جدید
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredManagers.map((m) => (
                <Card
                  key={m.id}
                  variant="elevated"
                  className="p-4 border-white/10 hover:border-white/20 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">
                        {m.fullName}
                      </h4>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {m.phoneNumber}
                      </div>
                    </div>
                    <Badge
                      variant={
                        m.role === "TRACKING_DIRECTOR"
                          ? "warning"
                          : m.role === "PROVINCIAL_DIRECTOR"
                            ? "info"
                            : m.role === "SCIENTIFIC_SUPERVISOR"
                              ? "success"
                              : "neutral"
                      }
                      size="sm"
                    >
                      {m.role === "TRACKING_DIRECTOR" && "مدیر پیگیری"}
                      {m.role === "PROVINCIAL_DIRECTOR" && "مدیر استانی"}
                      {m.role === "SCIENTIFIC_SUPERVISOR" && "مدیر علمی"}
                      {m.role === "SUPPORT_DIRECTOR" && "مدیر پشتیبانی"}
                      {m.role === "SYSTEM_ADMIN" && "مدیر کل و ادمین"}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5 flex items-center justify-between">
                    <span>
                      وضعیت حساب:{" "}
                      <strong className={m.isActive ? "text-apple-green" : "text-apple-red"}>
                        {m.isActive ? "فعال" : "معلق"}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      {m.createdAt ? `ثبت: ${m.createdAt}` : "سیستمی"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "assignments" && (
          <Card variant="elevated" className="space-y-5 p-6 border-white/10">
            <div><h3 className="text-base font-bold text-slate-100">انتساب مدیر علمی در سطح کارورز</h3><p className="mt-1 text-xs text-slate-400">هر مدیر علمی منتسب به همه پرونده‌های کارورز دسترسی و اختیار داوری برابر دارد. نخستین انتساب مدیر اصلی محسوب می‌شود.</p></div>
            <label className="block max-w-xl text-xs text-slate-300">کارورز<select value={selectedInternId} onChange={(event) => { setSelectedInternId(event.target.value); void fetchAssignments(event.target.value); }} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900 p-2.5 text-sm"> <option value="">انتخاب کارورز</option>{interns.filter((intern) => intern.stage === "INTERN").map((intern) => <option key={intern.id} value={intern.id}>{intern.fullName || intern.phoneNumber} · {intern.phoneNumber}</option>)}</select></label>
            {selectedInternId && <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 text-xs text-slate-300">مدیر علمی<select value={selectedSupervisorId} onChange={(event) => setSelectedSupervisorId(event.target.value)} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900 p-2.5 text-sm"><option value="">انتخاب مدیر علمی</option>{managers.filter((manager) => manager.role === "SCIENTIFIC_SUPERVISOR" && manager.isActive).map((manager) => <option key={manager.id} value={manager.id}>{manager.fullName} · {manager.phoneNumber}</option>)}</select></label><Button variant="primary" loading={isSavingAssignment} disabled={!selectedSupervisorId} onClick={() => void handleAssignSupervisor()}>افزودن مدیر علمی</Button></div>
              {supervisorAssignments.length === 0 ? <p className="rounded-apple-sm border border-white/5 p-4 text-xs text-slate-400">هنوز مدیری برای این کارورز ثبت نشده است.</p> : <div className="space-y-2">{supervisorAssignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between rounded-apple-md border border-white/10 bg-white/[0.02] p-3 text-xs"><div><strong className="text-slate-100">{assignment.supervisorName}</strong><span className="mr-2 text-slate-400">{assignment.phoneNumber}</span></div><Badge variant={assignment.isPrimary ? "info" : "indigo"} size="sm">{assignment.isPrimary ? "مدیر اصلی" : "مدیر همکار"}</Badge></div>)}</div>}
            </div>}
          </Card>
        )}

        {/* Tab 3: Searchable Audit Trail */}
        {activeTab === "audit" && (
          <Card variant="elevated" className="p-6 border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-apple-blue" />
                  لاگ ممیزی و رویدادنگاری جست‌وجوپذیر (سیاست D-04)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  طبق تصمیم D-04، تمام رخدادها در لاگ ممیزی ثبت می‌شوند و اعلان فوری صرفاً برای رخدادهای حساس صادر می‌گردد.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {[
                {
                  event: "تعریف مدیر علمی جدید (دکتر مریم حسینی)",
                  actor: "مهندس علوی (مدیر پیگیری)",
                  time: "۱۰ دقیقه قبل",
                  sensitive: true,
                },
                {
                  event: "تایید صلاحیت و ارتقای کارآموز رضا میرزایی به کارورز",
                  actor: "دکتر حسینی (مدیر علمی)",
                  time: "۳۵ دقیقه قبل",
                  sensitive: true,
                },
                {
                  event: "ثبت مصاحبه تک‌باره منبع پژوهشی (D-07)",
                  actor: "سارا ابراهیمی (کارورز)",
                  time: "۲ ساعت قبل",
                  sensitive: false,
                },
                {
                  event: "پذیرش متقاضی جدید در استان تهران (D-01: سن ۲۸)",
                  actor: "دکتر رضایی (مدیر استانی)",
                  time: "۴ ساعت قبل",
                  sensitive: false,
                },
                {
                  event: "تعلیق حساب کاربری به دلیل عدم تحویل گزارش (FR-035)",
                  actor: "مهندس محمدی (مدیر پشتیبانی)",
                  time: "دیروز",
                  sensitive: true,
                },
              ].map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-apple-md bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-200">{log.event}</span>
                    {log.sensitive && (
                      <Badge variant="warning" size="sm">
                        رخداد حساس نظارتی
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                    <span>اقدام‌کننده: {log.actor}</span>
                    <span className="font-mono text-slate-500">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Modal: Create Manager */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          title="انتصاب و تعریف مدیر جدید در شبکه پژوهش"
          maxWidth="md"
        >
          <form onSubmit={handleCreateManager} className="space-y-4 text-right">
            <p className="text-xs text-slate-400 leading-relaxed">
              مشخصات مدیر جدید را وارد نمایید. حساب کاربری بلافاصله با نقش و دسترسی‌های متناسب ایجاد می‌گردد:
            </p>

            <Input
              label="نام و نام خانوادگی مدیر"
              type="text"
              dir="rtl"
              required
              placeholder="مثال: دکتر علیرضا سلیمانی"
              value={newMgrName}
              onChange={(e) => setNewMgrName(e.target.value)}
            />

            <Input
              label="شماره تلفن همراه (جهت ورود)"
              type="tel"
              dir="ltr"
              required
              placeholder="09123456789"
              value={newMgrPhone}
              onChange={(e) => setNewMgrPhone(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                نقش و حیطه اختیارات سازمانی
              </label>
              <select
                dir="rtl"
                value={newMgrRole}
                onChange={(e) => setNewMgrRole(e.target.value)}
                className="w-full px-3 py-2 rounded-apple-md bg-slate-900 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-apple-blue/50"
              >
                <option value="SCIENTIFIC_SUPERVISOR">
                  مدیر علمی (داوری پرونده‌ها و ارزیابی شیوه‌نامه‌ها)
                </option>
                <option value="PROVINCIAL_DIRECTOR">
                  مدیر استانی (میز پذیرش متقاضیان و مصاحبه علمی)
                </option>
                <option value="SUPPORT_DIRECTOR">
                  مدیر پشتیبانی (رسیدگی به تیکت‌ها و تعلیق کاربران)
                </option>
                <option value="TRACKING_DIRECTOR">
                  مدیر پیگیری و معاون شبکه
                </option>
              </select>
            </div>

            <Input
              label="گذرواژه اولیه"
              type="password"
              dir="ltr"
              required
              minLength={8}
              value={newMgrPassword}
              onChange={(e) => setNewMgrPassword(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsCreateModalOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isCreatingManager}
                icon={<UserPlus className="w-4 h-4" />}
              >
                ایجاد و فعال‌سازی مدیر
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
