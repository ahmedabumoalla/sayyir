"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, List, Edit, Trash2, Loader2, ArrowRight } from "lucide-react";

export default function LocationsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
      setLoading(true);
      const { data: citiesData } = await supabase.from('cities').select('*').order('name');
      if (citiesData) setCities(citiesData);

      const { data: catsData } = await supabase.from('categories').select('*').order('name');
      if (catsData) setCategories(catsData);
      setLoading(false);
  };

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

  const handleAddCategory = async () => {
      const name = prompt("أدخل اسم التصنيف الجديد:");
      if (!name) return;
      const { data, error } = await supabase.from('categories').insert({ name, type: 'place' }).select();
      if (!error && data) setCategories([...categories, data[0]]);
  };

  const handleEditCategory = async (id: string, currentName: string) => {
      const newName = prompt("تعديل اسم التصنيف:", currentName);
      if (!newName || newName === currentName) return;
      const { error } = await supabase.from('categories').update({ name: newName }).eq('id', id);
      if (!error) setCategories(categories.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  const handleDeleteCategory = async (id: string) => {
      if(!confirm("تأكيد حذف التصنيف؟")) return;
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if(!error) setCategories(categories.filter(c => c.id !== id));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8"/></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/admin/settings")} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition"><ArrowRight size={20} /></button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MapPin className="text-[#C89B3C]"/> المدن والتصنيفات</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cities */}
        <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-[#C89B3C] flex items-center gap-2"><MapPin size={18} /> المدن المدعومة</h2>
              <button onClick={handleAddCity} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#b88a2c] transition">+ إضافة</button>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
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

        {/* Categories */}
        <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-[#C89B3C] flex items-center gap-2"><List size={18} /> التصنيفات</h2>
              <button onClick={handleAddCategory} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#b88a2c] transition">+ إضافة</button>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {categories.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition">
                      <span className="font-bold">{cat.name}</span>
                      <div className="flex items-center gap-2">
                          <button onClick={() => handleEditCategory(cat.id, cat.name)} className="text-blue-400 hover:bg-blue-500/20 p-2 rounded-lg transition"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition"><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))}
          </div>
        </section>

      </div>
    </div>
  );
}