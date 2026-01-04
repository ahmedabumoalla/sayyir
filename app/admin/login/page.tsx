"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);

    const email = (document.getElementById("email") as HTMLInputElement)?.value?.trim();
    const authPassword = (document.getElementById("auth_password") as HTMLInputElement)?.value;
    const secret = (document.getElementById("secret") as HTMLInputElement)?.value;

    if (!email || !authPassword || !secret) {
      alert("الرجاء إدخال جميع البيانات");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, authPassword, secret }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        alert(json?.error || "فشل تسجيل الدخول");
        setLoading(false);
        return;
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });

      if (setErr) {
        alert("فشل تسجيل الدخول");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      alert("فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="rounded-2xl backdrop-blur-2xl bg-white/15 border border-white/20 shadow-2xl p-8 text-white">
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Sayyir AI" width={120} height={40} />
          </div>

          <h1 className="text-xl font-semibold text-center mb-2">تسجيل دخول الأدمن</h1>
          <p className="text-sm text-center text-white/80 mb-6">من هم شركاء سير؟</p>

          <div className="space-y-4">
            <input
              id="email"
              type="email"
              placeholder="البريد الإلكتروني"
              className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 outline-none"
            />

            <div className="relative">
              <input
                id="auth_password"
                type={showAuthPassword ? "text" : "password"}
                placeholder="كلمة مرور الحساب"
                className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAuthPassword(!showAuthPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70"
              >
                {showAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <input
                id="secret"
                type={showSecret ? "text" : "password"}
                placeholder="الإجابة السرّية"
                className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70"
              >
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-xl bg-white text-black py-3 font-semibold disabled:opacity-70"
            >
              {loading ? "جاري التحقق..." : "دخول الأدمن"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
