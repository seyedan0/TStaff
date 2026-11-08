import React, { useState } from "react";
import { HelpCircle, Send } from "lucide-react";
import { ResearchCasesView } from "../../features/research/ResearchCasesView.js";
import { DirectChatView } from "../../features/messaging/DirectChatView.js";
import { Button } from "../../shared/ui/Button.js";
import { Modal } from "../../shared/ui/Modal.js";
import { apiClient } from "../../shared/api-client.js";
import { UserNavigation, type UserNavigationTab } from "../../app/UserNavigation.js";

interface InternPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const InternPortal: React.FC<InternPortalProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<UserNavigationTab>("researcher");

  // Support Ticket Modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setIsSubmittingTicket(true);
    try {
      await apiClient.post("/users/support-tickets", {
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
      });
      setShowSupportModal(false);
      setTicketSubject("");
      setTicketDescription("");
      onNotify(
        "success",
        "تیکت پشتیبانی ارسال شد",
        "پیام شما به مدیر پشتیبانی سامانه ارسال گردید و در اسرع وقت بررسی خواهد شد.",
      );
    } catch (err: unknown) {
      onNotify(
        "error",
        "خطا در ارسال تیکت",
        err instanceof Error ? err.message : "امکان ارسال تیکت وجود ندارد",
      );
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="space-y-6">
      <UserNavigation active={activeTab} isApprentice={false} onChange={setActiveTab} />

      {/* Support ticket action */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <Button
          variant="secondary"
          size="sm"
          icon={<HelpCircle className="w-3.5 h-3.5" />}
          onClick={() => setShowSupportModal(true)}
          className="text-xs"
        >
          ارسال تیکت به پشتیبانی
        </Button>
      </div>

      {/* Active user portal tab */}
      <div className="animate-fade-in">
        {activeTab === "researcher" && <ResearchCasesView onNotify={onNotify} />}
        {activeTab === "chat" && <DirectChatView onNotify={onNotify} />}
      </div>

      {/* Modal: Support Ticket */}
      {showSupportModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowSupportModal(false)}
          title="ارسال تیکت به مدیر پشتیبانی"
          maxWidth="md"
        >
          <form onSubmit={handleCreateSupportTicket} className="space-y-4 text-right">
            <p className="text-xs text-slate-400 leading-relaxed">
              هرگونه مشکل سامانه‌ای یا ابهام در فرایندهای پژوهشی را گزارش نمایید:
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                موضوع تیکت
              </label>
              <input
                type="text"
                dir="rtl"
                required
                placeholder="مثال: عدم دسترسی به ضبط مصاحبه در مرحله منابع"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                شرح درخواست
              </label>
              <textarea
                dir="rtl"
                rows={4}
                required
                placeholder="شرح دقیق موضوع..."
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-apple-md bg-white/[0.04] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-apple-blue/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowSupportModal(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmittingTicket}
                icon={<Send className="w-4 h-4" />}
              >
                ارسال تیکت
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
