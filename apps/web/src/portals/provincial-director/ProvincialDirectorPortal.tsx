import React, { useState } from "react";
import { Users, BarChart3, ShieldAlert } from "lucide-react";
import { ApplicantsView } from "../../features/applicants/ApplicantsView.js";
import { Card } from "../../shared/ui/Card.js";
import { Badge } from "../../shared/ui/Badge.js";
import { useAuth } from "../../features/auth/AuthContext.js";

interface ProvincialDirectorPortalProps {
  onNotify: (
    type: "success" | "error" | "info" | "warning",
    title: string,
    message?: string,
  ) => void;
}

export const ProvincialDirectorPortal: React.FC<
  ProvincialDirectorPortalProps
> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"applicants" | "kpis">(
    "applicants",
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card
        variant="elevated"
        className="p-6 border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-apple-blue/10"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="info" size="sm">
                پنل مدیریت استانی
              </Badge>
              <span className="text-xs text-slate-400">
                قوانین الزامی: FR-001 (عدم ساخت کاربر قبل از قبولی) و D-01 (سن فقط عدد صحیح)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              میز پذیرش علمی و راهبری پژوهشگران استان (مدیر استانی: {currentUser?.fullName || "دکتر علی رضایی"})
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              ثبت‌نام متقاضیان، هدایت مصاحبه‌های علمی و غربالگری، نظارت بر استانداردهای ورود به دوره کارآموزی و نظارت بر کارایی پژوهشگران استان.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-apple-lg bg-white/[0.03] border border-white/5">
            <button
              onClick={() => setActiveTab("applicants")}
              className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold transition-all ${
                activeTab === "applicants"
                  ? "bg-apple-blue text-white shadow-apple-glow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" />
              میز پذیرش و متقاضیان استانی
            </button>
            <button
              onClick={() => setActiveTab("kpis")}
              className={`flex items-center gap-2 px-4 py-2 rounded-apple-md text-xs font-semibold transition-all ${
                activeTab === "kpis"
                  ? "bg-apple-blue text-white shadow-apple-glow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              شاخص‌های عملکرد استان
            </button>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="animate-fade-in">
        {activeTab === "applicants" && <ApplicantsView onNotify={onNotify} />}

        {activeTab === "kpis" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="glass" className="p-4 border-white/10">
                <span className="text-xs text-slate-400">کل متقاضیان استان</span>
                <div className="text-2xl font-bold text-slate-100 mt-1">۱۲ نفر</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  در فرآیند غربالگری و مصاحبه علمی
                </div>
              </Card>

              <Card variant="glass" className="p-4 border-white/10">
                <span className="text-xs text-slate-400">کارآموزان فعال</span>
                <div className="text-2xl font-bold text-apple-blue mt-1">۵ نفر</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  در حال مطالعه شیوه‌نامه‌ها
                </div>
              </Card>

              <Card variant="glass" className="p-4 border-white/10">
                <span className="text-xs text-slate-400">کارورزان ارتقایافته</span>
                <div className="text-2xl font-bold text-apple-green mt-1">۸ نفر</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  دارای پرونده فعال در چرخه ۴ مرحله‌ای
                </div>
              </Card>

              <Card variant="glass" className="p-4 border-white/10">
                <span className="text-xs text-slate-400">متقاضیان ردشده (بدون حساب)</span>
                <div className="text-2xl font-bold text-apple-amber mt-1">۳ نفر</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  بایگانی‌شده بر اساس اصل FR-002
                </div>
              </Card>
            </div>

            <Card variant="elevated" className="p-6 border-white/10">
              <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-apple-blue" />
                قواعد ممیزی استانی منطبق با مصوبات محصول:
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong>قاعده FR-001 و FR-002:</strong> تا پیش از تایید نهایی در مرحله مصاحبه علمی، هیچ رکوردی در جدول کاربران ایجاد نمی‌شود. متقاضیان ردشده اکانت دریافت نمی‌کنند.
                </li>
                <li>
                  <strong>قاعده D-01 (سن فقط عدد صحیح):</strong> سن متقاضی عدد صحیح مثبت بین ۱۸ تا ۱۰۰ سال است و نباید از روی تاریخ تولد مشتق شود.
                </li>
                <li>
                  <strong>قاعده محلی‌سازی:</strong> مدیر استانی به پرونده‌های متقاضیان استان تحت نظارت خود دسترسی مستقیم دارد.
                </li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
