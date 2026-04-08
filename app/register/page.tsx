"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Home } from "lucide-react"; 
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneCode, setPhoneCode] = useState("+966"); // حالة مفتاح الدولة

  const handleRegister = async () => {
    if (loading) return;
    setLoading(true);

    const full_name = (document.getElementById("name") as HTMLInputElement)?.value.trim();
    const rawPhone = (document.getElementById("phone") as HTMLInputElement)?.value.trim();
    const email = (document.getElementById("email") as HTMLInputElement)?.value.trim();
    const password = (document.getElementById("password") as HTMLInputElement)?.value;
    const confirm = (document.getElementById("confirm") as HTMLInputElement)?.value;

    const phone = rawPhone ? phoneCode + rawPhone.replace(/\D/g, '') : '';

    // 1. التحقق من الحقول الفارغة
    if (!full_name || !phone || !email || !password || !confirm) {
      toast.error("جميع الحقول مطلوبة");
      setLoading(false);
      return;
    }

    // 2. التحقق من تطابق كلمة المرور
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      setLoading(false);
      return;
    }

    try {
        const normalizedEmail = email.toLowerCase();

        // 3. الفحص المسبق: التحقق من وجود الإيميل
        const { data: emailCheck } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', normalizedEmail)
            .maybeSingle();

        if (emailCheck) {
            toast.error("البريد الإلكتروني مسجل مسبقاً في المنصة.");
            setLoading(false);
            return;
        }

        // 4. الفحص المسبق: التحقق من وجود رقم الجوال
        const { data: phoneCheck } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

        if (phoneCheck) {
            toast.error("رقم الجوال مسجل مسبقاً بحساب آخر.");
            setLoading(false);
            return;
        }

        // 5. الفحص المسبق: التحقق من وجود الاسم (اختياري لكنه مطلوب بناءً على طلبك)
        const { data: nameCheck } = await supabase
            .from('profiles')
            .select('id')
            .eq('full_name', full_name)
            .maybeSingle();

        if (nameCheck) {
            toast.error("هذا الاسم مسجل مسبقاً، يرجى استخدام اسم آخر أو إضافة لقب.");
            setLoading(false);
            return;
        }

        // 6. المتابعة لإنشاء الحساب في Auth
        const redirectTo = `${window.location.origin}/auth/callback`;

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: full_name,
              phone: phone,
              role: 'client' 
            }
          }
        });

        if (error) {
          toast.error(error.message || "فشل إنشاء الحساب");
          setLoading(false);
          return;
        }

        if (data.user && !data.session) {
          toast.success("تم إنشاء الحساب بنجاح! راجع بريدك لتفعيل الحساب.");
          setTimeout(() => {
              router.replace("/login");
          }, 3000);
        } else if (data.session) {
          router.replace("/"); 
        }

    } catch (err) {
        console.error(err);
        toast.error("حدث خطأ غير متوقع أثناء الاتصال بالخادم");
    } finally {
        setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <Toaster position="top-center" richColors />
      
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

            {/* حقل الجوال مع مفتاح الدولة */}
            <div className="flex flex-row-reverse" dir="ltr">
                <select
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-l-xl px-3 text-white focus:border-[#C89B3C] focus:bg-black/20 outline-none transition text-center appearance-none"
                >
                    <option value="+966" className="bg-[#1a1a1a]">+966 🇸🇦</option>
                    <option value="+971" className="bg-[#1a1a1a]">+971 🇦🇪</option>
                    <option value="+965" className="bg-[#1a1a1a]">+965 🇰🇼</option>
                    <option value="+973" className="bg-[#1a1a1a]">+973 🇧🇭</option>
                    <option value="+968" className="bg-[#1a1a1a]">+968 🇴🇲</option>
                    <option value="+974" className="bg-[#1a1a1a]">+974 🇶🇦</option>
                    <option value="+20" className="bg-[#1a1a1a]">+20 🇪🇬</option>
                </select>
                <input
                    id="phone"
                    type="tel"
                    placeholder="رقم الجوال"
                    className="w-full rounded-r-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition text-left"
                    dir="ltr"
                />
            </div>

            <input
              id="email"
              type="email"
              placeholder="البريد الإلكتروني"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition text-left"
              dir="ltr"
            />

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition text-left"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <input
                id="confirm"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="تأكيد كلمة المرور"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition text-left"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
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