"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, Lock, Save, Loader2, ArrowRight } from "lucide-react";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [accountInfo, setAccountInfo] = useState({ fullName: "", email: "" });
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });

  useEffect(() => {
    const fetchAccountInfo = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
            setAccountInfo({ 
                fullName: profile?.full_name || "المسؤول", 
                email: session.user.email || "" 
            });
        }
        setLoading(false);
    };
    fetchAccountInfo();
  }, []);

  const handleUpdatePassword = async () => {
    if (!passwords.newPassword) return alert("الرجاء إدخال كلمة المرور الجديدة.");
    if (passwords.newPassword !== passwords.confirmPassword) return alert("كلمات المرور غير متطابقة!");
    if (passwords.newPassword.length < 6) return alert("كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.");

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      alert("✅ تم تغيير كلمة المرور بنجاح!");
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      alert("❌ حدث خطأ: " + error.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8"/></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl pb-10">
      <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/admin/settings")} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition"><ArrowRight size={20} /></button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><User className="text-[#C89B3C]"/> إعدادات حسابي</h1>
      </div>

      <section className="bg-white/5 border border-white/10 p-8 rounded-3xl">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
                <label className="block text-white/60 mb-2 text-sm">اسم المسؤول</label>
                <input type="text" value={accountInfo.fullName} disabled className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white/50 outline-none cursor-not-allowed font-bold" />
            </div>
            <div>
                <label className="block text-white/60 mb-2 text-sm">البريد الإلكتروني</label>
                <input type="email" value={accountInfo.email} disabled className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white/50 outline-none cursor-not-allowed font-mono dir-ltr text-left" />
            </div>
        </div>

        <div className="border-t border-white/10 pt-8">
            <h3 className="text-[#C89B3C] font-bold mb-6 flex items-center gap-2"><Lock size={18}/> تغيير كلمة المرور</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <label className="block text-white/60 mb-2 text-sm">كلمة المرور الجديدة</label>
                <input 
                    type="password" 
                    value={passwords.newPassword} 
                    onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#C89B3C] transition dir-ltr text-left" 
                    placeholder="••••••••"
                />
                </div>
                <div>
                <label className="block text-white/60 mb-2 text-sm">تأكيد كلمة المرور الجديدة</label>
                <input 
                    type="password" 
                    value={passwords.confirmPassword} 
                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#C89B3C] transition dir-ltr text-left" 
                    placeholder="••••••••"
                />
                </div>
            </div>
            
            <div className="mt-8 flex justify-end">
                <button onClick={handleUpdatePassword} disabled={updatingPassword} className="bg-[#C89B3C] text-[#2B1F17] font-bold py-3 px-8 rounded-xl hover:bg-[#b88a2c] transition flex items-center gap-2 shadow-lg">
                {updatingPassword ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                تحديث كلمة المرور
                </button>
            </div>
        </div>

      </section>
    </div>
  );
}