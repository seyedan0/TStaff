import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LifeBuoy, MessageSquare, RefreshCw, Search, Send, UserX } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { DirectoryUserDto } from "@tstaff/contracts";
import { getRoleLabel } from "../../app/navigation.js";
import { usePortalSection } from "../../app/usePortalSection.js";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { Modal } from "../../shared/ui/Modal.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";

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
  userFullName?: string;
  userPhone?: string;
  user?: {
    id: string;
    fullName?: string;
    phoneNumber: string;
  };
}

export const SupportDirectorPortal: React.FC<SupportDirectorPortalProps> = ({ onNotify }) => {
  const activeTab = usePortalSection<"tickets" | "users">(
    { "/support/tickets": "tickets", "/support/users": "users" },
    "tickets",
  );
  const { ticketId, userId } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [users, setUsers] = useState<DirectoryUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ticketResponse, setTicketResponse] = useState("");
  const [ticketResolutionStatus, setTicketResolutionStatus] = useState<"RESOLVED" | "CLOSED">("RESOLVED");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [statusModalUser, setStatusModalUser] = useState<DirectoryUserDto | null>(null);
  const [statusReason, setStatusReason] = useState("");

  const searchTerm = (query.get("q") ?? "").trim().toLowerCase();

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<SupportTicketItem[]>("/users/support-tickets");
      setTickets(data);
    } catch (err) {
      setTickets([]);
      setError(err instanceof Error ? err.message : "دریافت تیکت‌های پشتیبانی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<DirectoryUserDto[]>("/users");
      setUsers(data);
    } catch (err) {
      setUsers([]);
      setError(err instanceof Error ? err.message : "دریافت فهرست کاربران ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "tickets") {
      void loadTickets();
    } else {
      void loadUsers();
    }
  }, [activeTab, loadTickets, loadUsers]);

  const activeTicket = ticketId ? tickets.find((t) => t.id === ticketId) ?? null : null;
  const activeUser = userId ? users.find((u) => u.id === userId) ?? null : null;

  useEffect(() => {
    if (activeTicket) {
      setTicketResponse(activeTicket.response ?? "");
      setTicketResolutionStatus(activeTicket.status === "CLOSED" ? "CLOSED" : "RESOLVED");
    }
  }, [activeTicket]);

  const handleResolveTicket = async (event: React.FormEvent, targetId: string) => {
    event.preventDefault();
    if (ticketResponse.trim().length < 5) {
      onNotify("warning", "پاسخ کوتاه است", "پاسخ باید حداقل ۵ کاراکتر باشد.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post(`/users/support-tickets/${encodeURIComponent(targetId)}/resolve`, {
        status: ticketResolutionStatus,
        response: ticketResponse.trim(),
      });
      onNotify("success", "تیکت تعیین تکلیف شد");
      await loadTickets();
    } catch (err) {
      onNotify("error", "ثبت پاسخ تیکت ناموفق بود", err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSuspension = async (target: DirectoryUserDto, reason: string) => {
    if (reason.trim().length < 5) {
      onNotify("warning", "علت الزامی است", "حداقل ۵ کاراکتر دلیل برای تغییر وضعیت حساب ثبت کنید.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (target.isActive) {
        await apiClient.post(`/users/${encodeURIComponent(target.id)}/suspend`, { reason: reason.trim() });
        onNotify("warning", "حساب کاربر تعلیق شد", "دسترسی کاربر تا زمان رفع تعلیق مسدود شد (FR-035).");
      } else {
        await apiClient.post(`/users/${encodeURIComponent(target.id)}/reactivate`, { reason: reason.trim() });
        onNotify("success", "حساب کاربر فعال شد");
      }
      setStatusModalUser(null);
      setStatusReason("");
      await loadUsers();
    } catch (err) {
      onNotify("error", "تغییر وضعیت کاربر انجام نشد", err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setSearchQuery = (val: string) => {
    const next = new URLSearchParams(query);
    val ? next.set("q", val) : next.delete("q");
    navigate({ search: next.toString() }, { replace: true });
  };

  // Detail route: /support/tickets/:ticketId
  if (activeTab === "tickets" && ticketId) {
    if (loading) return <LoadingState message="در حال دریافت جزئیات تیکت..." />;
    if (error || !activeTicket) {
      return (
        <div className="space-y-4">
          <PageHeader
            title="جزئیات تیکت پشتیبانی"
            breadcrumbs={[{ label: "تیکت‌ها", to: "/support/tickets" }, { label: "جزئیات" }]}
            backTo={{ to: "/support/tickets", label: "بازگشت به تیکت‌ها" }}
          />
          <ErrorState message={error ?? "تیکت مورد نظر یافت نشد."} onRetry={() => void loadTickets()} />
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <PageHeader
          title={activeTicket.subject}
          subtitle={`ارسال‌کننده: ${activeTicket.userFullName || activeTicket.user?.fullName || activeTicket.userId}`}
          breadcrumbs={[{ label: "درخواست‌های پشتیبانی", to: "/support/tickets" }, { label: activeTicket.subject }]}
          backTo={{ to: "/support/tickets", label: "بازگشت به تیکت‌ها" }}
        />

        <Card variant="default" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={activeTicket.status === "OPEN" ? "warning" : activeTicket.status === "RESOLVED" ? "success" : "neutral"} size="sm">
              {activeTicket.status === "OPEN" ? "در انتظار پاسخ" : activeTicket.status === "RESOLVED" ? "پاسخ‌داده‌شده" : "بسته‌شده"}
            </Badge>
            <span className="text-xs text-[#4F6659]">{new Date(activeTicket.createdAt).toLocaleString("fa-IR")}</span>
          </div>

          <div className="rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/60 p-4 text-sm leading-7 text-[#214031]">
            {activeTicket.description}
          </div>

          <form onSubmit={(e) => void handleResolveTicket(e, activeTicket.id)} className="space-y-3 border-t border-[#214E3A]/10 pt-4">
            <label className="block space-y-1.5 text-xs font-medium text-[#214031]">
              پاسخ پشتیبانی (حداقل ۵ کاراکتر)
              <textarea
                required
                minLength={5}
                rows={4}
                value={ticketResponse}
                onChange={(e) => setTicketResponse(e.target.value)}
                placeholder="پاسخ و راهنمایی لازم را بنویسید..."
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="block space-y-1 text-xs font-medium text-[#214031]">
                وضعیت پس از ثبت
                <select
                  value={ticketResolutionStatus}
                  onChange={(e) => setTicketResolutionStatus(e.target.value as "RESOLVED" | "CLOSED")}
                  className="block rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2 text-xs text-[#214031]"
                >
                  <option value="RESOLVED">پاسخ‌داده‌شده</option>
                  <option value="CLOSED">بسته‌شده</option>
                </select>
              </label>
              <Button type="submit" variant="primary" loading={isSubmitting} icon={<Send className="h-4 w-4" />}>
                ثبت پاسخ پشتیبانی
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // Detail route: /support/users/:userId
  if (activeTab === "users" && userId) {
    if (loading) return <LoadingState message="در حال دریافت مشخصات کاربر..." />;
    if (error || !activeUser) {
      return (
        <div className="space-y-4">
          <PageHeader
            title="جزئیات حساب کاربر"
            breadcrumbs={[{ label: "کاربران", to: "/support/users" }, { label: "جزئیات" }]}
            backTo={{ to: "/support/users", label: "بازگشت به کاربران" }}
          />
          <ErrorState message={error ?? "کاربر یافت نشد."} onRetry={() => void loadUsers()} />
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <PageHeader
          title={activeUser.fullName}
          subtitle={`${getRoleLabel(activeUser.role)} · ${activeUser.phoneNumber}`}
          breadcrumbs={[{ label: "کاربران", to: "/support/users" }, { label: activeUser.fullName }]}
          backTo={{ to: "/support/users", label: "بازگشت به فهرست کاربران" }}
        />

        <Card variant="default" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={activeUser.isActive ? "success" : "danger"} size="sm">
              {activeUser.isActive ? "حساب فعال" : "حساب معلق (FR-035)"}
            </Badge>
            <span className="text-xs text-[#4F6659]">عضویت: {new Date(activeUser.createdAt).toLocaleDateString("fa-IR")}</span>
          </div>

          <dl className="grid gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-[#4F6659]">شماره همراه</dt>
              <dd dir="ltr" className="mt-1 text-right font-mono font-semibold text-[#214031]">{activeUser.phoneNumber}</dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-[#4F6659]">نقش اصلی</dt>
              <dd className="mt-1 font-semibold text-[#214031]">{getRoleLabel(activeUser.role)}</dd>
            </div>
            <div className="rounded-xl bg-[#F3EBDD]/55 p-3">
              <dt className="text-[#4F6659]">مرحله رشد</dt>
              <dd className="mt-1 font-semibold text-[#214031]">{activeUser.stage === "INTERN" ? "کارورز" : "کارآموز"}</dd>
            </div>
          </dl>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleToggleSuspension(activeUser, statusReason);
            }}
            className="space-y-3 border-t border-[#214E3A]/10 pt-4"
          >
            <label className="block space-y-1.5 text-xs font-medium text-[#214031]">
              دلیل {activeUser.isActive ? "تعلیق حساب" : "رفع تعلیق"} (حداقل ۵ کاراکتر · ثبت در ممیزی D-04)
              <textarea
                required
                minLength={5}
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="علت دقیق تغییر وضعیت حساب..."
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" variant={activeUser.isActive ? "danger" : "primary"} loading={isSubmitting}>
                {activeUser.isActive ? "تعلیق حساب کاربری" : "رفع تعلیق و فعال‌سازی"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  const filteredTickets = tickets.filter(
    (t) =>
      !searchTerm ||
      `${t.subject} ${t.description} ${t.userFullName ?? t.user?.fullName ?? ""} ${t.userPhone ?? t.user?.phoneNumber ?? ""}`
        .toLowerCase()
        .includes(searchTerm),
  );

  const filteredUsers = users.filter(
    (u) =>
      !searchTerm ||
      `${u.fullName} ${u.phoneNumber} ${getRoleLabel(u.role)}`.toLowerCase().includes(searchTerm),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {activeTab === "tickets" ? <LifeBuoy className="h-5 w-5 text-[#214E3A]" /> : <UserX className="h-5 w-5 text-[#214E3A]" />}
            {activeTab === "tickets" ? "درخواست‌های پشتیبانی" : "مدیریت حساب کاربران (FR-035)"}
          </span>
        }
        subtitle={
          activeTab === "tickets"
            ? "رسیدگی به سوالات و گزارش‌های کاربران در سامانه"
            : "بررسی وضعیت حساب‌ها و اعمال تعلیق یا رفع تعلیق با ثبت ممیزی"
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            loading={loading}
            onClick={() => void (activeTab === "tickets" ? loadTickets() : loadUsers())}
          >
            به‌روزرسانی
          </Button>
        }
      />

      <Card variant="default" padding="sm">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B8073]" />
          <input
            type="search"
            aria-label="جست‌وجو"
            value={query.get("q") ?? ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "tickets" ? "جست‌وجوی موضوع یا نام فرستنده..." : "جست‌وجوی نام، شماره همراه یا نقش..."}
            className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] py-2 pr-9 pl-3 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
          />
        </div>
      </Card>

      {loading ? (
        <LoadingState message={activeTab === "tickets" ? "در حال دریافت تیکت‌ها..." : "در حال دریافت کاربران..."} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void (activeTab === "tickets" ? loadTickets() : loadUsers())} />
      ) : activeTab === "tickets" ? (
        filteredTickets.length === 0 ? (
          <EmptyState title="تیکت پشتیبانی یافت نشد" description="تیکتی ثبت نشده یا با جست‌وجو مطابقت ندارد." icon={<CheckCircle2 className="h-6 w-6" />} />
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <Card key={t.id} variant="default" className="space-y-3">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/support/tickets/${encodeURIComponent(t.id)}`} className="text-sm font-bold text-[#214031] hover:underline">
                        {t.subject}
                      </Link>
                      <Badge variant={t.status === "OPEN" ? "warning" : t.status === "RESOLVED" ? "success" : "neutral"} size="sm">
                        {t.status === "OPEN" ? "در انتظار پاسخ" : t.status === "RESOLVED" ? "پاسخ‌داده‌شده" : "بسته‌شده"}
                      </Badge>
                    </div>
                    <p className="rounded-xl border border-[#214E3A]/10 bg-[#F3EBDD]/50 p-3 text-xs leading-relaxed text-[#214031]">
                      {t.description}
                    </p>
                    {t.response && (
                      <div className="rounded-xl border border-[#214E3A]/20 bg-[#214E3A]/10 p-2.5 text-xs text-[#214031]">
                        <strong>پاسخ پشتیبانی: </strong>
                        {t.response}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#4F6659]">
                      <span>ارسال‌کننده: {t.userFullName || t.user?.fullName || t.userId}</span>
                      <span>·</span>
                      <span dir="ltr" className="font-mono">{t.userPhone || t.user?.phoneNumber || "-"}</span>
                      <span>·</span>
                      <span>{new Date(t.createdAt).toLocaleDateString("fa-IR")}</span>
                    </div>
                  </div>
                  <Link
                    to={`/support/tickets/${encodeURIComponent(t.id)}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#214E3A] px-3.5 py-2 text-xs font-semibold text-[#FFFCF5] hover:bg-[#193C2C]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t.response ? "مشاهده و ویرایش پاسخ" : "بررسی و پاسخ"}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="کاربری یافت نشد" description="فهرست کاربران با فیلتر فعلی خالی است." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredUsers.map((u) => (
            <Card key={u.id} variant="default" className={u.isActive ? "" : "border-[#D94F3D]/40 bg-[#D94F3D]/5"}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/support/users/${encodeURIComponent(u.id)}`} className="text-sm font-bold text-[#214031] hover:underline">
                      {u.fullName}
                    </Link>
                    <Badge variant={u.isActive ? "success" : "danger"} size="sm">
                      {u.isActive ? "فعال" : "معلق"}
                    </Badge>
                  </div>
                  <div dir="ltr" className="text-right font-mono text-xs text-[#4F6659]">{u.phoneNumber}</div>
                  <div className="text-[11px] text-[#4F6659]">
                    {getRoleLabel(u.role)} · {u.stage === "INTERN" ? "کارورز" : "کارآموز"}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    variant={u.isActive ? "danger" : "primary"}
                    size="sm"
                    onClick={() => {
                      setStatusModalUser(u);
                      setStatusReason("");
                    }}
                  >
                    {u.isActive ? "تعلیق حساب" : "رفع تعلیق"}
                  </Button>
                  <Link
                    to={`/support/users/${encodeURIComponent(u.id)}`}
                    className="text-center text-[11px] font-semibold text-[#214E3A] hover:underline"
                  >
                    صفحه جزئیات
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {statusModalUser && (
        <Modal
          isOpen
          onClose={() => setStatusModalUser(null)}
          title={statusModalUser.isActive ? `تعلیق حساب ${statusModalUser.fullName}` : `فعال‌سازی حساب ${statusModalUser.fullName}`}
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleToggleSuspension(statusModalUser, statusReason);
            }}
            className="space-y-4 text-right"
          >
            <label className="block space-y-1.5 text-xs font-medium text-[#214031]">
              دلیل اقدام (حداقل ۵ کاراکتر · D-04 / FR-035)
              <textarea
                required
                minLength={5}
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] p-3 text-sm text-[#214031]"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-[#214E3A]/10 pt-3">
              <Button type="button" variant="ghost" onClick={() => setStatusModalUser(null)}>انصراف</Button>
              <Button type="submit" variant={statusModalUser.isActive ? "danger" : "primary"} loading={isSubmitting}>
                تأیید و ثبت
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
