"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Edit, Trash2, Loader2, X, UploadCloud, AlertCircle, Video } from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export default function ProviderServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // الحقول الديناميكية (تأتي من الأدمن)
  const [fields, setFields] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [previews, setPreviews] = useState<Record<string, string[]>>({});
  
  // البيانات الأساسية الثابتة
  const [baseData, setBaseData] = useState({ title: "", price: "", description: "" });

  useEffect(() => {
    fetchServices();
    fetchAdminFields();
  }, []);

  const fetchServices = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('services').select('*').eq('provider_id', session.user.id).order('created_at', { ascending: false });
    if (data) setServices(data);
    setLoading(false);
  };

  const fetchAdminFields = async () => {
    // جلب الحقول المخصصة للخدمات (scope = service)
    const { data } = await supabase.from('registration_fields').select('*').eq('scope', 'service').order('sort_order');
    if (data) setFields(data);
  };

  const handleFileChange = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files) {
          const fileList = Array.from(e.target.files);
          setFiles(prev => ({...prev, [fieldId]: fileList}));
          // معاينة
          const urls = fileList.map(f => URL.createObjectURL(f));
          setPreviews(prev => ({...prev, [fieldId]: urls}));
      }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("يجب تسجيل الدخول");

        // 1. رفع الملفات
        const uploadedUrls: Record<string, string[]> = {};
        for (const [fieldId, fileList] of Object.entries(files)) {
            uploadedUrls[fieldId] = [];
            for (const file of fileList) {
                const fileName = `services/${Date.now()}_${file.name.replace(/\s/g, '-')}`;
                const { error } = await supabase.storage.from('provider-files').upload(fileName, file);
                if(!error) {
                    const { data } = supabase.storage.from('provider-files').getPublicUrl(fileName);
                    uploadedUrls[fieldId].push(data.publicUrl);
                }
            }
        }

        // 2. دمج الإجابات والصور
        const finalDetails = { ...answers, ...uploadedUrls };

        // 3. استخراج اللوكيشن إذا وجد
        let lat = null, lng = null;
        Object.values(answers).forEach((val: any) => {
            if(val && val.lat && val.lng) { lat = val.lat; lng = val.lng; }
        });

        const { error } = await supabase.from('services').insert([{
            provider_id: session.user.id,
            title: baseData.title,
            description: baseData.description,
            price: baseData.price,
            details: finalDetails, 
            location_lat: lat,
            location_lng: lng,
            status: 'pending',
            service_type: 'general' 
        }]);

        if (error) throw error;
        alert("✅ تم رفع الخدمة، وهي بانتظار موافقة الإدارة.");
        setIsModalOpen(false);
        fetchServices();
        setBaseData({ title: "", price: "", description: "" });
        setAnswers({});
        setFiles({});
        setPreviews({});

    } catch (err: any) {
        alert("خطأ: " + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("حذف الخدمة؟")) return;
      await supabase.from('services').delete().eq('id', id);
      fetchServices();
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

        {/* عرض الخدمات */}
        {loading ? <div className="text-center p-10 text-[#C89B3C]">جاري التحميل...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.length === 0 && <p className="text-white/40 col-span-full text-center py-10">لم تضف أي خدمات بعد.</p>}
                {services.map(service => (
                    <div key={service.id} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden group hover:border-[#C89B3C]/30 transition">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-white mb-1">{service.title}</h3>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${service.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : service.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {service.status === 'approved' ? 'مفعلة' : service.status === 'rejected' ? 'مرفوضة' : 'مراجعة'}
                                </span>
                            </div>
                            <p className="text-white/50 text-sm mb-4 line-clamp-2">{service.description}</p>
                            
                            {service.status === 'rejected' && service.rejection_reason && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                                    <p className="text-red-400 text-xs font-bold flex gap-1"><AlertCircle size={12}/> سبب الرفض:</p>
                                    <p className="text-white/80 text-xs mt-1">{service.rejection_reason}</p>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-sm font-bold text-[#C89B3C] border-t border-white/5 pt-3">
                                <span>{service.price} ريال</span>
                                <button onClick={() => handleDelete(service.id)} className="text-white/40 hover:text-red-400"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Modal الإضافة (ديناميكي بالكامل) */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#1a1a1a] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center">
                        <h3 className="font-bold text-white">إضافة خدمة جديدة</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="text-white/50 hover:text-white"/></button>
                    </div>
                    
                    <form onSubmit={handleAddService} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        
                        {/* 1. الحقول الأساسية الثابتة */}
                        <div className="space-y-4 border-b border-white/10 pb-6">
                            <h4 className="text-[#C89B3C] text-sm font-bold">معلومات أساسية</h4>
                            <input required placeholder="عنوان الخدمة" value={baseData.title} onChange={e => setBaseData({...baseData, title: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" />
                            <input required type="number" placeholder="السعر (ريال)" value={baseData.price} onChange={e => setBaseData({...baseData, price: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none" />
                            <textarea required placeholder="وصف الخدمة" rows={3} value={baseData.description} onChange={e => setBaseData({...baseData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none resize-none" />
                        </div>

                        {/* 2. الحقول الديناميكية (من الأدمن) */}
                        {fields.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[#C89B3C] text-sm font-bold">تفاصيل إضافية (مطلوبة من الإدارة)</h4>
                                
                                {fields.map(field => (
                                    <div key={field.id} className="space-y-2">
                                        <label className="text-xs text-white/70 block">
                                            {field.label} {field.is_required && <span className="text-red-500">*</span>}
                                        </label>

                                        {/* نوع نص */}
                                        {field.field_type === 'text' && (
                                            <input type="text" required={field.is_required} onChange={e=>setAnswers({...answers, [field.label]: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"/>
                                        )}

                                        {/* نوع ملفات */}
                                        {field.field_type === 'file' && (
                                            <div className="border border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-[#C89B3C] transition relative">
                                                <input type="file" multiple className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => handleFileChange(field.id, e)} required={field.is_required && !files[field.id]} />
                                                <UploadCloud className="mx-auto text-white/50 mb-2"/>
                                                <span className="text-xs text-white/50">اضغط لرفع الصور</span>
                                                {/* معاينة */}
                                                {previews[field.id] && (
                                                    <div className="flex gap-2 mt-2 overflow-x-auto justify-center">
                                                        {previews[field.id].map((src, i) => (
                                                            <img key={i} src={src} className="w-10 h-10 rounded object-cover border border-white/10"/>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* نوع خريطة */}
                                        {field.field_type === 'map' && (
                                            <div className="h-48 rounded-xl overflow-hidden border border-white/10 relative">
                                                <Map 
                                                    initialViewState={{ latitude: 18.2, longitude: 42.5, zoom: 10 }} 
                                                    mapStyle="mapbox://styles/mapbox/dark-v11" 
                                                    mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                                                    onClick={(e) => setAnswers({...answers, [field.label]: {lat: e.lngLat.lat, lng: e.lngLat.lng}})}
                                                >
                                                    {answers[field.label] && <Marker latitude={answers[field.label].lat} longitude={answers[field.label].lng} color="#C89B3C"/>}
                                                    <NavigationControl/>
                                                </Map>
                                                <p className="absolute bottom-2 right-2 text-[10px] bg-black/50 px-2 rounded text-white">اضغط لتحديد الموقع</p>
                                            </div>
                                        )}

                                        {/* نوع سياسة */}
                                        {field.field_type === 'policy' && (
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                                <p className="text-xs text-white/60 mb-2 max-h-20 overflow-y-auto">{field.options?.[0] || "الشروط والأحكام..."}</p>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" required={field.is_required} onChange={e=>setAnswers({...answers, [field.label]: e.target.checked})} className="accent-[#C89B3C] w-4 h-4"/>
                                                    <span className="text-xs font-bold text-white">{field.label}</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
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