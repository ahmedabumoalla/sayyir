"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Compass, MapPin, Sparkles, Loader2, Calendar, 
  Heart, ArrowUpLeft, Clock, Map as MapIcon, ChevronLeft,
  Menu, X, LogOut, User, Settings, LayoutDashboard
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { useRouter } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

export default function ClientDashboard() { 
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState({
    total_trips: 0,
    upcoming_trips: 0,
    favorites_count: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [suggestedPlace, setSuggestedPlace] = useState<any>(null);
  const [suggestionType, setSuggestionType] = useState<'service' | 'landmark'>('service'); // نوع الاقتراح

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData();

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      setUserEmail(session.user.email || "");

      // 1. جلب بيانات المستخدم
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
      if(profile) setUserName(profile.full_name);

      // 2. إحصائيات
      const { data: bookings } = await supabase.from('bookings').select('status, booking_date').eq('user_id', session.user.id);
      const total = bookings?.length || 0;
      const upcoming = bookings?.filter(b => b.status === 'confirmed' || b.status === 'pending').length || 0;

      const { count: favCount } = await supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);

      // 3. آخر الحجوزات
      const { data: recent } = await supabase
        .from('bookings')
        .select(`id, status, booking_date, total_price, services:service_id (title, image_url, location)`)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // 4. نظام الاقتراحات الذكي (خدمة أو معلم)
      let suggestion = null;
      let type: 'service' | 'landmark' = 'service';

      // أ) محاولة جلب خدمة عشوائية
      const { data: services } = await supabase.from('services').select('*').limit(5); // نجلب 5 لنختار عشوائياً
      
      if (services && services.length > 0) {
          // اختيار واحد عشوائي
          suggestion = services[Math.floor(Math.random() * services.length)];
          type = 'service';
      } 
      
      // ب) إذا لم نجد خدمات، نبحث في المعالم (Landmarks)
      if (!suggestion) {
          const { data: landmarks } = await supabase.from('landmarks').select('*').limit(5);
          if (landmarks && landmarks.length > 0) {
              suggestion = landmarks[Math.floor(Math.random() * landmarks.length)];
              type = 'landmark';
          }
      }

      setStats({ total_trips: total, upcoming_trips: upcoming, favorites_count: favCount || 0 });
      if (recent) setRecentBookings(recent);
      if (suggestion) {
          setSuggestedPlace(suggestion);
          setSuggestionType(type);
      }

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) return (
    <div className={`h-screen flex flex-col items-center justify-center bg-[#1a1a1a] text-[#C89B3C] ${tajawal.className}`}>
        <Loader2 className="animate-spin w-10 h-10 mb-4" />
        <p className="animate-pulse">جاري تجهيز لوحتك...</p>
    </div>
  );

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
      </nav>

      {/* Sidebar Overlay */}
      <div className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsSidebarOpen(false)} />
      
      {/* Sidebar */}
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
      <main className="pt-20 p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-[#C89B3C] mb-3 bg-[#C89B3C]/10 w-fit px-4 py-1.5 rounded-full border border-[#C89B3C]/20"><Sparkles size={16} /><span className="text-sm font-bold">لوحة العميل</span></div>
          <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">أهلاً بك، {userName} 👋</h1>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/client/trips" className="group bg-[#252525] p-8 rounded-[2rem] border border-white/5 hover:border-[#C89B3C]/50 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-6"><div className="p-4 bg-[#C89B3C]/10 rounded-2xl text-[#C89B3C]"><Calendar size={32} /></div><span className="text-4xl font-bold text-white">{stats.upcoming_trips}</span></div>
            <p className="text-white/60 font-medium">رحلات قادمة</p>
          </Link>
          <Link href="/client/trips" className="group bg-[#252525] p-8 rounded-[2rem] border border-white/5 hover:border-emerald-500/50 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-6"><div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500"><Compass size={32} /></div><span className="text-4xl font-bold text-white">{stats.total_trips}</span></div>
            <p className="text-white/60 font-medium">إجمالي الحجوزات</p>
          </Link>
          <Link href="/client/favorites" className="group bg-[#252525] p-8 rounded-[2rem] border border-white/5 hover:border-red-500/50 transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-6"><div className="p-4 bg-red-500/10 rounded-2xl text-red-500"><Heart size={32} /></div><span className="text-4xl font-bold text-white">{stats.favorites_count}</span></div>
            <p className="text-white/60 font-medium">المفضلة</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3"><Clock size={24} className="text-[#C89B3C]" /><span>آخر الحجوزات</span></h3>
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <Link key={booking.id} href={`/client/trips/${booking.id}`} className="block bg-[#252525] border border-white/5 rounded-3xl p-5 hover:border-[#C89B3C]/30 transition group">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-full md:w-28 h-28 rounded-2xl overflow-hidden relative bg-black shrink-0">
                        <Image src={booking.services?.image_url || "/placeholder.jpg"} alt="Service" fill className="object-cover group-hover:scale-110 transition" />
                      </div>
                      <div className="flex-1 text-center md:text-right w-full">
                        <h4 className="font-bold text-white text-xl mb-2">{booking.services?.title || "خدمة محذوفة"}</h4>
                        <span className={`px-4 py-1 rounded-full text-xs font-bold ${booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {booking.status === 'confirmed' ? 'مؤكد' : 'بانتظار الموافقة'}
                        </span>
                      </div>
                      <span className="text-[#C89B3C] font-bold text-lg dir-ltr bg-[#C89B3C]/10 px-3 py-1 rounded-lg">{booking.total_price} SAR</span>
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

          {/* Suggestion */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold flex items-center gap-3 mb-8"><Sparkles size={24} className="text-[#C89B3C]" /><span>نقترح عليك</span></h3>
            {suggestedPlace ? (
              <div className="group relative h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl">
                <Image src={suggestedPlace.image_url || "/placeholder.jpg"} alt={suggestedPlace.title || suggestedPlace.name} fill className="object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col h-full justify-end">
                  <span className="bg-[#C89B3C] text-[#2B1F17] text-xs font-bold px-3 py-1.5 rounded-full mb-auto inline-flex w-fit">
                    {suggestionType === 'service' ? 'تجربة مميزة' : 'معلم سياحي'}
                  </span>
                  <h4 className="text-3xl font-extrabold text-white mb-3">{suggestedPlace.title || suggestedPlace.name}</h4>
                  <p className="text-white/70 mb-6 line-clamp-2">{suggestedPlace.description || "استمتع بجمال عسير وتعرف على ثقافتها العريقة."}</p>
                  <div className="flex items-center justify-between bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div>
                      <p className="text-white/50 text-xs mb-1">التكلفة</p>
                      <span className="text-[#C89B3C] font-extrabold text-xl dir-ltr">
                        {suggestionType === 'service' ? `${suggestedPlace.price} SAR` : 'دخول مجاني'}
                      </span>
                    </div>
                    <Link href={suggestionType === 'service' ? `/services/${suggestedPlace.id}` : '/map'} className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-[#C89B3C] transition flex items-center gap-2">
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
    </div>
  );
}