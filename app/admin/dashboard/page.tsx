"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, CheckCircle, Clock, Loader2, LogOut, 
  Briefcase, ShieldAlert, Map, DollarSign, Settings,
  UserPlus
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
    pendingTotal: 0 // مجموع الطلبات المعلقة (خدمات + مزودين)
  });

  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      // 1. معلومات الأدمن
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, is_super_admin')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setAdminName(profile.full_name);
        if (profile.is_super_admin) setIsSuperAdmin(true);
      }

      // 2. الإحصائيات الحقيقية
      // أ) الأرباح
      const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'succeeded');
      const totalRevenue = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      // ب) المستخدمين
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      // ج) الشركاء (المزودين المعتمدين)
      const { count: providersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_provider', true);

      // د) الطلبات المعلقة (خدمات + انضمام مزودين)
      const { count: pendingServices } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: pendingProviders } = await supabase.from('provider_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      const totalPending = (pendingServices || 0) + (pendingProviders || 0);

      setStats({
        revenue: totalRevenue,
        users: usersCount || 0,
        providers: providersCount || 0,
        pendingTotal: totalPending
      });

      // 3. آخر طلبات الانضمام (للعرض في القائمة)
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
    { label: "طلبات الانضمام", icon: UserPlus, href: "/admin/requests", show: true }, // تم تحديث الأيقونة والرابط
    { label: "مراجعة الخدمات", icon: CheckCircle, href: "/admin/review-services", show: true },
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
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-black/40 border-l border-white/10 p-6 backdrop-blur-md">
        <div className="mb-10 flex justify-center pt-4">
          <Image src="/logo.png" alt="Sayyir Admin" width={120} height={50} priority className="opacity-90" />
        </div>
        <nav className="space-y-2 flex-1">
          {menuItems.map((item, index) => (
            item.show && (
              <Link key={index} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}>
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

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-10 h-screen overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">أهلاً، <span className="text-[#C89B3C]">{adminName}</span></h1>
            <p className="text-white/60 text-sm">نظرة عامة على أداء المنصة.</p>
          </div>
        </header>

        {loading ? (
           <div className="flex justify-center h-[50vh] items-center"><Loader2 className="animate-spin text-[#C89B3C]" size={40} /></div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="إجمالي الأرباح" value={`${stats.revenue} ﷼`} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-400/10" />
              <StatCard title="الشركاء المعتمدين" value={stats.providers} icon={Briefcase} color="text-[#C89B3C]" bg="bg-[#C89B3C]/10" />
              <StatCard title="طلبات معلقة (الكل)" value={stats.pendingTotal} icon={Clock} color="text-amber-400" bg="bg-amber-400/10" />
              <StatCard title="إجمالي المستخدمين" value={stats.users} icon={Users} color="text-blue-400" bg="bg-blue-400/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Recent Requests Section */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <UserPlus className="text-[#C89B3C]" size={20}/>
                    آخر طلبات الانضمام
                  </h3>
                  <Link href="/admin/requests" className="text-[#C89B3C] text-xs hover:underline">عرض الكل</Link>
                </div>
                
                {recentRequests.length === 0 ? (
                    <div className="text-center py-10 text-white/30">لا توجد طلبات انضمام جديدة.</div>
                ) : (
                    <div className="space-y-3">
                    {recentRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 font-bold">
                                {req.name[0]}
                            </div>
                            <div>
                                <p className="font-bold text-sm">{req.name}</p>
                                <p className="text-[10px] text-white/40">{req.service_type === 'housing' ? 'سكن' : req.service_type === 'food' ? 'مأكولات' : 'تجربة'}</p>
                            </div>
                        </div>
                        <Link href={`/admin/requests/${req.id}`} className="text-[10px] px-3 py-1.5 rounded bg-[#C89B3C]/10 text-[#C89B3C] hover:bg-[#C89B3C]/20 transition">
                            معاينة
                        </Link>
                        </div>
                    ))}
                    </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                   <h3 className="font-bold mb-4 text-white/80">إجراءات سريعة</h3>
                   <div className="grid grid-cols-1 gap-3">
                       <QuickAction label="إدارة طلبات الانضمام" icon={UserPlus} href="/admin/requests" />
                       <QuickAction label="مراجعة خدمة جديدة" icon={CheckCircle} href="/admin/review-services" />
                       <QuickAction label="إضافة معلم جديد" icon={Map} href="/admin/landmarks" />
                       <QuickAction label="تعديل نموذج التسجيل" icon={Settings} href="/admin/settings/registration" />
                   </div>
                 </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Components
function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 transition hover:border-white/20">
      <div className={`p-3 w-fit rounded-xl mb-4 ${bg} ${color}`}><Icon size={24} /></div>
      <p className="text-white/50 text-xs mb-1 font-medium">{title}</p>
      <p className="text-3xl font-bold font-mono">{value}</p>
    </div>
  );
}

function QuickAction({ label, icon: Icon, href }: any) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition group">
      <div className="p-2 bg-black/30 rounded-lg text-white/60 group-hover:text-[#C89B3C] transition">
          <Icon size={18} />
      </div>
      <span className="text-xs font-bold text-white/80">{label}</span>
    </Link>
  );
}