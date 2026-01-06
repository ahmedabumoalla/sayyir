"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, CheckCircle, Clock, Loader2, LogOut, 
  Briefcase, ShieldAlert, Map, DollarSign, Settings,
  UserPlus, Menu, X, User, Activity, Home, FileBox, CheckSquare, XSquare, Trash2, Edit, FileText, Info, 
  XCircle, ChevronDown, ChevronUp 
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

  // حالة النافذة المنبثقة للتفاصيل
  const [selectedLog, setSelectedLog] = useState<any>(null);
  
  // حالة "عرض الكل" للسجلات
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [stats, setStats] = useState({
    revenue: 0,
    users: 0,
    providers: 0,
    pendingTotal: 0,
    pendingPayouts: 0 
  });

  const [activityLog, setActivityLog] = useState<any[]>([]);

  // تعريف دالة جلب البيانات
  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      // 1. معلومات الأدمن الحالي
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

      // ============================================================
      // 3. سجل العمليات (جلب عدد أكبر لزر عرض الكل)
      // ============================================================

      // أ) جلب السجلات الجديدة من admin_logs (زيادة الحد إلى 50)
      const { data: newLogs } = await supabase
        .from('admin_logs')
        .select('*')
        .not('action_type', 'in', '("manage_admins", "delete_admin", "change_permissions")') 
        .order('created_at', { ascending: false })
        .limit(50); // زدنا العدد هنا

      // ب) جلب أسماء الأدمنز
      let logsWithNames: any[] = [];
      if (newLogs && newLogs.length > 0) {
          const adminIds = [...new Set(newLogs.map(l => l.admin_id).filter(Boolean))];
          
          const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', adminIds);
          
          const namesMap: Record<string, string> = {};
          profiles?.forEach(p => { namesMap[p.id] = p.full_name });

          logsWithNames = newLogs.map(log => ({
              ...log,
              executor: namesMap[log.admin_id] || 'أدمن غير معروف',
              is_system: false 
          }));
      }

      // ج) جلب البيانات القديمة (زيادة الحد إلى 10 للاحتياط)
      const { data: reqs } = await supabase.from('provider_requests').select('id, name, created_at, status').order('created_at', { ascending: false }).limit(10);
      const { data: servs } = await supabase.from('services').select('id, title, created_at, status').order('created_at', { ascending: false }).limit(10);
      const { data: pays } = await supabase.from('payout_requests').select('id, amount, created_at, status').order('created_at', { ascending: false }).limit(10);

      const formattedOldLogs = [
          ...(reqs || []).map(r => ({ 
              id: r.id, 
              action_type: r.status === 'approved' ? 'approve_provider' : (r.status === 'rejected' ? 'reject_provider' : 'new_request'), 
              details: r.status === 'pending' ? `طلب انضمام جديد من: ${r.name}` : `تم تحديث حالة طلب الشريك: ${r.name}`, 
              created_at: r.created_at,
              executor: r.status === 'pending' ? 'العميل' : 'النظام',
              is_system: true
          })),
          ...(servs || []).map(s => ({ 
              id: s.id, 
              action_type: 'new_service', 
              details: `إضافة خدمة جديدة بعنوان: ${s.title}`, 
              created_at: s.created_at,
              executor: 'مزود الخدمة',
              is_system: true
          })),
          ...(pays || []).map(p => ({ 
              id: p.id, 
              action_type: 'payout_request', 
              details: `طلب سحب رصيد بقيمة: ${p.amount} ﷼`, 
              created_at: p.created_at,
              executor: 'مزود الخدمة',
              is_system: true
          }))
      ];

      // د) الدمج والترتيب
      const combinedLogs = [...logsWithNames, ...formattedOldLogs];
      const sortedLogs = combinedLogs
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50); // نحتفظ بآخر 50 عملية

      setActivityLog(sortedLogs);

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const getLogStyle = (type: string) => {
      // إعدادات الأيقونات والألوان
      if (type === 'update_settings') return { icon: Settings, color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'تحديث إعدادات' };
      if (type.includes('approve_payout')) return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'موافقة مالية' };
      if (type.includes('reject_payout')) return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'رفض مالي' };
      if (type.includes('landmark')) return { icon: Map, color: 'text-[#C89B3C]', bg: 'bg-[#C89B3C]/10', label: 'إدارة المعالم' };
      if (type.includes('block_user')) return { icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10', label: 'حظر مستخدم' };
      if (type.includes('activate_user')) return { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'تفعيل مستخدم' };
      if (type.includes('approve')) return { icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'تمت الموافقة' };
      if (type.includes('reject')) return { icon: XSquare, color: 'text-red-400', bg: 'bg-red-400/10', label: 'تم الرفض' };
      if (type.includes('delete')) return { icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10', label: 'عملية حذف' };
      if (type.includes('edit') || type.includes('update')) return { icon: Edit, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'تعديل' };
      if (type.includes('payout')) return { icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'عملية مالية' };
      if (type.includes('service')) return { icon: FileBox, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'خدمة' };
      if (type.includes('new_request')) return { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'طلب جديد' };
      
      return { icon: Activity, color: 'text-white', bg: 'bg-white/10', label: 'عملية' };
  };

  const menuItems = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "طلبات الانضمام", icon: Briefcase, href: "/admin/requests", show: true, badge: stats.pendingTotal > 0 ? stats.pendingTotal : 0 },
    { label: "مراجعة الخدمات", icon: CheckCircle, href: "/admin/review-services", show: true },
    { label: "إدارة المعالم", icon: Map, href: "/admin/landmarks", show: true },
    { label: "المستخدمين", icon: Users, href: "/admin/customers", show: true },
    { label: "المالية والأرباح", icon: DollarSign, href: "/admin/finance", show: true, badge: stats.pendingPayouts }, 
    { label: "فريق الإدارة", icon: ShieldAlert, href: "/admin/users", show: isSuperAdmin },
    { label: "الإعدادات", icon: Settings, href: "/admin/settings", show: true },
  ];

  // تحديد السجلات المعروضة (5 أو الكل)
  const displayedLogs = showAllLogs ? activityLog : activityLog.slice(0, 5);

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

      {/* Sidebar Overlay */}
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
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Activity className="text-[#C89B3C]" size={20}/>
                    سجل العمليات الحديثة
                  </h3>
                  {/* زر عرض الكل / عرض أقل */}
                  {activityLog.length > 5 && (
                    <button 
                      onClick={() => setShowAllLogs(!showAllLogs)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                    >
                      {showAllLogs ? (
                        <>عرض أقل <ChevronUp size={14}/></>
                      ) : (
                        <>عرض الكل <ChevronDown size={14}/></>
                      )}
                    </button>
                  )}
                </div>
                
                {activityLog.length === 0 ? (
                    <div className="text-center py-10 text-white/30 border border-dashed border-white/5 rounded-xl">لا توجد عمليات مسجلة حديثاً.</div>
                ) : (
                    <div className="space-y-3">
                    {displayedLogs.map((log, index) => {
                        const style = getLogStyle(log.action_type);
                        const IconComponent = style.icon;
                        return (
                            <div 
                                key={`${log.id}-${index}`} 
                                onClick={() => setSelectedLog(log)} 
                                className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-[#C89B3C]/30 hover:bg-white/5 transition group cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold ${style.bg} ${style.color}`}>
                                        <IconComponent size={20}/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white/90 mb-1 line-clamp-1 group-hover:text-[#C89B3C] transition-colors">
                                            {log.details || style.label}
                                        </p>
                                        <div className="flex items-center gap-3 text-[11px]">
                                            <span className="text-white/40 flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${style.bg.replace('/10', '')}`}></span>
                                                {style.label}
                                            </span>
                                            <span className="text-white/20">|</span>
                                            <span className="text-white/50 flex items-center gap-1">
                                                <User size={10} className="text-[#C89B3C]"/> 
                                                بواسطة: <span className="text-[#C89B3C]">{log.executor}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left pl-2 shrink-0">
                                    <p className="text-[10px] text-white/40 flex items-center gap-1 justify-end">
                                        {new Date(log.created_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})} <Clock size={10} />
                                    </p>
                                    <p className="text-[10px] text-white/30 mt-0.5">
                                        {new Date(log.created_at).toLocaleDateString('ar-SA')}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full">
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

        {/* Modal (نافذة التفاصيل) */}
        {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#1a1a1a] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Info size={20} className="text-[#C89B3C]" /> تفاصيل العملية
                        </h3>
                        <button onClick={() => setSelectedLog(null)} className="text-white/50 hover:text-white transition">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-white/40 mb-1">نوع العملية</p>
                            <p className="text-white font-bold flex items-center gap-2">
                                {getLogStyle(selectedLog.action_type).label}
                            </p>
                        </div>
                        <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-white/40 mb-1">التفاصيل الكاملة</p>
                            <p className="text-white leading-relaxed text-sm">
                                {selectedLog.details}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1 bg-black/40 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-white/40 mb-1">المنفذ</p>
                                <p className="text-[#C89B3C] font-bold text-sm">{selectedLog.executor}</p>
                            </div>
                            <div className="flex-1 bg-black/40 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-white/40 mb-1">التوقيت</p>
                                <p className="text-white font-bold text-sm" dir="ltr">
                                    {new Date(selectedLog.created_at).toLocaleString('ar-SA')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                        <button onClick={() => setSelectedLog(null)} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold transition text-sm">
                            إغلاق
                        </button>
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