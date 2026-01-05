"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Save, Loader2, Lock, User, Globe, ToggleLeft, ToggleRight, LogOut, Briefcase,
  MapPin, Tag, Plus, Trash2, ArrowRight, Menu, X, Home
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // 'general' | 'categories' | 'account'

  // حالات القائمة الجانبية للجوال
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  // --- حالات البيانات ---
  const [profile, setProfile] = useState({ id: "", full_name: "", phone: "", email: "" });
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [appSettings, setAppSettings] = useState({
    maintenance_mode: false,
    support_phone: "",
    support_email: ""
  });
  
  // --- حالات التصنيفات والمدن ---
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCity, setNewCity] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [catType, setCatType] = useState("place");

  useEffect(() => {
    checkRole();
    fetchData();
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // 1. الملف الشخصي
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (myProfile) setProfile(myProfile as any);

      // 2. إعدادات المنصة
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

  // --- دوال التحديث ---
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

  const handleSaveAppSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'maintenance_mode', value: String(appSettings.maintenance_mode) },
        { key: 'support_phone', value: appSettings.support_phone },
        { key: 'support_email', value: appSettings.support_email },
      ];
      const { error } = await supabase.from('platform_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      alert("✅ تم حفظ إعدادات المنصة");
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- دوال المدن والتصنيفات ---
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
        <header className="hidden md:flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Settings className="text-[#C89B3C]" /> الإعدادات العامة
                </h1>
                <p className="text-white/60">التحكم في المنصة، التصنيفات، والملف الشخصي.</p>
            </div>
            <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition" title="الموقع الرئيسي">
                <Home size={20} className="text-white/70" />
            </Link>
        </header>

        {/* Mobile Header Title */}
        <div className="md:hidden mb-6">
             <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Settings className="text-[#C89B3C]" size={24} /> الإعدادات العامة
             </h1>
             <p className="text-white/60 text-sm">التحكم في المنصة والملف الشخصي.</p>
        </div>

        {loading ? (
           <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>
        ) : (
          <div>
            {/* Tabs Navigation */}
            <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
              <button onClick={() => setActiveTab('general')} className={`px-6 py-2 rounded-full whitespace-nowrap transition ${activeTab === 'general' ? 'bg-[#C89B3C] text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>إعدادات التطبيق</button>
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
                        <label className="text-xs text-white/60 mb-1 block">رقم الدعم الفني (واتساب)</label>
                        <input type="text" value={appSettings.support_phone} onChange={e => setAppSettings({...appSettings, support_phone: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" dir="ltr" />
                      </div>
                      <div>
                        <label className="text-xs text-white/60 mb-1 block">البريد الإلكتروني للدعم</label>
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

              {/* === TAB 2: CATEGORIES & CITIES === */}
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