import { useState, type FormEvent } from "react";
import { HelpCircle, Send } from "lucide-react";
import { apiClient } from "../../shared/api-client.js";
import { Button } from "../../shared/ui/Button.js";
import { Modal } from "../../shared/ui/Modal.js";

export function SupportRequest({
  onNotify,
}: {
  onNotify: (
    type: "success" | "error",
    title: string,
    message?: string,
  ) => void;
}) {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const handleCreateSupportTicket = async (event: FormEvent) => {
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
      onNotify(
        "success",
        "تیکت پشتیبانی ارسال شد",
        "پیام شما برای بررسی به پشتیبانی سامانه رسید.",
      );
    } catch (error) {
      onNotify(
        "error",
        "ارسال تیکت انجام نشد",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<HelpCircle size={17} />}
        onClick={() => setShowSupportModal(true)}
      >
        درخواست پشتیبانی
      </Button>
      {showSupportModal && (
        <Modal
          isOpen
          onClose={() => setShowSupportModal(false)}
          title="ارسال تیکت به مدیر پشتیبانی"
          maxWidth="md"
        >
          <form
            onSubmit={(event) => void handleCreateSupportTicket(event)}
            className="space-y-4 text-right"
          >
            <label className="block space-y-1.5 text-xs font-medium text-[#162F48]">
              موضوع
              <input
                required
                minLength={3}
                value={ticketSubject}
                onChange={(event) => setTicketSubject(event.target.value)}
                className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] px-3 py-2 text-sm text-[#162F48]"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-medium text-[#162F48]">
              شرح درخواست
              <textarea
                required
                minLength={10}
                rows={4}
                value={ticketDescription}
                onChange={(event) => setTicketDescription(event.target.value)}
                className="w-full rounded-xl border border-[#087674]/20 bg-[#FFFFFF] px-3 py-2 text-sm text-[#162F48]"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-[#087674]/10 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSupportModal(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmittingTicket}
                icon={<Send className="h-4 w-4" />}
              >
                ارسال
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
