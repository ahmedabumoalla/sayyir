"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Compass, Sparkles, Loader2, Calendar, 
  Heart, ArrowUpLeft, Clock, Map as MapIcon
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// مكون العداد التنازلي المصغر
function CountdownTimer({ expiryDate }: { expiryDate: string }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = new Date(expiryDate).getTime() - now;

            if (distance < 0) {
                setTimeLeft("منتهي");
                clearInterval(interval);
            } else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${hours}س ${minutes}د`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiryDate]);

    return <span className="text-xs font-mono font-bold text-red-400 dir-ltr">{timeLeft}</span>;
}

export default function ClientDashboard() { 
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  
  // Stats
  const [stats, setStats] = useState({
    total_trips: 0,
    upcoming_trips: 0,
    pending_approval: 0, 
    favorites_count: 0
  });

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  
  // Suggestions Logic
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // التغيير التلقائي للاقتراحات كل 7 ثواني
  useEffect(() => {
      if (suggestions.length > 1) {
          const interval = setInterval(() => {
              setFade(false);
              setTimeout(() => {
                  setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length);
                  setFade(true);
              }, 300); 
          }, 7000); 
          return () => clearInterval(interval);
      }
  }, [suggestions]);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
      if(profile) setUserName(profile.full_name);

      const { data: bookings } = await supabase.from('bookings').select('status').eq('user_id', session.user.id);
      const total = bookings?.length || 0;
      const upcoming = bookings?.filter(b => b.status === 'confirmed').length || 0;
      const pending = bookings?.filter(b => b.status === 'pending').length || 0;
      const { count: favCount } = await supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);

      setStats({ 
          total_trips: total, 
          upcoming_trips: upcoming, 
          pending_approval: pending, 
          favorites_count: favCount || 0 
      });

      const { data: recent } = await supabase
        .from('bookings')
        .select(`
            id, status, booking_date, total_price, expires_at,
            services:service_id (title, image_url)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (recent) setRecentBookings(recent);

      const { data: services } = await supabase.from('services').select('id, title, description, image_url, price').limit(3);
      const { data: landmarks } = await supabase.from('places').select('id, name, description, media_urls, price').limit(3);
      
      const mixedSuggestions = [
          ...(services || []).map(s => ({ ...s, type: 'service', name: s.title, media: s.image_url })),
          ...(landmarks || []).map(l => ({ ...l, type: 'landmark', title: l.name, media: l.media_urls?.[0] }))
      ].sort(() => 0.5 - Math.random()); 

      setSuggestions(mixedSuggestions);

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

  const currentSuggestion = suggestions[currentSuggestionIndex];

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-[70vh] text-[#C89B3C]">
              <Loader2 className="animate-spin w-10 h-10 mb-4" />
              <p className="animate-pulse text-white">جاري تجهيز لوحتك...</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      
      {/* رأس الصفحة */}
      <header>
        <div className="flex items-center gap-2 text-[#C89B3C] mb-3 bg-[#C89B3C]/10 w-fit px-4 py-1.5 rounded-full border border-[#C89B3C]/20">
            <Sparkles size={16} />
            <span className="text-sm font-bold">مرحباً بعودتك</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">أهلاً بك، {userName} 👋</h1>
        <p className="text-white/50">إليك ملخص سريع لنشاطاتك وحجوزاتك القادمة.</p>
      </header>

      {/* كروت الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/client/trips" className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-[#C89B3C]/50 transition-all hover:-translate-y-1 shadow-lg">
          <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#C89B3C]/10 rounded-xl text-[#C89B3C]"><Calendar size={24} /></div>
              <span className="text-3xl font-bold text-white">{stats.upcoming_trips}</span>
          </div>
          <p className="text-white/60 font-medium text-sm">رحلات مؤكدة</p>
        </Link>
        <div className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-yellow-500/50 transition-all hover:-translate-y-1 shadow-lg">
          <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500"><Clock size={24} /></div>
              <span className="text-3xl font-bold text-white">{stats.pending_approval}</span>
          </div>
          <p className="text-white/60 font-medium text-sm">بانتظار الموافقة</p>
        </div>
        <Link href="/client/trips" className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-emerald-500/50 transition-all hover:-translate-y-1 shadow-lg">
          <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><Compass size={24} /></div>
              <span className="text-3xl font-bold text-white">{stats.total_trips}</span>
          </div>
          <p className="text-white/60 font-medium text-sm">إجمالي الحجوزات</p>
        </Link>
        <Link href="/client/favorites" className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-red-500/50 transition-all hover:-translate-y-1 shadow-lg">
          <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500"><Heart size={24} /></div>
              <span className="text-3xl font-bold text-white">{stats.favorites_count}</span>
          </div>
          <p className="text-white/60 font-medium text-sm">المفضلة</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* النشاط الأخير (آخر الحجوزات) */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold flex items-center justify-between">
              <span className="flex items-center gap-2"><Clock size={20} className="text-[#C89B3C]" /> آخر الحجوزات</span>
              <Link href="/client/trips" className="text-sm text-[#C89B3C] font-normal hover:underline">عرض الكل</Link>
          </h3>
          <div className="space-y-4">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <Link key={booking.id} href={booking.status === 'approved_unpaid' ? `/checkout?booking_id=${booking.id}` : `/client/trips/${booking.id}`} className="block bg-[#252525] border border-white/5 rounded-2xl p-4 hover:border-[#C89B3C]/30 transition group relative overflow-hidden shadow-md">
                  <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
                    <div className="w-full md:w-24 h-24 rounded-xl overflow-hidden relative bg-black shrink-0 border border-white/10">
                      {isVideo(booking.services?.image_url) ? (
                          <video src={booking.services?.image_url} className="w-full h-full object-cover" muted autoPlay loop playsInline/>
                      ) : (
                          <Image src={booking.services?.image_url || "/placeholder.jpg"} alt="Service" fill className="object-cover group-hover:scale-110 transition duration-500" />
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-right w-full">
                      <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-white text-lg line-clamp-1">{booking.services?.title || "خدمة محذوفة"}</h4>
                          {booking.status === 'approved_unpaid' && (
                              <div className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border border-red-500/20">
                                  <Clock size={12}/>
                                  متبقي: <CountdownTimer expiryDate={booking.expires_at} />
                              </div>
                          )}
                      </div>
                      <div className="flex gap-2 justify-center md:justify-start">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 
                              booking.status === 'approved_unpaid' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                              'bg-amber-500/10 text-amber-400'
                          }`}>
                          {booking.status === 'confirmed' ? 'مؤكد' : booking.status === 'approved_unpaid' ? 'بانتظار الدفع' : 'بانتظار الموافقة'}
                          </span>
                      </div>
                    </div>
                    <span className="text-[#C89B3C] font-bold text-lg dir-ltr bg-black/40 px-4 py-2 rounded-xl border border-white/5">{booking.total_price} SAR</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 bg-[#252525] rounded-3xl border border-white/5 border-dashed">
                <p className="text-white/50 mb-4">لم تقم بأي حجوزات بعد</p>
                <Link href="/services" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C89B3C] text-[#2B1F17] rounded-xl hover:bg-[#b38a35] transition font-bold text-sm shadow-lg">تصفح الخدمات</Link>
              </div>
            )}
          </div>
        </div>

        {/* صندوق الاقتراحات الجانبي */}
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><Sparkles size={20} className="text-[#C89B3C]" /><span>نقترح عليك</span></h3>
          
          {currentSuggestion ? (
            <div className={`group relative h-[400px] rounded-3xl overflow-hidden shadow-2xl transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
              {isVideo(currentSuggestion.media) ? (
                  <video src={currentSuggestion.media} className="w-full h-full object-cover" muted autoPlay loop playsInline/>
              ) : (
                  <Image 
                      src={currentSuggestion.media || "/placeholder.jpg"} 
                      alt={currentSuggestion.name || currentSuggestion.title} 
                      fill 
                      className="object-cover transition duration-1000 group-hover:scale-110" 
                  />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />
              
              {/* شريط التقدم التلقائي (7 ثواني) */}
              <div className="absolute top-0 left-0 h-1 bg-[#C89B3C] w-full animate-[progress_7s_linear_infinite] origin-left"></div>

              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col h-full justify-end">
                <span className="bg-[#C89B3C] text-black text-[10px] font-bold px-3 py-1 rounded-full mb-auto inline-flex w-fit shadow-lg">
                  {currentSuggestion.type === 'service' ? 'تجربة مميزة' : 'معلم سياحي'}
                </span>
                <h4 className="text-2xl font-extrabold text-white mb-2">{currentSuggestion.title || currentSuggestion.name}</h4>
                <p className="text-white/60 mb-4 line-clamp-2 text-xs leading-relaxed">{currentSuggestion.description || "استمتع بجمال عسير وتعرف على ثقافتها العريقة."}</p>
                
                <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl backdrop-blur-md border border-white/10">
                  <div>
                    <span className="text-[#C89B3C] font-extrabold text-lg dir-ltr">
                      {currentSuggestion.price > 0 ? `${currentSuggestion.price} SAR` : 'دخول مجاني'}
                    </span>
                  </div>
                  <Link 
                      href={currentSuggestion.type === 'service' ? `/service/${currentSuggestion.id}` : `/landmarks`} 
                      className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-[#C89B3C] transition flex items-center gap-1 text-xs shadow-lg"
                  >
                    <span>التفاصيل</span><ArrowUpLeft size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[400px] bg-[#252525] rounded-3xl flex flex-col items-center justify-center border border-white/5 p-8 text-center relative overflow-hidden">
                <MapIcon size={40} className="text-white/20 mb-4" />
                <h4 className="font-bold text-white mb-2">الخريطة بانتظارك</h4>
                <p className="text-white/50 text-xs mb-6">تصفح الخريطة لاكتشاف آلاف المعالم</p>
                <Link href="/map" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C89B3C] text-[#2B1F17] rounded-xl hover:bg-[#b38a35] transition font-bold text-sm">الذهاب للخريطة</Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}