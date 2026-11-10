import { usePortalSection } from "../../app/usePortalSection.js";
import React, { useState } from "react";
import { HelpCircle, Send } from "lucide-react";
import type { UserNavigationTab } from "../../app/UserNavigation.js";
import { DirectChatView } from "../../features/messaging/DirectChatView.js";
import { LibraryDocumentsView } from "../../features/documents/LibraryDocumentsView.js";
import { apiClient } from "../../shared/api-client.js";
import { Button } from "../../shared/ui/Button.js";
import { Modal } from "../../shared/ui/Modal.js";

interface ApprenticePortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const ApprenticePortal: React.FC<ApprenticePortalProps> = ({ onNotify }) => {
  const activeTab = usePortalSection<UserNavigationTab>({ "/library": "resources", "/messages": "chat" }, "resources");
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const handleCreateSupportTicket = async (event: React.FormEvent) => {
    event.preventDefault();
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
      onNotify("success", "تیکت پشتیبانی ارسال شد", "پیام شما برای بررسی به پشتیبانی سامانه رسید.");
    } catch (error) {
      onNotify("error", "ارسال تیکت انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end border-b border-white/10 pb-3">
        <Button
          variant="secondary"
          size="sm"
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          onClick={() => setShowSupportModal(true)}
        >
          پیام به پشتیبانی
        </Button>
      </div>

      {activeTab === "resources" && <LibraryDocumentsView isApprentice onNotify={onNotify} />}
      {activeTab === "chat" && <DirectChatView onNotify={onNotify} />}

      {showSupportModal && (
        <Modal isOpen onClose={() => setShowSupportModal(false)} title="ارسال تیکت به مدیر پشتیبانی" maxWidth="md">
          <form onSubmit={(event) => void handleCreateSupportTicket(event)} className="space-y-4 text-right">
            <label className="block space-y-1.5 text-xs text-slate-300">
              موضوع
              <input
                required
                minLength={3}
                value={ticketSubject}
                onChange={(event) => setTicketSubject(event.target.value)}
                className="w-full rounded-apple-md border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-100"
              />
            </label>
            <label className="block space-y-1.5 text-xs text-slate-300">
              شرح درخواست
              <textarea
                required
                minLength={10}
                rows={4}
                value={ticketDescription}
                onChange={(event) => setTicketDescription(event.target.value)}
                className="w-full rounded-apple-md border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-100"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
              <Button type="button" variant="ghost" onClick={() => setShowSupportModal(false)}>انصراف</Button>
              <Button type="submit" variant="primary" loading={isSubmittingTicket} icon={<Send className="h-4 w-4" />}>
                ارسال
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
