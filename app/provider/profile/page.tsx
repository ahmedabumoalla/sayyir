"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Lock, Save, Mail, Phone, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { getProviderClientContext } from "@/lib/providerContextClient";

export default function ProviderProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  
  // بيانات المستخدم
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    phone: "",
  });

  // بيانات تغيير كلمة المرور
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const providerContext = await getProviderClientContext();
    setIsMaintenanceMode(providerContext.isMaintenanceMode);
    if (!providerContext.providerId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", providerContext.providerId)
      .single();

    if (data) {
      setProfile({
        id: providerContext.providerId,
        full_name: data.full_name || "",
        email:
          data.email ||
          (providerContext.isMaintenanceMode
            ? ""
            : providerContext.session?.user?.email || ""),
        phone: data.phone || "",
      });
    }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (isMaintenanceMode) return alert("وضع الصيانة للقراءة والتنقل فقط.");
    if (!profile.full_name.trim()) return alert("الاسم مطلوب");
    setUpdating(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .eq("id", profile.id);

    if (error) {
      alert("فشل التحديث: " + error.message);
    } else {
      alert("تم تحديث بياناتك بنجاح ✅");
    }
    setUpdating(false);
  };

  const handleUpdatePassword = async () => {
    if (isMaintenanceMode) return alert("وضع الصيانة للقراءة والتنقل فقط.");
    if (!passwords.newPassword) return alert("الرجاء إدخال كلمة المرور الجديدة");
    if (passwords.newPassword.length < 6) return alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (passwords.newPassword !== passwords.confirmPassword) return alert("كلمات المرور غير متطابقة");
    
    setPasswordUpdating(true);

    const { error } = await supabase.auth.updateUser({
      password: passwords.newPassword
    });

    if (error) {
      alert("فشل تغيير كلمة المرور: " + error.message);
    } else {
      alert("تم تغيير كلمة المرور بنجاح 🔒");
      setPasswords({ newPassword: "", confirmPassword: "" });
    }
    setPasswordUpdating(false);
  };

  if (loading) return <div className="text-center p-20 text-[#C89B3C]">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">إعدادات الحساب</h1>
        <p className="text-white/50">تحكم في بياناتك الشخصية وإعدادات الأمان.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* كرت المعلومات الشخصية */}
        <div className="bg-[#252525] border border-white/5 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <User className="text-[#C89B3C]" size={20} />
            <h3 className="text-lg font-bold text-white">البيانات الشخصية</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">الاسم الكامل (اسم النشاط)</label>
              <input 
                type="text" 
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none"
              />
            </div>

            <div className="space-y-2 opacity-60">
              <label className="text-sm text-white/70">البريد الإلكتروني</label>
              <input disabled type="text" value={profile.email} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">رقم الجوال</label>
              <input 
                type="text" 
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none"
              />
            </div>

            <button 
              onClick={handleUpdateProfile}
              disabled={isMaintenanceMode || updating}
              className="w-full mt-4 bg-[#C89B3C] text-[#2B1F17] py-3 rounded-xl font-bold hover:bg-[#b38a35] transition flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              <span>حفظ التغييرات</span>
            </button>
          </div>
        </div>

        {/* كرت الأمان */}
        <div className="bg-[#252525] border border-white/5 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <Lock className="text-red-400" size={20} />
            <h3 className="text-lg font-bold text-white">كلمة المرور</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">كلمة المرور الجديدة</label>
              <input 
                type="password" 
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-400 outline-none"
                placeholder="******"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">تأكيد كلمة المرور</label>
              <input 
                type="password" 
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-400 outline-none"
                placeholder="******"
              />
            </div>

            <button 
              onClick={handleUpdatePassword}
              disabled={isMaintenanceMode || passwordUpdating}
              className="w-full mt-4 bg-white/5 text-white py-3 rounded-xl font-bold hover:bg-red-500/10 hover:text-red-400 transition flex items-center justify-center gap-2"
            >
              {passwordUpdating ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
              <span>تحديث كلمة المرور</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
