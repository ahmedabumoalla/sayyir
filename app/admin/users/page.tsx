"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  Shield, UserPlus, Loader2, LogOut, LayoutDashboard, Settings, 
  Users, Map, DollarSign, Activity, X, Check, Lock, Briefcase, ShieldAlert,
  Trash2, Ban, Unlock
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

// تعريف الصلاحيات المتاحة (محدثة وشاملة)
const ALL_PERMISSIONS = [
  {
    category: "إدارة المستخدمين",
    icon: Users,
    items: [
      { key: "users_view", label: "مشاهدة قائمة المستخدمين" },
      { key: "users_manage", label: "حظر/تفعيل المستخدمين" }, // للأدمن العادي
      { key: "users_delete", label: "حذف المستخدمين نهائياً" }, // خطير
    ]
  },
  {
    category: "طلبات الانضمام والمزودين",
    icon: Briefcase,
    items: [
      { key: "requests_view", label: "مشاهدة الطلبات" },
      { key: "requests_approve", label: "قبول/رفض الطلبات" },
      { key: "providers_manage", label: "إدارة بيانات المزودين" },
    ]
  },
  {
    category: "المعالم والمحتوى",
    icon: Map,
    items: [
      { key: "landmarks_add", label: "إضافة معلم جديد" },
      { key: "landmarks_edit", label: "تعديل وحذف المعالم" },
      { key: "content_moderation", label: "حذف التعليقات المسيئة" },
    ]
  },
  {
    category: "المالية والأرباح",
    icon: DollarSign,
    items: [
      { key: "finance_view", label: "الاطلاع على الأرباح والداشبورد المالي" },
      { key: "payouts_approve", label: "اعتماد طلبات السحب" },
      { key: "refunds_manage", label: "إجراء عمليات الاسترداد" },
    ]
  },
  {
    category: "النظام والإعدادات",
    icon: ShieldAlert,
    items: [
      { key: "logs_view", label: "مشاهدة سجلات النشاط" },
      { key: "settings_manage", label: "تغيير إعدادات المنصة العامة" },
      { key: "admins_manage", label: "إدارة فريق العمل (للسوبر أدمن فقط)" }, // عادة للسوبر فقط
    ]
  }
];

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_blocked: boolean; // ✅ أضفنا حالة الحظر
  permissions?: any; 
}

export default function UsersManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", phone: "" });
  const [processingId, setProcessingId] = useState<string | null>(null); // للعمليات

  const [selectedAdmin, setSelectedAdmin] = useState<Profile | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<string, boolean>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setCurrentUserId(session.user.id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_admin', true) 
      .order('created_at', { ascending: false });

    if (profiles) {
      setAdmins(profiles as Profile[]);
      const myProfile = profiles.find((p: any) => p.id === session.user.id);
      if (myProfile && myProfile.is_super_admin) setIsSuperAdmin(true);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, requesterId: currentUserId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      alert(`✅ تم إضافة المسؤول بنجاح.`);
      setNewUser({ fullName: "", email: "", phone: "" });
      fetchAdmins();
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  // --- دالة الحذف ---
  const handleDeleteAdmin = async (targetId: string) => {
    if (!confirm("⚠️ هل أنت متأكد من حذف هذا الأدمن نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    setProcessingId(targetId);
    try {
        const res = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ targetUserId: targetId, requesterId: currentUserId })
        });
        if (!res.ok) throw new Error("فشل الحذف");
        alert("✅ تم حذف المسؤول بنجاح");
        fetchAdmins();
    } catch (e) {
        alert("فشل الحذف، تأكد من الصلاحيات");
    } finally {
        setProcessingId(null);
    }
  };

  // --- دالة الحظر/فك الحظر ---
  const handleToggleBlock = async (admin: Profile) => {
    const action = admin.is_blocked ? "فك الحظر" : "حظر";
    if (!confirm(`هل تريد ${action} عن ${admin.full_name}؟\n(لن يتمكن من الدخول للمنصة في حال الحظر)`)) return;
    
    setProcessingId(admin.id);
    try {
        const res = await fetch('/api/admin/toggle-block', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ targetUserId: admin.id, requesterId: currentUserId, block: !admin.is_blocked })
        });
        if (!res.ok) throw new Error("فشل التعديل");
        alert(`✅ تم ${action} بنجاح`);
        fetchAdmins();
    } catch (e) {
        alert("حدث خطأ أثناء تغيير الحالة");
    } finally {
        setProcessingId(null);
    }
  };

  const openPermissionsModal = (admin: Profile) => {
    setSelectedAdmin(admin);
    setTempPermissions(admin.permissions || {});
  };

  const togglePermission = (key: string) => {
    setTempPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePermissions = async () => {
    if (!selectedAdmin) return;
    setSavingPermissions(true);
    try {
      const res = await fetch('/api/admin/update-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetUserId: selectedAdmin.id, 
          permissions: tempPermissions,
          requesterId: currentUserId 
        })
      });
      if (!res.ok) throw new Error("فشل التحديث");

      alert("✅ تم تحديث الصلاحيات بنجاح");
      setSelectedAdmin(null);
      fetchAdmins(); 

    } catch (error: any) {
      alert("خطأ: " + error.message);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

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
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className}`}>
      
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-black/40 border-l border-white/10 p-6 backdrop-blur-md">
        <div className="mb-10 flex justify-center pt-4">
          <Image src="/logo.png" alt="Sayyir Admin" width={120} height={50} priority className="opacity-90" />
        </div>
        <nav className="space-y-2 flex-1">
          {menuItems.map((item, i) => item.show && (
            <Link key={i} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}>
              <item.icon size={20} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 transition w-full px-2">
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen relative">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="text-[#C89B3C]" />
            فريق الإدارة والصلاحيات
          </h1>
          <p className="text-white/60">أضف مسؤولين جدد للنظام وحدد صلاحياتهم بدقة.</p>
        </header>

        {isSuperAdmin && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-6 mb-10 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-[#C89B3C]" />
              إضافة مسؤول جديد
            </h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs text-white/70">الاسم الكامل</label>
                <input required type="text" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/70">البريد الإلكتروني</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/70">رقم الجوال</label>
                <input required type="tel" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" />
              </div>
              <button type="submit" disabled={creating} className="bg-[#C89B3C] text-[#2B1F17] font-bold py-3 px-6 rounded-xl hover:bg-[#b38a35] transition flex items-center justify-center gap-2">
                {creating ? <Loader2 className="animate-spin" /> : "إرسال الدعوة"}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
            <h3 className="font-bold text-white">قائمة المسؤولين</h3>
            <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/60">{admins.length} عضو</span>
          </div>

          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8" /></div>
          ) : (
            <table className="w-full text-right">
              <thead className="bg-black/20 text-white/50 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">الاسم</th>
                  <th className="px-6 py-4">التواصل</th>
                  <th className="px-6 py-4">الدور الحالي</th>
                  {isSuperAdmin && <th className="px-6 py-4 text-center">التحكم</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {admins.map((user) => (
                  <tr key={user.id} className={`hover:bg-white/5 transition ${user.is_blocked ? 'bg-red-500/5' : ''}`}>
                    <td className="px-6 py-4 font-bold flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C89B3C]/20 to-white/5 flex items-center justify-center text-[#C89B3C] font-bold border border-[#C89B3C]/30">
                        {user.full_name?.charAt(0) || "A"}
                      </div>
                      <div>
                        <div className="text-white flex items-center gap-2">
                            {user.full_name}
                            {user.is_blocked && <span className="text-[10px] bg-red-500 text-white px-1.5 rounded">محظور</span>}
                        </div>
                        {user.id === currentUserId && <span className="text-[10px] text-[#C89B3C]">(حسابك)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white/80">{user.email}</div>
                      <div className="text-white/40 text-xs font-mono">{user.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_super_admin ? <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">سوبر أدمن ⚡</span> : <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20">أدمن 🛡️</span>}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                            
                            {/* زر تعديل الصلاحيات */}
                            <button 
                              disabled={user.is_super_admin || processingId === user.id}
                              onClick={() => openPermissionsModal(user)}
                              className={`p-2 rounded-lg border transition ${user.is_super_admin ? "opacity-30 border-transparent" : "bg-white/5 border-white/10 text-white hover:border-[#C89B3C] hover:text-[#C89B3C]"}`}
                              title="تعديل الصلاحيات"
                            >
                              <Settings size={16} />
                            </button>

                            {/* زر الحظر/فك الحظر */}
                            <button 
                              disabled={user.is_super_admin || processingId === user.id}
                              onClick={() => handleToggleBlock(user)}
                              className={`p-2 rounded-lg border transition ${user.is_super_admin ? "opacity-30 border-transparent" : user.is_blocked ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white" : "bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white"}`}
                              title={user.is_blocked ? "فك الحظر" : "حظر المستخدم"}
                            >
                                {processingId === user.id ? <Loader2 size={16} className="animate-spin"/> : user.is_blocked ? <Unlock size={16}/> : <Ban size={16} />}
                            </button>

                            {/* زر الحذف */}
                            <button 
                              disabled={user.is_super_admin || processingId === user.id}
                              onClick={() => handleDeleteAdmin(user.id)}
                              className={`p-2 rounded-lg border transition ${user.is_super_admin ? "opacity-30 border-transparent" : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"}`}
                              title="حذف نهائي"
                            >
                              {processingId === user.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />}
                            </button>

                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#2B2B2B] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Lock size={20} className="text-[#C89B3C]" /> تعديل صلاحيات: {selectedAdmin.full_name}</h3>
                  <p className="text-xs text-white/50 mt-1">حدد الإجراءات المسموح لهذا المسؤول القيام بها.</p>
                </div>
                <button onClick={() => setSelectedAdmin(null)} className="text-white/50 hover:text-white transition"><X size={24} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {ALL_PERMISSIONS.map((group, idx) => {
                    const GroupIcon = group.icon;
                    return (
                      <div key={idx} className="bg-black/20 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 mb-4 text-[#C89B3C] font-bold pb-2 border-b border-white/5"><GroupIcon size={18} /> {group.category}</div>
                        <div className="space-y-3">
                          {group.items.map((item) => {
                            const isChecked = tempPermissions[item.key] || false;
                            return (
                              <label key={item.key} className="flex items-center justify-between cursor-pointer group hover:bg-white/5 p-2 rounded-lg transition">
                                <span className="text-sm text-white/80 group-hover:text-white transition">{item.label}</span>
                                <div onClick={() => togglePermission(item.key)} className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${isChecked ? 'bg-[#C89B3C]' : 'bg-white/10'}`}>
                                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${isChecked ? '-translate-x-5' : 'translate-x-0'}`} />
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="px-6 py-5 bg-black/20 border-t border-white/10 flex gap-3">
                <button onClick={savePermissions} disabled={savingPermissions} className="flex-1 py-3 rounded-xl bg-[#C89B3C] hover:bg-[#b38a35] text-[#2B1F17] font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-[#C89B3C]/10">
                  {savingPermissions ? <Loader2 className="animate-spin" /> : <><Check size={18} /> حفظ التغييرات</>}
                </button>
                <button onClick={() => setSelectedAdmin(null)} className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition">إلغاء</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}