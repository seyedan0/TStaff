import React, { useState } from "react";
import { Phone, Lock, ArrowLeft, ShieldCheck, UserCheck } from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { useAuth } from "./AuthContext.js";

interface TestUserPreset {
  title: string;
  roleName: string;
  phone: string;
  pass: string;
  badgeVariant: "info" | "success" | "warning" | "neutral";
  stage: "INTERN" | "APPRENTICE";
}

const TEST_PRESETS: TestUserPreset[] = [
  {
    title: "مهندس محمد علوی",
    roleName: "مدیر پیگیری و ارشد (امکان ایجاد مدیران)",
    phone: "09121111111",
    pass: "TStaff@123",
    badgeVariant: "warning",
    stage: "INTERN",
  },
  {
    title: "دکتر علی رضایی",
    roleName: "مدیر استانی (تهران)",
    phone: "09122222222",
    pass: "TStaff@123",
    badgeVariant: "info",
    stage: "INTERN",
  },
  {
    title: "دکتر مریم حسینی",
    roleName: "مدیر علمی اصلی پرونده‌ها",
    phone: "09123333333",
    pass: "TStaff@123",
    badgeVariant: "success",
    stage: "INTERN",
  },
  {
    title: "دکتر مهدی کاظمی",
    roleName: "مدیر علمی همکار پرونده‌ها",
    phone: "09124444444",
    pass: "TStaff@123",
    badgeVariant: "info",
    stage: "INTERN",
  },
  {
    title: "سارا ابراهیمی",
    roleName: "دستیار پژوهش (پژوهشگر ارتقایافته)",
    phone: "09125555555",
    pass: "TStaff@123",
    badgeVariant: "success",
    stage: "INTERN",
  },
  {
    title: "رضا میرزایی",
    roleName: "کارآموز پژوهشی (دسترسی محدود AT-02)",
    phone: "09126666666",
    pass: "TStaff@123",
    badgeVariant: "neutral",
    stage: "APPRENTICE",
  },
];

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^09\d{9}$/.test(phone)) {
      setError("شماره همراه باید با 09 آغاز شده و ۱۱ رقم باشد.");
      return;
    }
    if (password.length < 6) {
      setError("گذرواژه باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "شماره همراه یا گذرواژه واردشده نادرست است");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: TestUserPreset) => {
    setPhone(preset.phone);
    setPassword(preset.pass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-8 bg-[#0b0f17]">
      <div className="w-full max-w-md space-y-6">
        {/* Main Login Card */}
        <Card
          variant="elevated"
          className="w-full animate-scale-up border-white/10 shadow-2xl backdrop-blur-2xl bg-slate-900/80"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-apple-xl bg-apple-blue/15 border border-apple-blue/30 flex items-center justify-center text-apple-blue shadow-apple-glow">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              ورود به سامانه مدیریت پژوهش TStaff
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              جهت ورود به پنل، اطلاعات حساب کاربری خود را وارد فرمایید
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            <Input
              label="شماره تلفن همراه"
              type="tel"
              dir="ltr"
              placeholder="09121111111"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="w-4 h-4" />}
              required
            />

            <Input
              label="رمز عبور"
              type="password"
              dir="ltr"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />

            {error && (
              <div className="p-3 rounded-apple-md bg-apple-red/10 border border-apple-red/20 text-apple-red text-xs leading-relaxed">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-3 font-semibold"
              loading={loading}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              ورود به حساب کاربری
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-[11px] text-slate-500">
              احراز هویت فاز ۱ مبتنی بر گذرواژه امن (بدون ارسال پیامک OTP)
            </p>
          </div>
        </Card>

        {/* Quick Role Tester Presets */}
        <Card variant="glass" className="w-full border-white/10 p-4">
          <div className="flex items-center gap-2 mb-3 text-slate-300">
            <UserCheck className="w-4 h-4 text-apple-blue" />
            <h3 className="text-xs font-semibold">
              کاربران آزمایشی پیش‌فرض (تست سریع نقش‌ها)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            روی هر نقش کلیک کنید تا مشخصات آن برای تست سریع در فرم بارگذاری شود (رمز پیش‌فرض تمام کاربران: <code className="text-apple-blue font-mono">TStaff@123</code>):
          </p>

          <div className="space-y-2">
            {TEST_PRESETS.map((p) => (
              <button
                key={p.phone}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`w-full text-right p-2.5 rounded-apple-md border text-xs transition-all flex items-center justify-between ${
                  phone === p.phone
                    ? "bg-apple-blue/15 border-apple-blue/40 text-apple-blue"
                    : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]"
                }`}
              >
                <div>
                  <div className="font-medium text-slate-200">{p.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.roleName}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{p.phone}</span>
                  <Badge variant={p.badgeVariant} size="sm">
                    انتخاب
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
