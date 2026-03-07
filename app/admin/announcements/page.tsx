"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Megaphone, Plus, Trash2, Loader2, Calendar, Link as LinkIcon, Power, PowerOff 
} from "lucide-react";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    link_url: "",
    end_date: "",
    is_active: true
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching announcements:", error);
    else setAnnouncements(data || []);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.end_date) return alert("الرجاء إدخال العنوان وتاريخ الانتهاء");

    setSaving(true);
    try {
      const { error } = await supabase.from('announcements').insert([formData]);
      if (error) throw error;

      alert("تمت إضافة الإعلان بنجاح!");
      setIsModalOpen(false);
      setFormData({ title: "", description: "", link_url: "", end_date: "", is_active: true });
      fetchAnnouncements();
    } catch (err: any) {
      alert("حدث خطأ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
      try {
          const { error } = await supabase.from('announcements').update({ is_active: !currentStatus }).eq('id', id);
          if (error) throw error;
          setAnnouncements(announcements.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
      } catch (e: any) {
          alert("خطأ في تغيير الحالة");
      }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان نهائياً؟")) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(announcements.filter((a) => a.id !== id));
    } catch (err: any) {
      alert("خطأ في الحذف");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Megaphone className="text-[#C89B3C]" /> إعلانات المنصة
          </h1>
          <p className="text-white/50 text-sm mt-1">أضف إعلانات وعروض ترويجية تظهر كشريط متحرك في الصفحة الرئيسية.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-[#C89B3C] text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#b88a2c] transition shadow-lg">
          <Plus size={18} /> إعلان جديد
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.length === 0 ? (
            <div className="col-span-full text-center py-20 text-white/40 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                لا توجد إعلانات مسجلة.
            </div>
          ) : (
            announcements.map((ann) => {
                const isExpired = new Date(ann.end_date) < new Date();
                return (
                  <div key={ann.id} className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${ann.is_active && !isExpired ? 'bg-[#1e1e1e] border-[#C89B3C]/30 shadow-lg' : 'bg-white/5 border-white/5 opacity-70'}`}>
                    
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg text-white line-clamp-1">{ann.title}</h3>
                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${isExpired ? 'bg-red-500/20 text-red-400' : ann.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {isExpired ? 'منتهي الصلاحية' : ann.is_active ? 'نشط' : 'متوقف'}
                        </span>
                    </div>

                    <p className="text-white/60 text-sm line-clamp-2 mb-4">{ann.description || "بدون وصف إضافي"}</p>

                    <div className="space-y-2 mb-6">
                        {ann.link_url && (
                            <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-400/10 p-2 rounded-lg border border-blue-400/20 truncate dir-ltr">
                                <LinkIcon size={12} className="shrink-0"/> {ann.link_url}
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 p-2 rounded-lg border border-white/5">
                            <Calendar size={12} className="text-[#C89B3C]"/> ينتهي في: <span className="dir-ltr">{new Date(ann.end_date).toLocaleString('ar-SA')}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                        <button 
                            onClick={() => handleToggleActive(ann.id, ann.is_active)} 
                            className={`text-xs font-bold flex items-center gap-1 transition ${ann.is_active ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}
                        >
                            {ann.is_active ? <><PowerOff size={14}/> إيقاف مؤقت</> : <><Power size={14}/> تفعيل</>}
                        </button>
                        
                        <button onClick={() => handleDelete(ann.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition" title="حذف">
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </div>
                );
            })
          )}
        </div>
      )}

      {/* Modal إضافة الإعلان */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e1e1e] w-full max-w-lg rounded-3xl border border-white/10 p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><Megaphone size={20} className="text-[#C89B3C]"/> إنشاء إعلان جديد</h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-white/60 mb-1 block">النص الرئيسي للإعلان (مطلوب)</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" placeholder="مثال: خصم 20% بمناسبة يوم التأسيس" />
              </div>
              
              <div>
                <label className="text-xs text-white/60 mb-1 block">الوصف الإضافي (اختياري)</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" placeholder="مثال: استخدم كود SAYYIR عند الدفع" />
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1 block">رابط التوجيه (اختياري)</label>
                <input type="text" value={formData.link_url} onChange={e => setFormData({...formData, link_url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none dir-ltr text-left" placeholder="/experiences" />
                <p className="text-[10px] text-white/40 mt-1">ضع الرابط الذي سينتقل إليه العميل عند النقر على الإعلان.</p>
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1 block">تاريخ ووقت انتهاء الإعلان (مطلوب)</label>
                <input required type="datetime-local" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} style={{colorScheme: 'dark'}} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button type="submit" disabled={saving} className="flex-1 bg-[#C89B3C] text-black font-bold py-3 rounded-xl hover:bg-[#b88a2c] transition flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin" /> : "نشر الإعلان"}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}