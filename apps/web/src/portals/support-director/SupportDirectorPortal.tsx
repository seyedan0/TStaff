import React, { useState, useEffect } from "react";
import {
  LifeBuoy,
  UserX,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Modal } from "../../shared/ui/Modal.js";
import { apiClient } from "../../shared/api-client.js";

interface SupportDirectorPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

interface SupportTicketItem {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  response?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName?: string;
    phoneNumber: string;
  };
}

interface ManagedUserItem {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  stage: string;
  isActive: boolean;
}

export const SupportDirectorPortal: React.FC<SupportDirectorPortalProps> = ({
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<"tickets" | "users">("tickets");

  // Tickets State
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [ticketResponse, setTicketResponse] = useState("");
  const [ticketResolutionStatus, setTicketResolutionStatus] = useState<"RESOLVED" | "CLOSED">("RESOLVED");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Users Management State (Suspension FR-035)
  const [managedUsers, setManagedUsers] = useState<ManagedUserItem[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await apiClient.get<SupportTicketItem[]>("/users/support-tickets");
      setTickets(res);
    } catch {
      // Mock fallback
      setTickets([
        {
          id: "ticket-demo-1",
          userId: "10000000-0000-0000-0000-000000000006",
          subject: "سوال پیرامون زمان مصاحبه با خبره در مرحله منابع",
          description:
            "سلام، در صورتی که فرد مصاحبه‌شونده در هفته جاری در دسترس نباشد، آیا می‌توان گزارش مقدماتی را پیش از فایل صوتی بارگذاری کرد؟",
          status: "OPEN",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: "10000000-0000-0000-0000-000000000006",
            fullName: "رضا میرزایی",
            phoneNumber: "09126666666",
          },
        },
      ]);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch users
      const res = await apiClient.get<ManagedUserItem[]>("/users/managers");
      setManagedUsers(
        res.length > 0
          ? res
          : [
              {
                id: "10000000-0000-0000-0000-000000000005",
                fullName: "سارا ابراهیمی",
                phoneNumber: "09125555555",
                role: "INTERN",
                stage: "INTERN",
                isActive: true,
              },
              {
                id: "10000000-0000-0000-0000-000000000006",
                fullName: "رضا میرزایی",
                phoneNumber: "09126666666",
                role: "APPRENTICE",
                stage: "APPRENTICE",
                isActive: true,
              },
            ],
      );
    } catch {
      setManagedUsers([
        {
          id: "10000000-0000-0000-0000-000000000005",
          fullName: "سارا ابراهیمی",
          phoneNumber: "09125555555",
          role: "INTERN",
          stage: "INTERN",
          isActive: true,
        },
        {
          id: "10000000-0000-0000-0000-000000000006",
          fullName: "رضا میرزایی",
          phoneNumber: "09126666666",
          role: "APPRENTICE",
          stage: "APPRENTICE",
          isActive: true,
        },
      ]);
    }
  };

  useEffect(() => {
    if (activeTab === "tickets") {
      fetchTickets();
    } else {
      fetchUsers();
    }
  }, [activeTab]);

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketResponse.trim()) return;

    setIsSubmittingResponse(true);
    try {
      await apiClient.post(`/users/support-tickets/${selectedTicket.id}/resolve`, {
        status: ticketResolutionStatus,
        response: ticketResponse.trim(),
      });
      onNotify(
        "success",
        "تیکت تعیین تکلیف شد",
        `پاسخ برای کاربر «${selectedTicket.user?.fullName || selectedTicket.userId}» با موفقیت ارسال گردید.`,
      );
      setSelectedTicket(null);
      setTicketResponse("");
      fetchTickets();
    } catch (err: unknown) {
      onNotify(
        "error",
        "خطا در پاسخ به تیکت",
        err instanceof Error ? err.message : "خطا در برقراری ارتباط با سرور",
      );
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleToggleUserSuspension = async (
    userId: string,
    currentStatus: boolean,
  ) => {
    try {
      if (currentStatus) {
        // Suspend
        await apiClient.patch(`/users/${userId}/suspend`, {});
        onNotify(
          "warning",
          "حساب کاربر تعلیق شد",
          "دسترسی کاربر به سامانه تا زمان رفع تعلیق مسدود گردید (FR-035).",
        );
      } else {
        // Unsuspend
        await apiClient.patch(`/users/${userId}/unsuspend`, {});
        onNotify(
          "success",
          "حساب کاربر فعال شد",
          "دسترسی کاربر به سامانه مجدداً برقرار شد.",
        );
      }
      setManagedUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u)),
      );
    } catch (err: unknown) {
      onNotify(
        "error",
        "خطا در تغییر وضعیت حساب",
        err instanceof Error ? err.message : "امکان انجام عملیات وجود ندارد",
      );
    }
  };

  const filteredUsers = managedUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phoneNumber.includes(userSearch),
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card
        variant="elevated"
        className="p-6 border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-apple-amber/10"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">
                پنل مدیریت پشتیبانی
              </Badge>
              <span className="text-xs text-slate-400">
                رسیدگی به تیکت‌ها و تعلیق/رفع تعلیق کاربران (FR-035, AT-12)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              مرکز پشتیبانی و مدیریت حساب پژوهشگران
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              پاسخگویی به درخواست‌ها و سوالات کارآموزان و کارورزان، بررسی اشکالات گزارش‌شده و اعمال تعلیق‌های انضباطی یا رفع تعلیق حساب‌های کاربری.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-apple-lg bg-white/[0.03] border border-white/5">
            <button
              onClick={() => setActiveTab("tickets")}
              className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold transition-all ${
                activeTab === "tickets"
                  ? "bg-apple-blue text-white shadow-apple-glow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LifeBuoy className="w-4 h-4" />
              تیکت‌های پشتیبانی ({tickets.filter((t) => t.status === "OPEN").length} جدید)
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold transition-all ${
                activeTab === "users"
                  ? "bg-apple-blue text-white shadow-apple-glow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserX className="w-4 h-4" />
              مدیریت تعلیق کاربران (FR-035)
            </button>
          </div>
        </div>
      </Card>

      {/* Main Views */}
      <div className="animate-fade-in">
        {/* Tab 1: Tickets */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-apple-blue" />
                فهرست درخواست‌ها و تیکت‌های پشتیبانی کاربران
              </h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={fetchTickets}
                loading={isLoadingTickets}
                className="text-xs"
              >
                به‌روزرسانی تیکت‌ها
              </Button>
            </div>

            {tickets.length === 0 ? (
              <Card variant="glass" className="p-8 text-center border-white/10">
                <CheckCircle2 className="w-10 h-10 text-apple-green mx-auto mb-3 opacity-80" />
                <h4 className="text-sm font-semibold text-slate-200">
                  هیچ تیکت بی‌پاسخی در صف پشتیبانی وجود ندارد
                </h4>
              </Card>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <Card
                    key={t.id}
                    variant="elevated"
                    className="p-5 border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">
                            {t.subject}
                          </span>
                          <Badge
                            variant={
                              t.status === "OPEN"
                                ? "warning"
                                : t.status === "RESOLVED"
                                  ? "success"
                                  : "neutral"
                            }
                            size="sm"
                          >
                            {t.status === "OPEN"
                              ? "در انتظار پاسخ"
                              : t.status === "RESOLVED"
                                ? "پاسخ‌داده‌شده"
                                : "بسته شده"}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-apple-md border border-white/5">
                          {t.description}
                        </p>

                        {t.response && (
                          <div className="p-2.5 rounded-apple-md bg-apple-green/10 border border-apple-green/20 text-xs text-slate-200">
                            <strong className="text-apple-green">پاسخ پشتیبانی: </strong>
                            {t.response}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>
                            ارسال‌کننده: {t.user?.fullName || t.userId} (
                            <span className="font-mono">{t.user?.phoneNumber}</span>)
                          </span>
                          <span>•</span>
                          <span>
                            ثبت: {new Date(t.createdAt).toLocaleDateString("fa-IR")}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 self-end md:self-center">
                        <Button
                          variant="primary"
                          size="md"
                          icon={<MessageSquare className="w-4 h-4" />}
                          onClick={() => {
                            setSelectedTicket(t);
                            setTicketResponse(t.response || "");
                          }}
                        >
                          {t.response ? "ویرایش پاسخ" : "پاسخ به تیکت"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Users Suspension Management */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-apple-amber" />
                  مدیریت تعلیق و رفع تعلیق حساب کاربران (FR-035, AT-12)
                </h3>
                <p className="text-xs text-slate-400">
                  کاربران تعلیق‌شده امکان ورود به کارتابل یا ثبت پرونده را تا زمان رفع تعلیق نخواهند داشت:
                </p>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  dir="rtl"
                  placeholder="جست‌وجوی نام یا شماره همراه..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((u) => (
                <Card
                  key={u.id}
                  variant="elevated"
                  className={`p-4 border transition-all ${
                    !u.isActive
                      ? "border-apple-red/40 bg-apple-red/5"
                      : "border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">
                          {u.fullName}
                        </span>
                        <Badge
                          variant={u.isActive ? "success" : "danger"}
                          size="sm"
                        >
                          {u.isActive ? "فعال" : "معلق‌شده (FR-035)"}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-400 font-mono">
                        {u.phoneNumber}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        نقش: <span className="text-slate-200">{u.role}</span> | سطح:{" "}
                        <span className="text-slate-200">{u.stage}</span>
                      </div>
                    </div>

                    <div>
                      <Button
                        variant={u.isActive ? "secondary" : "primary"}
                        size="sm"
                        className={
                          u.isActive
                            ? "text-apple-red hover:bg-apple-red hover:text-white border-apple-red/30 text-xs"
                            : "text-xs"
                        }
                        onClick={() =>
                          handleToggleUserSuspension(u.id, u.isActive)
                        }
                      >
                        {u.isActive ? "تعلیق حساب" : "رفع تعلیق و فعال‌سازی"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Ticket Response */}
      {selectedTicket && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTicket(null)}
          title={`پاسخ به تیکت: ${selectedTicket.subject}`}
          maxWidth="md"
        >
          <form onSubmit={handleResolveTicket} className="space-y-4 text-right">
            <div className="p-3 rounded-apple-md bg-white/[0.03] border border-white/10 text-xs text-slate-300 space-y-1">
              <div>
                <strong>ارسال‌کننده: </strong>
                {selectedTicket.user?.fullName || selectedTicket.userId}
              </div>
              <div>
                <strong>شرح پیام متقاضی: </strong>
                <p className="mt-1 text-slate-200 leading-relaxed bg-black/20 p-2 rounded">
                  {selectedTicket.description}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                پاسخ مدیر پشتیبانی
              </label>
              <textarea
                dir="rtl"
                rows={4}
                required
                placeholder="متن پاسخ و راهنمایی لازم را وارد فرمایید..."
                value={ticketResponse}
                onChange={(e) => setTicketResponse(e.target.value)}
                className="w-full px-3 py-2 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                وضعیت پس از پاسخ
              </label>
              <select
                dir="rtl"
                value={ticketResolutionStatus}
                onChange={(e) =>
                  setTicketResolutionStatus(
                    e.target.value as "RESOLVED" | "CLOSED",
                  )
                }
                className="w-full px-3 py-2 rounded-apple-md bg-slate-900 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-apple-blue/50"
              >
                <option value="RESOLVED">پاسخ‌داده‌شده (حل مشکل)</option>
                <option value="CLOSED">بسته شده</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setSelectedTicket(null)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmittingResponse}
                icon={<Send className="w-4 h-4" />}
              >
                ثبت و ارسال پاسخ
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
