import React, { useState } from "react";
import { Phone, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Input } from "../../shared/ui/Input.js";
import { Button } from "../../shared/ui/Button.js";
import { useAuth } from "./AuthContext.js";

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [phone, setPhone] = useState("09121234567");
  const [password, setPassword] = useState("securePassword123");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ورود به سامانه");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card
        variant="elevated"
        className="w-full max-w-md animate-scale-up border-white/10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-apple-xl bg-apple-blue/15 border border-apple-blue/30 flex items-center justify-center text-apple-blue shadow-apple-glow">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            ورود به سامانه مدیریت پژوهش TStaff
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            شبکه هوشمند راهبری پژوهش‌ها، پذیرش علمی و نظارت دوره‌ای
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <Input
            label="شماره تلفن همراه"
            type="tel"
            dir="ltr"
            placeholder="09123456789"
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
            <div className="p-3 rounded-apple-md bg-apple-red/10 border border-apple-red/20 text-apple-red text-xs">
              {error}
            </div>
          )}

          <div className="p-3 rounded-apple-md bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300">نکته معماری فاز ۱:</span> احراز هویت پیامکی (OTP) مطابق مصوبات سند نیازمندی‌ها به فازهای بعدی موکول شده است.
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={loading}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            ورود به حساب کاربری
          </Button>
        </form>
      </Card>
    </div>
  );
};

