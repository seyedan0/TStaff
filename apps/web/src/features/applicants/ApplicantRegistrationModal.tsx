import React, { useEffect, useState } from "react";
import { Modal } from "../../shared/ui/Modal.js";
import { Input } from "../../shared/ui/Input.js";
import { Button } from "../../shared/ui/Button.js";
import { apiClient } from "../../shared/api-client.js";
import type { CreateApplicantDto } from "@tstaff/contracts";

export interface ApplicantRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (type: "success" | "error", title: string, message?: string) => void;
}

export const ApplicantRegistrationModal: React.FC<ApplicantRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [supervisors, setSupervisors] = useState<Array<{ id: string; fullName?: string | null; phoneNumber: string }>>([]);
  const [formData, setFormData] = useState<Partial<CreateApplicantDto>>({
    fullName: "",
    nationalId: "",
    phoneNumber: "",
    age: 25,
    provinceId: "11111111-1111-1111-1111-111111111111",
    education: "کارشناسی ارشد",
    fieldOfStudy: "مدیریت فناوری اطلاعات",
    notes: "",
    initialSupervisorId: "",
  });

  const [loading, setLoading] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    apiClient.get<Array<{ id: string; fullName?: string | null; phoneNumber: string; role?: string | null }>>("/users/managers")
      .then((users) => setSupervisors(users.filter((user) => user.role === "SCIENTIFIC_SUPERVISOR")))
      .catch((error) => { setSupervisors([]); onNotify("error", "فهرست مدیران علمی دریافت نشد", error instanceof Error ? error.message : undefined); });
  }, [isOpen, onNotify]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgeError(null);

    // Rule D-01 / FR-056 / AT-28: Strict Positive Integer Age Verification
    const ageVal = Number(formData.age);
    if (!Number.isInteger(ageVal) || ageVal < 18 || ageVal > 99) {
      setAgeError("سن باید یک عدد صحیح مثبت معتبر (بین ۱۸ تا ۹۹) باشد. اعداد اعشاری مردود است.");
      return;
    }

    if (!formData.nationalId || !/^\d{10}$/.test(formData.nationalId)) {
      onNotify("error", "کد ملی نامعتبر است", "کد ملی متقاضی باید دقیقاً ۱۰ رقم باشد.");
      return;
    }

    if (!formData.phoneNumber || !/^09\d{9}$/.test(formData.phoneNumber)) {
      onNotify("error", "شماره تماس نامعتبر است", "شماره همراه باید با 09 شروع شده و ۱۱ رقم باشد.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/applicants", {
        ...formData,
        age: ageVal,
      });
      onNotify(
        "success",
        "پرونده متقاضی ایجاد شد",
        "پرونده پیش‌نویس بدون ساخت حساب کاربری ذخیره شد (FR-001/BR-01).",
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      onNotify("error", "خطا در ثبت متقاضی", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ثبت پرونده پیش‌نویس متقاضی جدید"
      subtitle="طبق مصوبه D-01 و FR-001، سن فقط عدد صحیح است و تا پیش از تأیید علمی حسابی ساخته نمی‌شود."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <Input
          label="نام و نام خانوادگی"
          placeholder="مثال: سارا میرزایی"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          required
        />

        <label className="block text-xs text-slate-300">مدیر علمی اولیه برای مصاحبه و ارزیابی<select required value={formData.initialSupervisorId} onChange={(event) => setFormData({ ...formData, initialSupervisorId: event.target.value })} className="mt-1 w-full rounded-apple-md border border-white/10 bg-slate-900 p-2.5 text-sm text-slate-100"><option value="">انتخاب مدیر علمی</option>{supervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.id}>{supervisor.fullName || supervisor.phoneNumber}</option>)}</select></label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="کد ملی (۱۰ رقم)"
            dir="ltr"
            placeholder="1234567890"
            value={formData.nationalId}
            onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
            required
          />

          <Input
            label="شماره تلفن همراه"
            dir="ltr"
            placeholder="09121234567"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="سن (فقط عدد صحیح مثبت - D-01)"
            type="number"
            step="1"
            min="18"
            max="99"
            dir="ltr"
            value={formData.age}
            onChange={(e) => {
              setFormData({ ...formData, age: Number(e.target.value) });
              setAgeError(null);
            }}
            error={ageError || undefined}
            hint="اعشار و حروف پذیرفته نمی‌شود (قاعده D-01 و AT-28)"
            required
          />

          <Input
            label="مقطع تحصیلی"
            placeholder="کارشناسی / کارشناسی ارشد / دکتری"
            value={formData.education}
            onChange={(e) => setFormData({ ...formData, education: e.target.value })}
            required
          />
        </div>

        <Input
          label="رشته تحصیلی"
          placeholder="مثال: جامعه‌شناسی / مهندسی کامپیوتر"
          value={formData.fieldOfStudy}
          onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button type="button" variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            ثبت پیش‌نویس پرونده
          </Button>
        </div>
      </form>
    </Modal>
  );
};

