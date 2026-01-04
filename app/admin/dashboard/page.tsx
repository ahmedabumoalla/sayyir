"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, CheckCircle, Clock, Loader2, LogOut, 
  Briefcase, ShieldAlert, Map, DollarSign, Settings,
  UserPlus, Sliders // ⬅️ أيقونة فقط
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
});

export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");

  const [stats, setStats] = useState({
    revenue: 0,
    users: 0,
    providers: 0,
    pendingTotal: 0
  });

  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, is_super_admin')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setAdminName(profile.full_name);
        if (profile.is_super_admin) setIsSuperAdmin(true);
      }

      const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'succeeded');
      const totalRevenue = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: providersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_provider', true);
      const { count: pendingServices } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: pendingProviders } = await supabase.from('provider_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      const totalPending = (pendingServices || 0) + (pendingProviders || 0);

      setStats({
        revenue: totalRevenue,
        users: usersCount || 0,
        providers: providersCount || 0,
        pendingTotal: totalPending
      });

      const { data: recent } = await supabase
        .from('provider_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recent) setRecentRequests(recent);

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "طلبات الانضمام", icon: UserPlus, href: "/admin/requests", show: true },
    { label: "مراجعة الخدمات", icon: CheckCircle, href: "/admin/review-services", show: true },

    // ✅ الإضافة الوحيدة (زر تعديل إضافة الخدمات)
    { label: "إعدادات إضافة الخدمات", icon: Sliders, href: "/admin/service-settings", show: true },

    { label: "إدارة المعالم", icon: Map, href: "/admin/landmarks", show: true },
    { label: "المستخدمين", icon: Users, href: "/admin/customers", show: true },
    { label: "المالية والأرباح", icon: DollarSign, href: "/admin/finance", show: true },
    { label: "فريق الإدارة", icon: ShieldAlert, href: "/admin/users", show: isSuperAdmin },
    { label: "الإعدادات", icon: Settings, href: "/admin/settings", show: true },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className}`}>
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-black/40 border-l border-white/10 p-6 backdrop-blur-md">
        <div className="mb-10 flex justify-center pt-4">
          <Image src="/logo.png" alt="Sayyir Admin" width={120} height={50} priority className="opacity-90" />
        </div>
        <nav className="space-y-2 flex-1">
          {menuItems.map((item, index) => (
            item.show && (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  pathname === item.href
                    ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold"
                    : "text-white/60 hover:bg-white/5"
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10">
          <button onClick={handleLogout} className="flex gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 hover:bg-white/5 rounded-xl transition">
            <LogOut size={20} /> خروج
          </button>
        </div>
      </aside>

      <div className="flex-1 p-6 lg:p-10 h-screen overflow-y-auto">
        {/* المحتوى كما هو بدون أي تغيير */}
      </div>
    </main>
  );
}
