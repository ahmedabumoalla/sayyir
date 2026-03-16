"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, 
  Map, 
  Briefcase, 
  Users, 
  DollarSign, 
  ShieldAlert,
  Settings,
  Megaphone,
  LogOut,
  Menu,
  X,
  Home,
  Bell,
  Globe,
  Handshake,
  CheckCircle 
} from "lucide-react";
import { useState, useEffect } from "react";
import { TranslationProvider, useTranslation } from "./TranslationContext";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

// 1. المكون الرئيسي الذي يغلف التخطيط بالـ Provider
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <TranslationProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </TranslationProvider>
  );
}

// 2. مكون التخطيط الفعلي الذي يستخدم الـ Context
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // سحب اللغة ودالة التغيير من الـ Context
  const { language, toggleLanguage } = useTranslation();
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("المدير");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // ✅ حالة لتخزين العدادات (الإشعارات)
  const [notificationCounts, setNotificationCounts] = useState({
      requests: 0,
      services: 0
  });

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('profiles').select('full_name, is_super_admin').eq('id', session.user.id).single();
            if (data) {
                setUserName(data.full_name || "المدير");
                setIsSuperAdmin(data.is_super_admin);
            }
        } else {
            router.replace("/login");
        }
    };
    fetchUser();
    fetchNotificationCounts(); // جلب الإشعارات عند التحميل
  }, [router]);

  // ✅ دالة جلب الإشعارات
  const fetchNotificationCounts = async () => {
      try {
          // جلب طلبات الانضمام الجديدة فقط
          const { count: requestsCount } = await supabase
              .from('provider_requests')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending');

          // جلب جميع الخدمات التي تحتاج إجراء (جديدة، تعديل، إيقاف، حذف)
          const { count: servicesCount } = await supabase
              .from('services')
              .select('*', { count: 'exact', head: true })
              .in('status', ['pending', 'update_requested', 'stop_requested', 'delete_requested']);

          setNotificationCounts({
              requests: requestsCount || 0,
              services: servicesCount || 0
          });
      } catch (error) {
          console.error("Error fetching notification counts:", error);
      }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const sidebarItems = [
    { icon: LayoutDashboard, label: language === "ar" ? "الرئيسية" : "Dashboard", href: "/admin/dashboard", show: true, badge: 0 },
    { icon: Briefcase, label: language === "ar" ? "طلبات الانضمام" : "Join Requests", href: "/admin/requests", show: true, badge: notificationCounts.requests }, // 👈 ربط العداد
    { icon: CheckCircle, label: language === "ar" ? "مراجعة الخدمات" : "Review Services", href: "/admin/services", show: true, badge: notificationCounts.services }, // 👈 ربط العداد
    { icon: Map, label: language === "ar" ? "إدارة المعالم" : "Landmarks", href: "/admin/landmarks", show: true, badge: 0 },
    { icon: Handshake, label: language === "ar" ? "شركاء النجاح" : "Partners", href: "/admin/partners", show: true, badge: 0 }, 
    { icon: Users, label: language === "ar" ? "المستخدمين" : "Users", href: "/admin/customers", show: true, badge: 0 },
    { icon: Megaphone, label: language === "ar" ? "إعلانات المنصة" : "Announcements", href: "/admin/announcements", show: true, badge: 0 },
    { icon: DollarSign, label: language === "ar" ? "المالية والأرباح" : "Finance", href: "/admin/finance", show: true, badge: 0 },
    { icon: ShieldAlert, label: language === "ar" ? "فريق الإدارة" : "Admins", href: "/admin/users", show: isSuperAdmin, badge: 0 },
    { icon: Settings, label: language === "ar" ? "الإعدادات العامة" : "Settings", href: "/admin/settings", show: true, badge: 0 },
  ];

  const currentPageLabel = sidebarItems.find(item => item.href === pathname)?.label || (language === "ar" ? "لوحة الإدارة" : "Admin Panel");

  // حساب المجموع الكلي للإشعارات لزر الجرس
  const totalNotifications = notificationCounts.requests + notificationCounts.services;

  return (
    <div className={`flex min-h-screen bg-[#121212] text-white ${tajawal.className} relative`} dir={language === "ar" ? "rtl" : "ltr"}>
      
      {/* ================= إخفاء السكرول بار المزعج ================= */}
      <style jsx global>{`
        ::-webkit-scrollbar {
            width: 0px;
            background: transparent;
        }
        * {
            scrollbar-width: none; 
            -ms-overflow-style: none; 
        }
      `}</style>

      {/* ================= Mobile Header Bar ================= */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1E1E1E]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center shadow-lg">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]">
            <Menu size={24} />
        </button>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" />
        </Link>

        <div className="relative">
            <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10">
                <Users size={20} className="text-white" />
            </button>
            {isProfileMenuOpen && (
                <div className={`absolute top-full mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${language === "ar" ? "left-0" : "right-0"}`}>
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                        <p className="text-white text-sm font-bold truncate">{userName}</p>
                    </div>
                    <button onClick={toggleLanguage} className="w-full text-start px-4 py-3 hover:bg-white/5 text-sm transition text-white flex items-center gap-2">
                        <Globe size={16}/> {language === "ar" ? "English" : "العربية"}
                    </button>
                    <button onClick={handleLogout} className="w-full text-start px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition border-t border-white/5">
                        {language === "ar" ? "تسجيل الخروج" : "Logout"}
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* ================= Sidebar Overlay ================= */}
      {isSidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity" />
      )}

      {/* ================= Sidebar (Desktop & Mobile) ================= */}
      <aside className={`fixed md:sticky top-0 ${language === "ar" ? "right-0 border-l" : "left-0 border-r"} h-screen w-64 bg-[#1E1E1E] border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : (language === "ar" ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}`}>
        
        <button onClick={() => setSidebarOpen(false)} className={`md:hidden absolute top-4 ${language === "ar" ? "left-4" : "right-4"} p-2 text-white/50 hover:text-white`}>
            <X size={24} />
        </button>

        <div className="h-24 flex flex-col items-center justify-center border-b border-white/5 pt-4 md:pt-0">
           <Link href="/">
             <Image src="/logo.png" alt="Sayyir" width={100} height={40} className="opacity-90 hover:opacity-100 transition cursor-pointer" />
           </Link>
           <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded mt-1 font-bold tracking-wider">
               {language === "ar" ? "الإدارة العليا" : "SUPER ADMIN"}
           </span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {sidebarItems.map((item) => {
            if (!item.show) return null;
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={() => setSidebarOpen(false)} 
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition ${
                    isActive 
                        ? "bg-[#C89B3C] text-black font-bold shadow-lg shadow-[#C89B3C]/20" 
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                    <Icon size={20} className={isActive ? "text-black" : "text-[#C89B3C]"} />
                    <span className="text-sm">{item.label}</span>
                </div>
                {/* ✅ عرض العداد إذا كان أكبر من 0 */}
                {item.badge > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`}>
                        {item.badge}
                    </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold border border-red-500/30 shrink-0">
                    {userName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{userName}</p>
                    <p className="text-[10px] text-white/50">{language === "ar" ? "مدير نظام" : "Administrator"}</p>
                </div>
            </div>
            
            <Link href="/" className="flex items-center gap-3 w-full px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition mb-2 text-sm font-bold">
               <Home size={18} /> <span>{language === "ar" ? "العودة للمنصة" : "Back to Website"}</span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition text-sm font-bold">
              <LogOut size={18} />
              <span>{language === "ar" ? "تسجيل الخروج" : "Logout"}</span>
            </button>
        </div>
      </aside>

      {/* ================= Main Content Area ================= */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-20 md:pt-0">
        
        <header className="hidden md:flex h-20 border-b border-white/5 bg-[#1E1E1E]/50 backdrop-blur-md items-center justify-between px-8">
           <h2 className="font-bold text-lg text-white/80">{currentPageLabel}</h2>
           
           <div className="flex items-center gap-4">
              <button onClick={toggleLanguage} className="p-2 text-white/50 hover:text-[#C89B3C] hover:bg-white/5 rounded-full transition flex items-center gap-2 text-xs font-bold font-mono">
                  <Globe size={18}/> {language === "ar" ? "EN" : "AR"}
              </button>

              <button className="p-2 text-white/50 hover:text-[#C89B3C] hover:bg-white/5 rounded-full transition relative">
                  <Bell size={20} />
                  {/* نقطة الإشعار العامة */}
                  {totalNotifications > 0 && (
                      <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                  )}
              </button>
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>
      
    </div>
  );
}