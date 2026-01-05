"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Save, Loader2, Lock, User, Globe, ToggleLeft, ToggleRight, LogOut, Briefcase,
  MapPin, Tag, Plus, Trash2, ArrowRight, Menu, X, Home, Server, Key, ListPlus
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); 

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  // --- حالات البيانات (تم إصلاح الأنواع لتجنب الأخطاء) ---
  const [profile, setProfile] = useState<any>({ id: "", full_name: "", phone: "", email: "" });
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  
  // الإعدادات العامة
  const [appSettings, setAppSettings] = useState<any>({
    maintenance_mode: false,
    payment_mode: 'test',
    support_phone: "",
    support_email: ""
  });

  // قائمة إعدادات الربط الديناميكية
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [newIntegration, setNewIntegration] = useState({ key: "", value: "", description: "" });
  
  // حقول الخدمات والمدن والتصنيفات
  const [serviceFields, setServiceFields] = useState<any[]>([]);
  const [newServiceField, setNewServiceField] = useState<any>({ label: "", field_type: "text", options: "", is_required: false });
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
      // 1. البروفايل
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (myProfile) setProfile(myProfile);

      // 2. كل الإعدادات (العامة + الربط)
      const { data: settingsData } = await supabase.from('platform_settings').select('*').order('created_at');
      if (settingsData) {
        // نفصل الإعدادات الأساسية عن مفاتيح الربط
        const coreKeys = ['maintenance_mode', 'payment_mode', 'support_phone', 'support_email'];
        const core: any = {};
        const dyn: any[] = [];

        settingsData.forEach((item: any) => {
            if (coreKeys.includes(item.key)) {
                core[item.key] = item.key === 'maintenance_mode' ? item.value === 'true' : item.value;
            } else {
                dyn.push(item);
            }
        });
        setAppSettings((prev: any) => ({ ...prev, ...core }));
        setIntegrations(dyn);
      }

      // 3. حقول الخدمات (حيث scope = service)
      const { data: sFields } = await supabase.from('registration_fields').select('*').eq('scope', 'service').order('sort_order');
      if (sFields) setServiceFields(sFields);

      // 4. المدن والتصنيفات
      const { data: citiesData } = await supabase.from('cities').select('*').order('created_at');
      if (citiesData) setCities(citiesData);

      const { data: catData } = await supabase.from('categories').select('*').order('created_at');
      if (catData) setCategories(catData);
    }
    setLoading(false);
  };

  // --- دوال الحفظ ---
  const handleSaveGeneral = async () => {
    setSaving(true);
    const updates = [
        { key: 'maintenance_mode', value: String(appSettings.maintenance_mode) },
        { key: 'payment_mode', value: appSettings.payment_mode },
        { key: 'support_phone', value: appSettings.support_phone },
        { key: 'support_email', value: appSettings.support_email },
    ];
    await supabase.from('platform_settings').upsert(updates, { onConflict: 'key' });
    setSaving(false);
    alert("✅ تم حفظ الإعدادات العامة");
  };

  // --- دوال الربط الديناميكي ---
  const handleAddIntegration = async () => {
      if(!newIntegration.key || !newIntegration.value) return alert("المفتاح والقيمة مطلوبة");
      
      const { error } = await supabase.from('platform_settings').upsert([newIntegration], { onConflict: 'key' });
      if(!error) {
          alert("✅ تم إضافة/تحديث مفتاح الربط");
          setNewIntegration({ key: "", value: "", description: "" });
          fetchData();
      } else {
          alert(error.message);
      }
  };

  const handleDeleteIntegration = async (key: string) => {
      if(!confirm("حذف هذا المفتاح؟ قد تتوقف الخدمة المرتبطة به.")) return;
      await supabase.from('platform_settings').delete().eq('key', key);
      fetchData();
  };

  // --- دوال حقول الخدمات ---
  const handleAddServiceField = async () => {
      if(!newServiceField.label) return;
      const optionsArray = newServiceField.options ? newServiceField.options.split(',').map((s: string) => s.trim()) : null;
      
      const { error } = await supabase.from('registration_fields').insert([{
          label: newServiceField.label,
          field_type: newServiceField.field_type,
          options: optionsArray,
          is_required: newServiceField.is_required,
          scope: 'service', // هذا يحدد أن الحقل لصفحة إضافة الخدمة
          sort_order: serviceFields.length + 1
      }]);

      if(!error) {
          setNewServiceField({ label: "", field_type: "text", options: "", is_required: false });
          fetchData();
      }
  };

  const handleDeleteServiceField = async (id: string) => {
      if(!confirm("حذف هذا الحقل؟")) return;
      await supabase.from('registration_fields').delete().eq('id', id);
      fetchData();
  };

  // --- دوال التنظيف والحذف ---
  const handleWipeData = async () => {
      if(confirm("⚠️ تحذير: سيتم حذف جميع الحجوزات والمدفوعات والمفضلة. هل أنت متأكد؟")) {
          setSaving(true);
          const { error } = await supabase.rpc('wipe_system_data');
          setSaving(false);
          if(error) alert("خطأ: " + error.message);
          else alert("✅ تم تنظيف النظام بنجاح.");
      }
  };

  // دوال مساعدة أخرى (البروفايل، المدن، التصنيفات - نفس المنطق السابق)
  const handleUpdateProfile = async (e: any) => { e.preventDefault(); /* ... */ };
  const handleChangePassword = async (e: any) => { e.preventDefault(); /* ... */ };
  const handleAddCity = async () => { /* ... */ };
  const handleDeleteCity = async (id: string) => { /* ... */ };
  const handleAddCategory = async () => { /* ... */ };
  const handleDeleteCategory = async (id: string) => { /* ... */ };
  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  return (
    <main dir="rtl" className={`min-h-screen bg-[#1a1a1a] text-white relative ${tajawal.className}`}>
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => router.push('/admin/dashboard')} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]"><ArrowRight size={24} /></button>
        <Link href="/"><Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" /></Link>
        <div className="relative"><button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10"><User size={20} /></button></div>
      </div>

      <div className="p-6 lg:p-10 pt-24 md:pt-10">
        <header className="hidden md:flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Settings className="text-[#C89B3C]" /> الإعدادات العامة</h1>
            <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-full"><Home size={20} /></Link>
        </header>

        {loading ? <div className="text-center p-20 text-[#C89B3C]"><Loader2 className="animate-spin inline"/></div> : (
          <div>
            <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
              {['integrations', 'services_fields', 'general', 'categories', 'account'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-full whitespace-nowrap transition ${activeTab === tab ? 'bg-[#C89B3C] text-black font-bold' : 'bg-white/5 text-white/60'}`}>
                      {tab === 'integrations' && 'الربط والتقنية'}
                      {tab === 'services_fields' && 'حقول الخدمات'}
                      {tab === 'general' && 'إعدادات التطبيق'}
                      {tab === 'categories' && 'المدن والتصنيفات'}
                      {tab === 'account' && 'حسابي'}
                  </button>
              ))}
            </div>

            {/* === TAB: INTEGRATIONS (الربط الديناميكي) === */}
            {activeTab === 'integrations' && (
                <div className="space-y-8 animate-in fade-in">
                    
                    {/* إضافة ربط جديد */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex gap-2"><Server size={20} className="text-[#C89B3C]"/> مزودي الخدمات والـ API</h3>
                        </div>
                        
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
                            <p className="text-xs text-white/50 mb-3">أضف أي مفتاح ربط خارجي هنا (مثل: moyasar_key, google_maps_key, twilio_sid)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <input placeholder="المفتاح (Key)" value={newIntegration.key} onChange={e=>setNewIntegration({...newIntegration, key: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-3 text-sm outline-none text-white font-mono"/>
                                <input placeholder="القيمة (Value)" value={newIntegration.value} onChange={e=>setNewIntegration({...newIntegration, value: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-3 text-sm outline-none text-white font-mono"/>
                                <input placeholder="وصف الخدمة" value={newIntegration.description} onChange={e=>setNewIntegration({...newIntegration, description: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-3 text-sm outline-none text-white"/>
                            </div>
                            <button onClick={handleAddIntegration} className="w-full bg-[#C89B3C] text-black font-bold py-2 rounded-lg hover:bg-[#b38a35]">إضافة / حفظ</button>
                        </div>

                        {/* قائمة المفاتيح الموجودة */}
                        <div className="space-y-2">
                            {integrations.map(setting => (
                                <div key={setting.key} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div>
                                        <p className="font-bold text-[#C89B3C] text-sm font-mono">{setting.key}</p>
                                        <p className="text-xs text-white/50">{setting.description}</p>
                                        <p className="text-xs text-white/30 font-mono mt-1 max-w-xs truncate">{setting.value}</p>
                                    </div>
                                    <button onClick={() => handleDeleteIntegration(setting.key)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* منطقة الخطر */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-red-400 mb-2 flex gap-2"><ShieldAlert/> منطقة الخطر</h3>
                        <p className="text-white/60 text-sm mb-4">تنظيف قاعدة البيانات من جميع العمليات التجريبية.</p>
                        <button onClick={handleWipeData} disabled={saving} className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500 hover:text-white transition flex justify-center gap-2">
                            {saving ? <Loader2 className="animate-spin"/> : <><Trash2 size={18}/> حذف البيانات الوهمية (Reset)</>}
                        </button>
                    </div>
                </div>
            )}

            {/* === TAB: SERVICE FIELDS (حقول الخدمات) === */}
            {activeTab === 'services_fields' && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-in fade-in">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                        <div>
                            <h3 className="text-lg font-bold flex gap-2"><ListPlus className="text-[#C89B3C]"/> تخصيص نموذج الخدمات</h3>
                            <p className="text-xs text-white/50 mt-1">هنا تحدد ما يطلبه النظام من المزود عند إضافة خدمة جديدة.</p>
                        </div>
                    </div>

                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <input type="text" placeholder="عنوان الحقل (مثلاً: صور المكان)" value={newServiceField.label} onChange={e=>setNewServiceField({...newServiceField, label: e.target.value})} className="bg-black/30 border border-white/10 rounded-lg p-2 text-sm outline-none text-white"/>
                            <select value={newServiceField.field_type} onChange={e=>setNewServiceField({...newServiceField, field_type: e.target.value})} className="bg-black/30 border border-white/10 rounded-lg p-2 text-sm outline-none text-white">
                                <option value="text">نص قصير</option>
                                <option value="textarea">نص طويل (وصف)</option>
                                <option value="file">رفع ملفات/صور</option>
                                <option value="map">خريطة (لوكيشن)</option>
                                <option value="policy">سياسة (إقرار)</option>
                                <option value="select">قائمة اختيار</option>
                            </select>
                            <input type="text" placeholder="خيارات القائمة (مفصولة بفاصلة)" value={newServiceField.options} onChange={e=>setNewServiceField({...newServiceField, options: e.target.value})} disabled={!['select', 'policy'].includes(newServiceField.field_type)} className="bg-black/30 border border-white/10 rounded-lg p-2 text-sm outline-none text-white disabled:opacity-50"/>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={newServiceField.is_required} onChange={e=>setNewServiceField({...newServiceField, is_required: e.target.checked})} className="accent-[#C89B3C] w-5 h-5"/>
                                <label className="text-sm">اجباري؟</label>
                            </div>
                        </div>
                        <button onClick={handleAddServiceField} className="w-full bg-[#C89B3C] text-black font-bold py-2 rounded-lg hover:bg-[#b38a35]">إضافة حقل للخدمات</button>
                    </div>

                    <div className="space-y-2">
                        {serviceFields.length === 0 && <p className="text-center text-white/30">النموذج الافتراضي فقط. أضف حقولاً لتخصيص الطلب.</p>}
                        {serviceFields.map((f: any) => (
                            <div key={f.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold">{f.label}</span>
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70">{f.field_type}</span>
                                    {f.is_required && <span className="text-xs text-red-400 border border-red-500/30 px-1 rounded">اجباري</span>}
                                </div>
                                <button onClick={() => handleDeleteServiceField(f.id)} className="text-red-400 hover:text-white transition"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === باقي التبويبات (عامة، حساب، الخ) نفس الكود السابق يمكن وضعه هنا === */}
            {activeTab === 'general' && <div className="text-center text-white/50 p-10">إعدادات التطبيق العامة...</div>}
          </div>
        )}
      </div>
    </main>
  );
}