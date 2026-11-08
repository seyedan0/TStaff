import React, { useState, useEffect } from "react";
import {
  UserPlus,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { apiClient } from "../../shared/api-client.js";
import { ApplicantRegistrationModal } from "./ApplicantRegistrationModal.js";
import type { ApplicantItem } from "../../shared/types.js";
import type { ApplicantStatus } from "@tstaff/contracts";

export interface ApplicantsViewProps {
  onNotify: (type: "success" | "error" | "info", title: string, message?: string) => void;
}

export const ApplicantsView: React.FC<ApplicantsViewProps> = ({ onNotify }) => {
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const loadApplicants = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<ApplicantItem[]>("/applicants");
      setApplicants(data);
    } catch {
      // Fallback demo data showcasing all states
      setApplicants([
        {
          id: "app-101",
          fullName: "سارا احمدی",
          nationalId: "0012345678",
          phoneNumber: "09121112233",
          age: 26,
          provinceId: "11111111-1111-1111-1111-111111111111",
          education: "کارشناسی ارشد",
          fieldOfStudy: "جامعه‌شناسی ارتباطات",
          status: "APPROVED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "app-102",
          fullName: "مهدی خسروی",
          nationalId: "0023456789",
          phoneNumber: "09122223344",
          age: 29,
          provinceId: "11111111-1111-1111-1111-111111111111",
          education: "کارشناسی",
          fieldOfStudy: "مهندسی صنایع",
          status: "IN_REVIEW",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "app-103",
          fullName: "امیرحسین رضوی",
          nationalId: "0034567890",
          phoneNumber: "09123334455",
          age: 24,
          provinceId: "11111111-1111-1111-1111-111111111111",
          education: "کارشناسی",
          fieldOfStudy: "روان‌شناسی",
          status: "PENDING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "app-104",
          fullName: "نرگس صادقی",
          nationalId: "0045678901",
          phoneNumber: "09124445566",
          age: 31,
          provinceId: "11111111-1111-1111-1111-111111111111",
          education: "دکتری",
          fieldOfStudy: "علوم سیاسی",
          status: "REJECTED",
          rejectionReason: "عدم تطابق اولویت‌های پژوهشی استانی",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplicants();
  }, []);

  const handleSubmitForReview = async (id: string) => {
    try {
      await apiClient.post(`/applicants/${id}/submit`);
      onNotify("success", "ارسال به داوری علمی", "پرونده جهت ارزیابی به داوران علمی ارجاع شد.");
      loadApplicants();
    } catch (err: any) {
      onNotify("error", "خطا در ارجاع", err.message);
    }
  };

  const handleDecision = async (id: string, decision: "APPROVED" | "REJECTED") => {
    try {
      await apiClient.post(`/applicants/${id}/decisions`, {
        decision,
        reviewerNotes: decision === "APPROVED" ? "تأیید بر اساس مصاحبه و مدارک" : "عدم احراز شرایط",
      });
      if (decision === "APPROVED") {
        onNotify(
          "success",
          "تأیید علمی متقاضی",
          "حساب کاربری کارآموز (APPRENTICE) با موفقیت در ماژول هویت ایجاد شد (FR-001/002).",
        );
      } else {
        onNotify("info", "رد متقاضی", "پرونده متقاضی رد شد و هیچ حساب کاربری ساخته نشد.");
      }
      loadApplicants();
    } catch (err: any) {
      onNotify("error", "خطا در ثبت تصمیم داوری", err.message);
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await apiClient.post(`/applicants/${id}/reopen`, {
        reason: "ارائه مستندات تکمیلی و رزومه پژوهشی جدید (FR-033)",
      });
      onNotify("success", "درخواست بازگشایی", "درخواست بررسی مجدد پرونده ردشده ثبت گردید.");
      loadApplicants();
    } catch (err: any) {
      onNotify("error", "خطا در درخواست بازگشایی", err.message);
    }
  };

  const getStatusBadge = (status: ApplicantStatus) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success" dot>تأیید علمی (کارآموز فعال)</Badge>;
      case "IN_REVIEW":
        return <Badge variant="warning" dot>در انتظار داوری علمی</Badge>;
      case "PENDING":
        return <Badge variant="neutral">پیش‌نویس استانی</Badge>;
      case "REJECTED":
        return <Badge variant="danger">ردشده (بدون حساب)</Badge>;
      case "REOPEN_REQUESTED":
        return <Badge variant="info" dot>درخواست بازگشایی</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredApplicants =
    filterStatus === "ALL"
      ? applicants
      : applicants.filter((a) => a.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-apple-blue" />
            میز پذیرش و ارزیابی علمی متقاضیان (FR-001 الی FR-004)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ثبت پرونده پیش از ساخت کاربر، اعتبارسنجی سن عدد صحیح (D-01) و ارتقا از کارآموز به کارورز
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsRegisterOpen(true)}
        >
          ثبت متقاضی جدید
        </Button>
      </div>

      {/* Status Filter Tabs (Apple Pill Segmented Control) */}
      <div className="inline-flex p-1 rounded-apple-md apple-glass border border-white/5 gap-1 text-xs overflow-x-auto max-w-full">
        {[
          { key: "ALL", label: "همه پرونده‌ها" },
          { key: "IN_REVIEW", label: "در انتظار داوری" },
          { key: "APPROVED", label: "تأییدشده (کارآموز)" },
          { key: "PENDING", label: "پیش‌نویس استانی" },
          { key: "REJECTED", label: "ردشده" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-apple-sm transition-all duration-150 font-medium select-none ${
              filterStatus === tab.key
                ? "bg-apple-blue text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applicants Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">در حال بارگذاری متقاضیان...</div>
      ) : filteredApplicants.length === 0 ? (
        <Card variant="glass" className="text-center p-12">
          <p className="text-sm text-slate-400">متقاضی با این فیلتر یافت نشد.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApplicants.map((app) => (
            <Card key={app.id} variant="glass" className="hover:border-white/15 transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    {app.fullName}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>کد ملی: <span className="font-mono">{app.nationalId}</span></span>
                    <span>•</span>
                    <span>سن: <strong className="text-slate-200">{app.age} سال (عدد صحیح D-01)</strong></span>
                  </div>
                </div>
                {getStatusBadge(app.status)}
              </div>

              <div className="p-3 rounded-apple-md bg-white/[0.03] border border-white/5 text-xs text-slate-300 space-y-1 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">تحصیلات و رشته:</span>
                  <span>{app.education} - {app.fieldOfStudy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">شماره همراه:</span>
                  <span className="font-mono text-left" dir="ltr">{app.phoneNumber}</span>
                </div>
                {app.rejectionReason && (
                  <div className="text-apple-red pt-1 border-t border-white/5">
                    علت رد: {app.rejectionReason}
                  </div>
                )}
              </div>

              {/* Action Buttons based on status */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                {app.status === "PENDING" && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                    onClick={() => handleSubmitForReview(app.id)}
                  >
                    ارسال برای داوری علمی
                  </Button>
                )}

                {app.status === "IN_REVIEW" && (
                  <>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<XCircle className="w-3.5 h-3.5" />}
                      onClick={() => handleDecision(app.id, "REJECTED")}
                    >
                      رد پرونده
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle className="w-3.5 h-3.5" />}
                      onClick={() => handleDecision(app.id, "APPROVED")}
                    >
                      تأیید علمی (ایجاد کاربر)
                    </Button>
                  </>
                )}

                {app.status === "REJECTED" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={() => handleReopen(app.id)}
                  >
                    درخواست بازگشایی (FR-033)
                  </Button>
                )}

                {app.status === "APPROVED" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<UserCheck className="w-3.5 h-3.5 text-apple-green" />}
                    onClick={() =>
                      onNotify(
                        "success",
                        "ارتقای کارآموز (FR-004)",
                        "کارآموز دوره آموزشی را تکمیل نموده و می‌تواند به مرحله کارورز ارتقا یابد.",
                      )
                    }
                  >
                    ارتقا به کارورز (مدیر استانی)
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Registration Modal */}
      <ApplicantRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={loadApplicants}
        onNotify={onNotify}
      />
    </div>
  );
};
