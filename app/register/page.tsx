"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);

    const name = (document.getElementById("name") as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById("phone") as HTMLInputElement)?.value.trim();
    const email = (document.getElementById("email") as HTMLInputElement)?.value.trim();
    const password = (document.getElementById("password") as HTMLInputElement)?.value;
    const confirm = (document.getElementById("confirm") as HTMLInputElement)?.value;

    if (!name || !phone || !email || !password || !confirm) {
      alert("جميع الحقول مطلوبة");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      alert("كلمتا المرور غير متطابقتين");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      alert(error?.message || "فشل إنشاء الحساب");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email,
      phone,
      role: "client",
      is_provider: false,
      is_approved: false,
    });

    if (insertError) {
      alert("فشل حفظ بيانات المستخدم");
      setLoading(false);
      return;
    }

    router.push("/client/dashboard");
    setLoading(false);
  };

  return (
    <main dir="rtl" className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover pointer-events-none">
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="rounded-2xl backdrop-blur-2xl bg-white/15 border border-white/20 shadow-2xl p-8 text-white">

          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Sayyir AI" width={120} height={40} priority />
          </div>

          <h1 className="text-xl font-semibold text-center mb-2">إنشاء حساب جديد</h1>
          <p className="text-sm text-center text-white/80 mb-6">
            أنشئ حسابك وابدأ باستخدام Sayyir AI
          </p>

          <div className="space-y-4">
            <input
              id="name"
              type="text"
              placeholder="الاسم الكامل"
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm placeholder-white/60 outline-none focus:border-white/50 transition"
            />

            <input
              id="phone"
              type="tel"
              placeholder="رقم الجوال"
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm placeholder-white/60 outline-none focus:border-white/50 transition"
            />

            <input
              id="email"
              type="email"
              placeholder="البريد الإلكتروني"
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm placeholder-white/60 outline-none focus:border-white/50 transition"
            />

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm placeholder-white/60 outline-none focus:border-white/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <input
                id="confirm"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="تأكيد كلمة المرور"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm placeholder-white/60 outline-none focus:border-white/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-white text-black py-3 text-sm font-medium hover:bg-gray-100 transition disabled:opacity-60"
            >
              {loading ? "جاري الإنشاء..." : "إنشاء حساب"}
            </button>
          </div>

          <div className="text-center text-sm text-white/80 mt-6">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="underline hover:opacity-80">
              تسجيل الدخول
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}
