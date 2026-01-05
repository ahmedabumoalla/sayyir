"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Compass, MapPin, Sparkles, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ClientDashboard() { 
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completed_trips: 0,
    upcoming_trips: 0,
    favorites_count: 0
  });
  const [recentBooking, setRecentBooking] = useState<any>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 1. جلب الاسم
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
    if(profile) setUserName(profile.full_name);

    // 2. إحصائيات الحجوزات
    const { data: bookings } = await supabase
      .from('bookings')
      .select('status')
      .eq('user_id', session.user.id);

    const completed = bookings?.filter(b => b.status === 'completed').length || 0;
    const upcoming = bookings?.filter(b => b.status === 'confirmed' || b.status === 'pending').length || 0;

    // 3. عدد المفضلة
    const { count: favCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    // 4. آخر حجز
    const { data: lastBook } = await supabase
      .from('bookings')
      .select(`
        *,
        services:service_id (title, image_url)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setStats({
      completed_trips: completed,
      upcoming_trips: upcoming,
      favorites_count: favCount || 0
    });
    setRecentBooking(lastBook);
    setLoading(false);
  };

  if (loading) return <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-5 duration-700">
      
      {/* ================= القسم الأول: بطاقة البطل ================= */}
      <div className="relative h-[280px] rounded-3xl overflow-hidden group border border-white/5">
        <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2B1F17] via-[#2B1F17]/90 to-transparent mix-blend-multiply" />
        
        <div className="absolute inset-0 p-8 lg:p-12 flex flex-col justify-center items-start z-10">
           <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#C89B3C]/20 text-[#C89B3C] text-sm font-medium mb-4 border border-[#C89B3C]/30 backdrop-blur-md">
              <Sparkles size={14} />
              <span>أهلاً بك، {userName}</span>
           </div>
           <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4 leading-tight">
             اكتشف كنوز عسير المخفية <br/> عبر خريطتنا التفاعلية
           </h2>
           <Link href="/map">
             <button className="flex items-center gap-3 bg-[#C89B3C] text-[#2B1F17] px-6 py-3.5 rounded-xl font-bold hover:bg-[#b38a35] transition-all active:scale-95 shadow-lg shadow-[#C89B3C]/20">
               <span>ابدأ الاستكشاف الآن</span>
               <ArrowLeft size={20} />
             </button>
           </Link>
        </div>
      </div>

      {/* ================= القسم الثاني: الإحصائيات ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6 bg-[#252525] border border-white/5 hover:border-[#C89B3C]/30 transition group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#C89B3C]/10 flex items-center justify-center text-[#C89B3C]">
              <MapPin size={28} />
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1 font-medium">أماكن زرتها</p>
              <h3 className="text-3xl font-bold text-white">{stats.completed_trips}</h3>
            </div>
          </div>
        </div>
        
        <div className="rounded-2xl p-6 bg-[#252525] border border-white/5 hover:border-[#C89B3C]/30 transition group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Compass size={28} />
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1 font-medium">رحلات قادمة</p>
              <h3 className="text-3xl font-bold text-white">{stats.upcoming_trips}</h3>
            </div>
          </div>
        </div>

         <div className="rounded-2xl p-6 bg-[#252525] border border-white/5 hover:border-[#C89B3C]/30 transition group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <Sparkles size={28} />
            </div>
            <div>
              <p className="text-white/60 text-sm mb-1 font-medium">المفضلة</p>
              <h3 className="text-3xl font-bold text-white">{stats.favorites_count}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* ================= القسم الثالث: آخر نشاط ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-3xl bg-[#252525] border border-white/5 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">آخر نشاط لك</h3>
            <Link href="/client/trips" className="text-sm text-[#C89B3C] hover:underline">سجل الرحلات</Link>
          </div>
          
          {recentBooking ? (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-16 h-16 rounded-xl bg-black relative overflow-hidden">
                <Image src={recentBooking.services?.image_url || "/logo.png"} alt="place" fill className="object-cover" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold">{recentBooking.services?.title || "خدمة محجوزة"}</h4>
                <p className="text-white/60 text-sm flex items-center gap-2">
                   <Calendar size={12}/> {new Date(recentBooking.booking_date).toLocaleDateString('ar-SA')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${recentBooking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {recentBooking.status === 'confirmed' ? 'مؤكد' : recentBooking.status === 'pending' ? 'انتظار' : recentBooking.status}
              </span>
            </div>
          ) : (
            <p className="text-white/30 text-center py-4">لم تقم بأي حجوزات بعد.</p>
          )}
        </div>

        {/* توصية AI */}
        <div className="rounded-3xl bg-gradient-to-br from-[#C89B3C]/20 to-[#252525] border border-[#C89B3C]/20 p-6 lg:p-8 relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-[#C89B3C] text-[#2B1F17] text-xs font-bold px-2 py-1 rounded-md">AI Suggestion</span>
                <h3 className="text-xl font-bold text-white">توصية خاصة</h3>
              </div>
              <p className="text-white/70 mb-6">بناءً على اهتماماتك، نقترح عليك تجربة:</p>
              <div className="rounded-2xl overflow-hidden relative h-40 group cursor-pointer bg-black/40 border border-white/10">
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white font-bold">جولة في سد أبها</p>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}