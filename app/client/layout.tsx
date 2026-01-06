"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, 
  Map, 
  Heart, 
  History, 
  User, 
  LogOut,
  Bell,
  Search,
  Settings,
  Menu,
  X,
  MapPin
} from "lucide-react";
import { useState, useEffect } from "react";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

const sidebarItems = [
  { icon: LayoutDashboard, label: "الرئيسية", href: "/client/dashboard" },
  { icon: MapPin, label: "الخريطة التفاعلية", href: "/map" },
  { icon: Heart, label: "المفضلة", href: "/client/favorites" },
  { icon: History, label: "رحلاتي", href: "/client/trips" },
  { icon: User, label: "الملف الشخصي", href: "/client/profile" },
  { icon: Settings, label: "الإعدادات", href: "/client/settings" },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  // حالات القائمة الجانبية للجوال
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("عميل");

  useEffect(() => {
    // جلب اسم المستخدم للعرض في الهيدر
    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
            if (data) setUserName(data.full_name);
        }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className={`relative min-h-screen w-full bg-[#1a1a1a] ${tajawal.className}`} dir="rtl">
      
      {/* ================= Mobile Header ================= */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C] border border-white/10">
          <Menu size={24} />
        </button>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
           <Image src="/logo.png" alt="Sayyir" width={30} height={30} />
           <span className="text-[#C89B3C] font-bold text-lg">سيّر</span>
        </Link>

        <div className="relative">
          <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="w-9 h-9 bg-[#C89B3C] rounded-full flex items-center justify-center text-[#1a1a1a]">
            <User size={20} />
          </button>
          
          {isProfileMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
              <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                <p className="text-white text-sm font-bold truncate">{userName}</p>
              </div>
              <Link href="/client/profile" className="block px-4 py-3 hover:bg-white/5 text-sm transition text-white">الحساب الشخصي</Link>
              <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition border-t border-white/10">تسجيل الخروج</button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for Mobile Sidebar */}
      {isSidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity" />
      )}

      {/* ================= Sidebar (Desktop & Mobile) ================= */}
      <aside className={`fixed top-0 right-0 h-screen w-72 bg-[#252525] border-l border-white/10 z-50 transition-transform duration-300 ease-in-out flex flex-col p-6 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        
        {/* Logo Area */}
        <div className="flex justify-between items-center mb-10">
            <Link href="/" className="flex items-center gap-3">
                <Image src="/logo.png" alt="Sayyir AI" width={40} height={40} className="opacity-90" />
                <span className="text-2xl font-bold text-[#C89B3C]">سيّر</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-white/50 hover:text-white bg-white/5 rounded-lg">
                <X size={20} />
            </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? "bg-[#C89B3C]/10 text-[#C89B3C] font-bold border border-[#C89B3C]/20" 
                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon size={20} className={`transition-transform group-hover:scale-110 ${isActive ? "text-[#C89B3C]" : ""}`} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Mini-Card (Bottom Sidebar) */}
        <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-10 h-10 rounded-full bg-[#C89B3C] flex items-center justify-center text-[#1a1a1a]">
                    <User size={20} />
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{userName}</p>
                    <Link href="/client/profile" className="text-xs text-white/50 hover:text-[#C89B3C]">عرض الملف</Link>
                </div>
            </div>
            <button 
                onClick={handleLogout} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 transition-all text-sm font-bold"
            >
                <LogOut size={18} />
                <span>تسجيل الخروج</span>
            </button>
        </div>
      </aside>

      {/* ================= Main Content Area ================= */}
      <div className="md:pr-72 min-h-screen transition-all duration-300">
        {/* ملاحظة: لقد أزلت الهيدر العلوي (Desktop Header) من هنا 
            لأن صفحة Dashboard/Page.tsx تحتوي بالفعل على هيدر خاص بها بتصميم أجمل.
            وهذا يمنع تكرار العناوين ويجعل التصميم أنظف.
        */}
        <main className="min-h-screen pt-20 md:pt-0">
           {children}
        </main>
      </div>
      
    </div>
  );
}