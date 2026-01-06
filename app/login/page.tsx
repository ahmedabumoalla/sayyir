"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
// 1. اضفنا أيقونة Home هنا
import { Eye, EyeOff, Loader2, Home } from "lucide-react"; // <--- تعديل هنا
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);

    const email = (document.getElementById("email") as HTMLInputElement)?.value?.trim();
    const password = (document.getElementById("password") as HTMLInputElement)?.value;

    if (!email || !password) {
      alert("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
      setLoading(false);
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error || !session) {
        alert("بيانات الدخول غير صحيحة، تأكد من الإيميل وكلمة المرور.");
        setLoading(false);
        return;
      }

      // جلب الصلاحيات
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin, is_super_admin, is_provider")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        router.replace("/");
        return;
      }

      if (profile.is_super_admin || profile.is_admin) {
        router.replace("/admin/dashboard");
      } else if (profile.is_provider) {
        router.replace("/provider/dashboard");
      } else {
        router.replace("/"); 
      }

    } catch (err) {
      console.error(err);
      alert("حدث خطأ غير متوقع، حاول مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      
      {/* 2. زر الرجوع للرئيسية (تمت إضافته هنا في الزاوية) */}
      <Link 
        href="/" 
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all text-white text-sm font-bold group"
      >
        <Home size={18} className="group-hover:text-[#C89B3C] transition-colors" />
        <span className="group-hover:text-[#C89B3C] transition-colors">الرئيسية</span>
      </Link>
      {/* -------------------------------------------------- */}

      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover pointer-events-none opacity-60">
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6 animate-in zoom-in-95 duration-500">
        <div className="rounded-2xl backdrop-blur-2xl bg-white/10 border border-white/20 shadow-2xl p-8 text-white">
          
          <div className="flex justify-center mb-8">
            <button 
              type="button" 
              onClick={() => router.push("/admin/login")} 
              className="cursor-pointer hover:scale-105 transition-transform duration-300 opacity-90 hover:opacity-100"
              title="الدخول للإدارة"
            >
              <Image src="/logo.png" alt="Sayyir AI" width={140} height={50} priority />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <input id="email" type="email" placeholder="البريد الإلكتروني" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition-all text-left" dir="ltr" />
            </div>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} placeholder="كلمة المرور" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/50 focus:border-[#C89B3C] focus:bg-black/20 outline-none transition-all text-left" dir="ltr" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button onClick={handleLogin} disabled={loading} className="w-full rounded-xl bg-white text-black py-3.5 font-bold hover:bg-gray-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : "تسجيل الدخول"}
            </button>
          </div>

          <div className="text-center text-sm mt-8 text-white/60">
            ليس لديك حساب؟ <Link href="/register" className="text-white font-bold hover:text-[#C89B3C] transition underline underline-offset-4">إنشاء حساب جديد</Link>
          </div>
        </div>
      </div>
    </main>
  );
}