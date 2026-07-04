"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Eye, EyeOff, KeyRound, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const cleanRecoveryUrl = () => {
  window.history.replaceState({}, document.title, "/reset-password");
};

const getRecoveryParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const rawHash = window.location.hash.replace(/^#/, "");
  const hashQuery = rawHash.includes("?") ? rawHash.slice(rawHash.indexOf("?") + 1) : rawHash;
  const hashParams = new URLSearchParams(hashQuery);

  const getParam = (key: string) => searchParams.get(key) || hashParams.get(key) || "";

  return {
    code: getParam("code"),
    accessToken: getParam("access_token"),
    refreshToken: getParam("refresh_token"),
    tokenHash: getParam("token_hash"),
    type: getParam("type"),
    error: getParam("error"),
    errorDescription: getParam("error_description"),
  };
};

const formatAuthAttemptError = (message: string) => {
  if (!message) {
    return "رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا من صفحة تسجيل الدخول.";
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("expired") || normalized.includes("invalid")) {
    return "رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا من صفحة تسجيل الدخول.";
  }

  return `تعذر تأكيد رابط استعادة كلمة المرور. رسالة Supabase: ${message}`;
};

const formatSupabaseUrlError = (error: string, errorDescription: string) => {
  const details = errorDescription || error;
  if (!details) return "";

  return formatAuthAttemptError(details);
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const prepareRecoverySession = async () => {
      const params = getRecoveryParams();
      const attemptErrors: string[] = [];
      let recoverySucceeded = false;

      try {
        if (params.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeError) {
            attemptErrors.push(exchangeError.message);
          } else {
            recoverySucceeded = true;
          }
        }

        if (!recoverySucceeded && params.accessToken && params.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          if (sessionError) {
            attemptErrors.push(sessionError.message);
          } else {
            recoverySucceeded = true;
          }
        }

        if (!recoverySucceeded && params.tokenHash && params.type === "recovery") {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: params.tokenHash,
          });
          if (verifyError) {
            attemptErrors.push(verifyError.message);
          } else {
            recoverySucceeded = true;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (recoverySucceeded && session) {
          cleanRecoveryUrl();
          setRecoveryReady(true);
          return;
        }

        if (params.error || params.errorDescription) {
          setError(formatSupabaseUrlError(params.error, params.errorDescription));
          return;
        }

        if (attemptErrors.length > 0) {
          setError(formatAuthAttemptError(attemptErrors[attemptErrors.length - 1]));
          return;
        }

        setError("رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا من صفحة تسجيل الدخول.");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "";
        setError(formatAuthAttemptError(message));
      } finally {
        setCheckingSession(false);
      }
    };

    prepareRecoverySession();
  }, []);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("أدخل كلمة المرور الجديدة وتأكيدها.");
      return;
    }

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess("تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      setError(message ? `تعذر تحديث كلمة المرور. رسالة Supabase: ${message}` : "تعذر تحديث كلمة المرور. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#121212] flex items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C89B3C]/15 text-[#C89B3C]">
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">استعادة كلمة المرور</h1>
            <p className="mt-1 text-sm text-white/50">أدخل كلمة مرور جديدة لحسابك.</p>
          </div>
        </div>

        {checkingSession ? (
          <div className="flex items-center justify-center py-12 text-[#C89B3C]">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : success ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200">
              <CheckCircle className="mt-0.5 shrink-0" size={20} />
              <p className="text-sm leading-relaxed">{success}</p>
            </div>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="w-full rounded-xl bg-[#C89B3C] py-3 font-bold text-black transition hover:bg-[#b88d35]"
            >
              الذهاب إلى تسجيل الدخول
            </button>
          </div>
        ) : !recoveryReady ? (
          <div className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
                <XCircle className="mt-0.5 shrink-0" size={20} />
                <p className="text-sm leading-relaxed">{error}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="w-full rounded-xl bg-[#C89B3C] py-3 font-bold text-black transition hover:bg-[#b88d35]"
            >
              العودة إلى تسجيل الدخول
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
                <XCircle className="mt-0.5 shrink-0" size={20} />
                <p className="text-sm leading-relaxed">{error}</p>
              </div>
            )}

            <label className="block space-y-2">
              <span className="text-sm text-white/70">كلمة المرور الجديدة</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 pl-12 text-left text-white outline-none transition focus:border-[#C89B3C]"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-white/70">تأكيد كلمة المرور</span>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left text-white outline-none transition focus:border-[#C89B3C]"
                dir="ltr"
              />
            </label>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C89B3C] py-3 font-bold text-black transition hover:bg-[#b88d35] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={18} />}
              حفظ كلمة المرور
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
