"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Save, Loader2, Lock, User, Globe, ToggleLeft, ToggleRight, LogOut, Briefcase,
  MapPin, Tag, Plus, Trash2, ArrowRight, Menu, X, Home, Server, Key
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); 

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  // --- حالات البيانات ---
  const [profile, setProfile] = useState({ id: "", full_name: "", phone: "", email: "" });
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  
  // إعدادات التطبيق والمفاتيح
  const [appSettings, setAppSettings] = useState({
    maintenance_mode: false,
    payment_mode: 'test', // 'test' or 'live'
    support_phone: "",
    support_email: "",
    moyasar_key: "",
    gemini_key: "",
    resend_key: ""
  });
  
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCity, setNewCity] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [catType, setCatType] = useState("place");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // 1. الملف الشخصي
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (myProfile) setProfile(myProfile as any);

      // 2. إعدادات المنصة والمفاتيح
      const { data: settingsData } = await supabase.from('platform_settings').select('*');
      if (settingsData) {
        const newSettings: any = {};
        settingsData.forEach(item => {
            if (item.key === 'maintenance_mode') newSettings[item.key] = item.value === 'true';
            else newSettings[item.key] = item.value;
        });
        setAppSettings(prev => ({ ...prev, ...newSettings }));
      }

      // 3. المدن والتصنيفات
      const { data: citiesData } = await supabase.from('cities').select('*').order('created_at', { ascending: true });
      if (citiesData) setCities(citiesData);

      const { data: catData } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (catData) setCategories(catData);
    }
    setLoading(false);
  };

  // --- حفظ الإعدادات العامة والمفاتيح ---
  const handleSaveAppSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'maintenance_mode', value: String(appSettings.maintenance_mode) },
        { key: 'payment_mode', value: appSettings.payment_mode },
        { key: 'support_phone', value: appSettings.support_phone },
        { key: 'support_email', value: appSettings.support_email },
        { key: 'moyasar_key', value: appSettings.moyasar_key },
        { key: 'gemini_key', value: appSettings.gemini_key },
        { key: 'resend_key', value: appSettings.resend_key },
      ];
      const { error } = await supabase.from('platform_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      alert("✅ تم حفظ الإعدادات والمفاتيح بنجاح");
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: profile.full_name, phone: profile.phone }).eq('id', profile.id);
      if (error) throw error;
      alert("✅ تم تحديث بياناتك بنجاح");
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) return alert("كلمة المرور يجب أن تكون 6 خانات على الأقل");
    if (passwords.newPassword !== passwords.confirmPassword) return alert("كلمتا المرور غير متطابقتين");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      alert("✅ تم تغيير كلمة المرور بنجاح");
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCity = async () => {
    if (!newCity.trim()) return;
    const { data, error } = await supabase.from('cities').insert([{ name: newCity }]).select();
    if (!error && data) {
      setCities([...cities, data[0]]);
      setNewCity("");
    }
  };

  const handleDeleteCity = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المدينة؟")) return;
    const { error } = await supabase.from('cities').delete().eq('id', id);
    if (!error) setCities(cities.filter(c => c.id !== id));
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const { data, error } = await supabase.from('categories').insert([{ name: newCategory, type: catType }]).select();
    if (!error && data) {
      setCategories([...categories, data[0]]);
      setNewCategory("");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) setCategories(categories.filter(c => c.id !== id));
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  return (
    <main dir="rtl" className={`min-h-screen bg-[#1a1a1a] text-white relative ${tajawal.className}`}>
      
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => router.push('/admin/dashboard')} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]">
          <ArrowRight size={24} />
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

      <div className="p-6 lg:p-10 pt-24 md:pt-10">
        <header className="hidden md:flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Settings className="text-[#C89B3C]" /> الإعدادات العامة
                </h1>
                <p className="text-white/60">التحكم الشامل في المنصة والربط التقني.</p>
            </div>
            <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition" title="الموقع الرئيسي">
                <Home size={20} className="text-white/70" />
            </Link>
        </header>

        {loading ? (
           <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>
        ) : (
          <div>
            {/* Tabs Navigation */}
            <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
              <button onClick={() => setActiveTab('general')} className={`px-6 py-2 rounded-full whitespace-nowrap transition ${activeTab === 'general' ? 'bg-[#C89B3C] text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>إعدادات التطبيق</button>
              <button onClick={() => setActiveTab('integrations')} className={`px-6 py-2 rounded-full whitespace-nowrap transition ${activeTab === 'integrations' ? 'bg-[#C89B3C] text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>الربط والتقنية</button>
              <button onClick={() => setActiveTab('categories')} className={`px-6 py-2 rounded-full whitespace-nowrap transition ${activeTab === 'categories' ? 'bg-[#C89B3C] text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>المدن والتصنيفات</button>
              <button onClick={() => setActiveTab('account')} className={`px-6 py-2 rounded-full whitespace-nowrap transition ${activeTab === 'account' ? 'bg-[#C89B3C] text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>حسابي والأمان</button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              
              {/* === TAB 1: GENERAL SETTINGS === */}
              {activeTab === 'general' && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-3xl">
                   <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Globe className="text-[#C89B3C]" size={20} /> حالة التطبيق
                    </h3>
                    <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                      <span className={`text-sm font-bold ${appSettings.maintenance_mode ? "text-red-400" : "text-emerald-400"}`}>
                        {appSettings.maintenance_mode ? "وضع الصيانة مفعل ⚠️" : "التطبيق يعمل ✅"}
                      </span>
                      <button onClick={() => setAppSettings(prev => ({...prev, maintenance_mode: !prev.maintenance_mode}))} className="text-white/60 hover:text-white transition">
                        {appSettings.maintenance_mode ? <ToggleRight size={30} className="text-red-500"/> : <ToggleLeft size={30} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs text-white/60 mb-1 block">رقم الدعم الفني</label>
                        <input type="text" value={appSettings.support_phone} onChange={e => setAppSettings({...appSettings, support_phone: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" dir="ltr" />
                      </div>
                      <div>
                        <label className="text-xs text-white/60 mb-1 block">بريد الدعم</label>
                        <input type="text" value={appSettings.support_email} onChange={e => setAppSettings({...appSettings, support_email: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" dir="ltr" />
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button onClick={handleSaveAppSettings} disabled={saving} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition flex items-center gap-2">
                        {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> حفظ التغييرات</>}
                    </button>
                  </div>
                </div>
              )}

              {/* === TAB 2: INTEGRATIONS & SYSTEM CONTROL === */}
              {activeTab === 'integrations' && (
                <div className="space-y-8">
                    
                    {/* 1. التحكم في وضع النظام (تجريبي / حي) */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-6 text-[#C89B3C] border-b border-white/10 pb-4">
                            <Server size={24} /> 
                            <div>
                                <h2 className="text-xl font-bold">حالة النظام وبوابة الدفع</h2>
                                <p className="text-xs text-white/50 font-normal">اختر "وضع التجربة" لاختبار النظام بدون دفع حقيقي.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${appSettings.payment_mode === 'live' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`}></div>
                                <div>
                                    <h4 className="font-bold text-white">{appSettings.payment_mode === 'live' ? 'النظام في الوضع الحي (Live)' : 'النظام في وضع التجربة (Test Mode)'}</h4>
                                    <p className="text-xs text-white/50">{appSettings.payment_mode === 'live' ? 'يتم خصم مبالغ حقيقية عبر ميسر.' : 'يتم محاكاة الدفع والقبول تلقائياً.'}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setAppSettings(prev => ({...prev, payment_mode: prev.payment_mode === 'live' ? 'test' : 'live'}))}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${appSettings.payment_mode === 'live' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                            >
                                {appSettings.payment_mode === 'live' ? 'تحويل للتجربة' : 'تفعيل الإطلاق (Live)'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                                <label className="font-bold text-white flex items-center gap-2 mb-2"><Key size={16}/> مفتاح ميسر (Moyasar API Key)</label>
                                <input type="password" value={appSettings.moyasar_key} onChange={e => setAppSettings({...appSettings, moyasar_key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none font-mono text-sm" placeholder="sk_live_..." />
                            </div>
                            <div className="flex justify-end">
                                <button onClick={handleSaveAppSettings} disabled={saving} className="px-6 py-2 bg-[#C89B3C] text-black font-bold rounded-xl hover:bg-[#b38a35] transition flex items-center gap-2">
                                    {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> حفظ الإعدادات</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2. منطقة الخطر (حذف البيانات الوهمية) */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4 text-red-400">
                            <ShieldAlert size={24} /> 
                            <h2 className="text-xl font-bold">منطقة الخطر</h2>
                        </div>
                        <p className="text-white/70 text-sm mb-6 leading-relaxed">
                            هذا الزر يقوم بمسح <strong>جميع الحجوزات، المدفوعات، والسجلات المالية</strong> من قاعدة البيانات.
                            <br/> استخدم هذا الزر فقط عندما تريد تنظيف المنصة من البيانات التجريبية قبل الإطلاق الرسمي.
                            <br/> <span className="text-red-400 font-bold">ملاحظة: لا يتم حذف المستخدمين أو الخدمات.</span>
                        </p>
                        <button 
                            onClick={async () => {
                                if(confirm("⚠️ تحذير نهائي: هل أنت متأكد من حذف جميع بيانات العمليات والحجوزات؟ لا يمكن التراجع عن هذا الإجراء.")) {
                                    setSaving(true);
                                    const { error } = await supabase.rpc('wipe_system_data'); // استدعاء دالة قاعدة البيانات
                                    if(error) alert("خطأ: " + error.message);
                                    else alert("✅ تم تنظيف النظام بنجاح وأصبح جاهزاً للبيانات الحقيقية.");
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                            className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin"/> : <><Trash2 size={18}/> حذف جميع البيانات الوهمية (Reset System)</>}
                        </button>
                    </div>
                </div>
              )}

              {/* === TAB 3: CATEGORIES & CITIES === */}
              {activeTab === 'categories' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Cities */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6 text-[#C89B3C] border-b border-white/10 pb-4">
                      <MapPin size={24} /> <h2 className="text-xl font-bold">مدن ومحافظات عسير</h2>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <input type="text" placeholder="اسم المدينة..." className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-[#C89B3C]" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
                      <button onClick={handleAddCity} disabled={!newCity.trim()} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg font-bold hover:bg-[#b38a35] disabled:opacity-50"><Plus size={20} /></button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pl-2 custom-scrollbar">
                      {cities.map((city) => (
                        <div key={city.id} className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl border border-white/5 group hover:border-white/20 transition">
                          <span>{city.name}</span>
                          <button onClick={() => handleDeleteCity(city.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition hover:text-red-300"><Trash2 size={18} /></button>
                        </div>
                      ))}
                      {cities.length === 0 && <p className="text-white/30 text-center py-4">لا توجد مدن مضافة.</p>}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6 text-emerald-400 border-b border-white/10 pb-4">
                      <Tag size={24} /> <h2 className="text-xl font-bold">تصنيفات المعالم والخدمات</h2>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <input type="text" placeholder="اسم التصنيف..." className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-emerald-400" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                        <button onClick={handleAddCategory} disabled={!newCategory.trim()} className="bg-emerald-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-emerald-600 disabled:opacity-50"><Plus size={20} /></button>
                    </div>
                    <div className="flex gap-4 mb-6 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" checked={catType === 'place'} onChange={() => setCatType('place')} className="accent-emerald-500"/><span className="text-white/70">تصنيف معلم</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" checked={catType === 'service'} onChange={() => setCatType('service')} className="accent-emerald-500"/><span className="text-white/70">تصنيف خدمة</span></label>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pl-2 custom-scrollbar">
                      {categories.map((cat) => (
                        <div key={cat.id} className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl border border-white/5 group hover:border-white/20 transition">
                          <div className="flex items-center gap-2">
                            <span>{cat.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded ${cat.type === 'place' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>{cat.type === 'place' ? 'معلم' : 'خدمة'}</span>
                          </div>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition hover:text-red-300"><Trash2 size={18} /></button>
                        </div>
                      ))}
                      {categories.length === 0 && <p className="text-white/30 text-center py-4">لا توجد تصنيفات مضافة.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB 3: ACCOUNT & SECURITY === */}
              {activeTab === 'account' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-white/10"><User className="text-[#C89B3C]" size={20} /> بياناتي الشخصية</h3>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div><label className="text-xs text-white/60 mb-1 block">الاسم الكامل</label><input type="text" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" /></div>
                      <div><label className="text-xs text-white/60 mb-1 block">رقم الجوال</label><input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" /></div>
                      <div><label className="text-xs text-white/60 mb-1 block">البريد الإلكتروني</label><input disabled type="email" value={profile.email} className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed" /></div>
                      <button type="submit" disabled={saving} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition flex justify-center gap-2 mt-2">{saving ? <Loader2 className="animate-spin"/> : "حفظ البيانات"}</button>
                    </form>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 pb-4 border-b border-white/10"><Lock className="text-[#C89B3C]" size={20} /> الأمان وكلمة المرور</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div><label className="text-xs text-white/60 mb-1 block">كلمة المرور الجديدة</label><input required type="password" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" placeholder="******" /></div>
                      <div><label className="text-xs text-white/60 mb-1 block">تأكيد كلمة المرور</label><input required type="password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" placeholder="******" /></div>
                      <button type="submit" disabled={saving} className="w-full py-3 bg-[#C89B3C] hover:bg-[#b38a35] text-[#2B1F17] font-bold rounded-xl transition flex justify-center gap-2 mt-4">{saving ? <Loader2 className="animate-spin"/> : "تحديث كلمة المرور"}</button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </main>
  );
}