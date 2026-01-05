"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Wallet, CalendarCheck, Star, TrendingUp, Users, ArrowUpRight, Plus, AlertCircle } from "lucide-react";

export default function ProviderDashboard() {
  const [stats, setStats] = useState({
    earnings: 0,
    bookings: 0,
    services_count: 0,
    rating: 5.0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerName, setProviderName] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // 1. بيانات البروفايل
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
        if(profile) setProviderName(profile.full_name);

        // 2. إحصائيات الخدمات (للمزود الحالي)
        const { count: servicesCount } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('provider_id', session.user.id);

        // 3. إحصائيات الحجوزات (لخدمات المزود)
        // نحتاج Join لجلب الحجوزات المرتبطة بخدمات هذا المزود
        // الطريقة المبسطة: جلب الخدمات أولاً ثم الحجوزات
        const { data: myServices } = await supabase.from('services').select('id').eq('provider_id', session.user.id);
        const serviceIds = myServices?.map(s => s.id) || [];
        
        let bookingsCount = 0;
        let earningsTotal = 0;
        let recent = [];

        if (serviceIds.length > 0) {
            const { data: bookings } = await supabase
                .from('bookings')
                .select('*, profiles:user_id(full_name)')
                .in('service_id', serviceIds) // افترضنا وجود عمود service_id في bookings
                .order('created_at', { ascending: false });
            
            if (bookings) {
                bookingsCount = bookings.length;
                // حساب الأرباح (بافتراض أن total_price رقم أو نص يمكن تحويله)
                earningsTotal = bookings
                    .filter(b => b.status === 'confirmed' || b.status === 'completed')
                    .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
                
                recent = bookings.slice(0, 3); // آخر 3 حجوزات
            }
        }

        setRecentBookings(recent);
        setStats({
          earnings: earningsTotal,
          bookings: bookingsCount,
          services_count: servicesCount || 0,
          rating: 4.8 // يمكن حسابه لاحقاً من جدول التقييمات
        });
    }
    setLoading(false);
  };

  if (loading) return <div className="text-[#C89B3C] text-center p-20">جاري تحميل البيانات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">أهلاً بك، {providerName} 👋</h1>
        <p className="text-white/50">إليك ملخص سريع لأداء خدماتك.</p>
      </div>

      {/* كروت الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* الأرباح */}
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition"><Wallet size={80} /></div>
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Wallet size={24} /></div>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{stats.earnings.toLocaleString()} <span className="text-sm font-normal text-white/50">ريال</span></h3>
           <p className="text-white/40 text-sm">إجمالي الأرباح</p>
        </div>

        {/* الحجوزات */}
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition"><CalendarCheck size={80} /></div>
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"><Users size={24} /></div>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{stats.bookings}</h3>
           <p className="text-white/40 text-sm">حجوزات (الكل)</p>
        </div>

        {/* الخدمات */}
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition"><Star size={80} /></div>
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#C89B3C]/10 text-[#C89B3C] rounded-xl"><Star size={24} /></div>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{stats.services_count}</h3>
           <p className="text-white/40 text-sm">خدمات مفعلة</p>
        </div>

        {/* التقييم */}
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition"><TrendingUp size={80} /></div>
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl"><TrendingUp size={24} /></div>
           </div>
           <h3 className="text-3xl font-bold text-white mb-1">{stats.rating}</h3>
           <p className="text-white/40 text-sm">متوسط التقييم</p>
        </div>
      </div>

      {/* قسم العمليات والجدول */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-[#252525] rounded-2xl border border-white/5 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex justify-between items-center">
                آخر الحجوزات 
                <Link href="/provider/bookings" className="text-xs text-[#C89B3C] hover:underline">عرض الكل</Link>
            </h3>
            <div className="space-y-4">
               {recentBookings.length === 0 ? <p className="text-white/30 text-center py-6">لا توجد حجوزات حديثة.</p> : recentBookings.map((b: any) => (
                   <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-[#C89B3C]">{b.profiles?.full_name?.charAt(0)}</div>
                          <div>
                              <h4 className="font-bold text-white">{b.profiles?.full_name || "عميل"}</h4>
                              <p className="text-xs text-white/50">{new Date(b.booking_date).toLocaleDateString('ar-SA')}</p>
                          </div>
                      </div>
                      <span className={`px-3 py-1 text-xs rounded-full border ${b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                          {b.status === 'confirmed' ? 'مؤكد' : b.status === 'pending' ? 'انتظار' : b.status}
                      </span>
                   </div>
               ))}
            </div>
         </div>

         <div className="bg-gradient-to-br from-[#C89B3C]/20 to-[#252525] rounded-2xl border border-[#C89B3C]/20 p-6 flex flex-col justify-center text-center">
            <h3 className="text-xl font-bold text-white mb-2">زيادة الدخل؟</h3>
            <p className="text-white/60 text-sm mb-6">أضف خدمات جديدة لجذب المزيد من العملاء.</p>
            <Link href="/provider/services">
              <button className="w-full py-3 bg-[#C89B3C] text-black font-bold rounded-xl hover:bg-[#b38a35] transition shadow-lg shadow-[#C89B3C]/20 flex justify-center gap-2 items-center">
                  <Plus size={18}/> إدارة الخدمات
              </button>
            </Link>
         </div>
      </div>
    </div>
  );
}