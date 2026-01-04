"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, List, CalendarCheck, Wallet, UserCog, LogOut 
} from "lucide-react"; // تم التصحيح هنا: List بحرف كبير

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

// قائمة المزود تختلف عن العميل
const providerMenu = [
  { label: "لوحة المعلومات", icon: LayoutDashboard, href: "/provider/dashboard" },
  { label: "خدماتي", icon: List, href: "/provider/services" }, // تم التصحيح هنا: List
  { label: "الحجوزات والطلبات", icon: CalendarCheck, href: "/provider/bookings" },
  { label: "المحفظة والأرباح", icon: Wallet, href: "/provider/finance" },
  { label: "إعدادات الحساب", icon: UserCog, href: "/provider/profile" },
];

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className={`flex min-h-screen bg-[#121212] text-white ${tajawal.className}`} dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#1E1E1E] border-l border-white/5 flex flex-col hidden md:flex">
        <div className="h-20 flex items-center justify-center border-b border-white/5">
           <Image src="/logo.png" alt="Sayyir Provider" width={100} height={40} className="opacity-90" />
           <span className="text-[10px] bg-[#C89B3C] text-black px-1.5 py-0.5 rounded mr-2 font-bold">شريك</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {providerMenu.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive ? "bg-[#C89B3C] text-black font-bold shadow-lg shadow-[#C89B3C]/20" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition">
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header بسيط */}
        <header className="h-20 border-b border-white/5 bg-[#1E1E1E]/50 backdrop-blur-md flex items-center justify-between px-8">
           <h2 className="font-bold text-lg text-white/80">بوابة الشركاء</h2>
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C] font-bold border border-[#C89B3C]/30">P</div>
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}