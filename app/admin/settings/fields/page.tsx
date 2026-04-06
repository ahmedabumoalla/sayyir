"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Database, Plus, Edit, Trash2, X, Loader2, ArrowRight } from "lucide-react";

export default function DynamicFieldsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [currentField, setCurrentField] = useState<any>({ 
    label: "", field_type: "text", options: [], is_required: false, sort_order: 0, scope: "service" 
  });
  const [optionsText, setOptionsText] = useState("");

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    setLoading(true);
    const { data } = await supabase.from('registration_fields').select('*').order('scope', { ascending: false }).order('sort_order', { ascending: true });
    if (data) setFields(data);
    setLoading(false);
  };

  const handleAddNewField = () => { 
      setCurrentField({ label: "", field_type: "text", options: [], is_required: false, sort_order: fields.length + 1, scope: "service" }); 
      setOptionsText(""); 
      setIsModalOpen(true); 
  };
  
  const handleEditField = (field: any) => { 
      setCurrentField(field); 
      setOptionsText(field.options ? field.options.join(", ") : (field.field_type === 'policy' && field.options ? field.options[0] : "")); 
      setIsModalOpen(true); 
  };
  
  const handleDeleteField = async (id: string) => { 
    if (!confirm("تأكيد الحذف؟")) return; 
    const { error } = await supabase.from('registration_fields').delete().eq('id', id); 
    if (!error) setFields(fields.filter(f => f.id !== id)); 
  };
  
  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setFieldSaving(true);
    try {
      let finalOptions: string[] | null = null;
      if (currentField.field_type === 'select') {
          finalOptions = optionsText.split(',').map(s => s.trim()).filter(Boolean);
      } else if (currentField.field_type === 'policy') {
          // حفظ نص السياسة في الـ options
          finalOptions = [optionsText];
      }
      
      const fieldData = { 
          ...currentField, 
          options: finalOptions, 
          // تمكين الأدمن من التحكم في ما إذا كانت السياسة إجبارية أم لا
          is_required: currentField.is_required 
      };

      const { error } = await supabase.from('registration_fields').upsert(fieldData);
      if (error) throw error;
      
      await fetchFields(); 
      setIsModalOpen(false); 
    } catch (e: any) { 
        alert(e.message); 
    } finally { 
        setFieldSaving(false); 
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <button onClick={() => router.push("/admin/settings")} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition"><ArrowRight size={20} /></button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Database className="text-[#C89B3C]"/> إدارة الحقول الديناميكية والسياسات</h1>
        </div>
        <button onClick={handleAddNewField} className="bg-[#C89B3C] text-black px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#b38a35] text-sm"><Plus size={16} /> إضافة حقل / سياسة</button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8"/></div> : 
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right min-w-[600px]">
                <thead className="bg-black/20 text-white/50 text-xs uppercase border-b border-white/10">
                    <tr><th className="px-6 py-4">الترتيب</th><th className="px-6 py-4">النطاق</th><th className="px-6 py-4">العنوان</th><th className="px-6 py-4">النوع</th><th className="px-6 py-4">إجراءات</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                    {fields.map(f => (
                    <tr key={f.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-mono text-[#C89B3C]">{f.sort_order}</td>
                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-lg text-xs font-bold ${f.scope === 'registration' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{f.scope === 'registration' ? 'تسجيل مزود' : 'إضافة خدمة'}</span></td>
                        <td className="px-6 py-4 font-bold">{f.label}</td>
                        <td className="px-6 py-4"><span className={`bg-white/10 px-3 py-1 rounded-lg text-xs ${f.field_type === 'policy' ? 'bg-orange-500/20 text-orange-400' : ''}`}>{f.field_type === 'policy' ? 'سياسة/شروط' : f.field_type}</span></td>
                        <td className="px-6 py-4 flex gap-2">
                            <button onClick={()=>handleEditField(f)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition"><Edit size={16}/></button>
                            <button onClick={()=>handleDeleteField(f.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/></button>
                        </td>
                    </tr>
                ))}</tbody>
            </table>
        </div>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#1a1a1a] w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold">{currentField.id ? "تعديل الحقل" : "إضافة حقل جديد"}</h3>
                <button onClick={()=>setIsModalOpen(false)}><X className="text-white/50 hover:text-white"/></button>
            </div>
            <form onSubmit={handleSaveField} className="space-y-4">
              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <label className="text-xs text-[#C89B3C] mb-2 block font-bold">مكان الظهور (النطاق)</label>
                  <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={()=>setCurrentField({...currentField, scope: 'registration'})} className={`p-2 rounded-lg text-sm border transition ${currentField.scope === 'registration' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/40 border-white/10'}`}>تسجيل مزود جديد</button>
                      <button type="button" onClick={()=>setCurrentField({...currentField, scope: 'service'})} className={`p-2 rounded-lg text-sm border transition ${currentField.scope === 'service' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-black/40 border-white/10'}`}>نموذج إضافة خدمة</button>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs text-white/60 mb-1 block">نوع الحقل</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" value={currentField.field_type} onChange={e=>setCurrentField({...currentField, field_type:e.target.value})}>
                          <option value="text">نص قصير</option>
                          <option value="textarea">نص طويل</option>
                          <option value="tel">رقم هاتف</option>
                          <option value="select">قائمة منسدلة (خيارات)</option>
                          <option value="file">رفع ملف</option>
                          <option value="map">موقع خريطة</option>
                          <option value="policy">سياسات وشروط (موافقة)</option>
                      </select>
                  </div>
                  <div>
                      <label className="text-xs text-white/60 mb-1 block">ترتيب الظهور</label>
                      <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" value={currentField.sort_order} onChange={e=>setCurrentField({...currentField, sort_order: +e.target.value})}/>
                  </div>
              </div>
              <div>
                  <label className="text-xs text-white/60 mb-1 block">{currentField.field_type === 'policy' ? 'عنوان السياسة (مثال: سياسة المنصة)' : 'العنوان الظاهر للمستخدم'}</label>
                  <input required type="text" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" value={currentField.label} onChange={e => setCurrentField({...currentField, label: e.target.value})} />
              </div>
              
              {currentField.field_type === 'select' && (
                  <div>
                  <label className="text-xs text-white/60 mb-1 block">الخيارات (افصل بينها بفاصلة , )</label>
                      <input type="text" placeholder="مثال: خيار 1, خيار 2, خيار 3" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm" value={optionsText} onChange={e => setOptionsText(e.target.value)} />
                  </div>
              )}

              {currentField.field_type === 'policy' && (
                  <div>
                  <label className="text-xs text-white/60 mb-1 block">النص التفصيلي للسياسة والشروط</label>
                      <textarea placeholder="اكتب الشروط أو السياسات هنا ليقوم المزود بقراءتها..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white h-32 focus:border-[#C89B3C] outline-none text-sm resize-none" value={optionsText} onChange={e => setOptionsText(e.target.value)} />
                  </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="req" checked={currentField.is_required} onChange={e=>setCurrentField({...currentField, is_required: e.target.checked})} className="accent-[#C89B3C] w-4 h-4"/>
                  <label htmlFor="req" className="text-sm text-white/80 cursor-pointer select-none">
                      {currentField.field_type === 'policy' ? 'إجبار المزود على الموافقة لقبول الإرسال' : 'حقل إجباري'}
                  </label>
              </div>

              <button disabled={fieldSaving} className="w-full bg-[#C89B3C] text-black font-bold py-3 rounded-xl hover:bg-[#b38a35] mt-4 transition flex justify-center gap-2">
                  {fieldSaving ? <Loader2 className="animate-spin" /> : "حفظ الإعدادات"}
              </button>
            </form>
        </div>
        </div>
      )}
    </div>
  );
}