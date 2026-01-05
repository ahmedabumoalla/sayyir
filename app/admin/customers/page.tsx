"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Search, Ban, CheckCircle, Loader2, Mail, Phone, Calendar, LogOut, Briefcase, UserCheck,
  Menu, X, User, Home
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  is_banned: boolean;
}

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // حالات القائمة الجانبية للجوال
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  // حالات العدادات
  const [stats, setStats] = useState({
    clients: 0,
    providers: 0
  });

  useEffect(() => {
    fetchData();
    checkRole();
  }, []);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', session.user.id).single();
      if (data?.is_super_admin) setIsSuperAdmin(true);
    } else {
      router.replace("/login");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    // 1. جلب العملاء للقائمة (نستثني الأدمن والمزودين)
    const { data: clientsData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_provider', false)
      .eq('is_admin', false)
      .order('created_at', { ascending: false });

    if (!error && clientsData) {
      setUsers(clientsData as any);
    }

    // 2. جلب الإحصائيات (عدد العملاء وعدد المزودين)
    const { count: clientsCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_provider', false)
      .eq('is_admin', false);

    const { count: providersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_provider', true);

    setStats({
      clients: clientsCount || 0,
      providers: providersCount || 0
    });

    setLoading(false);
  };

  const toggleBan = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "فك الحظر عن" : "حظر";
    if (!confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: !currentStatus } : u));
      alert(`تم ${action} المستخدم بنجاح.`);
    } catch (error: any) {
      alert("حدث خطأ: " + error.message);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.phone || "").includes(searchTerm);
    const matchesFilter = filter === 'all' ? true : filter === 'banned' ? user.is_banned : !user.is_banned;
    return matchesSearch && matchesFilter;
  });

  const menuItems = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "طلبات الانضمام", icon: Briefcase, href: "/admin/requests", show: true },
    { label: "إدارة المعالم", icon: Map, href: "/admin/landmarks", show: true },
    { label: "المستخدمين", icon: Users, href: "/admin/customers", show: true },
    { label: "المالية والأرباح", icon: DollarSign, href: "/admin/finance", show: true },
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
             <Image src="/logo.png" alt="Admin" width={120} height={50} priority className="opacity-90 hover:opacity-100 transition" />
          </Link>
        </div>

        <nav className="space-y-2 flex-1 h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
          {menuItems.map((item, i) => item.show && (
            <Link key={i} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}>
              <item.icon size={20} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10 mt-auto"><button onClick={handleLogout} className="flex gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 hover:bg-white/5 rounded-xl transition items-center"><LogOut size={20} /> خروج</button></div>
      </aside>

      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen pt-24 md:pt-10">
        <header className="hidden md:flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Users className="text-[#C89B3C]" /> إدارة العملاء
                </h1>
                <p className="text-white/60">متابعة السياح والزوار المسجلين في المنصة.</p>
            </div>
            <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition" title="الموقع الرئيسي">
                <Home size={20} className="text-white/70" />
            </Link>
        </header>

        {/* Mobile Header Title */}
        <div className="md:hidden mb-6">
             <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Users className="text-[#C89B3C]" size={24} /> إدارة العملاء
             </h1>
             <p className="text-white/60 text-sm">متابعة السياح والزوار.</p>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-6 rounded-2xl flex items-center justify-between">
                <div>
                    <p className="text-blue-400 text-sm font-bold mb-1">إجمالي العملاء (السياح)</p>
                    <h2 className="text-4xl font-bold text-white">{stats.clients}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Users size={24} />
                </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-6 rounded-2xl flex items-center justify-between">
                <div>
                    <p className="text-purple-400 text-sm font-bold mb-1">إجمالي مزودي الخدمة</p>
                    <h2 className="text-4xl font-bold text-white">{stats.providers}</h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Briefcase size={24} />
                </div>
            </div>
        </div>

        {/* الفلتر والبحث */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 text-white/40" size={20} />
            <input 
              type="text" placeholder="بحث..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-[#C89B3C] outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap ${filter === 'all' ? "bg-[#C89B3C] text-black font-bold" : "bg-black/20 text-white/60"}`}>الكل</button>
            <button onClick={() => setFilter('active')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap ${filter === 'active' ? "bg-emerald-500 text-white" : "bg-black/20 text-white/60"}`}>نشط</button>
            <button onClick={() => setFilter('banned')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap ${filter === 'banned' ? "bg-red-500 text-white" : "bg-black/20 text-white/60"}`}>محظور</button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-20 text-center text-white/40">لا يوجد عملاء مطابقين.</div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right min-w-[900px]">
                <thead className="bg-black/20 text-white/50 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">العميل</th>
                    <th className="px-6 py-4">معلومات الاتصال</th>
                    <th className="px-6 py-4">تاريخ الانضمام</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${user.is_banned ? 'bg-red-500/20 text-red-500' : 'bg-[#C89B3C]/20 text-[#C89B3C]'}`}>
                            {user.full_name ? user.full_name.charAt(0) : <UserCheck size={18}/>}
                          </div>
                          <div>
                            <div className="font-bold text-white">{user.full_name || "مستخدم بدون اسم"}</div>
                            <div className="text-xs text-white/40 font-mono">ID: {user.id.slice(0, 6)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-2 text-white/80 text-xs"><Mail size={14} className="text-[#C89B3C]" /> {user.email}</div>
                        <div className="flex items-center gap-2 text-white/60 text-xs"><Phone size={14} /> {user.phone || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-white/50 text-xs flex items-center gap-2">
                        <Calendar size={14} /> {new Date(user.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-6 py-4">
                        {user.is_banned ? <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs border border-red-500/20">محظور</span> : <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">نشط</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => toggleBan(user.id, user.is_banned)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${user.is_banned ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white" : "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"}`}>
                          {user.is_banned ? "فك الحظر" : "حظر"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}