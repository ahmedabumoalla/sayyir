"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link"; // استيراد Link للتنقل
import { 
  Wallet, CalendarCheck, Star, TrendingUp, Users, ArrowUpRight 
} from "lucide-react";

export default function ProviderDashboard() {
  const [stats, setStats] = useState({
    earnings: 0,
    bookings: 0,
    views: 0,
    rating: 0
  });
  const [loading, setLoading] = useState(true);
  const [providerName, setProviderName] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // جلب الاسم من جدول الـ profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
          
        if(profile) setProviderName(profile.full_name);

        // بيانات وهمية للعرض (سيتم ربطها لاحقاً بجدول الخدمات والحجوزات)
        setStats({
          earnings: 4500,
          bookings: 12,
          views: 1250,
          rating: 4.8
        });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 p-4 md:p-8">
      
      {/* قسم الترحيب */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          أهلاً بك، {providerName || "شريك النجاح"} 👋
        </h1>
        <p className="text-white/50">إليك ملخص سريع لأداء خدماتك هذا الشهر.</p>
      </div>

      {/* كروت الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* كرت الأرباح */}
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition">
             <Wallet size={80} />
           </div>
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Wallet size={24} />
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full flex items-center gap-1">
                +12% <ArrowUpRight size={12}/>
              </span>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">
             {stats.earnings} <span className="text-sm font-normal text-white/50">ريال</span>
           </h3>
           <p className="text-white/40 text-sm">إجمالي الأرباح</p>
        </div>

        {/* كرت الحجوزات */}
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition">
             <CalendarCheck size={80} />
           </div>
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Users size={24} />
              </div>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{stats.bookings}</h3>
           <p className="text-white/40 text-sm">حجوزات مكتملة</p>
        </div>

        {/* كرت التقييم */}
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition">
             <Star size={80} />
           </div>
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#C89B3C]/10 text-[#C89B3C] rounded-xl">
                <Star size={24} />
              </div>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">
             {stats.rating} <span className="text-sm text-white/30">/ 5.0</span>
           </h3>
           <p className="text-white/40 text-sm">تقييم العملاء</p>
        </div>

        {/* كرت الزيارات */}
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition">
             <TrendingUp size={80} />
           </div>
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                <TrendingUp size={24} />
              </div>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{stats.views}</h3>
           <p className="text-white/40 text-sm">مشاهدات لصفحتك</p>
        </div>
      </div>

      {/* قسم العمليات والجدول */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* قائمة الحجوزات الأخيرة */}
         <div className="lg:col-span-2 bg-[#252525] rounded-2xl border border-white/5 p-6">
            <h3 className="text-xl font-bold text-white mb-6">آخر الطلبات والحجوزات</h3>
            <div className="space-y-4">
               {/* عنصر تجريبي 1 */}
               <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-[#C89B3C]">A</div>
                      <div>
                         <h4 className="font-bold text-white">عبدالله القحطاني</h4>
                         <p className="text-xs text-white/50">حجز: جولة في رجال ألمع</p>
                      </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20">قيد الانتظار</span>
               </div>
               
               {/* عنصر تجريبي 2 */}
               <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-[#C89B3C]">M</div>
                      <div>
                         <h4 className="font-bold text-white">محمد الشهري</h4>
                         <p className="text-xs text-white/50">حجز: ليلة في نزل السحاب</p>
                      </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">مؤكد</span>
               </div>
            </div>
         </div>

         {/* كرت الإجراء السريع (تفعيل الزر هنا) */}
         <div className="bg-gradient-to-br from-[#C89B3C]/20 to-[#252525] rounded-2xl border border-[#C89B3C]/20 p-6 flex flex-col justify-center text-center">
            <h3 className="text-xl font-bold text-white mb-2">تريد زيادة دخلك؟</h3>
            <p className="text-white/60 text-sm mb-6">أضف خدمة جديدة أو معلم سياحي لصفحتك واجذب المزيد من الزوار.</p>
            
            {/* الربط بصفحة إضافة الخدمة */}
            <Link href="/add-service">
              <button className="w-full py-3 bg-[#C89B3C] text-black font-bold rounded-xl hover:bg-[#b38a35] transition shadow-lg shadow-[#C89B3C]/20">
                  + إضافة خدمة جديدة
              </button>
            </Link>
         </div>
      </div>

    </div>
  );
}