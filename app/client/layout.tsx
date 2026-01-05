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
  CreditCard,
  Menu, // إضافة أيقونة القائمة
  X     // إضافة أيقونة الإغلاق
} from "lucide-react";
import { useState } from "react"; // إضافة useState

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

const sidebarItems = [
  { icon: LayoutDashboard, label: "الرئيسية", href: "/client/dashboard" },
  { icon: Map, label: "الخريطة التفاعلية", href: "/map" },
  { icon: Heart, label: "المفضلة", href: "/client/favorites" },
  { icon: History, label: "رحلاتي السابقة", href: "/client/trips" },
  { icon: CreditCard, label: "مدفوعاتي", href: "/client/payments" },
  { icon: User, label: "الملف الشخصي", href: "/client/profile" },
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div className={`relative min-h-screen w-full overflow-x-hidden bg-[#3A3A3A] ${tajawal.className}`} dir="rtl">
      
      {/* الخلفية */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, #5F6F52 0%, #2B1F17 55%, #3A3A3A 100%)`,
          }}
        />
        <div className="absolute inset-0 opacity-[0.06] bg-[url('/grain.png')] pointer-events-none" />
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ backgroundColor: "#C89B3C", opacity: 0.15 }} 
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-[150px]"
          style={{ backgroundColor: "#5F6F52", opacity: 0.1 }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen">
        
        {/* Mobile Header (جديد) */}
        <div className="md:hidden fixed top-0 w-full z-50 bg-[#2B1F17]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
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
                        <Link href="/client/profile" className="block px-4 py-3 hover:bg-white/5 text-sm transition text-white">الحساب الشخصي</Link>
                        <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition">تسجيل الخروج</button>
                    </div>
                )}
            </div>
        </div>

        {/* Sidebar Overlay (Mobile) */}
        {isSidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />
        )}

        {/* القائمة الجانبية (Sidebar) - معدلة لتكون متجاوبة */}
        <aside className={`fixed md:sticky top-0 right-0 h-screen w-64 border-l border-white/10 bg-black/20 backdrop-blur-xl z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          
          {/* زر إغلاق للقائمة (موبايل فقط) */}
          <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute top-4 left-4 p-2 text-white/50 hover:text-white">
            <X size={24} />
          </button>

          <div className="h-24 flex items-center justify-center mb-6 pt-4">
             <Image src="/logo.png" alt="Sayyir AI" width={100} height={40} priority className="opacity-90" />
          </div>

          <nav className="flex-1 flex flex-col gap-2 px-3 overflow-y-auto">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)} // إغلاق القائمة عند الضغط
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                    isActive 
                      ? "bg-gradient-to-r from-[#C89B3C]/20 to-transparent text-white border-r-2 border-[#C89B3C]" 
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={22} className={`transition-transform group-hover:scale-110 ${isActive ? "text-[#C89B3C]" : ""}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* زر تسجيل الخروج */}
          <div className="p-4 mt-auto">
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <LogOut size={22} />
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* المحتوى الرئيسي */}
        <main className="flex-1 flex flex-col overflow-hidden pt-20 md:pt-0"> {/* إضافة بادينغ علوي للموبايل */}
          
          {/* Desktop Header */}
          <header className="h-20 px-6 lg:px-10 hidden md:flex items-center justify-between backdrop-blur-md bg-black/10 border-b border-white/5">
            <div className="flex-1 flex items-center gap-8">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white">
                  أهلاً بك، <span className="text-[#C89B3C]">أحمد</span> 👋
                </h1>
                <p className="text-sm text-white/60 hidden md:block">جاهز لاستكشاف وجهتك القادمة في عسير؟</p>
              </div>
              <div className="hidden lg:flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-full w-96 border border-white/10 focus-within:border-[#C89B3C]/50 transition">
                <Search size={18} className="text-white/50" />
                <input 
                  type="text" 
                  placeholder="ابحث عن وجهة، معلم تراثي..." 
                  className="bg-transparent border-none outline-none text-white placeholder-white/50 text-sm flex-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 relative">
               <button className="relative p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 transition border border-white/10">
                 <Bell size={20} />
                 <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#3A3A3A]"></span>
               </button>
               <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#C89B3C] to-[#5F6F52] p-[2px] cursor-pointer">
                 <div className="w-full h-full rounded-full bg-[#2B1F17] overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-white font-bold">A</div>
                 </div>
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}