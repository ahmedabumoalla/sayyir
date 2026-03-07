"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Users, Search, Ban, User, CheckCircle, Loader2, Mail, Phone, Calendar, Briefcase, UserCheck, Trash2, KeyRound, Eye, XCircle, Clock, Filter, Send
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  is_banned: boolean;
  is_provider: boolean;
  is_admin: boolean;
  city?: string;
  gender?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  last_sign_in_at?: string; 
}

export default function CustomersPage() {
  const [allUsers, setAllUsers] = useState<Profile[]>([]); 
  const [displayedUsers, setDisplayedUsers] = useState<Profile[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned' | 'deleted' | 'inactive'>('all'); 
  const [typeFilter, setTypeFilter] = useState<'clients' | 'providers'>('clients'); 
  
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const [stats, setStats] = useState({
    activeClients: 0,
    activeProviders: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchTerm, statusFilter, typeFilter, allUsers]);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('is_admin', 'eq', true) 
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAllUsers(data as any);
      
      const activeClients = data.filter((u: any) => !u.is_provider && !u.is_deleted && !u.is_banned).length;
      const activeProviders = data.filter((u: any) => u.is_provider && !u.is_deleted && !u.is_banned).length;

      setStats({
        activeClients,
        activeProviders
      });
    }
    setLoading(false);
  };

  const filterData = () => {
    let result = allUsers;

    if (typeFilter === 'clients') {
      result = result.filter(u => !u.is_provider);
    } else if (typeFilter === 'providers') {
      result = result.filter(u => u.is_provider);
    }

    if (statusFilter === 'active') {
      result = result.filter(u => !u.is_banned && !u.is_deleted);
    } else if (statusFilter === 'banned') {
      result = result.filter(u => u.is_banned && !u.is_deleted);
    } else if (statusFilter === 'deleted') {
      result = result.filter(u => u.is_deleted);
    } else if (statusFilter === 'inactive') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(u => {
          const lastSeen = u.last_sign_in_at ? new Date(u.last_sign_in_at) : new Date(u.created_at); 
          return lastSeen < thirtyDaysAgo && !u.is_deleted;
      });
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(u => 
        (u.full_name?.toLowerCase() || "").includes(lowerTerm) ||
        (u.email?.toLowerCase() || "").includes(lowerTerm) ||
        (u.phone || "").includes(lowerTerm)
      );
    }

    setDisplayedUsers(result);
  };

  const handleToggleBan = async (id: string, currentStatus: boolean, userName: string) => {
    const actionText = currentStatus ? "فك الحظر عن" : "حظر";
    if (!confirm(`هل أنت متأكد من ${actionText} المستخدم "${userName}"؟`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("جلسة العمل مفقودة");

      const newStatus = !currentStatus;
      const logMsg = newStatus ? `تم حظر المستخدم: ${userName}` : `تم فك الحظر عن المستخدم: ${userName}`;

      const response = await fetch('/api/admin/users/action', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ 
              action: 'toggle_ban', 
              userId: id, 
              newStatus: newStatus,
              logDetails: logMsg
          })
      });

      if (!response.ok) {
          const res = await response.json();
          throw new Error(res.error || "فشل العملية");
      }
      
      setAllUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: newStatus } : u));
      alert(`تم ${actionText} المستخدم بنجاح.`);

    } catch (error: any) {
      alert("حدث خطأ: " + error.message);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!confirm(`تحذير: سيتم حذف حساب "${userName}" وجميع بياناته نهائياً.\nهل أنت متأكد؟`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("جلسة العمل مفقودة");

      const response = await fetch('/api/admin/users/action', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ 
              action: 'delete', 
              userId: id, 
              requesterId: session.user.id, 
              logDetails: `تم حذف المستخدم نهائياً: ${userName}`
          })
      });

      const res = await response.json();

      if (!response.ok) {
          throw new Error(res.error || "فشل الحذف");
      }
      
      setAllUsers(prev => prev.filter(u => u.id !== id));
      alert("✅ " + (res.message || "تم حذف المستخدم نهائياً."));

    } catch (error: any) {
      console.error(error);
      alert("❌ " + error.message);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`هل تريد إرسال رابط إعادة تعيين كلمة المرور إلى ${email}؟`)) return;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) alert("خطأ: " + error.message);
    else alert("تم إرسال رابط إعادة التعيين إلى بريد المستخدم.");
  };

  const handleDirectEmail = (clientEmail: string, clientName: string) => {
      const subject = encodeURIComponent("تواصل من إدارة منصة سيّر");
      const body = encodeURIComponent(`مرحباً ${clientName}،\n\nنحن فريق الدعم في منصة سيّر، ونتواصل معك بخصوص...\n\n`);
      window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <header className="flex justify-between items-center mb-8">
          <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
              <Users className="text-[#C89B3C]" /> إدارة {typeFilter === 'clients' ? 'العملاء' : 'مزودي الخدمة'}
              </h1>
              <p className="text-white/60 text-sm">متابعة {typeFilter === 'clients' ? 'السياح والزوار' : 'أصحاب الخدمات'} المسجلين في المنصة.</p>
          </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div 
            onClick={() => setTypeFilter('clients')}
            className={`cursor-pointer border p-6 rounded-2xl flex items-center justify-between transition-all duration-300 ${typeFilter === 'clients' ? 'bg-linear-to-br from-blue-500/20 to-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
              <div>
                  <p className={`text-sm font-bold mb-1 ${typeFilter === 'clients' ? 'text-blue-400' : 'text-gray-400'}`}>العملاء النشطين (الفعليين)</p>
                  <h2 className="text-4xl font-bold text-white">{stats.activeClients}</h2>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${typeFilter === 'clients' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/50'}`}>
                  <Users size={24} />
              </div>
          </div>

          <div 
            onClick={() => setTypeFilter('providers')}
            className={`cursor-pointer border p-6 rounded-2xl flex items-center justify-between transition-all duration-300 ${typeFilter === 'providers' ? 'bg-linear-to-br from-purple-500/20 to-purple-600/10 border-purple-500 ring-1 ring-purple-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
              <div>
                  <p className={`text-sm font-bold mb-1 ${typeFilter === 'providers' ? 'text-purple-400' : 'text-gray-400'}`}>مزودي الخدمة النشطين</p>
                  <h2 className="text-4xl font-bold text-white">{stats.activeProviders}</h2>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${typeFilter === 'providers' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-white/50'}`}>
                  <Briefcase size={24} />
              </div>
          </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 text-white/40" size={20} />
          <input 
            type="text" placeholder="بحث بالاسم، الإيميل، أو الجوال..." 
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-[#C89B3C] outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${statusFilter === 'all' ? "bg-[#C89B3C] text-black font-bold" : "bg-black/20 text-white/60"}`}><Filter size={16}/> الكل</button>
          <button onClick={() => setStatusFilter('active')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${statusFilter === 'active' ? "bg-emerald-500 text-white" : "bg-black/20 text-white/60"}`}><CheckCircle size={16}/> نشط</button>
          <button onClick={() => setStatusFilter('inactive')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${statusFilter === 'inactive' ? "bg-orange-500 text-white" : "bg-black/20 text-white/60"}`}><Clock size={16}/> خامل (30+ يوم)</button>
          <button onClick={() => setStatusFilter('banned')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${statusFilter === 'banned' ? "bg-red-500 text-white" : "bg-black/20 text-white/60"}`}><Ban size={16}/> محظور</button>
          <button onClick={() => setStatusFilter('deleted')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${statusFilter === 'deleted' ? "bg-gray-600 text-white" : "bg-black/20 text-white/60"}`}><Trash2 size={16}/> محذوف</button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl min-h-100">
        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
        ) : displayedUsers.length === 0 ? (
          <div className="p-20 text-center text-white/40 flex flex-col items-center">
              <Search size={40} className="mb-4 opacity-20"/>
              لا يوجد مستخدمين مطابقين للبحث أو الفلتر.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right min-w-250">
              <thead className="bg-black/20 text-white/50 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">المستخدم</th>
                  <th className="px-6 py-4">بيانات التواصل</th>
                  <th className="px-6 py-4">تاريخ الانضمام</th>
                  <th className="px-6 py-4">آخر ظهور</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {displayedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${user.is_banned ? 'bg-red-500/20 text-red-500' : 'bg-[#C89B3C]/20 text-[#C89B3C]'}`}>
                          {user.full_name ? user.full_name.charAt(0) : <UserCheck size={18}/>}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                              {user.full_name || "مستخدم بدون اسم"}
                              {user.is_deleted && <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-600 font-bold">محذوف</span>}
                              {user.is_provider && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">مزود</span>}
                          </div>
                          <div className="text-xs text-white/40 font-mono">ID: {user.id.slice(0, 6)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-white/80 text-xs"><Mail size={14} className="text-[#C89B3C]" /> {user.email}</div>
                      <div className="flex items-center gap-2 text-white/60 text-xs"><Phone size={14} /> {user.phone || "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-white/50 text-xs">
                      <div className="flex items-center gap-2"><Calendar size={14} /> {new Date(user.created_at).toLocaleDateString('ar-SA')}</div>
                    </td>
                    <td className="px-6 py-4 text-white/50 text-xs">
                      <div className="flex items-center gap-2">
                          <Clock size={14} className="text-white/30"/> 
                          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ar-SA') : 'غير معروف'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_deleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs border border-gray-600">
                              <Trash2 size={12}/> مؤرشف
                          </span>
                      ) : user.is_banned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                              <Ban size={12}/> محظور
                          </span>
                      ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                              <CheckCircle size={12}/> نشط
                          </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                              onClick={() => handleDirectEmail(user.email, user.full_name || "العميل")} 
                              title="مراسلة عبر الإيميل" 
                              className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition"
                          >
                              <Send size={16} />
                          </button>
                          <button onClick={() => setSelectedUser(user)} title="عرض التفاصيل" className="p-2 bg-white/5 hover:bg-white/10 text-blue-400 rounded-lg transition"><Eye size={16} /></button>
                          <button onClick={() => handleResetPassword(user.email)} title="إرسال رابط استعادة كلمة المرور" className="p-2 bg-white/5 hover:bg-white/10 text-yellow-400 rounded-lg transition"><KeyRound size={16} /></button>
                          <button 
                              onClick={() => handleToggleBan(user.id, user.is_banned, user.full_name || "المستخدم")} 
                              title={user.is_banned ? "فك الحظر" : "حظر"} 
                              className={`p-2 bg-white/5 hover:bg-white/10 rounded-lg transition ${user.is_banned ? "text-emerald-400" : "text-orange-400"}`}
                          >
                              {user.is_banned ? <CheckCircle size={16}/> : <Ban size={16}/>}
                          </button>
                          <button onClick={() => handleDeleteUser(user.id, user.full_name || "المستخدم")} title="حذف نهائي" className="p-2 bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-500 rounded-lg transition"><Trash2 size={16} /></button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: User Details */}
      {selectedUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#252525] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-bold flex items-center gap-2"><User size={20} className="text-[#C89B3C]"/> تفاصيل المستخدم</h3>
                    <button onClick={() => setSelectedUser(null)} className="text-white/50 hover:text-white"><XCircle size={24}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C] text-2xl font-bold">
                            {selectedUser.full_name ? selectedUser.full_name.charAt(0) : "م"}
                        </div>
                        <div>
                            <h4 className="text-xl font-bold">{selectedUser.full_name || "بدون اسم"}</h4>
                            <p className="text-sm text-white/50">{selectedUser.is_provider ? 'مزود خدمة' : 'سائح/زائر'}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                            <label className="text-xs text-white/40 block mb-1">البريد الإلكتروني</label>
                            <div className="text-sm select-all dir-ltr text-left">{selectedUser.email}</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                            <label className="text-xs text-white/40 block mb-1">رقم الجوال</label>
                            <div className="text-sm select-all dir-ltr text-left">{selectedUser.phone || "غير مسجل"}</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                            <label className="text-xs text-white/40 block mb-1">تاريخ الانضمام</label>
                            <div className="text-sm">{new Date(selectedUser.created_at).toLocaleDateString('ar-SA')}</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                            <label className="text-xs text-white/40 block mb-1">آخر ظهور</label>
                            <div className="text-sm">{selectedUser.last_sign_in_at ? new Date(selectedUser.last_sign_in_at).toLocaleDateString('ar-SA') : 'غير معروف'}</div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end gap-2">
                    <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">إغلاق</button>
                    <button onClick={() => handleDirectEmail(selectedUser.email, selectedUser.full_name || "العميل")} className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-sm transition border border-indigo-500/20 flex items-center gap-1">
                        <Send size={14}/> مراسلة
                    </button>
                    <button onClick={() => handleDeleteUser(selectedUser.id, selectedUser.full_name || "المستخدم")} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-sm transition border border-red-500/20">حذف الحساب</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}