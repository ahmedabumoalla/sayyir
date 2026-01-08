"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { 
  CheckCircle, XCircle, Eye, Edit, Trash2, 
  MapPin, Clock, FileText, ChevronLeft, Save, Loader2, Filter, User, 
  Sparkles, Box, Utensils, Mountain, Compass, Info
} from "lucide-react";
import { Tajawal } from "next/font/google";
import Link from "next/link";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// تعريف الواجهة لتشمل كل الحقول الجديدة
interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  service_type: string;
  service_category?: string;
  sub_category?: string;
  
  // الحقول الجديدة
  stock_quantity?: number;
  room_count?: number;
  max_capacity?: number;
  amenities?: string[];
  activity_type?: string;
  difficulty_level?: string;
  duration?: string;
  meeting_point?: string;
  included_items?: string;
  requirements?: string;
  
  // الموقع
  location_lat?: number;
  location_lng?: number;

  created_at: string;
  rejection_reason?: string;
  work_hours?: any[];
  menu_items?: any[]; // قائمة المنيو أو المنتجات
  details?: Record<string, any>;
  commercial_license?: string; // رابط الترخيص

  profiles?: {
    full_name: string;
    email: string;
    // تم إزالة phone_number مؤقتاً لتجنب الأخطاء
  };
}

export default function ReviewServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchServices();
  }, [filter]);

 const fetchServices = async () => {
    setLoading(true);
    
    // 1. نجلب الخدمات أولاً بدون تعقيد العلاقات
    let query = supabase
      .from('services')
      .select(`
        *,
        profiles:provider_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase Error:", error);
      alert("خطأ في جلب البيانات: " + error.message);
    } else {
      // التأكد من أن البيانات مصفوفة
      setServices(data as unknown as Service[]);
    }
    setLoading(false);
  };

  const openModal = (service: Service) => {
    setSelectedService(service);
    // تعبئة بيانات التعديل الأولية
    setEditData({
      title: service.title,
      description: service.description,
      price: service.price,
      status: service.status,
      // يمكن إضافة حقول أخرى للتعديل هنا حسب الحاجة
    });
    setIsEditing(false);
    setRejectionReason("");
  };

  const handleAction = async (action: 'approve' | 'reject' | 'delete' | 'update') => {
    if (!selectedService) return;
    if (action === 'reject' && !rejectionReason) return alert("الرجاء كتابة سبب الرفض");
    if (action === 'delete' && !confirm("حذف نهائي؟")) return;

    setActionLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("غير مصرح");

      // 1. تحديث قاعدة البيانات
      const updates: any = {};
      if (action === 'approve') { updates.status = 'approved'; updates.rejection_reason = null; }
      if (action === 'reject') { updates.status = 'rejected'; updates.rejection_reason = rejectionReason; }
      if (action === 'update') {
          updates.title = editData.title;
          updates.description = editData.description;
          updates.price = Number(editData.price);
      }

      if (action === 'delete') {
          const { error } = await supabase.from('services').delete().eq('id', selectedService.id);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('services').update(updates).eq('id', selectedService.id);
          if (error) throw error;
      }

      // 2. إرسال الإيميل (مع الفحص الدقيق)
      if (action === 'approve' || action === 'reject') {
          // التعامل مع احتمالية أن يكون البروفايل مصفوفة أو كائن
          const profileData: any = selectedService.profiles;
          // أخذ الإيميل سواء كان مصفوفة أو كائن
          const providerEmail = Array.isArray(profileData) ? profileData[0]?.email : profileData?.email;
          const providerName = Array.isArray(profileData) ? profileData[0]?.full_name : profileData?.full_name;

          // فحص قبل الإرسال (Debug)
          if (!providerEmail) {
              alert("⚠️ تنبيه: تم حفظ الحالة ولكن لا يوجد بريد إلكتروني للمزود، لذلك لن يتم إرسال إيميل.");
              console.log("Profile Data:", profileData); // شيك الكونسول عشان تشوف شكل البيانات
          } else {
              // محاولة الإرسال
              const emailResponse = await fetch('/api/emails/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      type: action === 'approve' ? 'service_approved' : 'service_rejected',
                      email: providerEmail,
                      name: providerName || 'شريكنا العزيز',
                      serviceTitle: selectedService.title,
                      reason: rejectionReason
                  })
              });

              const emailResult = await emailResponse.json();

              if (!emailResponse.ok) {
                  // هنا سيظهر لك سبب فشل الإيميل بالضبط
                  alert(`⚠️ تم تغيير الحالة لكن فشل إرسال الإيميل!\nالسبب: ${emailResult.error}`);
              } else {
                  console.log("Email Sent Successfully:", emailResult);
              }
          }
      }

      alert("تمت العملية بنجاح");
      setSelectedService(null);
      fetchServices();

    } catch (error: any) {
      console.error(error);
      alert("حدث خطأ: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#1a1a1a] text-white p-6 lg:p-10 ${tajawal.className}`} dir="rtl">
      
      {/* Header & Filters (كما هي) */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">مراجعة الخدمات</h1>
          <p className="text-white/50">إدارة الخدمات والتجارب المقدمة من الشركاء.</p>
        </div>
        <Link href="/admin/dashboard" className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition">
          <ChevronLeft />
        </Link>
      </div>

      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {/* ... (نفس أزرار الفلترة السابقة) ... */}
        {[{ key: 'pending', label: 'بانتظار المراجعة', icon: Clock }, { key: 'approved', label: 'الخدمات المفعلة', icon: CheckCircle }, { key: 'rejected', label: 'المرفوضة', icon: XCircle }, { key: 'all', label: 'الكل', icon: Filter }].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition whitespace-nowrap ${filter === f.key ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'bg-black/20 text-white/60 border-white/10 hover:bg-white/5'}`}>
            <f.icon size={16} /> {f.label}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#C89B3C]" size={40}/></div> : services.length === 0 ? <div className="text-center p-20 bg-white/5 rounded-2xl border border-white/5 text-white/40">لا توجد خدمات.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden p-5 shadow-lg flex flex-col hover:border-[#C89B3C]/30 transition group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-[#C89B3C]/10 flex items-center justify-center text-[#C89B3C] font-bold text-lg">{service.title.charAt(0)}</div>
                     <div>
                        <h3 className="font-bold text-white line-clamp-1 text-lg">{service.title}</h3>
                        <p className="text-xs text-white/50 flex items-center gap-1"><User size={10}/> {service.profiles?.full_name}</p>
                     </div>
                  </div>
                </div>
                <div className="bg-black/20 p-3 rounded-xl mb-4 space-y-2 text-sm border border-white/5">
                   <div className="flex justify-between"><span className="text-white/50">السعر:</span><span className="text-[#C89B3C] font-bold">{service.price} ﷼</span></div>
                   <div className="flex justify-between"><span className="text-white/50">النوع:</span><span>{service.service_category === 'experience' ? 'تجربة' : 'مرفق'} {service.sub_category ? `(${service.sub_category})` : ''}</span></div>
                   <div className="flex justify-between"><span className="text-white/50">الحالة:</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${service.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : service.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{service.status === 'approved' ? 'نشط' : service.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></div>
                </div>
                <button onClick={() => openModal(service)} className="mt-auto w-full py-2.5 bg-white/5 hover:bg-[#C89B3C] hover:text-black font-bold rounded-xl transition flex justify-center items-center gap-2 border border-white/5 group-hover:border-[#C89B3C]"><Eye size={18}/> معاينة واتخاذ إجراء</button>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL للتفاصيل الكاملة --- */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#1e1e1e] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
              <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-white"><FileText className="text-[#C89B3C]" /> تفاصيل الخدمة الكاملة</h2>
                  <p className="text-xs text-white/50 mt-1">المعرف: {selectedService.id}</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-lg transition ${isEditing ? 'bg-[#C89B3C] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`} title="تعديل"><Edit size={20}/></button>
                 <button onClick={() => setSelectedService(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><XCircle size={20}/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* القسم اليمين: المعلومات الأساسية والمزود */}
                <div className="space-y-6">
                   {/* 1. المزود */}
                   <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><User size={16}/> بيانات المزود</h3>
                      <div className="space-y-2 text-sm">
                         <p className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50">الاسم:</span> <span>{selectedService.profiles?.full_name}</span></p>
                         <p className="flex justify-between"><span className="text-white/50">البريد:</span> <span>{selectedService.profiles?.email}</span></p>
                      </div>
                   </div>

                   {/* 2. تفاصيل الخدمة الأساسية */}
                   <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                      <h3 className="text-[#C89B3C] font-bold text-sm mb-2">البيانات الأساسية</h3>
                      <div className="space-y-1">
                         <label className="text-xs text-white/50">العنوان</label>
                         {isEditing ? <input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white outline-none"/> : <p className="font-bold text-lg">{selectedService.title}</p>}
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs text-white/50">السعر</label>
                         {isEditing ? <input type="number" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white outline-none"/> : <p className="font-bold text-[#C89B3C] text-xl font-mono">{selectedService.price} ﷼</p>}
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs text-white/50">الوصف</label>
                         {isEditing ? <textarea rows={4} value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white outline-none"/> : <p className="text-white/80 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">{selectedService.description}</p>}
                      </div>
                   </div>

                   {/* 3. الخريطة والموقع */}
                   {selectedService.location_lat && selectedService.location_lng && (
                       <div className="h-64 rounded-xl overflow-hidden border border-white/10 relative shadow-lg">
                           <Map initialViewState={{ latitude: selectedService.location_lat, longitude: selectedService.location_lng, zoom: 12 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN}>
                               <NavigationControl/>
                               <Marker latitude={selectedService.location_lat} longitude={selectedService.location_lng} color="#C89B3C"/>
                           </Map>
                           <a href={`https://www.google.com/maps/search/?api=1&query=${selectedService.location_lat},${selectedService.location_lng}`} target="_blank" className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#C89B3C] hover:text-black transition"><MapPin size={14}/> فتح في Google Maps</a>
                       </div>
                   )}
                </div>

                {/* القسم اليسار: التفاصيل الدقيقة (تجارب، نزل، منيو...) */}
                <div className="space-y-6">
                   
                   {/* تفاصيل التجارب */}
                   {selectedService.service_category === 'experience' && (
                       <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                           <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Compass size={16}/> تفاصيل التجربة</h3>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                               <div><p className="text-white/50 text-xs">النشاط</p><p>{selectedService.activity_type || '-'}</p></div>
                               <div><p className="text-white/50 text-xs">الصعوبة</p><p>{selectedService.difficulty_level || '-'}</p></div>
                               <div><p className="text-white/50 text-xs">المدة</p><p>{selectedService.duration || '-'}</p></div>
                               <div><p className="text-white/50 text-xs">السعة</p><p>{selectedService.max_capacity} شخص</p></div>
                           </div>
                           {selectedService.meeting_point && <div className="bg-white/5 p-2 rounded"><p className="text-white/50 text-xs">نقطة التجمع</p><p className="text-sm">{selectedService.meeting_point}</p></div>}
                           {selectedService.requirements && <div className="bg-white/5 p-2 rounded"><p className="text-white/50 text-xs">المتطلبات</p><p className="text-sm">{selectedService.requirements}</p></div>}
                       </div>
                   )}

                   {/* تفاصيل النزل */}
                   {selectedService.sub_category === 'lodging' && (
                       <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                           <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Mountain size={16}/> تفاصيل السكن</h3>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                               <div><p className="text-white/50 text-xs">عدد الوحدات</p><p>{selectedService.room_count}</p></div>
                               <div><p className="text-white/50 text-xs">السعة</p><p>{selectedService.max_capacity} شخص</p></div>
                           </div>
                           {selectedService.amenities && selectedService.amenities.length > 0 && (
                               <div>
                                   <p className="text-white/50 text-xs mb-2">المميزات</p>
                                   <div className="flex flex-wrap gap-2">
                                       {selectedService.amenities.map((am, i) => (
                                           <span key={i} className="text-xs bg-[#C89B3C]/10 text-[#C89B3C] px-2 py-1 rounded border border-[#C89B3C]/20">{am}</span>
                                       ))}
                                   </div>
                               </div>
                           )}
                       </div>
                   )}

                   {/* المنيو / المنتجات (للأكل والحرف) */}
                   {selectedService.menu_items && selectedService.menu_items.length > 0 && (
                       <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                           <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2">
                               {selectedService.sub_category === 'food' ? <Utensils size={16}/> : <Box size={16}/>} 
                               {selectedService.sub_category === 'food' ? 'قائمة الطعام' : 'المنتجات'}
                           </h3>
                           <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                               {selectedService.menu_items.map((item: any, i: number) => (
                                   <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm">
                                       <div className="flex items-center gap-3">
                                           {item.image && <Image src={item.image} alt={item.name} width={40} height={40} className="rounded object-cover"/>}
                                           <span>{item.name}</span>
                                       </div>
                                       <div className="text-left">
                                           <span className="block font-bold text-[#C89B3C]">{item.price} ﷼</span>
                                           {item.qty && <span className="text-[10px] text-white/50">الكمية: {item.qty}</span>}
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}

                   {/* المرفقات (الترخيص) */}
                   {selectedService.commercial_license && (
                       <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                           <h3 className="text-[#C89B3C] font-bold text-sm mb-2 flex items-center gap-2"><Info size={16}/> المرفقات</h3>
                           <a href={selectedService.commercial_license} target="_blank" className="text-blue-400 text-sm hover:underline flex items-center gap-2">
                               <FileText size={16}/> عرض الترخيص التجاري
                           </a>
                       </div>
                   )}

                   {/* أوقات العمل */}
                   {selectedService.work_hours && (
                       <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                           <h3 className="text-[#C89B3C] font-bold text-sm mb-2 flex items-center gap-2"><Clock size={16}/> أوقات التوفر</h3>
                           <div className="grid grid-cols-2 gap-2">
                               {selectedService.work_hours.filter((w: any) => w.is_active).map((w: any, i: number) => (
                                   <div key={i} className="text-xs bg-white/5 p-1.5 rounded flex justify-between">
                                       <span>{w.day}</span>
                                       <div className="flex flex-col">
                                           {w.shifts?.map((s: any, idx: number) => <span key={idx}>{s.from} - {s.to}</span>)}
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}
                </div>

              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-[#151515] rounded-b-3xl">
               {isEditing ? (
                  <button disabled={actionLoading} onClick={() => handleAction('update')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-blue-600/20">
                     {actionLoading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> حفظ التعديلات</>}
                  </button>
               ) : selectedService.status === 'pending' ? (
                  <div className="flex gap-4">
                     <button disabled={actionLoading} onClick={() => handleAction('approve')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-600/20">
                        {actionLoading ? <Loader2 className="animate-spin"/> : <><CheckCircle size={20}/> قبول ونشر</>}
                     </button>
                     <div className="flex-[2] flex gap-2">
                        <input type="text" placeholder="سبب الرفض (إجباري)..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-sm focus:border-red-500 outline-none transition"/>
                        <button disabled={actionLoading} onClick={() => handleAction('reject')} className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 rounded-xl transition shadow-lg shadow-red-600/20">رفض</button>
                     </div>
                  </div>
               ) : (
                  <button disabled={actionLoading} onClick={() => handleAction('delete')} className="w-full border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-bold py-3 rounded-xl transition">
                      {actionLoading ? <Loader2 className="animate-spin mx-auto"/> : "حذف الخدمة نهائياً"}
                  </button>
               )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}