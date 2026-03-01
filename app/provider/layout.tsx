"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, List, CalendarCheck, Wallet, UserCog, LogOut,
  Menu, X, User, Home, QrCode // ✅ تم إضافة أيقونة QrCode
} from "lucide-react"; 
import { useState } from "react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

const providerMenu = [
  { label: "لوحة المعلومات", icon: LayoutDashboard, href: "/provider/dashboard" },
  { label: "خدماتي", icon: List, href: "/provider/services" }, 
  { label: "الحجوزات والطلبات", icon: CalendarCheck, href: "/provider/bookings" },
  { label: "قارئ التذاكر", icon: QrCode, href: "/provider/scanner" }, // ✅ تم إضافة صفحة قارئ التذاكر هنا
  { label: "المحفظة والأرباح", icon: Wallet, href: "/provider/finance" },
  { label: "إعدادات الحساب", icon: UserCog, href: "/provider/profile" },
];

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className={`flex min-h-screen bg-[#121212] text-white ${tajawal.className} relative`} dir="rtl">
      
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1E1E1E]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]">
            <Menu size={24} />
        </button>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" />
        </Link>

        <div className="relative">
            <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10">
                <User size={20} className="text-white" />
            </button>
            {isProfileMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                    <Link href="/provider/profile" className="block px-4 py-3 hover:bg-white/5 text-sm transition text-white">إعدادات الحساب</Link>
                    <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition">تسجيل الخروج</button>
                </div>
            )}
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 right-0 h-screen w-64 bg-[#1E1E1E] border-l border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        
        <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute top-4 left-4 p-2 text-white/50 hover:text-white">
            <X size={24} />
        </button>

        <div className="h-24 flex flex-col items-center justify-center border-b border-white/5 pt-4 md:pt-0">
           {/* الشعار الآن يرجع للصفحة الرئيسية */}
           <Link href="/">
             <Image src="/logo.png" alt="Sayyir Provider" width={100} height={40} className="opacity-90 hover:opacity-100 transition cursor-pointer" />
           </Link>
           <span className="text-[10px] bg-[#C89B3C] text-black px-1.5 py-0.5 rounded mt-1 font-bold">بوابة الشركاء</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {providerMenu.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive ? "bg-[#C89B3C] text-black font-bold shadow-lg shadow-[#C89B3C]/20" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link href="/" className="flex items-center gap-3 w-full px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition mb-2">
             <Home size={20} /> <span>زيارة المنصة</span>
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition">
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-20 md:pt-0">
        <header className="hidden md:flex h-20 border-b border-white/5 bg-[#1E1E1E]/50 backdrop-blur-md items-center justify-between px-8">
           <h2 className="font-bold text-lg text-white/80">لوحة التحكم</h2>
           <div className="flex items-center gap-3">
              <Link href="/" title="زيارة الموقع" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><Home size={18}/></Link>
              <div className="w-10 h-10 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C] font-bold border border-[#C89B3C]/30">P</div>
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
}