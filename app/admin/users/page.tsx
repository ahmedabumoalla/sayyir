"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Shield, UserPlus, Loader2, Settings, 
  Users, Map, DollarSign, X, Check, Lock, Briefcase, ShieldAlert,
  Trash2, Ban, Unlock
} from "lucide-react";
import { useRouter } from "next/navigation";

const ALL_PERMISSIONS = [
  {
    category: "إدارة المستخدمين",
    icon: Users,
    items: [
      { key: "users_view", label: "مشاهدة قائمة المستخدمين" },
      { key: "users_manage", label: "حظر/تفعيل المستخدمين" },
      { key: "users_delete", label: "حذف المستخدمين نهائياً" },
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
      { key: "admins_manage", label: "إدارة فريق العمل (للسوبر أدمن فقط)" },
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
  is_blocked: boolean;
  is_deleted: boolean;
  permissions?: any; 
}

export default function UsersManagement() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", phone: "" });
  const [processingId, setProcessingId] = useState<string | null>(null);

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

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_admin', true) 
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching admins:", error);
    } else if (profiles) {
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
      if (!res.ok) throw new Error(result.error || "حدث خطأ أثناء الإرسال");

      // تحديث البروفايل في حال تم إنشاء الحساب بنجاح
      await supabase
        .from('profiles')
        .update({ 
            is_admin: true, 
            full_name: newUser.fullName, 
            phone: newUser.phone 
        })
        .eq('email', newUser.email);

      alert(`✅ تم إرسال الدعوة وإضافة المسؤول بنجاح.`);
      setNewUser({ fullName: "", email: "", phone: "" });
      fetchAdmins();
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAdmin = async (targetId: string) => {
    if (!confirm("⚠️ هل أنت متأكد من حذف هذا الأدمن نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    setProcessingId(targetId);
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ is_deleted: true, is_admin: false, is_super_admin: false })
            .eq('id', targetId);

        if (error) throw error;
        
        alert("✅ تم إزالة المسؤول بنجاح");
        fetchAdmins();
    } catch (e: any) {
        alert("❌ فشل الحذف: " + e.message);
    } finally {
        setProcessingId(null);
    }
  };

  const handleToggleBlock = async (admin: Profile) => {
    const action = admin.is_blocked ? "فك الحظر" : "حظر";
    if (!confirm(`هل تريد ${action} عن ${admin.full_name}؟`)) return;
    
    setProcessingId(admin.id);
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ is_blocked: !admin.is_blocked })
            .eq('id', admin.id);

        if (error) throw error;
        
        alert(`✅ تم ${action} بنجاح`);
        fetchAdmins();
    } catch (e: any) {
        alert("❌ حدث خطأ أثناء تغيير الحالة: " + e.message);
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
      const { error } = await supabase
          .from('profiles')
          .update({ permissions: tempPermissions })
          .eq('id', selectedAdmin.id);

      if (error) throw error;

      alert("✅ تم تحديث الصلاحيات بنجاح");
      setSelectedAdmin(null);
      fetchAdmins(); 
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
            <Shield className="text-[#C89B3C]" />
            فريق الإدارة والصلاحيات
          </h1>
          <p className="text-white/60">أضف مسؤولين جدد للنظام وحدد صلاحياتهم بدقة.</p>
        </header>

        {isSuperAdmin && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10 shadow-lg">
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
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right min-w-[800px]">
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
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[#C89B3C] font-bold border border-white/10 shrink-0">
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
                                
                                <button 
                                disabled={user.is_super_admin || processingId === user.id}
                                onClick={() => openPermissionsModal(user)}
                                className={`p-2 rounded-lg border transition ${user.is_super_admin ? "opacity-30 border-transparent cursor-not-allowed" : "bg-white/5 border-white/10 text-white hover:border-[#C89B3C] hover:text-[#C89B3C]"}`}
                                title="تعديل الصلاحيات"
                                >
                                <Settings size={16} />
                                </button>

                                <button 
                                disabled={user.is_super_admin || processingId === user.id}
                                onClick={() => handleToggleBlock(user)}
                                className={`p-2 rounded-lg border transition ${user.is_super_admin ? "opacity-30 border-transparent cursor-not-allowed" : user.is_blocked ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white" : "bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white"}`}
                                title={user.is_blocked ? "فك الحظر" : "حظر المستخدم"}
                                >
                                    {processingId === user.id ? <Loader2 size={16} className="animate-spin"/> : user.is_blocked ? <Unlock size={16}/> : <Ban size={16} />}
                                </button>

                                <button 
                                disabled={user.is_super_admin || processingId === user.id}
                                onClick={() => handleDeleteAdmin(user.id)}
                                className={`p-2 rounded-lg border transition ${user.is_super_admin ? "opacity-30 border-transparent cursor-not-allowed" : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"}`}
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
            </div>
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
  );
}