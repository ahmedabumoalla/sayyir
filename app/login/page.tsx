"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";



export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"client" | "provider">("client");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    // جلب القيم من الحقول
    const phone = (document.getElementById("phone") as HTMLInputElement)?.value?.trim();
    const emailInput = (document.getElementById("email") as HTMLInputElement)?.value?.trim();
    const password = (document.getElementById("password") as HTMLInputElement)?.value;

    // التحقق المبدئي من أن الحقول ليست فارغة
    if (
      !password ||
      (mode === "client" && !phone) ||
      (mode === "provider" && !emailInput)
    ) {
      alert("الرجاء إدخال جميع البيانات");
      setLoading(false);
      return;
    }

    let emailToLogin = "";

    // ---------------------------------------------------------
    // الخطوة 1: تحديد الإيميل (بناءً على الوضع: زائر أو مزود)
    // ---------------------------------------------------------
    
    if (mode === "client") {
      // 🔒 الطريقة الآمنة: استخدام RPC لجلب الإيميل من رقم الجوال
      // هذا يحمي قاعدة البيانات من القراءة العامة
      const { data: fetchedEmail, error: rpcError } = await supabase.rpc(
        "get_email_by_phone",
        { phone_input: phone }
      );

      if (rpcError || !fetchedEmail) {
        // في حال لم نجد الرقم، نعطي رسالة عامة للأمان
        console.error("RPC Error or Phone not found:", rpcError);
        alert("بيانات الدخول غير صحيحة");
        setLoading(false);
        return;
      }
      emailToLogin = fetchedEmail;
    } else {
      // إذا كان مزود خدمة، هو يدخل الإيميل مباشرة
      emailToLogin = emailInput;
    }

    // ---------------------------------------------------------
    // الخطوة 2: محاولة تسجيل الدخول (Authentication)
    // ---------------------------------------------------------
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });

    if (authError || !authData.user) {
      alert("بيانات الدخول غير صحيحة");
      setLoading(false);
      return;
    }

    // ---------------------------------------------------------
    // الخطوة 3: التحقق من بيانات المستخدم (Authorization)
    // ---------------------------------------------------------
    // الآن نحن مسجلون دخول، فيمكننا قراءة بياناتنا الخاصة من جدول users
    // (بفضل سياسة RLS: auth.uid() = id)

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role, is_active, is_approved")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !userProfile) {
      alert("حدث خطأ في استرجاع بيانات الحساب");
      await supabase.auth.signOut(); // نخرج المستخدم لأنه واجه مشكلة تقنية
      setLoading(false);
      return;
    }

    // التحقق من أن المستخدم يحاول الدخول من البوابة الصحيحة
    if (userProfile.role !== mode) {
        const correctRole = userProfile.role === "client" ? "زائر" : "مزود خدمة";
        alert(`عذراً، هذا الحساب مسجل كـ "${correctRole}" يرجى تغيير نوع الدخول.`);
        await supabase.auth.signOut();
        setLoading(false);
        return;
    }

    // التحقق من تفعيل الحساب
    if (!userProfile.is_active) {
      alert("تم تعطيل هذا الحساب، يرجى التواصل مع الإدارة");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // ---------------------------------------------------------
    // الخطوة 4: التوجيه (Routing)
    // ---------------------------------------------------------

    if (mode === "client") {
      router.push("/client/dashboard");
      return;
    }

    if (mode === "provider") {
      // التحقق من تأكيد الإيميل لمزود الخدمة
      if (!authData.user.email_confirmed_at) {
        alert("يرجى تأكيد البريد الإلكتروني أولاً");
        setLoading(false);
        return;
      }

      // التحقق من موافقة الإدارة
      if (!userProfile.is_approved) {
        router.push("/provider/pending");
        return;
      }

      router.push("/provider/dashboard");
      return;
    }

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
            <Image src="/logo.png" alt="Sayyir AI" width={120} height={40} />
          </div>

          <div className="flex mb-6 rounded-full bg-white/10 p-1 text-sm">
            <button onClick={() => setMode("client")} className={`flex-1 py-2 rounded-full transition-all ${mode === "client" ? "bg-white text-black font-bold" : "text-white/80 hover:bg-white/5"}`}>
              زائر
            </button>
            <button onClick={() => setMode("provider")} className={`flex-1 py-2 rounded-full transition-all ${mode === "provider" ? "bg-white text-black font-bold" : "text-white/80 hover:bg-white/5"}`}>
              مزود خدمة
            </button>
          </div>

          <div className="space-y-4">
            {mode === "provider" && (
              <input id="email" type="email" placeholder="البريد الإلكتروني" className="w-full rounded-xl bg-white/10 border border-white/10 focus:border-white/50 px-4 py-3 outline-none transition-colors" />
            )}

            {mode === "client" && (
              <input id="phone" type="tel" placeholder="رقم الجوال" className="w-full rounded-xl bg-white/10 border border-white/10 focus:border-white/50 px-4 py-3 outline-none transition-colors" />
            )}

            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} placeholder="كلمة المرور" className="w-full rounded-xl bg-white/10 border border-white/10 focus:border-white/50 px-4 py-3 outline-none transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button onClick={handleLogin} disabled={loading} className="w-full rounded-xl bg-white text-black py-3 font-semibold hover:bg-gray-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? "جاري التحقق..." : "تسجيل الدخول"}
            </button>
          </div>

          <div className="text-center text-sm mt-6">
            ليس لديك حساب؟ <Link href="/register" className="underline hover:text-gray-300">إنشاء حساب</Link>
          </div>
        </div>
      </div>
    </main>
  );
}