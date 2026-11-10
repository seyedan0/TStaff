import { usePortalSection } from "../../app/usePortalSection.js";
import React, { useState } from "react";
import { HelpCircle, Send } from "lucide-react";
import { ResearchCasesView } from "../../features/research/ResearchCasesView.js";
import { DirectChatView } from "../../features/messaging/DirectChatView.js";
import { LibraryDocumentsView } from "../../features/documents/LibraryDocumentsView.js";
import { Button } from "../../shared/ui/Button.js";
import { Modal } from "../../shared/ui/Modal.js";
import { apiClient } from "../../shared/api-client.js";
import type { UserNavigationTab } from "../../app/UserNavigation.js";

interface InternPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const InternPortal: React.FC<InternPortalProps> = ({ onNotify }) => {
  const activeTab = usePortalSection<UserNavigationTab>({ "/projects": "researcher", "/library": "resources", "/messages": "chat" }, "researcher");

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
    <div className="space-y-5">
      <div className="flex items-center justify-end border-b border-[#214E3A]/15 pb-3">
        <Button
          variant="secondary"
          size="sm"
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          onClick={() => setShowSupportModal(true)}
        >
          ارسال تیکت به پشتیبانی
        </Button>
      </div>

      <div className="animate-fade-in">
        {activeTab === "researcher" && <ResearchCasesView onNotify={onNotify} />}
        {activeTab === "resources" && <LibraryDocumentsView isApprentice={false} onNotify={onNotify} />}
        {activeTab === "chat" && <DirectChatView onNotify={onNotify} />}
      </div>

      {showSupportModal && (
        <Modal
          isOpen
          onClose={() => setShowSupportModal(false)}
          title="ارسال تیکت به مدیر پشتیبانی"
          maxWidth="md"
        >
          <form onSubmit={(e) => void handleCreateSupportTicket(e)} className="space-y-4 text-right">
            <p className="text-xs leading-relaxed text-[#4F6659]">
              هرگونه مشکل سامانه‌ای یا ابهام در فرایندهای پژوهشی را گزارش نمایید:
            </p>

            <label className="block space-y-1.5 text-xs font-medium text-[#214031]">
              موضوع تیکت
              <input
                type="text"
                dir="rtl"
                required
                minLength={3}
                placeholder="مثال: عدم دسترسی به ضبط مصاحبه در مرحله منابع"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5 text-xs font-medium text-[#214031]">
              شرح درخواست
              <textarea
                dir="rtl"
                rows={4}
                required
                minLength={10}
                placeholder="شرح دقیق موضوع..."
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                className="w-full rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3 py-2 text-sm text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
              />
            </label>

            <div className="flex items-center justify-end gap-2 border-t border-[#214E3A]/10 pt-3">
              <Button type="button" variant="ghost" size="md" onClick={() => setShowSupportModal(false)}>
                انصراف
              </Button>
              <Button type="submit" variant="primary" size="md" loading={isSubmittingTicket} icon={<Send className="h-4 w-4" />}>
                ارسال تیکت
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
