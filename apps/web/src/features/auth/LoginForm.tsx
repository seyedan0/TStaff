import React, { useState } from "react";
import { Phone, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { Button } from "../../shared/ui/Button.js";
import { useAuth } from "./AuthContext.js";
import { getLocalQuickLoginConfig, type LocalQuickLoginUser } from "./local-quick-login.js";
import { isDemoMode } from "../demo/demo-mode.js";
import { getDemoPersonas } from "../demo/demo-store.js";

export const LoginForm: React.FC = () => {
  const { login, loginDemo } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const localHostname = typeof window === "undefined" ? "" : window.location.hostname;
  const demoMode = isDemoMode();
  const demoPersonas = demoMode ? getDemoPersonas() : [];
  const isLoopbackHost = ["localhost", "127.0.0.1", "::1"].includes(localHostname.toLowerCase());
  const quickLoginConfig = import.meta.env.DEV && isLoopbackHost
    ? getLocalQuickLoginConfig({
        isDevelopment: true,
        enabled: import.meta.env.VITE_LOCAL_TEST_LOGIN,
        hostname: localHostname,
        password: import.meta.env.VITE_LOCAL_TEST_PASSWORD,
        usersJson: import.meta.env.VITE_LOCAL_TEST_USERS,
      })
    : null;

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

  const handleQuickLogin = async (user: LocalQuickLoginUser) => {
    if (!quickLoginConfig || loading) return;
    setError(null);
    setLoading(true);
    try {
      await login(user.phoneNumber, quickLoginConfig.password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ورود سریع محلی انجام نشد");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (personaId: string) => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await loginDemo(personaId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ورود به حساب نمایشی انجام نشد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-8 bg-[#F3EBDD]">
      <div className="w-full max-w-md space-y-6">
        <Card variant="elevated" className="w-full animate-scale-up">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#214E3A] text-[#FFFCF5] flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-[#214031] tracking-tight">
              {demoMode ? "بازبینی نسخه‌ی نمایشی TStaff" : "ورود به سامانه مدیریت پژوهش TStaff"}
            </h1>
            <p className="text-xs text-[#4F6659] mt-1.5 leading-relaxed">
              {demoMode ? "برای مشاهده‌ی پنل‌ها، یکی از حساب‌های ساختگی را انتخاب کنید." : "جهت ورود به پنل، اطلاعات حساب کاربری خود را وارد فرمایید"}
            </p>
          </div>

          {demoMode ? (
            <section className="space-y-3" aria-label="حساب‌های نمایشی">
              <div className="rounded-xl border border-[#214E3A]/20 bg-[#214E3A]/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-[#214031]">
                داده‌ها ساختگی‌اند. هر حساب فقط وضعیت نمایشی را باز می‌کند؛ تغییرات این مرورگر با seed محلی مشترک ذخیره می‌شوند.
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {demoPersonas.map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    disabled={loading}
                    onClick={() => void handleDemoLogin(persona.id)}
                    className="rounded-xl border border-[#214E3A]/20 bg-[#F3EBDD]/60 px-3 py-3 text-right transition-colors hover:border-[#214E3A] hover:bg-[#214E3A]/10 disabled:cursor-wait disabled:opacity-50"
                  >
                    <span className="block text-xs font-semibold text-[#214031]">{persona.label}</span>
                    <span className="mt-1 block text-[10px] font-medium text-[#214E3A]">{persona.status}</span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-[#4F6659]">{persona.summary}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
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
                <div role="alert" className="p-3 rounded-xl bg-[#D94F3D]/10 border border-[#D94F3D]/30 text-[#B83B2B] text-xs font-medium leading-relaxed">
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
          )}

          {!demoMode && quickLoginConfig && (
            <section className="mt-5 border-t border-[#214E3A]/15 pt-4" aria-label="ورود سریع محلی">
              <h2 className="mb-3 text-sm font-semibold text-[#214031]">ورود سریع برای تست محلی</h2>
              <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {quickLoginConfig.users.map((user) => (
                  <button
                    key={`${user.phoneNumber}-${user.role}`}
                    type="button"
                    disabled={loading}
                    onClick={() => void handleQuickLogin(user)}
                    className="rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/55 px-3 py-2 text-right transition-colors hover:border-[#214E3A] hover:bg-[#214E3A]/10 disabled:cursor-wait disabled:opacity-50"
                  >
                    <span className="block text-xs font-semibold text-[#214031]">{user.label}</span>
                    <span className="mt-1 block text-[10px] text-[#4F6659]">{user.role} · {user.phoneNumber}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mt-4 pt-4 border-t border-[#214E3A]/10 text-center">
            <p className="text-[11px] text-[#4F6659]">
              {demoMode ? "نسخه‌ی نمایشی به API و حساب واقعی متصل نیست." : "احراز هویت فاز ۱ مبتنی بر گذرواژه امن (بدون ارسال پیامک OTP)"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
