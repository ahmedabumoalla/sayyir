"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Home } from "lucide-react"; 
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner"; // يفضل استخدام sonner للتنبيهات

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;
    setLoading(true);

    const full_name = (document.getElementById("name") as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById("phone") as HTMLInputElement)?.value.trim();
    const email = (document.getElementById("email") as HTMLInputElement)?.value.trim();
    const password = (document.getElementById("password") as HTMLInputElement)?.value;
    const confirm = (document.getElementById("confirm") as HTMLInputElement)?.value;

    if (!full_name || !phone || !email || !password || !confirm) {
      alert("جميع الحقول مطلوبة");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      alert("كلمتا المرور غير متطابقتين");
      setLoading(false);
      return;
    }

    try {
        // تحديد رابط العودة بعد التفعيل
        // تأكد أنك ضفت هذا الرابط في Supabase -> Auth -> URL Configuration -> Redirect URLs
        const redirectTo = `${window.location.origin}/auth/callback`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo, // مهم جداً عشان يرجع للموقع
            data: {
              full_name: full_name,
              phone: phone,
              role: 'client' 
            }
          }
        });

        if (error) {
          alert(error.message || "فشل إنشاء الحساب");
          setLoading(false);
          return;
        }

        // التحقق من الحالة
        if (data.user && !data.session) {
          // الحالة هنا: تم إنشاء اليوزر لكن الإيميل غير مؤكد
          // Supabase أرسل الإيميل تلقائياً بناءً على إعدادات الداشبورد
          alert("✅ تم إنشاء الحساب بنجاح!\n\nتم إرسال رابط التفعيل إلى بريدك الإلكتروني.\nالرجاء تأكيد الإيميل لتتمكن من تسجيل الدخول.");
          router.replace("/login");
        } else if (data.session) {
          // في حال كان خيار تأكيد الإيميل مقفل (سيدخل مباشرة)
          router.replace("/"); 
        }

    } catch (err) {
        console.error(err);
        alert("حدث خطأ غير متوقع");
    } finally {
        setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      
      {/* زر الرجوع للرئيسية */}
      <Link 
        href="/" 
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all text-white text-sm font-bold group"
      >
        <Home size={18} className="group-hover:text-[#C89B3C] transition-colors" />
        <span className="group-hover:text-[#C89B3C] transition-colors">الرئيسية</span>
      </Link>

      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover pointer-events-none opacity-60">
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6 animate-in zoom-in-95 duration-500">
        <div className="rounded-2xl backdrop-blur-2xl bg-white/10 border border-white/20 shadow-2xl p-8 text-white">
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Sayyir AI" width={120} height={40} priority />
          </div>

          <h1 className="text-xl font-semibold text-center mb-2">إنشاء حساب جديد</h1>
          <p className="text-sm text-center text-white/80 mb-6">أنشئ حسابك واستمتع بتجربة سياحية ذكية</p>

          <div className="space-y-4">
            <input
              id="name"
              type="text"
              placeholder="الاسم الكامل"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition"
            />

            <input
              id="phone"
              type="tel"
              placeholder="رقم الجوال"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition"
            />

            <input
              id="email"
              type="email"
              placeholder="البريد الإلكتروني"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition"
              dir="ltr"
            />

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <input
                id="confirm"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="تأكيد كلمة المرور"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-white text-black py-3.5 font-bold hover:bg-gray-200 transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : "إنشاء حساب"}
            </button>
          </div>

          <div className="text-center text-sm text-white/60 mt-6">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-white font-bold hover:text-[#C89B3C] transition underline underline-offset-4">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}