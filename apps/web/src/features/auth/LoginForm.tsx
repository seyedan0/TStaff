import React, { useState } from "react";
import { Phone, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { Button } from "../../shared/ui/Button.js";
import { useAuth } from "./AuthContext.js";
import { getLocalQuickLoginConfig, type LocalQuickLoginUser } from "./local-quick-login.js";

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const localHostname = typeof window === "undefined" ? "" : window.location.hostname;
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

          {quickLoginConfig && (
            <section className="mt-5 border-t border-white/10 pt-4" aria-label="ورود سریع محلی">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">ورود سریع برای تست محلی</h3>
              <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {quickLoginConfig.users.map((user) => (
                  <button
                    key={`${user.phoneNumber}-${user.role}`}
                    type="button"
                    disabled={loading}
                    onClick={() => void handleQuickLogin(user)}
                    className="rounded-apple-md border border-white/10 bg-slate-900/70 px-3 py-2 text-right transition-colors hover:border-apple-blue/50 hover:bg-apple-blue/10 disabled:cursor-wait disabled:opacity-50"
                  >
                    <span className="block text-xs font-medium text-slate-100">{user.label}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{user.role} · {user.phoneNumber}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-[11px] text-slate-500">
              احراز هویت فاز ۱ مبتنی بر گذرواژه امن (بدون ارسال پیامک OTP)
            </p>
          </div>
        </Card>

      </div>
    </div>
  );
};
