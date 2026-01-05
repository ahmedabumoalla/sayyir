"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Edit, Trash2, MapPin, Loader2, X, UploadCloud, AlertCircle, Eye, Info } from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default function ProviderServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // الحقول الديناميكية (من الأدمن)
  const [fields, setFields] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  
  // بيانات الخدمة الأساسية
  const [baseData, setBaseData] = useState({ title: "", price: "", description: "" });

  useEffect(() => {
    fetchServices();
    fetchFields();
  }, []);

  const fetchServices = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('services').select('*').eq('provider_id', session.user.id).order('created_at', { ascending: false });
    if (data) setServices(data);
    setLoading(false);
  };

  const fetchFields = async () => {
    // نجلب الحقول المخصصة للخدمات (يمكن تخصيصها في جدول registration_fields أو جدول منفصل، هنا سنستخدم نفس الجدول كنموذج)
    const { data } = await supabase.from('registration_fields').select('*').eq('applies_to', 'service').order('sort_order');
    // ملاحظة: تأكد من إضافة عمود `applies_to` في جدول الحقول لتمييز حقول التسجيل عن حقول الخدمات، أو استخدم كل الحقول مؤقتاً
    if (data && data.length > 0) setFields(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف الخدمة نهائياً؟")) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) setServices(prev => prev.filter(s => s.id !== id));
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("يجب تسجيل الدخول");

        // رفع الملفات
        const uploadedUrls: Record<string, string[]> = {};
        // (منطق الرفع مشابه لصفحة التسجيل - مختصر هنا)

        // تجميع البيانات
        const details = { ...answers, ...uploadedUrls };

        const { error } = await supabase.from('services').insert([{
            provider_id: session.user.id,
            title: baseData.title,
            description: baseData.description,
            price: baseData.price,
            details: details, // البيانات الديناميكية تخزن في JSONB
            status: 'pending', // دائماً معلق حتى يوافق الأدمن
            service_type: 'general' // أو يؤخذ من قائمة
        }]);

        if (error) throw error;
        alert("✅ تم رفع الخدمة، وهي بانتظار موافقة الإدارة.");
        setIsModalOpen(false);
        fetchServices();
        setBaseData({ title: "", price: "", description: "" });
        setAnswers({});

    } catch (err: any) {
        alert("خطأ: " + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-white">إدارة الخدمات</h1>
                <p className="text-white/50 text-sm">أضف وعدّل خدماتك المقدمة للعملاء.</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-[#C89B3C] text-black px-4 py-2 rounded-xl font-bold hover:bg-[#b38a35] flex items-center gap-2"><Plus size={18}/> خدمة جديدة</button>
        </div>

        {loading ? <div className="text-center p-10 text-[#C89B3C]">جاري التحميل...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.length === 0 && <p className="text-white/40 col-span-full text-center py-10">لم تضف أي خدمات بعد.</p>}
                {services.map(service => (
                    <div key={service.id} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden group hover:border-[#C89B3C]/30 transition">
                        <div className="h-40 bg-black/40 relative">
                            {/* صورة الخدمة (يمكن أخذها من details) */}
                            <div className="absolute top-3 left-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    service.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                                    service.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 
                                    'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                    {service.status === 'approved' ? 'مفعلة' : service.status === 'rejected' ? 'مرفوضة' : 'بانتظار المراجعة'}
                                </span>
                            </div>
                        </div>
                        <div className="p-5">
                            <h3 className="text-lg font-bold text-white mb-1">{service.title}</h3>
                            <p className="text-white/50 text-sm mb-4 line-clamp-2">{service.description}</p>
                            <div className="flex justify-between items-center text-sm font-bold text-[#C89B3C]">
                                <span>{service.price} ريال</span>
                                <button onClick={() => handleDelete(service.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                            
                            {/* سبب الرفض */}
                            {service.status === 'rejected' && service.rejection_reason && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-red-400 text-xs font-bold mb-1 flex items-center gap-1"><AlertCircle size={12}/> سبب الرفض:</p>
                                    <p className="text-white/80 text-xs">{service.rejection_reason}</p>
                                    <button className="mt-2 text-[10px] text-[#C89B3C] underline">تواصل مع الدعم الفني</button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Modal إضافة خدمة */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#1a1a1a] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center">
                        <h3 className="font-bold text-white">إضافة خدمة جديدة</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="text-white/50 hover:text-white"/></button>
                    </div>
                    <form onSubmit={handleAddService} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-white/60">عنوان الخدمة</label>
                            <input required type="text" value={baseData.title} onChange={e => setBaseData({...baseData, title: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/60">السعر (ريال)</label>
                            <input required type="number" value={baseData.price} onChange={e => setBaseData({...baseData, price: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/60">وصف مختصر</label>
                            <textarea required rows={3} value={baseData.description} onChange={e => setBaseData({...baseData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none resize-none" />
                        </div>

                        {/* الحقول الديناميكية (صور، خرائط، إلخ) */}
                        {fields.length > 0 && (
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-[#C89B3C] text-sm font-bold mb-3">تفاصيل إضافية مطلوبة</p>
                                {/* هنا يتم رسم الحقول بنفس طريقة صفحة التسجيل (مختصر للكود) */}
                                <p className="text-white/30 text-xs">سيتم تحميل الحقول المخصصة من الإدارة هنا...</p>
                            </div>
                        )}

                        <button disabled={submitting} type="submit" className="w-full bg-[#C89B3C] text-black font-bold py-3 rounded-xl hover:bg-[#b38a35] mt-4">
                            {submitting ? "جاري الإرسال..." : "رفع الخدمة للمراجعة"}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}