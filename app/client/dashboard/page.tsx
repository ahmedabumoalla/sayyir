"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Compass, MapPin, Sparkles, Loader2, Calendar, 
  Heart, ArrowUpLeft, Clock, Map as MapIcon, ChevronLeft,
  Menu, X, LogOut, User, Settings, LayoutDashboard, Bell, FileText, CheckCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { useRouter } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  
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

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData();

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setIsUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ تم التعديل: التغيير كل 7 ثواني
  useEffect(() => {
      if (suggestions.length > 1) {
          const interval = setInterval(() => {
              setFade(false);
              setTimeout(() => {
                  setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length);
                  setFade(true);
              }, 300); 
          }, 7000); // 7000ms = 7 seconds
          return () => clearInterval(interval);
      }
  }, [suggestions]);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      setUserEmail(session.user.email || "");

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

      const fakeNotifs = [];
      if (pending > 0) fakeNotifs.push({ title: "طلب جديد", msg: `لديك ${pending} طلب بانتظار الموافقة`, time: "الآن" });
      if (recent?.some(b => b.status === 'approved_unpaid')) fakeNotifs.push({ title: "تنبيه دفع", msg: "تمت الموافقة على طلبك، يرجى الدفع", time: "منذ ساعة" });
      setNotifications(fakeNotifs);

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

  const currentSuggestion = suggestions[currentSuggestionIndex];

  if (loading) return <div className={`h-screen flex flex-col items-center justify-center bg-[#1a1a1a] text-[#C89B3C] ${tajawal.className}`}><Loader2 className="animate-spin w-10 h-10 mb-4" /><p className="animate-pulse">جاري تجهيز لوحتك...</p></div>;

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'لوحة التحكم', href: '/client/dashboard' },
    { icon: MapIcon, label: 'الخريطة التفاعلية', href: '/map' },
    { icon: Calendar, label: 'رحلاتي', href: '/client/trips' },
    { icon: Heart, label: 'المفضلة', href: '/client/favorites' },
    { icon: Settings, label: 'الإعدادات', href: '/client/settings' },
  ];

  return (
    <div className={`min-h-screen bg-[#1a1a1a] text-white ${tajawal.className} relative overflow-x-hidden`} dir="rtl">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white hover:bg-white/10 rounded-lg transition"><Menu size={24} /></button>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <Image src="/logo.png" alt="Sayyir" width={40} height={40} />
          <span className="text-xl font-bold text-[#C89B3C] hidden md:block">سيّر</span>
        </Link>
        
        <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 relative">
                    <Bell size={20} className={notifications.length > 0 ? "text-[#C89B3C]" : "text-white/60"} />
                    {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#1a1a1a]"></span>}
                </button>
                {isNotifOpen && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                        <div className="p-3 border-b border-white/10 text-sm font-bold text-white/50">الإشعارات</div>
                        <div className="max-h-60 overflow-y-auto">
                            {notifications.length > 0 ? notifications.map((n, i) => (
                                <div key={i} className="p-4 border-b border-white/5 hover:bg-white/5 transition flex gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#C89B3C] mt-2 shrink-0"></div>
                                    <div>
                                        <p className="font-bold text-sm">{n.title}</p>
                                        <p className="text-xs text-white/60">{n.msg}</p>
                                        <p className="text-[10px] text-white/30 mt-1">{n.time}</p>
                                    </div>
                                </div>
                            )) : <div className="p-6 text-center text-white/40 text-sm">لا توجد إشعارات جديدة</div>}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative" ref={userMenuRef}>
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 p-1 pr-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition">
                <span className="text-sm hidden md:block">{userName || "مستخدم"}</span>
                <div className="w-8 h-8 rounded-full bg-[#C89B3C] flex items-center justify-center"><User size={18} className="text-[#1a1a1a]" /></div>
            </button>
            {isUserMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#252525] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                <div className="p-4 border-b border-white/10 bg-white/5"><p className="font-bold truncate">{userName}</p><p className="text-xs text-white/50 truncate">{userEmail}</p></div>
                <div className="py-2">
                    <Link href="/client/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition"><Settings size={18} className="text-[#C89B3C]" /><span>الإعدادات</span></Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-red-400 transition border-t border-white/10 mt-2"><LogOut size={18} /><span>خروج</span></button>
                </div>
                </div>
            )}
            </div>
        </div>
      </nav>

      {/* Sidebar Overlay & Sidebar (نفس الكود) */}
      <div className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`fixed top-0 right-0 h-full w-72 bg-[#252525] border-l border-white/10 z-50 transform transition-transform duration-300 p-6 flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <Link href="/" className="flex items-center gap-2"><Image src="/logo.png" alt="Sayyir" width={50} height={50} /><span className="text-2xl font-bold text-[#C89B3C]">سيّر</span></Link>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition"><X size={24} /></button>
        </div>
        <nav className="flex-1 space-y-2">
          {sidebarItems.map((item, index) => (
            <Link key={index} href={item.href} className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition group" onClick={() => setIsSidebarOpen(false)}>
              <item.icon size={20} className="text-[#C89B3C] group-hover:scale-110 transition" /><span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pt-24 p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-[#C89B3C] mb-3 bg-[#C89B3C]/10 w-fit px-4 py-1.5 rounded-full border border-[#C89B3C]/20"><Sparkles size={16} /><span className="text-sm font-bold">لوحة العميل</span></div>
          <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">أهلاً بك، {userName} 👋</h1>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Link href="/client/trips" className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-[#C89B3C]/50 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4"><div className="p-3 bg-[#C89B3C]/10 rounded-xl text-[#C89B3C]"><Calendar size={24} /></div><span className="text-3xl font-bold text-white">{stats.upcoming_trips}</span></div>
            <p className="text-white/60 font-medium text-sm">رحلات مؤكدة</p>
          </Link>
          <div className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-yellow-500/50 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4"><div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500"><Clock size={24} /></div><span className="text-3xl font-bold text-white">{stats.pending_approval}</span></div>
            <p className="text-white/60 font-medium text-sm">بانتظار الموافقة</p>
          </div>
          <Link href="/client/trips" className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-emerald-500/50 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4"><div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><Compass size={24} /></div><span className="text-3xl font-bold text-white">{stats.total_trips}</span></div>
            <p className="text-white/60 font-medium text-sm">إجمالي الحجوزات</p>
          </Link>
          <Link href="/client/favorites" className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-red-500/50 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4"><div className="p-3 bg-red-500/10 rounded-xl text-red-500"><Heart size={24} /></div><span className="text-3xl font-bold text-white">{stats.favorites_count}</span></div>
            <p className="text-white/60 font-medium text-sm">المفضلة</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3"><Clock size={24} className="text-[#C89B3C]" /><span>آخر الحجوزات</span></h3>
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <Link key={booking.id} href={booking.status === 'approved_unpaid' ? `/checkout?booking_id=${booking.id}` : `/client/trips/${booking.id}`} className="block bg-[#252525] border border-white/5 rounded-3xl p-5 hover:border-[#C89B3C]/30 transition group relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                      <div className="w-full md:w-28 h-28 rounded-2xl overflow-hidden relative bg-black shrink-0 border border-white/10">
                        {isVideo(booking.services?.image_url) ? (
                            <video src={booking.services?.image_url} className="w-full h-full object-cover" muted autoPlay loop playsInline/>
                        ) : (
                            <Image src={booking.services?.image_url || "/placeholder.jpg"} alt="Service" fill className="object-cover group-hover:scale-110 transition" />
                        )}
                      </div>
                      <div className="flex-1 text-center md:text-right w-full">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-white text-xl mb-2">{booking.services?.title || "خدمة محذوفة"}</h4>
                            {booking.status === 'approved_unpaid' && (
                                <div className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border border-red-500/20">
                                    <Clock size={12}/>
                                    متبقي: <CountdownTimer expiryDate={booking.expires_at} />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 justify-center md:justify-start">
                            <span className={`px-4 py-1 rounded-full text-xs font-bold ${
                                booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 
                                booking.status === 'approved_unpaid' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                                'bg-amber-500/10 text-amber-400'
                            }`}>
                            {booking.status === 'confirmed' ? 'مؤكد' : booking.status === 'approved_unpaid' ? 'بانتظار الدفع' : 'بانتظار الموافقة'}
                            </span>
                        </div>
                      </div>
                      <span className="text-[#C89B3C] font-bold text-lg dir-ltr bg-[#C89B3C]/10 px-4 py-2 rounded-xl border border-[#C89B3C]/20">{booking.total_price} SAR</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-16 bg-[#252525] rounded-3xl border border-white/5 border-dashed">
                  <p className="text-white/50 text-lg mb-6">لم تقم بأي حجوزات بعد</p>
                  <Link href="/map" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C89B3C] text-[#2B1F17] rounded-xl hover:bg-[#b38a35] transition font-bold">ابدأ المغامرة</Link>
                </div>
              )}
            </div>
          </div>

          {/* Suggestion Box (Rotating) */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold flex items-center gap-3 mb-8"><Sparkles size={24} className="text-[#C89B3C]" /><span>نقترح عليك</span></h3>
            
            {currentSuggestion ? (
              <div className={`group relative h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
                {isVideo(currentSuggestion.media) ? (
                    <video src={currentSuggestion.media} className="w-full h-full object-cover" muted autoPlay loop playsInline/>
                ) : (
                    <Image 
                        src={currentSuggestion.media || "/placeholder.jpg"} 
                        alt={currentSuggestion.name || currentSuggestion.title} 
                        fill 
                        className="object-cover transition duration-700 group-hover:scale-110" 
                    />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/60 to-transparent" />
                
                {/* ✅ Progress Bar for Auto Rotation (7 Seconds) */}
                <div className="absolute top-0 left-0 h-1 bg-[#C89B3C] w-full animate-[progress_7s_linear_infinite] origin-left"></div>

                <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col h-full justify-end">
                  <span className="bg-[#C89B3C] text-[#2B1F17] text-xs font-bold px-3 py-1.5 rounded-full mb-auto inline-flex w-fit shadow-lg">
                    {currentSuggestion.type === 'service' ? 'تجربة مميزة' : 'معلم سياحي'}
                  </span>
                  <h4 className="text-3xl font-extrabold text-white mb-3">{currentSuggestion.title || currentSuggestion.name}</h4>
                  <p className="text-white/70 mb-6 line-clamp-2 text-sm leading-relaxed">{currentSuggestion.description || "استمتع بجمال عسير وتعرف على ثقافتها العريقة."}</p>
                  
                  <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                    <div>
                      <p className="text-white/50 text-xs mb-1">التكلفة</p>
                      <span className="text-[#C89B3C] font-extrabold text-xl dir-ltr">
                        {currentSuggestion.price > 0 ? `${currentSuggestion.price} SAR` : 'دخول مجاني'}
                      </span>
                    </div>
                    {/* ✅ تم تصحيح الروابط هنا */}
                    <Link 
                        href={currentSuggestion.type === 'service' ? `/service/${currentSuggestion.id}` : `/landmarks`} 
                        className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-[#C89B3C] transition flex items-center gap-2 text-sm shadow-lg"
                    >
                      <span>التفاصيل</span><ArrowUpLeft size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[450px] bg-[#252525] rounded-[2.5rem] flex flex-col items-center justify-center border border-white/5 p-8 text-center relative overflow-hidden">
                  <MapIcon size={48} className="text-white/20 mb-4" />
                  <h4 className="text-xl font-bold text-white mb-2">الخريطة بانتظارك</h4>
                  <p className="text-white/50 text-sm mb-6">تصفح الخريطة لاكتشاف آلاف المعالم</p>
                  <Link href="/map" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C89B3C] text-[#2B1F17] rounded-xl hover:bg-[#b38a35] transition font-bold">الذهاب للخريطة</Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes progress {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}