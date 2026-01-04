"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Compass, MapPin, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";


export default function ClientDashboard() { 
    const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-5 duration-700">
      
      {/* ================= القسم الأول: بطاقة البطل (Hero Card) ================= */}
      {/* دعوة لاستخدام الميزة الرئيسية (الخريطة) بتصميم جذاب */}
      <div className="relative h-[280px] rounded-3xl overflow-hidden group">
        {/* خلفية البطاقة (صورة مموهة) */}
        <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2B1F17] via-[#2B1F17]/80 to-transparent mix-blend-multiply" />
        
        {/* محتوى البطاقة */}
        <div className="absolute inset-0 p-8 lg:p-12 flex flex-col justify-center items-start z-10">
           <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#C89B3C]/20 text-[#C89B3C] text-sm font-medium mb-4 border border-[#C89B3C]/30 backdrop-blur-md">
              <Sparkles size={14} />
              <span>تجربة سيّر المميزة</span>
           </div>
           <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4 leading-tight">
             اكتشف كنوز عسير المخفية <br/> عبر خريطتنا التفاعلية
           </h2>
           <p className="text-white/70 max-w-xl mb-8 text-lg">
             تصفح المعالم التراثية، النُزل الريفية، وتجارب الطهي الأصيلة في رحلة بصرية لا تُنسى.
           </p>
           
           <Link href="/map">
             <button className="flex items-center gap-3 bg-[#C89B3C] text-[#2B1F17] px-6 py-3.5 rounded-xl font-bold hover:bg-[#b38a35] transition-all active:scale-95 shadow-lg shadow-[#C89B3C]/20">
               <span>ابدأ الاستكشاف الآن</span>
               <ArrowLeft size={20} />
             </button>
           </Link>
        </div>

        {/* عنصر جمالي: بوصلة خفيفة في الخلفية */}
        <Compass className="absolute left-10 top-1/2 -translate-y-1/2 text-white/5 w-64 h-64 pointer-events-none group-hover:rotate-45 transition-transform duration-700" strokeWidth={1} />
      </div>


      {/* ================= القسم الثاني: الإحصائيات السريعة ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* كرت 1 */}
        <div className="rounded-2xl p-6 bg-white/5 backdrop-blur-lg border border-white/10 relative overflow-hidden group hover:border-[#C89B3C]/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C89B3C]/10 rounded-full blur-[50px] -z-10 translate-x-1/2 -translate-y-1/2 group-hover:bg-[#C89B3C]/20 transition-all"></div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C]">
              <MapPin size={28} />
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1 font-medium">أماكن قمت بزيارتها</p>
              <h3 className="text-3xl font-bold text-white">12 <span className="text-base font-normal text-white/50">مكان</span></h3>
            </div>
          </div>
        </div>
        
        {/* كرت 2 */}
        <div className="rounded-2xl p-6 bg-white/5 backdrop-blur-lg border border-white/10 relative overflow-hidden group hover:border-[#C89B3C]/30 transition-colors">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#5F6F52]/20 rounded-full blur-[50px] -z-10 translate-x-1/2 -translate-y-1/2 group-hover:bg-[#5F6F52]/30 transition-all"></div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#5F6F52]/20 flex items-center justify-center text-[#9EB38D]">
              <Compass size={28} />
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1 font-medium">رحلات مخطط لها</p>
              <h3 className="text-3xl font-bold text-white">03 <span className="text-base font-normal text-white/50">رحلات</span></h3>
            </div>
          </div>
        </div>

         {/* كرت 3 */}
         <div className="rounded-2xl p-6 bg-white/5 backdrop-blur-lg border border-white/10 relative overflow-hidden group hover:border-[#C89B3C]/30 transition-colors">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#C89B3C]/10 rounded-full blur-[50px] -z-10 translate-x-1/2 -translate-y-1/2 group-hover:bg-[#C89B3C]/20 transition-all"></div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C]">
              <Sparkles size={28} />
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1 font-medium">نقاط المكافآت</p>
              <h3 className="text-3xl font-bold text-[#C89B3C]">450 <span className="text-base font-normal text-[#C89B3C]/70">نقطة</span></h3>
            </div>
          </div>
        </div>
      </div>


      {/* ================= القسم الثالث: توصيات ومؤخراً ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* قائمة النشاط الأخير */}
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">نشاطك الأخير</h3>
            <Link href="/client/trips" className="text-sm text-[#C89B3C] hover:underline">عرض الكل</Link>
          </div>
          
          <div className="space-y-4">
            {/* عنصر قائمة 1 */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer group">
              <div className="w-16 h-16 rounded-xl bg-neutral-800 relative overflow-hidden">
                <Image src="/logo.png" alt="place" fill className="object-cover opacity-50 group-hover:scale-110 transition" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold">زيارة قرية رجال ألمع</h4>
                <p className="text-white/60 text-sm">تمت الزيارة • منذ يومين</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#5F6F52]/20 flex items-center justify-center text-[#9EB38D]">
                <ArrowLeft size={16} className="rotate-180" />
              </div>
            </div>
            {/* عنصر قائمة 2 */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer group">
              <div className="w-16 h-16 rounded-xl bg-neutral-800 relative overflow-hidden">
                <Image src="/logo.png" alt="place" fill className="object-cover opacity-50 group-hover:scale-110 transition" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold">حجز غداء في مطعم عسيري</h4>
                <p className="text-white/60 text-sm">مؤكد • للأسبوع القادم</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C]">
                <ArrowLeft size={16} className="rotate-180" />
              </div>
            </div>
          </div>
        </div>

        {/* توصيات الذكاء الاصطناعي (مساحة إبداعية) */}
        <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 p-6 lg:p-8 relative overflow-hidden">
           {/* تأثير خلفية */}
           <Sparkles className="absolute top-4 left-4 text-[#C89B3C]/20 w-32 h-32" />
           
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-[#C89B3C] text-[#2B1F17] text-xs font-bold px-2 py-1 rounded-md">Sayyir AI</span>
                <h3 className="text-xl font-bold text-white">توصيات لك</h3>
              </div>
              <p className="text-white/70 mb-6">بناءً على اهتمامك بالتراث، اخترنا لك هذه التجربة الفريدة.</p>
              
              {/* كرت التوصية */}
              <div className="rounded-2xl overflow-hidden relative h-48 group cursor-pointer">
                <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h4 className="text-white font-bold text-lg mb-1">ليلة في نُزل السحاب التراثي</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-white/70 text-sm flex items-center gap-1">
                      <MapPin size={14} className="text-[#C89B3C]" /> السودة، عسير
                    </p>
                    <span className="text-[#C89B3C] font-bold text-sm">اكتشف المزيد</span>
                  </div>
                </div>
              </div>

           </div>
        </div>

      </div>

    </div>
  );
}