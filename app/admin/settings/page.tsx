"use client";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Save, Loader2, Info, Phone, Mail, FileText, Globe, Server, Key, 
  Database, MapPin, List, User, Lock, Plus, Edit, Trash2, X, MessageSquare
} from "lucide-react";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "700"] });

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("app_settings");
  const router = useRouter();

  // === States for Dynamic Fields ===
  const [fields, setFields] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentField, setCurrentField] = useState<any>({ 
    label: "", field_type: "text", options: [], is_required: false, sort_order: 0, scope: "service" 
  });
  const [optionsText, setOptionsText] = useState("");
  const [fieldSaving, setFieldSaving] = useState(false);

  // === States for Cities & Categories ===
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // === States for Settings ===
  const [formData, setFormData] = useState({
    is_app_active: true, about_us: "", vision: "", mission: "",
    whatsapp: "", email: "", twitter: "", instagram: "", linkedin: ""
  });

  const [techData, setTechData] = useState({
    googleMapKey: "",
    geminiKey: "",
    paymentGateway: "Stripe",
    moyasarKey: "", 
    gmailUser: "",
    gmailAppPassword: "",
    resendApiKey: "", 
    twilioSid: "",    
    twilioToken: "",  
    twilioPhone: ""   
  });

  // --- Fetch Data ---
  useEffect(() => {
    const initData = async () => {
        await Promise.all([fetchSettings(), fetchFields(), fetchCitiesAndCats()]);
        setLoading(false);
    };
    initData();
  }, []);

  const fetchFields = async () => {
    const { data } = await supabase.from('registration_fields').select('*').order('scope', { ascending: false }).order('sort_order', { ascending: true });
    if (data) setFields(data);
  };

  const fetchCitiesAndCats = async () => {
      const { data: citiesData } = await supabase.from('cities').select('*').order('name');
      if (citiesData) setCities(citiesData);

      const { data: catsData } = await supabase.from('categories').select('*').order('name');
      if (catsData) setCategories(catsData);
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
      if (data) {
        setFormData({
          is_app_active: data.is_app_active ?? true,
          about_us: data.about_us || "", vision: data.vision || "", mission: data.mission || "",
          whatsapp: data.whatsapp || "", email: data.email || "",
          twitter: data.twitter || "", instagram: data.instagram || "", linkedin: data.linkedin || ""
        });
        setTechData({
          googleMapKey: data.google_map_key || "",
          geminiKey: data.gemini_key || "",
          paymentGateway: data.payment_gateway || "Stripe",
          moyasarKey: data.moyasar_key || "",
          gmailUser: data.gmail_user || "",
          gmailAppPassword: data.gmail_app_password || "",
          resendApiKey: data.resend_api_key || "",
          twilioSid: data.twilio_account_sid || "",
          twilioToken: data.twilio_auth_token || "",
          twilioPhone: data.twilio_phone_number || ""
        });
      }
    } catch (error) { console.error(error); }
  };

  // --- Handle Save Settings ---
  const handleSave = async () => {
    setSaving(true);
    try {
      let dataToUpdate = {};
      if (activeTab === "app_settings") dataToUpdate = { ...formData };
      else if (activeTab === "tech_link") {
        dataToUpdate = {
          google_map_key: techData.googleMapKey, gemini_key: techData.geminiKey,
          payment_gateway: techData.paymentGateway, moyasar_key: techData.moyasarKey,
          gmail_user: techData.gmailUser, gmail_app_password: techData.gmailAppPassword,
          resend_api_key: techData.resendApiKey, twilio_account_sid: techData.twilioSid,
          twilio_auth_token: techData.twilioToken, twilio_phone_number: techData.twilioPhone
        };
      } else { setSaving(false); return; }

      const { error } = await supabase.from('platform_settings').upsert({ id: 1, ...dataToUpdate, updated_at: new Date().toISOString() });
      if (error) throw error;
      alert("✅ تم حفظ الإعدادات بنجاح!");
    } catch (error: any) { alert("❌ خطأ: " + error.message); } finally { setSaving(false); }
  };

  // --- Field Logic ---
  const handleAddNewField = () => { setCurrentField({ label: "", field_type: "text", options: [], is_required: false, sort_order: fields.length + 1, scope: "service" }); setOptionsText(""); setIsModalOpen(true); };
  const handleEditField = (field: any) => { setCurrentField(field); setOptionsText(field.options ? field.options.join(", ") : (field.field_type === 'policy' && field.options ? field.options[0] : "")); setIsModalOpen(true); };
  const handleDeleteField = async (id: string) => { if (!confirm("حذف؟")) return; const { error } = await supabase.from('registration_fields').delete().eq('id', id); if (!error) setFields(fields.filter(f => f.id !== id)); };
  
  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault(); setFieldSaving(true);
    try {
      let finalOptions: string[] | null = null;
      if (currentField.field_type === 'select') finalOptions = optionsText.split(',').map(s => s.trim()).filter(Boolean);
      else if (currentField.field_type === 'policy') finalOptions = [optionsText];
      const fieldData = { ...currentField, options: finalOptions, is_required: currentField.field_type === 'policy' ? true : currentField.is_required };
      const { error } = await supabase.from('registration_fields').upsert(fieldData);
      if (error) throw error;
      await fetchFields(); setIsModalOpen(false); alert("✅ تم الحفظ");
    } catch (e: any) { alert(e.message); } finally { setFieldSaving(false); }
  };

  // --- Cities & Categories Logic ---
  const handleAddCity = async () => {
      const name = prompt("أدخل اسم المدينة الجديدة:");
      if (!name) return;
      const { data, error } = await supabase.from('cities').insert({ name }).select();
      if (!error && data) setCities([...cities, data[0]]);
      else alert("خطأ في الإضافة: " + (error?.message || "unknown"));
  };

  // ✅ دالة تعديل المدينة
  const handleEditCity = async (id: string, currentName: string) => {
      const newName = prompt("تعديل اسم المدينة:", currentName);
      if (!newName || newName === currentName) return;

      const { error } = await supabase.from('cities').update({ name: newName }).eq('id', id);
      if (!error) {
          setCities(cities.map(c => c.id === id ? { ...c, name: newName } : c));
      } else {
          alert("فشل التعديل: " + error.message);
      }
  };

  const handleDeleteCity = async (id: string) => {
      if(!confirm("هل أنت متأكد من حذف هذه المدينة؟")) return;
      const { error } = await supabase.from('cities').delete().eq('id', id);
      if(!error) setCities(cities.filter(c => c.id !== id));
      else alert("خطأ في الحذف");
  };

  const handleAddCategory = async () => {
      const name = prompt("أدخل اسم التصنيف الجديد:");
      if (!name) return;
      const { data, error } = await supabase.from('categories').insert({ name, type: 'place' }).select();
      if (!error && data) setCategories([...categories, data[0]]);
      else alert("خطأ في الإضافة");
  };

  // ✅ دالة تعديل التصنيف
  const handleEditCategory = async (id: string, currentName: string) => {
      const newName = prompt("تعديل اسم التصنيف:", currentName);
      if (!newName || newName === currentName) return;

      const { error } = await supabase.from('categories').update({ name: newName }).eq('id', id);
      if (!error) {
          setCategories(categories.map(c => c.id === id ? { ...c, name: newName } : c));
      } else {
          alert("فشل التعديل: " + error.message);
      }
  };

  const handleDeleteCategory = async (id: string) => {
      if(!confirm("حذف التصنيف؟")) return;
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if(!error) setCategories(categories.filter(c => c.id !== id));
      else alert("خطأ في الحذف");
  };

  if (loading) return <div className="p-10 text-center text-white">جاري التحميل...</div>;

  return (
    <div className={`p-6 max-w-5xl mx-auto text-right ${tajawal.className}`} dir="rtl">
      <button onClick={() => router.push("/admin/dashboard")} className="p-2 bg-white/5 rounded-lg text-[#C89B3C] mb-4"><ArrowRight size={22} /></button>
      <h1 className="text-3xl font-bold text-white mb-8 border-b border-white/10 pb-4">الإعدادات العامة</h1>
      
      <div className="flex flex-wrap gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit mx-auto md:mx-0 border border-white/10">
        {[
          { id: "app_settings", label: "التطبيق", icon: <Globe size={16}/> },
          { id: "tech_link", label: "الربط والتقنية", icon: <Server size={16}/> },
          { id: "fields", label: "الحقول", icon: <Database size={16}/> },
          { id: "cities", label: "المدن", icon: <MapPin size={16}/> },
          { id: "account", label: "حسابي", icon: <User size={16}/> }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? "bg-[#C89B3C] text-black" : "text-white/60 hover:bg-white/10"}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ============== تبويب إعدادات التطبيق ============== */}
      {activeTab === "app_settings" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
           <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
             <h2 className="text-xl font-bold text-[#C89B3C] mb-4 flex gap-2"><Globe size={20}/> حالة التطبيق</h2>
             <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${formData.is_app_active ? "bg-green-500 shadow-[0_0_10px_lime]" : "bg-red-500 shadow-[0_0_10px_red]"}`}></div>
                    <span className="text-white font-bold">{formData.is_app_active ? "التطبيق يعمل" : "التطبيق متوقف للصيانة"}</span>
                </div>
                <button onClick={() => setFormData({...formData, is_app_active: !formData.is_app_active})} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${formData.is_app_active ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>{formData.is_app_active ? 'إيقاف للصيانة' : 'تفعيل التطبيق'}</button>
             </div>
           </section>

           <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2">
              <Phone size={20} /> معلومات التواصل
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">رقم الواتساب</label>
                <div className="relative">
                   <input type="text" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none pl-10" />
                   <Phone className="absolute left-3 top-3.5 text-gray-500" size={18} />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm">البريد الإلكتروني</label>
                <div className="relative">
                   <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none pl-10" />
                   <Mail className="absolute left-3 top-3.5 text-gray-500" size={18} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
              <div><label className="block text-gray-400 mb-2 text-sm">تويتر</label><input type="text" value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs" dir="ltr" /></div>
              <div><label className="block text-gray-400 mb-2 text-sm">انستقرام</label><input type="text" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs" dir="ltr" /></div>
              <div><label className="block text-gray-400 mb-2 text-sm">لينكد إن</label><input type="text" value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs" dir="ltr" /></div>
            </div>
           </section>

           <div className="flex justify-end pt-4"><button onClick={handleSave} disabled={saving} className="bg-[#C89B3C] text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2">{saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>} حفظ التغييرات</button></div>
        </div>
      )}

      {/* ============== تبويب إعدادات الربط والتقنية ============== */}
      {activeTab === "tech_link" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><Key size={20} /> بوابات الدفع الإلكتروني</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-gray-400 mb-2 text-sm">البوابة المفضلة</label>
                    <select value={techData.paymentGateway} onChange={(e) => setTechData({...techData, paymentGateway: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none">
                        <option value="Stripe">Stripe (عالمي)</option>
                        <option value="Moyasar">Moyasar (السعودية - مدى)</option>
                        <option value="Tamara">Tamara (تقسيط)</option>
                    </select>
                </div>
                {techData.paymentGateway === 'Moyasar' && (
                    <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-black/20 rounded-xl border border-[#C89B3C]/30">
                        <label className="block text-[#C89B3C] mb-2 text-xs font-bold">مفتاح الربط الخاص (Moyasar Secret Key)</label>
                        <input type="text" value={techData.moyasarKey} onChange={(e) => setTechData({...techData, moyasarKey: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none font-mono text-sm" placeholder="sk_test_..." dir="ltr"/>
                        <p className="text-[10px] text-gray-500 mt-2">انسخ المفتاح من لوحة تحكم ميسر وضعه هنا.</p>
                    </div>
                )}
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><Mail size={20} /> خدمات البريد الإلكتروني</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
                    <h3 className="text-white font-bold text-sm border-b border-white/10 pb-2">إعدادات Gmail SMTP</h3>
                    <div><label className="block text-gray-400 mb-2 text-xs">البريد المرسل</label><input type="email" value={techData.gmailUser} onChange={(e) => setTechData({...techData, gmailUser: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm" dir="ltr" placeholder="email@gmail.com"/></div>
                    <div><label className="block text-gray-400 mb-2 text-xs">كلمة مرور التطبيق</label><input type="password" value={techData.gmailAppPassword} onChange={(e) => setTechData({...techData, gmailAppPassword: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm" dir="ltr"/></div>
                </div>
                <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
                    <h3 className="text-white font-bold text-sm border-b border-white/10 pb-2">إعدادات Resend API</h3>
                    <div><label className="block text-gray-400 mb-2 text-xs">API Key</label><input type="text" value={techData.resendApiKey} onChange={(e) => setTechData({...techData, resendApiKey: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono" dir="ltr" placeholder="re_123..."/></div>
                    <p className="text-[10px] text-gray-500">يستخدم Resend لإرسال إيميلات احترافية وسريعة.</p>
                </div>
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><MessageSquare size={20} /> خدمات الرسائل القصيرة (Twilio)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-gray-400 mb-2 text-xs">Account SID</label><input type="text" value={techData.twilioSid} onChange={(e) => setTechData({...techData, twilioSid: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono" dir="ltr"/></div>
                <div><label className="block text-gray-400 mb-2 text-xs">Auth Token</label><input type="password" value={techData.twilioToken} onChange={(e) => setTechData({...techData, twilioToken: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono" dir="ltr"/></div>
                <div><label className="block text-gray-400 mb-2 text-xs">رقم المرسل (Sender Phone)</label><input type="text" value={techData.twilioPhone} onChange={(e) => setTechData({...techData, twilioPhone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono" dir="ltr" placeholder="+123456789"/></div>
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><Server size={20} /> خدمات أخرى</h2>
            <div className="space-y-4">
                <div><label className="block text-gray-400 mb-2 text-sm">Google Maps API Key</label><input type="text" value={techData.googleMapKey} onChange={(e) => setTechData({...techData, googleMapKey: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono" dir="ltr"/></div>
                <div><label className="block text-gray-400 mb-2 text-sm">Gemini AI Key</label><input type="text" value={techData.geminiKey} onChange={(e) => setTechData({...techData, geminiKey: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono" dir="ltr"/></div>
            </div>
          </section>

          <div className="flex justify-end pt-4 sticky bottom-4 z-10">
            <div className="bg-[#121212]/80 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-2xl">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#C89B3C] hover:bg-[#b88a2c] text-black font-bold py-3 px-12 rounded-xl transition disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} حفظ إعدادات الربط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== تبويب إدارة الحقول ============== */}
      {activeTab === "fields" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-[#C89B3C] flex items-center gap-2"><Database size={20} /> إدارة الحقول والنماذج</h2>
                    <p className="text-xs text-white/50">تحكم بالحقول التي تظهر في نماذج التسجيل.</p>
                </div>
                <button onClick={handleAddNewField} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#b38a35] text-sm"><Plus size={16} /> إضافة حقل</button>
            </div>
            <div className="overflow-x-auto custom-scrollbar rounded-xl border border-white/5">
                <table className="w-full text-right border-collapse min-w-[600px]">
                    <thead className="bg-black/20 text-white/50 text-xs uppercase">
                        <tr><th className="px-4 py-3">الترتيب</th><th className="px-4 py-3">النطاق</th><th className="px-4 py-3">العنوان</th><th className="px-4 py-3">النوع</th><th className="px-4 py-3">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {fields.map(f => (
                        <tr key={f.id} className="hover:bg-white/5 transition">
                            <td className="px-4 py-3 font-mono text-[#C89B3C]">{f.sort_order}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${f.scope === 'registration' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{f.scope === 'registration' ? 'تسجيل جديد' : 'إضافة خدمة'}</span></td>
                            <td className="px-4 py-3 font-bold">{f.label}</td>
                            <td className="px-4 py-3"><span className="bg-white/10 px-2 py-1 rounded text-xs">{f.field_type}</span></td>
                            <td className="px-4 py-3 flex gap-2"><button onClick={()=>handleEditField(f)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500 hover:text-white"><Edit size={14}/></button><button onClick={()=>handleDeleteField(f.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white"><Trash2 size={14}/></button></td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
          </section>
          {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#2B2B2B] w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold">{currentField.id ? "تعديل الحقل" : "إضافة حقل جديد"}</h3>
                    <button onClick={()=>setIsModalOpen(false)}><X className="text-white/50 hover:text-white"/></button>
                </div>
                <form onSubmit={handleSaveField} className="space-y-4">
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <label className="text-xs text-[#C89B3C] mb-2 block font-bold">النطاق</label>
                      <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={()=>setCurrentField({...currentField, scope: 'registration'})} className={`p-2 rounded-lg text-sm border transition ${currentField.scope === 'registration' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/20 border-white/10'}`}>تسجيل مزود</button>
                          <button type="button" onClick={()=>setCurrentField({...currentField, scope: 'service'})} className={`p-2 rounded-lg text-sm border transition ${currentField.scope === 'service' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-black/20 border-white/10'}`}>إضافة خدمة</button>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs text-white/60 mb-1 block">النوع</label><select className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" value={currentField.field_type} onChange={e=>setCurrentField({...currentField, field_type:e.target.value})}><option value="text">نص</option><option value="policy">سياسة</option><option value="map">خريطة</option><option value="file">ملف</option><option value="tel">جوال</option><option value="select">قائمة</option><option value="textarea">نص طويل</option></select></div>
                      <div><label className="text-xs text-white/60 mb-1 block">الترتيب</label><input type="number" className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" value={currentField.sort_order} onChange={e=>setCurrentField({...currentField, sort_order: +e.target.value})}/></div>
                  </div>
                  <div><label className="text-xs text-white/60 mb-1 block">العنوان</label><input required type="text" className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" value={currentField.label} onChange={e => setCurrentField({...currentField, label: e.target.value})} /></div>
                  {(currentField.field_type === 'select' || currentField.field_type === 'policy') && (
                      <div><label className="text-xs text-white/60 mb-1 block">{currentField.field_type === 'policy' ? 'نص السياسة' : 'الخيارات (فواصل)'}</label>
                      {currentField.field_type === 'policy' ? <textarea className="w-full bg-black/30 border border-white/10 rounded-lg p-2 h-24" value={optionsText} onChange={e => setOptionsText(e.target.value)} /> : <input type="text" className="w-full bg-black/30 border border-white/10 rounded-lg p-2" value={optionsText} onChange={e => setOptionsText(e.target.value)} />}</div>
                  )}
                  <div className="flex items-center gap-2 pt-2"><input type="checkbox" id="req" checked={currentField.is_required} onChange={e=>setCurrentField({...currentField, is_required: e.target.checked})} className="accent-[#C89B3C]"/><label htmlFor="req" className="text-sm text-white/80">إجباري</label></div>
                  <button disabled={fieldSaving} className="w-full bg-[#C89B3C] text-black font-bold py-2 rounded-lg hover:bg-[#b38a35] mt-2">{fieldSaving ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
                </form>
            </div>
            </div>
          )}
        </div>
      )}

      {/* ============== تبويب المدن (Cities) ============== */}
      {activeTab === "cities" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Cities Section */}
            <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[#C89B3C] flex items-center gap-2"><MapPin size={20} /> المدن المدعومة</h2>
                  <button onClick={handleAddCity} className="text-xs bg-[#C89B3C] text-black px-3 py-1 rounded hover:bg-[#b88a2c]">+ إضافة</button>
              </div>
              <div className="space-y-2">
                  {cities.length === 0 ? <p className="text-white/40 text-center py-4">لا توجد مدن مضافة.</p> : cities.map((city, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5 group">
                          <span>{city.name}</span>
                          <div className="flex items-center gap-2">
                              {/* زر التعديل المضاف ✅ */}
                              <button onClick={() => handleEditCity(city.id, city.name)} className="text-blue-400 hover:bg-blue-500/20 p-1.5 rounded transition"><Edit size={14}/></button>
                              <button onClick={() => handleDeleteCity(city.id)} className="text-red-400 hover:bg-red-500/20 p-1.5 rounded transition"><Trash2 size={14}/></button>
                          </div>
                      </div>
                  ))}
              </div>
            </section>

            {/* Categories Section */}
            <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[#C89B3C] flex items-center gap-2"><List size={20} /> التصنيفات</h2>
                  <button onClick={handleAddCategory} className="text-xs bg-[#C89B3C] text-black px-3 py-1 rounded hover:bg-[#b88a2c]">+ إضافة</button>
              </div>
              <div className="space-y-2">
                  {categories.length === 0 ? <p className="text-white/40 text-center py-4">لا توجد تصنيفات مضافة.</p> : categories.map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5 group">
                          <span>{cat.name}</span>
                          <div className="flex items-center gap-2">
                              {/* زر التعديل المضاف ✅ */}
                              <button onClick={() => handleEditCategory(cat.id, cat.name)} className="text-blue-400 hover:bg-blue-500/20 p-1.5 rounded transition"><Edit size={14}/></button>
                              <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:bg-red-500/20 p-1.5 rounded transition"><Trash2 size={14}/></button>
                          </div>
                      </div>
                  ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ============== تبويب الحساب (Account) ============== */}
      {activeTab === "account" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><User size={20} /> إعدادات الحساب</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div><label className="block text-gray-400 mb-2 text-sm">المسؤول</label><input type="text" defaultValue="المدير العام" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" /></div>
               <div><label className="block text-gray-400 mb-2 text-sm">البريد</label><input type="email" defaultValue="admin@sayyir.com" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" disabled /></div>
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Lock size={16}/> كلمة المرور</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-gray-400 mb-2 text-sm">الحالية</label><input type="password" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" /></div>
                  <div><label className="block text-gray-400 mb-2 text-sm">الجديدة</label><input type="password" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" /></div>
               </div>
               <div className="mt-6 flex justify-end"><button className="px-6 py-2 bg-[#C89B3C] text-black font-bold rounded-lg hover:bg-[#b88a2c] transition">تحديث</button></div>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}