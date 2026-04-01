"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Lock, Save, Mail, Phone, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export default function ClientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  
  const [profile, setProfile] = useState({ id: "", full_name: "", email: "", phone: "" });
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (data) {
      setProfile({
        id: session.user.id,
        full_name: data.full_name || "",
        email: session.user.email || "",
        phone: data.phone || "",
      });
    }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!profile.full_name.trim()) return alert("الاسم مطلوب");
    setUpdating(true);

    try {
        // 1. تحديث جدول profiles وحل مشكلة 409 (إذا كان الجوال فارغ يرسله null وليس "")
        const phoneToSave = profile.phone.trim() === "" ? null : profile.phone.trim();
        
        const { error: profileError } = await supabase.from("profiles").update({ 
            full_name: profile.full_name, 
            phone: phoneToSave 
        }).eq("id", profile.id);

        if (profileError) throw profileError;

        // 2. تحديث اسم المستخدم في نظام المصادقة (Auth) بدون رقم الجوال لمنع خطأ 422
        const { error: authError } = await supabase.auth.updateUser({
            data: { full_name: profile.full_name }
        });

        if (authError) throw authError;

        alert("تم تحديث بياناتك بنجاح ✅");
    } catch (err: any) {
        alert("فشل التحديث: " + err.message);
    } finally {
        setUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwords.newPassword.length < 6) return alert("كلمة المرور قصيرة");
    if (passwords.newPassword !== passwords.confirmPassword) return alert("كلمات المرور غير متطابقة");
    setPasswordUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
    if (error) alert("فشل التغيير: " + error.message);
    else { alert("تم تغيير كلمة المرور 🔒"); setPasswords({ newPassword: "", confirmPassword: "" }); }
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
        <div className="bg-[#252525] border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex gap-2"><User className="text-[#C89B3C]" size={20}/> البيانات الشخصية</h3>
          <div className="space-y-4">
            <div><label className="text-sm text-white/60 block mb-1">الاسم الكامل</label><input type="text" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none"/></div>
            <div><label className="text-sm text-white/60 block mb-1">البريد الإلكتروني</label><input disabled type="text" value={profile.email} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"/></div>
            <div><label className="text-sm text-white/60 block mb-1">رقم الجوال</label><input type="text" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none"/></div>
            <button onClick={handleUpdateProfile} disabled={updating} className="w-full bg-[#C89B3C] text-[#2B1F17] py-3 rounded-xl font-bold hover:bg-[#b38a35] transition flex items-center justify-center gap-2">{updating ? <Loader2 className="animate-spin"/> : "حفظ التغييرات"}</button>
          </div>
        </div>

        <div className="bg-[#252525] border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex gap-2"><Lock className="text-red-400" size={20}/> كلمة المرور</h3>
          <div className="space-y-4">
            <div><label className="text-sm text-white/60 block mb-1">كلمة المرور الجديدة</label><input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-400 outline-none" placeholder="******"/></div>
            <div><label className="text-sm text-white/60 block mb-1">تأكيد كلمة المرور</label><input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-400 outline-none" placeholder="******"/></div>
            <button onClick={handleUpdatePassword} disabled={passwordUpdating} className="w-full bg-white/5 text-white py-3 rounded-xl font-bold hover:bg-red-500/10 hover:text-red-400 transition flex items-center justify-center gap-2">{passwordUpdating ? <Loader2 className="animate-spin"/> : "تحديث كلمة المرور"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}