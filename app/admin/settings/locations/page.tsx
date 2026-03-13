"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, List, Edit, Trash2, Loader2, ArrowRight, UploadCloud, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

// الأنواع المفصلة والمحدثة بدقة بناءً على طلبك
const CATEGORY_TYPES = [
    { id: 'tourist_landmark', label: 'معلم سياحي' },
    { id: 'heritage_landmark', label: 'معلم تراثي' },
    { id: 'natural_landmark', label: 'معلم طبيعي' },
    { id: 'food', label: 'تجارب الأكل والمطاعم' },
    { id: 'experience', label: 'تجارب سياحية' },
    { id: 'lodging', label: 'نزل وسكن' },
    { id: 'facility', label: 'مرافق عامة' },
    { id: 'event', label: 'فعاليات' },
];

export default function LocationsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // حالة نافذة إضافة/تعديل تصنيف
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ id: '', name: '', type: 'tourist_landmark', icon_url: '' });
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      const { data: citiesData } = await supabase.from('cities').select('*').order('name');
      if (citiesData) setCities(citiesData);

      const { data: catsData } = await supabase.from('categories').select('*').order('type');
      if (catsData) setCategories(catsData);
      setLoading(false);
  };

  // ================= مدن =================
  const handleAddCity = async () => {
      const name = prompt("أدخل اسم المدينة الجديدة:");
      if (!name) return;
      const { data, error } = await supabase.from('cities').insert({ name }).select();
      if (!error && data) setCities([...cities, data[0]]);
  };

  const handleEditCity = async (id: string, currentName: string) => {
      const newName = prompt("تعديل اسم المدينة:", currentName);
      if (!newName || newName === currentName) return;
      const { error } = await supabase.from('cities').update({ name: newName }).eq('id', id);
      if (!error) setCities(cities.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  const handleDeleteCity = async (id: string) => {
      if(!confirm("تأكيد حذف المدينة؟")) return;
      const { error } = await supabase.from('cities').delete().eq('id', id);
      if(!error) setCities(cities.filter(c => c.id !== id));
  };

  // ================= تصنيفات =================
  const openCategoryModal = (cat: any = null) => {
      if (cat) {
          setCatForm({ id: cat.id, name: cat.name, type: cat.type || 'tourist_landmark', icon_url: cat.icon_url || '' });
      } else {
          setCatForm({ id: '', name: '', type: 'tourist_landmark', icon_url: '' });
      }
      setIsCatModalOpen(true);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingIcon(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `category_icon_${Date.now()}.${fileExt}`;
          
          // رفع الأيقونة لمجلد images
          const { error: uploadError } = await supabase.storage.from('images').upload(`icons/${fileName}`, file);
          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('images').getPublicUrl(`icons/${fileName}`);
          setCatForm({ ...catForm, icon_url: data.publicUrl });
      } catch (err: any) {
          alert("خطأ في رفع الأيقونة: " + err.message);
      } finally {
          setUploadingIcon(false);
      }
  };

  const handleSaveCategory = async () => {
      if (!catForm.name) return alert("يرجى إدخال اسم التصنيف");
      
      setSavingCat(true);
      try {
          if (catForm.id) {
              // تعديل
              const { error } = await supabase.from('categories')
                  .update({ name: catForm.name, type: catForm.type, icon_url: catForm.icon_url })
                  .eq('id', catForm.id);
              if (error) throw error;
              setCategories(categories.map(c => c.id === catForm.id ? catForm : c));
          } else {
              // إضافة
              const { data, error } = await supabase.from('categories')
                  .insert({ name: catForm.name, type: catForm.type, icon_url: catForm.icon_url })
                  .select();
              if (error) throw error;
              if (data) setCategories([...categories, data[0]]);
          }
          setIsCatModalOpen(false);
      } catch (err: any) {
          alert("حدث خطأ: " + err.message);
      } finally {
          setSavingCat(false);
      }
  };

  const handleDeleteCategory = async (id: string) => {
      if(!confirm("تأكيد حذف التصنيف؟")) return;
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if(!error) setCategories(categories.filter(c => c.id !== id));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8"/></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir="rtl">
      <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/admin/settings")} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition"><ArrowRight size={20} /></button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MapPin className="text-[#C89B3C]"/> المدن والتصنيفات للأيقونات</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ================= Cities ================= */}
        <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-[#C89B3C] flex items-center gap-2"><MapPin size={18} /> المدن المدعومة</h2>
              <button onClick={handleAddCity} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#b88a2c] transition">+ إضافة مدينة</button>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {cities.map((city) => (
                  <div key={city.id} className="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition">
                      <span className="font-bold">{city.name}</span>
                      <div className="flex items-center gap-2">
                          <button onClick={() => handleEditCity(city.id, city.name)} className="text-blue-400 hover:bg-blue-500/20 p-2 rounded-lg transition"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteCity(city.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition"><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))}
          </div>
        </section>

        {/* ================= Categories (Updated) ================= */}
        <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-[#C89B3C] flex items-center gap-2"><List size={18} /> التصنيفات وأيقونات الخريطة</h2>
              <button onClick={() => openCategoryModal()} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#b88a2c] transition">+ إضافة تصنيف</button>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {categories.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition">
                      <div className="flex items-center gap-4">
                          {cat.icon_url ? (
                              <img src={cat.icon_url} alt={cat.name} className="w-10 h-10 object-contain drop-shadow-lg" />
                          ) : (
                              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/30"><ImageIcon size={20}/></div>
                          )}
                          <div>
                              <span className="font-bold block text-white">{cat.name}</span>
                              <span className="text-[10px] text-[#C89B3C] bg-[#C89B3C]/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                                  {CATEGORY_TYPES.find(t => t.id === cat.type)?.label || 'غير محدد'}
                              </span>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => openCategoryModal(cat)} className="text-blue-400 hover:bg-blue-500/20 p-2 rounded-lg transition"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition"><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))}
          </div>
        </section>

      </div>

      {/* ================= Category Modal ================= */}
      {isCatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <List className="text-[#C89B3C]" /> {catForm.id ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
                      </h2>
                      <button onClick={() => setIsCatModalOpen(false)} className="text-white/50 hover:text-white"><X size={20}/></button>
                  </div>

                  <div className="space-y-5">
                      {/* الاسم */}
                      <div>
                          <label className="block text-xs text-white/60 mb-2">اسم التصنيف (يظهر للعميل)</label>
                          <input 
                              type="text" 
                              value={catForm.name} 
                              onChange={e => setCatForm({...catForm, name: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none transition"
                              placeholder="مثال: مطاعم تراثية، شاليهات..."
                          />
                      </div>

                      {/* النوع الأساسي */}
                      <div>
                          <label className="block text-xs text-white/60 mb-2">القسم الأساسي التابع له</label>
                          <select 
                              value={catForm.type}
                              onChange={e => setCatForm({...catForm, type: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none transition appearance-none"
                          >
                              {CATEGORY_TYPES.map(type => (
                                  <option key={type.id} value={type.id} className="bg-[#1e1e1e]">{type.label}</option>
                              ))}
                          </select>
                      </div>

                      {/* أيقونة الخريطة */}
                      <div>
                          <label className="block text-xs text-white/60 mb-2">أيقونة الماركر على الخريطة (PNG/SVG)</label>
                          <div className="flex items-center gap-4">
                              <div className="relative w-16 h-16 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center bg-black/20 hover:border-[#C89B3C] transition cursor-pointer overflow-hidden group">
                                  {uploadingIcon ? (
                                      <Loader2 className="animate-spin text-[#C89B3C]" size={20}/>
                                  ) : catForm.icon_url ? (
                                      <img src={catForm.icon_url} className="w-full h-full object-contain p-2" alt="icon"/>
                                  ) : (
                                      <UploadCloud className="text-white/40 group-hover:text-[#C89B3C]" size={20}/>
                                  )}
                                  <input type="file" accept="image/png, image/svg+xml" onChange={handleIconUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                              </div>
                              <div className="text-xs text-white/40">
                                  <p>يفضل صيغة PNG أو SVG بخلفية شفافة.</p>
                                  <p>المقاس المفضل (64x64) بيكسل.</p>
                              </div>
                          </div>
                      </div>

                      <button 
                          onClick={handleSaveCategory}
                          disabled={savingCat}
                          className="w-full bg-[#C89B3C] hover:bg-[#b88a2c] text-black font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 mt-4 shadow-lg shadow-yellow-900/20"
                      >
                          {savingCat ? <Loader2 className="animate-spin" size={18}/> : 'حفظ التصنيف'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}