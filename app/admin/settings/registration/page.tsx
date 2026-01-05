"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, Plus, Edit, Trash2, Save, X, Loader2, ScrollText, LayoutDashboard,
  Menu, User, Home
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

interface Field {
  id?: string;
  label: string;
  field_type: string;
  options?: string[] | null;
  is_required: boolean;
  sort_order: number;
}

export default function RegistrationSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // حالات القائمة (لأيقونة البروفايل)
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  const [currentField, setCurrentField] = useState<Field>({
    label: "",
    field_type: "text",
    options: [],
    is_required: false,
    sort_order: 0
  });

  const [optionsText, setOptionsText] = useState("");

  useEffect(() => { fetchFields(); }, []);

  const fetchFields = async () => {
    setLoading(true);
    const { data } = await supabase.from('registration_fields').select('*').order('sort_order', { ascending: true });
    if (data) setFields(data);
    setLoading(false);
  };

  const handleAddNew = () => {
    setCurrentField({ label: "", field_type: "text", options: [], is_required: false, sort_order: fields.length + 1 });
    setOptionsText("");
    setIsModalOpen(true);
  };

  const handleEdit = (field: Field) => {
    setCurrentField(field);
    if (field.field_type === 'policy' && field.options && field.options.length > 0) {
        setOptionsText(field.options[0]);
    } else {
        setOptionsText(field.options ? field.options.join(", ") : "");
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from('registration_fields').delete().eq('id', id);
    if (!error) setFields(fields.filter(f => f.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalOptions: string[] | null = null;

      if (currentField.field_type === 'select') {
         finalOptions = optionsText.split(',').map(s => s.trim()).filter(Boolean);
      } else if (currentField.field_type === 'policy') {
         finalOptions = [optionsText];
      }

      const fieldData = {
        ...currentField,
        options: finalOptions,
        is_required: currentField.field_type === 'policy' ? true : currentField.is_required
      };

      const { data, error } = await supabase.from('registration_fields').upsert(fieldData).select().single();
      if (error) throw error;

      if (currentField.id) setFields(fields.map(f => f.id === data.id ? data : f));
      else setFields([...fields, data]);

      setIsModalOpen(false);
      alert("✅ تم الحفظ");
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

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

      <div className="p-6 md:p-10 pt-24 md:pt-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div className="flex items-center gap-4">
            {/* ✅ زر الرجوع للوحة التحكم (سطح المكتب فقط) */}
            <button 
                onClick={() => router.push('/admin/dashboard')} 
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition text-sm font-bold text-white/80 border border-white/5 hover:border-white/10"
            >
                <ArrowRight size={18} />
                <span>لوحة التحكم</span>
            </button>
            
            <div className="h-8 w-px bg-white/10 mx-2 hidden md:block"></div>

            <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                    <ScrollText className="text-[#C89B3C]" /> إدارة الحقول والسياسات
                </h1>
            </div>
            </div>
            
            <button onClick={handleAddNew} className="bg-[#C89B3C] text-[#2B1F17] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#b38a35] transition shadow-lg shadow-[#C89B3C]/10 w-full md:w-auto">
            <Plus size={20} /> إضافة حقل
            </button>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8"/></div> : 
            fields.length === 0 ? <div className="p-20 text-center text-white/40">لا توجد حقول مضافة. النموذج فارغ حالياً.</div> :
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse min-w-[700px]">
                    <thead className="bg-black/20 text-white/50 text-xs uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4">الترتيب</th>
                            <th className="px-6 py-4">العنوان</th>
                            <th className="px-6 py-4">النوع</th>
                            <th className="px-6 py-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {fields.map(f => (
                        <tr key={f.id} className="hover:bg-white/5 transition duration-150">
                            <td className="px-6 py-4 font-mono text-[#C89B3C] font-bold">{f.sort_order}</td>
                            <td className="px-6 py-4 font-bold max-w-xs truncate" title={f.label}>{f.label}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${f.field_type === 'policy' ? 'bg-[#C89B3C]/20 text-[#C89B3C] border border-[#C89B3C]/30' : 'bg-white/10 text-white/70'}`}>
                                    {f.field_type === 'text' && 'نص قصير'}
                                    {f.field_type === 'textarea' && 'نص طويل'}
                                    {f.field_type === 'tel' && 'رقم جوال'}
                                    {f.field_type === 'email' && 'بريد إلكتروني'}
                                    {f.field_type === 'select' && 'قائمة اختيار'}
                                    {f.field_type === 'map' && '📍 خريطة'}
                                    {f.field_type === 'file' && '📎 رفع ملفات'}
                                    {f.field_type === 'policy' && '📜 سياسة / إقرار'}
                                </span>
                            </td>
                            <td className="px-6 py-4 flex gap-2">
                                <button onClick={()=>handleEdit(f)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition"><Edit size={16}/></button>
                                <button onClick={()=>handleDelete(f.id!)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>}
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#2B2B2B] w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold">{currentField.id ? "تعديل الحقل" : "إضافة حقل جديد"}</h3>
                    <button onClick={()=>setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition"><X className="text-white/50 hover:text-white"/></button>
                </div>
                
                <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-white/60 block mb-1">النوع</label><select className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#C89B3C]" value={currentField.field_type} onChange={e=>setCurrentField({...currentField, field_type:e.target.value})}><option value="text">نص</option><option value="policy">📜 سياسة (Checkbox)</option><option value="map">📍 خريطة</option><option value="file">📎 ملفات</option><option value="tel">جوال</option><option value="email">إيميل</option><option value="select">قائمة</option><option value="textarea">نص طويل</option></select></div>
                    <div><label className="text-xs text-white/60 block mb-1">الترتيب</label><input type="number" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#C89B3C]" value={currentField.sort_order} onChange={e=>setCurrentField({...currentField, sort_order: +e.target.value})}/></div>
                </div>
                
                <div>
                    <label className="text-xs text-white/60 block mb-1">
                        {currentField.field_type === 'policy' ? 'نص الإقرار المختصر (بجانب الـ Checkbox)' : 'عنوان السؤال'}
                    </label>
                    <input required type="text" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#C89B3C]" 
                    value={currentField.label} onChange={e => setCurrentField({...currentField, label: e.target.value})} 
                    placeholder={currentField.field_type === 'policy' ? "مثال: أوافق على الشروط والأحكام" : "عنوان الحقل"} 
                    />
                </div>

                {currentField.field_type === 'policy' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs text-white/60 block mb-1 text-[#C89B3C]">نص السياسة الكامل (يظهر في النافذة المنبثقة)</label>
                        <textarea required className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none h-32 resize-none focus:border-[#C89B3C]" 
                            value={optionsText} onChange={e => setOptionsText(e.target.value)} placeholder="اكتب الشروط والتفاصيل الكاملة هنا..." />
                    </div>
                )}

                {currentField.field_type === 'select' && (
                    <div><label className="text-xs text-white/60 block mb-1">الخيارات (افصل بفاصلة)</label><input type="text" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#C89B3C]" value={optionsText} onChange={e => setOptionsText(e.target.value)}/></div>
                )}

                <button disabled={saving} className="w-full bg-[#C89B3C] text-[#2B1F17] font-bold py-3 rounded-xl hover:bg-[#b38a35] mt-4 flex justify-center gap-2 items-center">
                    {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> حفظ التغييرات</>}
                </button>
                </form>
            </div>
            </div>
        )}
      </div>
    </main>
  );
}