import React, { useState } from "react";
import { Modal } from "../../shared/ui/Modal.js";
import { Input } from "../../shared/ui/Input.js";
import { Button } from "../../shared/ui/Button.js";
import { apiClient } from "../../shared/api-client.js";
import type { CreateResearchCaseDto } from "@tstaff/contracts";

export interface CreateResearchCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (type: "success" | "error", title: string, message?: string) => void;
}

export const CreateResearchCaseModal: React.FC<CreateResearchCaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [formData, setFormData] = useState<CreateResearchCaseDto>({
    title: "",
    code: `CASE-${Math.floor(100 + Math.random() * 900)}`,
    subject: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.title.length < 3) {
      onNotify("error", "خطای اعتبارسنجی", "عنوان پرونده باید حداقل ۳ کاراکتر باشد.");
      return;
    }
    if (!formData.subject || formData.subject.length < 2) {
      onNotify("error", "خطای اعتبارسنجی", "موضوع پژوهش الزامی است.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/research-cases", formData);
      onNotify(
        "success",
        "پرونده پژوهشی ایجاد شد",
        `پرونده با کد ${formData.code} در مرحله آغازین منابع (SOURCES) ایجاد گردید.`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      onNotify("error", "خطا در ایجاد پرونده", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ایجاد پرونده پژوهشی جدید (AT-04)"
      subtitle="شروع چرخه علمی پژوهش شامل مراحل منابع، تبیین، تجویز و سناریونویسی"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <Input
          label="عنوان پرونده پژوهشی"
          placeholder="مثال: بررسی تحولات زیست‌بوم نوآوری کشور"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="کد یکتای پرونده"
            dir="ltr"
            placeholder="CASE-204"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />

          <Input
            label="حوزه و موضوع کلی"
            placeholder="مثال: اقتصاد دیجیتال"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button type="button" variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            ایجاد پرونده
          </Button>
        </div>
      </form>
    </Modal>
  );
};

