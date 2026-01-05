"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, CheckCircle, Clock, Loader2, LogOut, 
  Briefcase, ShieldAlert, Map, DollarSign, Settings,
  UserPlus, Menu, X, User, Activity, Home, ArrowUpRight, FileBox
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
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  const [stats, setStats] = useState({
    revenue: 0,
    users: 0,
    providers: 0,
    pendingTotal: 0,
    pendingPayouts: 0 
  });

  const [activityLog, setActivityLog] = useState<any[]>([]);

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

      // 2. الإحصائيات
      const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'succeeded');
      const totalRevenue = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');
      const { count: providersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_provider', true);

      // عدادات الانتظار
      const { count: pendingServices } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: pendingProviders } = await supabase.from('provider_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: pendingPayouts } = await supabase.from('payout_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      const totalPending = (pendingServices || 0) + (pendingProviders || 0) + (pendingPayouts || 0);

      setStats({
        revenue: totalRevenue,
        users: usersCount || 0,
        providers: providersCount || 0,
        pendingTotal: totalPending,
        pendingPayouts: pendingPayouts || 0
      });

      // 3. سجل العمليات
      const { data: reqs } = await supabase
        .from('provider_requests')
        .select('id, name, created_at, status')
        .eq('status', 'pending')
        .limit(3);

      const { data: servs } = await supabase
        .from('services')
        .select('id, title, created_at, status')
        .eq('status', 'pending')
        .limit(3);

      const { data: pays } = await supabase
        .from('payout_requests')
        .select('id, amount, created_at, status')
        .eq('status', 'pending')
        .limit(3);

      const combinedLogs = [
        ...(reqs || []).map(r => ({ ...r, type: 'provider_request', label: 'طلب انضمام', details: r.name })),
        ...(servs || []).map(s => ({ ...s, type: 'service', label: 'خدمة جديدة', details: s.title })),
        ...(pays || []).map(p => ({ ...p, type: 'payout', label: 'طلب سحب أرباح', details: `${p.amount} ﷼` }))
      ];

      combinedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivityLog(combinedLogs.slice(0, 5));

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

  const getIconByType = (type: string) => {
      switch(type) {
          case 'provider_request': return { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-400/10' };
          case 'service': return { icon: FileBox, color: 'text-purple-400', bg: 'bg-purple-400/10' };
          case 'payout': return { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
          default: return { icon: Clock, color: 'text-white', bg: 'bg-white/10' };
      }
  };

  const menuItems = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "طلبات الانضمام", icon: UserPlus, href: "/admin/requests", show: true, badge: stats.pendingTotal > 0 ? stats.pendingTotal : 0 },
    { label: "مراجعة الخدمات", icon: CheckCircle, href: "/admin/review-services", show: true },
    { label: "إدارة المعالم", icon: Map, href: "/admin/landmarks", show: true },
    { label: "المستخدمين", icon: Users, href: "/admin/customers", show: true },
    { label: "المالية والأرباح", icon: DollarSign, href: "/admin/finance", show: true, badge: stats.pendingPayouts }, 
    { label: "فريق الإدارة", icon: ShieldAlert, href: "/admin/users", show: isSuperAdmin },
    { label: "الإعدادات", icon: Settings, href: "/admin/settings", show: true },
  ];

  return (
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className} relative`}>
      
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]">
          <Menu size={24} />
        </button>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
           <Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" />
        </Link>

        <div className="relative">
          <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10">
            <User size={20} />
          </button>
          
          {isProfileMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-3 border-b border-white/5 text-xs text-white/50">أهلاً، {adminName}</div>
              <Link href="/admin/profile" className="block px-4 py-3 hover:bg-white/5 text-sm transition">الحساب الشخصي</Link>
              <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition">تسجيل الخروج</button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 right-0 h-screen w-64 bg-[#151515] md:bg-black/40 border-l border-white/10 p-6 backdrop-blur-md z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        
        <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute top-4 left-4 p-2 text-white/50 hover:text-white">
          <X size={24} />
        </button>

        <div className="mb-10 flex justify-center pt-4">
          <Link href="/" title="العودة للرئيسية">
             <Image src="/logo.png" alt="Sayyir Admin" width={120} height={50} priority className="opacity-90 hover:opacity-100 transition" />
          </Link>
        </div>

        <nav className="space-y-2 flex-1 h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
          {menuItems.map((item, index) => (
            item.show && (
              <Link 
                key={index} 
                href={item.href} 
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
                    {item.badge > 99 ? '+99' : item.badge}
                  </span>
                )}
              </Link>
            )
          ))}
        </nav>

        <div className="pt-6 border-t border-white/10 mt-auto">
            <button onClick={handleLogout} className="flex gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 hover:bg-white/5 rounded-xl transition items-center">
                <LogOut size={20} /> خروج
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-10 h-screen overflow-y-auto pt-24 md:pt-10">
        <header className="hidden md:flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">أهلاً، <span className="text-[#C89B3C]">{adminName}</span></h1>
            <p className="text-white/60 text-sm">نظرة عامة على أداء المنصة.</p>
          </div>
          <div className="flex gap-4 items-center">
             <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition" title="الموقع الرئيسي">
                <Home size={20} className="text-white/70" />
             </Link>
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
              <StatCard title="إجمالي العمليات المعلقة" value={stats.pendingTotal} icon={Clock} color="text-amber-400" bg="bg-amber-400/10" />
              <StatCard title="المستخدمين (العملاء)" value={stats.users} icon={Users} color="text-blue-400" bg="bg-blue-400/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Activity Log Section */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Activity className="text-[#C89B3C]" size={20}/>
                    سجل العمليات الحديثة
                  </h3>
                  <span className="text-white/30 text-xs">تحديث فوري</span>
                </div>
                
                {activityLog.length === 0 ? (
                    <div className="text-center py-10 text-white/30">لا توجد عمليات معلقة حديثة.</div>
                ) : (
                    <div className="space-y-3">
                    {activityLog.map((log) => {
                        const style = getIconByType(log.type);
                        const IconComponent = style.icon;
                        return (
                            <div key={`${log.type}-${log.id}`} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${style.bg} ${style.color}`}>
                                        <IconComponent size={18}/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white/90">
                                            {log.label} <span className="text-white/30 text-[10px] mx-1">|</span> <span className="text-[#C89B3C] font-medium">{log.details}</span>
                                        </p>
                                        <p className="text-[10px] text-white/40 flex items-center gap-1 mt-1">
                                            <Clock size={10} /> {new Date(log.created_at).toLocaleDateString('ar-SA')} - {new Date(log.created_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                                {/* تم إزالة زر التفاصيل من هنا */}
                            </div>
                        );
                    })}
                    </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                   <h3 className="font-bold mb-4 text-white/80">إجراءات سريعة</h3>
                   <div className="grid grid-cols-1 gap-3">
                       <QuickAction label="إدارة طلبات الانضمام" icon={UserPlus} href="/admin/requests" />
                       <QuickAction label="مراجعة الخدمات" icon={CheckCircle} href="/admin/review-services" />
                       <QuickAction label="إدارة المعالم" icon={Map} href="/admin/landmarks" />
                       <QuickAction label="إعدادات المنصة" icon={Settings} href="/admin/settings" />
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
    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 transition hover:border-white/20 hover:-translate-y-1 duration-300">
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