"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Lock, Save, Mail, Phone, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  
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

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // جلب البيانات من جدول profiles
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setProfile({
        id: session.user.id,
        full_name: data.full_name || "",
        email: session.user.email || "", // الايميل من المصادقة أدق
        phone: data.phone || "",
      });
    }
    setLoading(false);
  };

  // 1. تحديث المعلومات الشخصية
  const handleUpdateProfile = async () => {
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

  // 2. تغيير كلمة المرور
  const handleUpdatePassword = async () => {
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
      setPasswords({ newPassword: "", confirmPassword: "" }); // تفريغ الحقول
    }
    setPasswordUpdating(false);
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <User className="text-[#C89B3C]" />
          إعدادات الحساب
        </h2>
        <p className="text-white/60 text-sm">تحكم في بياناتك الشخصية وإعدادات الأمان.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ================= كرت المعلومات الشخصية ================= */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <div className="p-2 bg-[#C89B3C]/10 rounded-lg text-[#C89B3C]">
              <User size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">البيانات الشخصية</h3>
          </div>

          <div className="space-y-4">
            {/* الاسم الكامل */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">الاسم الكامل</label>
              <input 
                type="text" 
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none transition"
              />
            </div>

            {/* البريد الإلكتروني (للقراءة فقط) */}
            <div className="space-y-2 opacity-60">
              <label className="text-sm text-white/70 flex items-center gap-2">
                البريد الإلكتروني <span className="text-xs text-[#C89B3C]">(لا يمكن تغييره)</span>
              </label>
              <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed">
                <Mail size={18} />
                <span>{profile.email}</span>
              </div>
            </div>

            {/* رقم الجوال */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">رقم الجوال</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="مثال: 055xxxxxxx"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:border-[#C89B3C] outline-none transition"
                />
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              </div>
            </div>

            {/* زر الحفظ */}
            <button 
              onClick={handleUpdateProfile}
              disabled={updating}
              className="w-full mt-4 bg-[#C89B3C] text-[#2B1F17] py-3 rounded-xl font-bold hover:bg-[#b38a35] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {updating ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              <span>حفظ التغييرات</span>
            </button>
          </div>
        </div>


        {/* ================= كرت الأمان وكلمة المرور ================= */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <div className="p-2 bg-red-400/10 rounded-lg text-red-400">
              <Lock size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">الأمان وكلمة المرور</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3 mb-4">
              <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-yellow-200/80 leading-relaxed">
                تأكد من اختيار كلمة مرور قوية تحتوي على أحرف وأرقام لحماية حسابك وحجوزاتك.
              </p>
            </div>

            {/* كلمة المرور الجديدة */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">كلمة المرور الجديدة</label>
              <input 
                type="password" 
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-400 outline-none transition"
              />
            </div>

            {/* تأكيد كلمة المرور */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">تأكيد كلمة المرور</label>
              <input 
                type="password" 
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-400 outline-none transition"
              />
            </div>

            {/* زر تغيير الباسورد */}
            <button 
              onClick={handleUpdatePassword}
              disabled={passwordUpdating}
              className="w-full mt-4 bg-white/10 text-white py-3 rounded-xl font-bold hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-transparent transition flex items-center justify-center gap-2 disabled:opacity-50"
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