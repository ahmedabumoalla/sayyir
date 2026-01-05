"use client";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Save,
  Loader2,
  Info,
  Phone,
  Mail,
  FileText,
  Target,
  Eye,
  Twitter,
  Instagram,
  Linkedin,
  Globe,
  Server,
  Key,
  Database,
  MapPin,
  List,
  User,
  Lock,
  CheckCircle,

  // ✅ الأيقونات الناقصة
  Plus,
  Edit,
  Trash2,
  X
} from "lucide-react";

import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "700"] });


export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("app_settings");
  const router = useRouter();

  // ==================== منطق حقول الخدمات (جديد) ====================
  const [fields, setFields] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentField, setCurrentField] = useState<any>({ label: "", field_type: "text", options: [], is_required: false, sort_order: 0 });
  const [optionsText, setOptionsText] = useState("");
  const [fieldSaving, setFieldSaving] = useState(false);

  // جلب الحقول عند فتح الصفحة
  useEffect(() => {
    const fetchFields = async () => {
      const { data } = await supabase.from('registration_fields').select('*').order('sort_order', { ascending: true });
      if (data) setFields(data);
    };
    fetchFields();
  }, []);

  const handleAddNewField = () => {
    setCurrentField({ label: "", field_type: "text", options: [], is_required: false, sort_order: fields.length + 1 });
    setOptionsText("");
    setIsModalOpen(true);
  };

  const handleEditField = (field: any) => {
    setCurrentField(field);
    setOptionsText(field.options ? field.options.join(", ") : (field.field_type === 'policy' && field.options ? field.options[0] : ""));
    setIsModalOpen(true);
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from('registration_fields').delete().eq('id', id);
    if (!error) setFields(fields.filter(f => f.id !== id));
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldSaving(true);
    try {
      let finalOptions: string[] | null = null;
      if (currentField.field_type === 'select') finalOptions = optionsText.split(',').map(s => s.trim()).filter(Boolean);
      else if (currentField.field_type === 'policy') finalOptions = [optionsText];

      const fieldData = { ...currentField, options: finalOptions, is_required: currentField.field_type === 'policy' ? true : currentField.is_required };
      const { data, error } = await supabase.from('registration_fields').upsert(fieldData).select().single();
      
      if (error) throw error;
      if (currentField.id) setFields(fields.map(f => f.id === data.id ? data : f));
      else setFields([...fields, data]);
      
      setIsModalOpen(false);
    } catch (error: any) {
      alert("خطأ: " + error.message);
    } finally {
      setFieldSaving(false);
    }
  };
  // ==============================================================

  // بيانات الإعدادات العامة
  const [formData, setFormData] = useState({
    is_app_active: true,
    about_us: "",
    vision: "",
    mission: "",
    whatsapp: "",
    email: "",
    twitter: "",
    instagram: "",
    linkedin: ""
  });

  // بيانات وهمية للعرض في التبويبات الأخرى (يمكنك ربطها بقاعدة البيانات لاحقاً)
  const [techData, setTechData] = useState({
    googleMapKey: "AIzaSyDxxxxxxxxxxxxxx",
    geminiKey: "sk-xxxxxxxxxxxxxx",
    paymentGateway: "Stripe"
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') console.error(error);

      if (data) {
        setFormData({
          is_app_active: data.is_app_active ?? true,
          about_us: data.about_us || "",
          vision: data.vision || "",
          mission: data.mission || "",
          whatsapp: data.whatsapp || "",
          email: data.email || "",
          twitter: data.twitter || "",
          instagram: data.instagram || "",
          linkedin: data.linkedin || ""
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // هنا نحفظ فقط إعدادات التطبيق (التبويب الأول)
      // التبويبات الأخرى تحتاج جداول خاصة أو منطق حفظ منفصل حسب برمجتك السابقة
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          id: 1,
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert("تم حفظ الإعدادات بنجاح!");
    } catch (error) {
      alert("حدث خطأ أثناء الحفظ");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-white">جاري التحميل...</div>;

  return (
    <div className={`p-6 max-w-5xl mx-auto text-right ${tajawal.className}`} dir="rtl">
      <button
  onClick={() => router.push("/admin/dashboard")}
  className="p-2 bg-white/5 rounded-lg text-[#C89B3C]"
>
  <ArrowRight size={22} />
</button>

      <h1 className="text-3xl font-bold text-white mb-8 border-b border-white/10 pb-4">الإعدادات العامة</h1>
      

      {/* --- شريط التبويبات --- */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit mx-auto md:mx-0 border border-white/10">
        {[
          { id: "app_settings", label: "إعدادات التطبيق", icon: <Globe size={16}/> },
          { id: "tech_link", label: "الربط والتقنية", icon: <Server size={16}/> },
          { id: "fields", label: "حقول الخدمات", icon: <Database size={16}/> },
          { id: "cities", label: "المدن والتصنيفات", icon: <MapPin size={16}/> },
          { id: "account", label: "حسابي", icon: <User size={16}/> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
              activeTab === tab.id 
                ? "bg-[#C89B3C] text-black shadow-lg shadow-[#C89B3C]/20" 
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= تبويب 1: إعدادات التطبيق ================= */}
      {activeTab === "app_settings" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          {/* حالة التطبيق */}
          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2">
              <Globe size={20} /> حالة التطبيق
            </h2>
            <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${formData.is_app_active ? "bg-green-500 shadow-[0_0_10px_lime]" : "bg-red-500 shadow-[0_0_10px_red]"}`}></div>
                <span className="text-white font-bold">{formData.is_app_active ? "التطبيق يعمل" : "التطبيق متوقف للصيانة"}</span>
              </div>
              <button 
                onClick={() => setFormData({...formData, is_app_active: !formData.is_app_active})}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${formData.is_app_active ? "bg-green-500/20 border border-green-500" : "bg-red-500/20 border border-red-500"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${formData.is_app_active ? "-translate-x-6 bg-green-500" : "translate-x-0 bg-red-500"}`}></div>
              </button>
            </div>
          </section>

          {/* التواصل */}
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
              <div>
                <label className="block text-gray-400 mb-2 text-sm flex gap-2"><Twitter size={14}/> تويتر</label>
                <input type="text" value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-xs" dir="ltr" />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm flex gap-2"><Instagram size={14}/> انستقرام</label>
                <input type="text" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-xs" dir="ltr" />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm flex gap-2"><Linkedin size={14}/> لينكد إن</label>
                <input type="text" value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-xs" dir="ltr" />
              </div>
            </div>
          </section>

          {/* المحتوى */}
          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2">
              <FileText size={20} /> المحتوى التعريفي
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">من نحن</label>
                <textarea rows={4} value={formData.about_us} onChange={(e) => setFormData({ ...formData, about_us: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 mb-2 text-sm">الرؤية</label>
                  <textarea rows={3} value={formData.vision} onChange={(e) => setFormData({ ...formData, vision: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2 text-sm">الرسالة</label>
                  <textarea rows={3} value={formData.mission} onChange={(e) => setFormData({ ...formData, mission: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none" />
                </div>
              </div>
            </div>
          </section>
          
          <div className="flex justify-end pt-4 sticky bottom-4 z-10">
            <div className="bg-[#121212]/80 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-2xl">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#C89B3C] hover:bg-[#b88a2c] text-black font-bold py-3 px-12 rounded-xl transition disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= تبويب 2: الربط والتقنية ================= */}
      {activeTab === "tech_link" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2">
              <Key size={20} /> مفاتيح الربط (API Keys)
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 mb-2 text-sm">مفتاح خرائط جوجل (Google Maps API)</label>
                <input type="text" defaultValue={techData.googleMapKey} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none font-mono text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm">مفتاح الذكاء الاصطناعي (Gemini AI Key)</label>
                <input type="text" defaultValue={techData.geminiKey} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none font-mono text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-gray-400 mb-2 text-sm">بوابة الدفع (Payment Gateway)</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none">
                  <option value="Stripe">Stripe</option>
                  <option value="Moyasar">Moyasar (ميسر)</option>
                  <option value="Tamara">Tamara</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
               <button className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition text-sm">حفظ مفاتيح الربط</button>
            </div>
          </section>
        </div>
      )}

      {/* ================= تبويب 3: حقول الخدمات (المعدل) ================= */}
      {activeTab === "fields" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#C89B3C] flex items-center gap-2">
                  <Database size={20} /> إدارة حقول ونماذج التسجيل
                </h2>
                <button onClick={handleAddNewField} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#b38a35] text-sm">
                   <Plus size={16} /> إضافة حقل
                </button>
            </div>

            {/* الجدول */}
            <div className="overflow-x-auto custom-scrollbar rounded-xl border border-white/5">
                <table className="w-full text-right border-collapse min-w-[600px]">
                    <thead className="bg-black/20 text-white/50 text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3">الترتيب</th>
                            <th className="px-4 py-3">العنوان</th>
                            <th className="px-4 py-3">النوع</th>
                            <th className="px-4 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {fields.map(f => (
                        <tr key={f.id} className="hover:bg-white/5 transition">
                            <td className="px-4 py-3 font-mono text-[#C89B3C]">{f.sort_order}</td>
                            <td className="px-4 py-3 font-bold">{f.label}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${f.field_type === 'policy' ? 'bg-[#C89B3C]/20 text-[#C89B3C]' : 'bg-white/10'}`}>
                                    {f.field_type === 'text' && 'نص'} {f.field_type === 'select' && 'قائمة'} {f.field_type === 'file' && 'ملف'} {f.field_type === 'policy' && 'سياسة'} {f.field_type === 'map' && 'خريطة'}
                                    {f.field_type === 'tel' && 'جوال'} {f.field_type === 'email' && 'إيميل'} {f.field_type === 'textarea' && 'نص طويل'}
                                </span>
                            </td>
                            <td className="px-4 py-3 flex gap-2">
                                <button onClick={()=>handleEditField(f)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500 hover:text-white"><Edit size={14}/></button>
                                <button onClick={()=>handleDeleteField(f.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
          </section>

          {/* النافذة المنبثقة (Modal) للإضافة والتعديل */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#2B2B2B] w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold">{currentField.id ? "تعديل الحقل" : "إضافة حقل جديد"}</h3>
                    <button onClick={()=>setIsModalOpen(false)}><X className="text-white/50 hover:text-white"/></button>
                </div>
                <form onSubmit={handleSaveField} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs text-white/60 mb-1 block">النوع</label><select className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" value={currentField.field_type} onChange={e=>setCurrentField({...currentField, field_type:e.target.value})}><option value="text">نص</option><option value="policy">سياسة</option><option value="map">خريطة</option><option value="file">ملف</option><option value="tel">جوال</option><option value="select">قائمة</option><option value="textarea">نص طويل</option></select></div>
                      <div><label className="text-xs text-white/60 mb-1 block">الترتيب</label><input type="number" className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" value={currentField.sort_order} onChange={e=>setCurrentField({...currentField, sort_order: +e.target.value})}/></div>
                  </div>
                  <div><label className="text-xs text-white/60 mb-1 block">العنوان</label><input required type="text" className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" value={currentField.label} onChange={e => setCurrentField({...currentField, label: e.target.value})} /></div>
                  
                  {(currentField.field_type === 'select' || currentField.field_type === 'policy') && (
                     <div><label className="text-xs text-white/60 mb-1 block">{currentField.field_type === 'policy' ? 'نص السياسة الكامل' : 'الخيارات (بينها فواصل)'}</label>
                     {currentField.field_type === 'policy' ? <textarea className="w-full bg-black/30 border border-white/10 rounded-lg p-2 h-24" value={optionsText} onChange={e => setOptionsText(e.target.value)} /> : <input type="text" className="w-full bg-black/30 border border-white/10 rounded-lg p-2" value={optionsText} onChange={e => setOptionsText(e.target.value)} />}
                     </div>
                  )}

                  <button disabled={fieldSaving} className="w-full bg-[#C89B3C] text-black font-bold py-2 rounded-lg hover:bg-[#b38a35] mt-2">
                    {fieldSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                </form>
            </div>
            </div>
          )}
        </div>
      )}

      {/* ================= تبويب 4: المدن والتصنيفات ================= */}
      {activeTab === "cities" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-[#C89B3C] flex items-center gap-2">
                   <MapPin size={20} /> المدن المدعومة
                 </h2>
                 <button className="text-xs bg-[#C89B3C] text-black px-3 py-1 rounded hover:bg-[#b88a2c]">+ إضافة</button>
              </div>
              <div className="space-y-2">
                 {['أبها', 'خميس مشيط', 'النماص', 'رجال ألمع', 'تنومة'].map((city, idx) => (
                   <div key={idx} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5">
                      <span>{city}</span>
                      <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">نشط</span>
                   </div>
                 ))}
              </div>
            </section>

            <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-[#C89B3C] flex items-center gap-2">
                   <List size={20} /> تصنيفات الخدمات
                 </h2>
                 <button className="text-xs bg-[#C89B3C] text-black px-3 py-1 rounded hover:bg-[#b88a2c]">+ إضافة</button>
              </div>
              <div className="space-y-2">
                 {['مطاعم ومقاهي', 'نزل تراثية', 'فنادق ومنتجعات', 'تجارب هايكنج', 'متاحف'].map((cat, idx) => (
                   <div key={idx} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-white/5">
                      <span>{cat}</span>
                      <span className="text-xs text-white/40">50 خدمة</span>
                   </div>
                 ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ================= تبويب 5: حسابي ================= */}
      {activeTab === "account" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2">
              <User size={20} /> إعدادات الحساب والأمان
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-gray-400 mb-2 text-sm">اسم المسؤول</label>
                  <input type="text" defaultValue="المدير العام" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none" />
               </div>
               <div>
                  <label className="block text-gray-400 mb-2 text-sm">البريد الإلكتروني</label>
                  <input type="email" defaultValue="admin@sayyir.com" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none" disabled />
               </div>
            </div>
            
            <div className="mt-8 border-t border-white/10 pt-6">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Lock size={16}/> تغيير كلمة المرور</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">كلمة المرور الحالية</label>
                    <input type="password" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">كلمة المرور الجديدة</label>
                    <input type="password" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none" />
                  </div>
               </div>
               <div className="mt-6 flex justify-end">
                  <button className="px-6 py-2 bg-[#C89B3C] text-black font-bold rounded-lg hover:bg-[#b88a2c] transition">تحديث الملف الشخصي</button>
               </div>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}