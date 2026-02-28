"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { 
  CheckCircle, XCircle, Eye, Edit, Trash2, 
  MapPin, Clock, FileText, ChevronLeft, Save, Loader2, Filter, User, 
  Sparkles, Box, Utensils, Mountain, Compass, Info, PauseCircle, AlertTriangle, CheckSquare, Image as ImageIcon, Video,
  Calendar, Map as MapIcon, ShieldAlert, Home, Send, HeartPulse, Waves, Car, Wind, Tv, Flame, Coffee, ShieldCheck, Ticket , Wifi, Percent
} from "lucide-react";
import { Tajawal } from "next/font/google";
import Link from "next/link";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// بيانات التواصل الرسمية للادمن
const ADMIN_CONTACT_INFO = `
للاستفسار يرجى التواصل مع الإدارة:
Email: admin@sayyir.com
Phone: +966 50 000 0000
`;

// مصفوفة لترجمة المميزات بناءً على الـ ID المحفوظ في قاعدة البيانات
const AMENITIES_DICT: Record<string, any> = {
    'wifi': { label: 'واي فاي (Wi-Fi)', icon: Wifi },
    'parking': { label: 'مواقف خاصة', icon: Car },
    'pool': { label: 'مسبح خاص', icon: Waves },
    'cleaning': { label: 'خدمة تنظيف', icon: Sparkles },
    'ac': { label: 'تكييف', icon: Wind },
    'tv': { label: 'تلفزيون / ستالايت', icon: Tv },
    'kitchen': { label: 'مطبخ مجهز', icon: Utensils },
    'bbq': { label: 'منطقة شواء', icon: Flame },
    'breakfast': { label: 'إفطار مشمول', icon: Coffee },
    'security': { label: 'حراسة / أمان', icon: ShieldCheck },
    'firstaid': { label: 'إسعافات أولية', icon: HeartPulse },
    'view': { label: 'إطلالة مميزة', icon: Mountain },
};

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  service_type: string;
  service_category?: string;
  sub_category?: string;
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
  location_lat?: number;
  location_lng?: number;
  created_at: string;
  rejection_reason?: string; 
  work_hours?: any[];
  blocked_dates?: string[];
  menu_items?: any[]; 
  details?: Record<string, any>; 
  commercial_license?: string;
  platform_commission?: number | null; 
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function ReviewServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [actionToConfirm, setActionToConfirm] = useState<'reject' | 'force_stop' | 'soft_delete' | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // States العمولة للخدمة
  const [useCustomCommission, setUseCustomCommission] = useState(false);
  const [customCommission, setCustomCommission] = useState("");
  const [savingCommission, setSavingCommission] = useState(false); // ✅ State جديد لزر حفظ العمولة فقط

  useEffect(() => {
    fetchServices();
  }, [filter]);

  const fetchServices = async () => {
    setLoading(true);
    
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
    } else {
      query = query.neq('status', 'deleted');
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase Error:", error);
      alert("خطأ في جلب البيانات: " + error.message);
    } else {
      setServices(data as unknown as Service[]);
    }
    setLoading(false);
  };

  const openModal = (service: Service) => {
    setSelectedService(service);
    setEditData({
      title: service.title,
      description: service.description,
      price: service.price,
      status: service.status,
    });
    setIsEditing(false);
    setRejectionReason("");
    setActionToConfirm(null);
    
    // ضبط إعدادات العمولة بناءً على الخدمة المحددة
    setUseCustomCommission(service.platform_commission !== null && service.platform_commission !== undefined);
    setCustomCommission(service.platform_commission ? service.platform_commission.toString() : "");
  };

  const isVideo = (url: string) => {
      return url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');
  };

  // ✅ دالة جديدة مخصصة فقط لتحديث العمولة مباشرة بدون تغيير حالة الخدمة
  const handleUpdateCommission = async () => {
      if (!selectedService) return;
      if (useCustomCommission && !customCommission) return alert("الرجاء إدخال النسبة.");

      setSavingCommission(true);
      try {
          const newCommissionValue = useCustomCommission ? Number(customCommission) : null;
          
          const { error } = await supabase.rpc('force_update_service_approval', {
              p_id: selectedService.id,
              p_status: selectedService.status, // نبقي الحالة كما هي
              p_reason: selectedService.rejection_reason || null,
              p_commission: newCommissionValue
          });

          // Fallback if RPC fails
          if (error && error.message.includes('Could not find the function')) {
             const { error: normalError } = await supabase.from('services').update({ platform_commission: newCommissionValue }).eq('id', selectedService.id);
             if (normalError) throw normalError;
          } else if (error) {
              throw error;
          }

          alert("تم تحديث نسبة العمولة بنجاح ✅");
          fetchServices(); // تحديث القائمة
          
          // تحديث الخدمة المحددة في الـ Modal لتعكس القيمة الجديدة
          setSelectedService({ ...selectedService, platform_commission: newCommissionValue });

      } catch (err: any) {
          console.error(err);
          alert("حدث خطأ أثناء تحديث العمولة: " + err.message);
      } finally {
          setSavingCommission(false);
      }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'soft_delete' | 'update' | 'approve_stop' | 'reject_stop' | 'force_stop') => {
    if (!selectedService) return;

    if (['reject', 'force_stop', 'soft_delete'].includes(action) && !rejectionReason.trim()) {
        return alert("الرجاء كتابة السبب والتعليمات للمزود.");
    }

    if (action === 'approve' && useCustomCommission && !customCommission) {
        return alert("الرجاء إدخال نسبة العمولة المخصصة أو اختيار الاعتماد على النسبة العامة للقسم.");
    }

    setActionLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("غير مصرح");

      const updates: any = {};
      let emailType = ''; 
      const finalReason = `${rejectionReason}\n\n--\n${ADMIN_CONTACT_INFO}`;

      if (action === 'approve') { 
          updates.status = 'approved'; 
          updates.rejection_reason = null; 
          updates.platform_commission = useCustomCommission ? Number(customCommission) : null;
          emailType = 'service_approved'; 
      }
      
      if (action === 'reject') { 
          updates.status = 'rejected'; 
          updates.rejection_reason = finalReason; 
          emailType = 'service_rejected'; 
      }

      if (action === 'approve_stop') { 
          updates.status = 'stopped'; 
          emailType = 'service_rejected'; 
      } 
      
      if (action === 'reject_stop') { 
          updates.status = 'approved'; 
          emailType = 'service_approved'; 
      } 

      if (action === 'force_stop') {
          updates.status = 'stopped';
          updates.rejection_reason = finalReason; 
          emailType = 'service_rejected';
      }

      if (action === 'soft_delete') {
          updates.status = 'deleted'; 
          updates.rejection_reason = finalReason; 
          emailType = 'service_rejected';
      }

      if (action === 'update') {
          updates.title = editData.title;
          updates.description = editData.description;
          updates.price = Number(editData.price);
      }

      // الحل الجذري لتجاوز كاش Supabase (استخدام RPC للموافقة وتحديث العمولة)
      let updateError;
      
      if (action === 'approve') {
          const { error: rpcError } = await supabase.rpc('force_update_service_approval', {
              p_id: selectedService.id,
              p_status: updates.status,
              p_reason: updates.rejection_reason || null,
              p_commission: updates.platform_commission !== undefined ? updates.platform_commission : null
          });
          updateError = rpcError;
          
          if (rpcError && rpcError.message.includes('Could not find the function')) {
             const { error: normalError } = await supabase.from('services').update(updates).eq('id', selectedService.id);
             updateError = normalError;
          }
      } else {
          const { error: normalError } = await supabase.from('services').update(updates).eq('id', selectedService.id);
          updateError = normalError;
      }

      if (updateError) throw updateError;

      if (['approve', 'reject', 'approve_stop', 'reject_stop', 'force_stop', 'soft_delete'].includes(action)) {
          const profileData: any = selectedService.profiles;
          const providerEmail = Array.isArray(profileData) ? profileData[0]?.email : profileData?.email;
          const providerName = Array.isArray(profileData) ? profileData[0]?.full_name : profileData?.full_name;
          
          let emailBodyReason = finalReason;
          if (action === 'approve_stop') emailBodyReason = "تمت الموافقة على طلبكم بإيقاف الخدمة.";
          if (action === 'reject_stop') emailBodyReason = "تم رفض طلب إيقاف الخدمة، الخدمة ما زالت نشطة.";

          if (providerEmail) {
              await fetch('/api/emails/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      type: emailType,
                      email: providerEmail,
                      name: providerName,
                      serviceTitle: selectedService.title,
                      reason: emailBodyReason
                  })
              }).catch(err => console.error("Email Error:", err));
          }
      }

      alert("تمت العملية بنجاح ✅");
      setSelectedService(null);
      fetchServices(); 

    } catch (error: any) {
      console.error(error);
      alert("حدث خطأ: " + error.message);
    } finally {
      setActionLoading(false);
      setActionToConfirm(null);
    }
  };

  return (
    <div className={`min-h-screen bg-[#1a1a1a] text-white p-6 lg:p-10 ${tajawal.className}`} dir="rtl">
      
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
        {[
            { key: 'pending', label: 'بانتظار المراجعة', icon: Clock }, 
            { key: 'stop_requested', label: 'طلبات الإيقاف', icon: PauseCircle }, 
            { key: 'approved', label: 'الخدمات المفعلة', icon: CheckCircle }, 
            { key: 'stopped', label: 'المتوقفة', icon: PauseCircle }, 
            { key: 'rejected', label: 'المرفوضة', icon: XCircle }, 
            { key: 'deleted', label: 'المحذوفة', icon: Trash2 }, 
            { key: 'all', label: 'الكل', icon: Filter }
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition whitespace-nowrap ${filter === f.key ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'bg-black/20 text-white/60 border-white/10 hover:bg-white/5'}`}>
            <f.icon size={16} /> {f.label}
          </button>
        ))}
      </div>

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
                   <div className="flex justify-between"><span className="text-white/50">السعر:</span><span className="text-[#C89B3C] font-bold">{service.price === 0 ? 'مجاني' : service.price}</span></div>
                   <div className="flex justify-between">
                       <span className="text-white/50">الحالة:</span>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                           service.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                           service.status === 'stop_requested' ? 'bg-orange-500/20 text-orange-400' : 
                           service.status === 'stopped' ? 'bg-gray-500/20 text-gray-400' :
                           service.status === 'deleted' ? 'bg-red-900/20 text-red-500' :
                           'bg-red-500/20 text-red-400'
                       }`}>
                           {service.status === 'approved' ? 'نشط' : 
                            service.status === 'stop_requested' ? 'طلب إيقاف' : 
                            service.status === 'stopped' ? 'متوقفة' : 
                            service.status === 'deleted' ? 'محذوفة' :
                            'مرفوضة'}
                       </span>
                   </div>
                   
                   {(service.status === 'deleted' || service.status === 'stopped' || service.status === 'rejected') && service.rejection_reason && (
                       <div className="mt-2 pt-2 border-t border-white/5">
                           <p className="text-[10px] text-red-400 font-bold mb-1">
                               {service.status === 'deleted' ? 'سبب الحذف:' : service.status === 'stopped' ? 'سبب الإيقاف:' : 'سبب الرفض:'}
                           </p>
                           <p className="text-[10px] text-white/60 line-clamp-2 leading-relaxed">
                               {service.rejection_reason.split('\n')[0]} 
                           </p>
                       </div>
                   )}
                </div>
                <button onClick={() => openModal(service)} className="mt-auto w-full py-2.5 bg-white/5 hover:bg-[#C89B3C] hover:text-black font-bold rounded-xl transition flex justify-center items-center gap-2 border border-white/5 group-hover:border-[#C89B3C]"><Eye size={18}/> معاينة واتخاذ إجراء</button>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL التفاصيل الكاملة --- */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#1e1e1e] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
              <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-white"><FileText className="text-[#C89B3C]" /> تفاصيل الخدمة كاملة</h2>
                  <p className="text-xs text-white/50 mt-1">المعرف: {selectedService.id}</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-lg transition ${isEditing ? 'bg-[#C89B3C] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`} title="تعديل"><Edit size={20}/></button>
                  <button onClick={() => setSelectedService(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><XCircle size={20}/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                
                {/* عرض السبب الكامل في الـ Modal */}
                {(selectedService.status === 'deleted' || selectedService.status === 'stopped' || selectedService.status === 'rejected') && selectedService.rejection_reason && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
                        <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                            <Info size={20}/> 
                            {selectedService.status === 'deleted' ? 'سبب الحذف (الأرشفة)' : selectedService.status === 'stopped' ? 'سبب الإيقاف القسري' : 'سبب الرفض'}
                        </h3>
                        <p className="text-white text-sm whitespace-pre-line bg-black/20 p-3 rounded-lg leading-relaxed">
                            {selectedService.rejection_reason}
                        </p>
                    </div>
                )}

                {/* ⚠️ تنبيه: طلب إيقاف الخدمة */}
                {selectedService.status === 'stop_requested' && selectedService.details?.stop_reason && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mb-6 animate-pulse">
                        <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle size={20}/> طلب إيقاف خدمة</h3>
                        <p className="text-white text-sm">سبب المزود: <span className="font-bold bg-orange-500/20 px-2 py-1 rounded">{selectedService.details.stop_reason}</span></p>
                    </div>
                )}

                {/* ✅ معرض الصور والفيديو (في الأعلى ليعطي نظرة عامة) */}
                {selectedService.details?.images && selectedService.details.images.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><ImageIcon size={16}/> صور / فيديو المكان</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {selectedService.details.images.map((url: string, i: number) => (
                                <div key={i} onClick={() => setZoomedImage(url)} className="relative w-40 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 group cursor-pointer hover:border-[#C89B3C]/50 transition">
                                    {isVideo(url) ? (
                                        <div className="w-full h-full relative">
                                            <video src={url} className="w-full h-full object-cover" muted />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Video className="text-white/80" size={24}/></div>
                                        </div>
                                    ) : (
                                        <Image src={url} fill className="object-cover group-hover:scale-110 transition duration-500" alt={`Place Image ${i}`}/>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* باقي التفاصيل (الشبكة) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* ========= العمود الأول (اليمين) ========= */}
                    <div className="space-y-6">
                        
                        {/* بيانات المزود */}
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><User size={16}/> بيانات المزود والتصنيف</h3>
                            <div className="space-y-2 text-sm">
                                <p className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50">اسم المزود:</span> <span>{selectedService.profiles?.full_name}</span></p>
                                <p className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50">البريد الإلكتروني:</span> <span>{selectedService.profiles?.email}</span></p>
                                <p className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/50">القسم الرئيسي:</span> <span className="font-bold">{selectedService.service_category === 'facility' ? 'مرفق أو فعالية' : 'تجربة سياحية'}</span></p>
                                <p className="flex justify-between"><span className="text-white/50">النوع الفرعي:</span> <span className="bg-white/10 px-2 rounded">{selectedService.sub_category}</span></p>
                            </div>
                        </div>

                        {/* البيانات الأساسية */}
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                            <h3 className="text-[#C89B3C] font-bold text-sm mb-2">البيانات الأساسية</h3>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white outline-none"/>
                                    <input type="number" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white outline-none"/>
                                    <textarea rows={4} value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white outline-none"/>
                                </div>
                            ) : (
                                <>
                                    <div><p className="text-xs text-white/50">العنوان</p><p className="font-bold text-lg">{selectedService.title}</p></div>
                                    <div><p className="text-xs text-white/50">السعر</p><p className="font-bold text-[#C89B3C] text-xl font-mono">{selectedService.price === 0 ? 'مجاني' : `${selectedService.price} ﷼`}</p></div>
                                    {selectedService.max_capacity && selectedService.max_capacity > 0 ? (
                                        <div><p className="text-xs text-white/50">السعة القصوى (أشخاص/تذاكر)</p><p className="font-bold text-sm">{selectedService.max_capacity}</p></div>
                                    ) : null}
                                    <div><p className="text-xs text-white/50">الوصف</p><p className="text-white/80 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 whitespace-pre-line">{selectedService.description}</p></div>
                                </>
                            )}
                        </div>

                        {/* تفاصيل السكن (إن وجدت) */}
                        {selectedService.sub_category === 'lodging' && (
                             <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-2 flex items-center gap-2"><Home size={16}/> تفاصيل السكن والنزل</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><p className="text-xs text-white/50">عدد الوحدات/الغرف</p><p>{selectedService.room_count}</p></div>
                                </div>
                             </div>
                        )}

                        {/* تفاصيل التجربة والفعاليات (مهم جداً) */}
                        {(selectedService.service_category === 'experience' || selectedService.sub_category === 'event' || selectedService.sub_category === 'general_experience') && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Compass size={16}/> تفاصيل التجربة / الفعالية</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedService.activity_type && <div><p className="text-xs text-white/50">نوع النشاط</p><p className="font-bold text-sm">{selectedService.activity_type}</p></div>}
                                    {selectedService.difficulty_level && <div><p className="text-xs text-white/50">مستوى الصعوبة</p><p className="font-bold text-sm">{selectedService.difficulty_level}</p></div>}
                                    {selectedService.duration && <div><p className="text-xs text-white/50">المدة الزمنية</p><p className="font-bold text-sm">{selectedService.duration}</p></div>}
                                    {selectedService.meeting_point && <div><p className="text-xs text-white/50">نقطة التجمع</p><p className="font-bold text-sm">{selectedService.meeting_point}</p></div>}
                                </div>
                                {selectedService.included_items && <div><p className="text-xs text-white/50">ماذا تشمل؟</p><p className="text-sm text-white/80 whitespace-pre-line bg-white/5 p-2 rounded-lg">{selectedService.included_items}</p></div>}
                                {selectedService.requirements && <div><p className="text-xs text-white/50">المتطلبات من العميل</p><p className="text-sm text-white/80 whitespace-pre-line bg-white/5 p-2 rounded-lg">{selectedService.requirements}</p></div>}
                            </div>
                        )}

                        {/* السياسات والشروط */}
                        {selectedService.details?.policies && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                                <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><ShieldAlert size={16}/> سياسات وشروط المكان</h3>
                                <p className="text-sm text-white/80 whitespace-pre-line bg-white/5 p-3 rounded-lg border border-white/5">
                                    {selectedService.details.policies}
                                </p>
                            </div>
                        )}

                        {/* الترخيص التجاري */}
                        {selectedService.commercial_license && (
                            <div className="bg-[#C89B3C]/10 p-4 rounded-xl border border-[#C89B3C]/20 flex justify-between items-center">
                                <div>
                                    <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><FileText size={16}/> الترخيص التجاري</h3>
                                    <p className="text-xs text-white/50 mt-1">مرفق من قبل المزود لإثبات الأهلية</p>
                                </div>
                                <a href={selectedService.commercial_license} target="_blank" rel="noreferrer" className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-white transition flex items-center gap-2">
                                    <Eye size={14}/> عرض المرفق
                                </a>
                            </div>
                        )}

                    </div>

                    {/* ========= العمود الثاني (اليسار) ========= */}
                    <div className="space-y-6">
                        
                        {/* الخريطة */}
                        {selectedService.location_lat && selectedService.location_lng && (
                            <div className="h-64 rounded-xl overflow-hidden border border-white/10 relative shadow-lg">
                                <Map initialViewState={{ latitude: selectedService.location_lat, longitude: selectedService.location_lng, zoom: 12 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN}>
                                    <NavigationControl showCompass={false}/>
                                    <Marker latitude={selectedService.location_lat} longitude={selectedService.location_lng} color="#C89B3C"/>
                                </Map>
                                <a href={`http://googleusercontent.com/maps.google.com/4{selectedService.location_lat},${selectedService.location_lng}`} target="_blank" className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#C89B3C] hover:text-black transition"><MapPin size={14}/> فتح في Google Maps</a>
                            </div>
                        )}

                        {/* المميزات والخيارات الإضافية */}
                        {(selectedService.amenities?.length ? selectedService.amenities.length > 0 : false || selectedService.details?.custom_amenities) && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Sparkles size={16}/> المميزات والخدمات</h3>
                                
                                {selectedService.amenities && selectedService.amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {selectedService.amenities.map((am: string, i: number) => {
                                            const amenityObj = AMENITIES_DICT[am];
                                            const IconComponent = amenityObj?.icon || CheckSquare;
                                            return (
                                                <span key={i} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
                                                    <IconComponent size={14} className="text-[#C89B3C]" />
                                                    {amenityObj ? amenityObj.label : am}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                {selectedService.details?.custom_amenities && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <p className="text-xs text-[#C89B3C] mb-1">مميزات إضافية مخصصة:</p>
                                        <p className="text-sm text-white/90 whitespace-pre-line bg-white/5 p-2 rounded-lg">{selectedService.details.custom_amenities}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* أوقات الدوام (للمرافق والمطاعم والنزل) */}
                        {selectedService.work_hours && selectedService.work_hours.length > 0 && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Clock size={16}/> أوقات العمل والدوام</h3>
                                <div className="space-y-2">
                                    {selectedService.work_hours.map((day: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                            <span className="text-white/70 font-bold">{day.day}</span>
                                            {day.active ? (
                                                <div className="flex flex-wrap justify-end gap-1.5">
                                                    {day.shifts?.map((s:any, idx:number) => (
                                                        <span key={idx} className="bg-white/10 px-2 py-0.5 rounded text-xs dir-ltr">{s.from} - {s.to}</span>
                                                    ))}
                                                </div>
                                            ) : <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">مغلق</span>}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* الأيام المحجوبة إن وجدت */}
                                {selectedService.blocked_dates && selectedService.blocked_dates.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-white/10">
                                        <p className="text-xs text-red-400 mb-2 font-bold">أيام مغلقة / مستثناة:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedService.blocked_dates.map((date, idx) => (
                                                <span key={idx} className="bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-1 rounded text-xs dir-ltr">{date}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* مواعيد الجلسات والفعاليات */}
                        {selectedService.details?.sessions && selectedService.details.sessions.length > 0 && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Calendar size={16}/> المواعيد والجلسات المتاحة</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {selectedService.details.sessions.map((session: any, i: number) => (
                                        <div key={i} className="bg-white/5 p-3 rounded-lg text-sm border border-white/5 flex items-start gap-3">
                                            <Calendar size={16} className="text-[#C89B3C] mt-0.5 shrink-0"/>
                                            {session.type === 'range' ? (
                                                <div className="space-y-1 w-full">
                                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                                        <span className="text-white/50 text-xs">تاريخ البدء:</span> 
                                                        <span className="dir-ltr font-bold text-[#C89B3C]">{session.startDate} | {session.startTime}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-1">
                                                        <span className="text-white/50 text-xs">تاريخ الانتهاء:</span> 
                                                        <span className="dir-ltr font-bold text-[#C89B3C]">{session.endDate} | {session.endTime}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between w-full">
                                                    <span className="text-white/50 text-xs">تاريخ ووقت الجلسة:</span>
                                                    <span className="dir-ltr font-bold text-[#C89B3C]">{session.date} | {session.time}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* المنيو / المنتجات */}
                        {selectedService.menu_items && selectedService.menu_items.length > 0 && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Box size={16}/> المنتجات / المنيو</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                    {selectedService.menu_items.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm border border-white/5">
                                            <div className="flex items-center gap-3">
                                                {item.image ? (
                                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition shadow-lg" onClick={() => setZoomedImage(item.image)}>
                                                        {isVideo(item.image) ? (
                                                            <video src={item.image} className="w-full h-full object-cover" muted />
                                                        ) : (
                                                            <Image src={item.image} fill className="object-cover" alt={item.name}/>
                                                        )}
                                                    </div>
                                                ) : <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white/30"><ImageIcon size={16}/></div>}
                                                <div>
                                                    <span className="block font-bold">{item.name}</span>
                                                    {item.qty && <span className="text-[10px] text-white/50">المخزون: {item.qty}</span>}
                                                </div>
                                            </div>
                                            <span className="block font-bold text-[#C89B3C] bg-black/40 px-2 py-1 rounded">{item.price} ﷼</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ✅ قسم إعدادات العمولة للخدمة (يظهر للخدمات النشطة وقيد المراجعة) */}
                {(selectedService.status === 'pending' || selectedService.status === 'approved') && (
                    <div className="mt-8 bg-black/40 border border-white/10 p-5 rounded-xl mx-8 mb-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Percent size={18}/> إعدادات عمولة المنصة (لهذه الخدمة تحديداً)</h3>
                            
                            {/* زر الحفظ يظهر فقط للخدمات المعتمدة أصلاً، لتحديث النسبة فقط دون تغيير الحالة */}
                            {selectedService.status === 'approved' && (
                                <button 
                                    onClick={handleUpdateCommission} 
                                    disabled={savingCommission}
                                    className="bg-[#C89B3C] hover:bg-white text-black font-bold text-xs px-4 py-2 rounded-lg transition flex items-center gap-2"
                                >
                                    {savingCommission ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                                    تحديث النسبة فقط
                                </button>
                            )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="service_commission" 
                                    checked={!useCustomCommission} 
                                    onChange={() => setUseCustomCommission(false)}
                                    className="accent-[#C89B3C] w-4 h-4"
                                />
                                <span className="text-sm text-white/90">اعتماد النسبة العامة (حسب قسم المالية)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="service_commission" 
                                    checked={useCustomCommission} 
                                    onChange={() => setUseCustomCommission(true)}
                                    className="accent-[#C89B3C] w-4 h-4"
                                />
                                <span className="text-sm text-white/90">تحديد نسبة مخصصة لهذه الخدمة</span>
                            </label>
                        </div>
                        
                        {useCustomCommission && (
                            <div className="mt-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    placeholder="اكتب النسبة (مثال: 15)" 
                                    className="w-48 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#C89B3C] outline-none text-white"
                                    value={customCommission}
                                    onChange={(e) => setCustomCommission(e.target.value)}
                                />
                                <span className="text-white/50 text-sm font-bold">% خصم من الإيراد</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-[#151515] rounded-b-3xl">
               {isEditing ? (
                  <button disabled={actionLoading} onClick={() => handleAction('update')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-blue-600/20">
                      {actionLoading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> حفظ التعديلات</>}
                  </button>
               ) : (
                  <div className="flex flex-col gap-4">
                      {!actionToConfirm && (
                          <div className="flex gap-4">
                              {selectedService.status === 'pending' && (
                                  <>
                                    <button disabled={actionLoading} onClick={() => handleAction('approve')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><CheckCircle size={20}/> قبول ونشر</button>
                                    <button onClick={() => setActionToConfirm('reject')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><XCircle size={20}/> رفض الطلب</button>
                                  </>
                              )}
                              {selectedService.status === 'stop_requested' && (
                                  <>
                                    <button disabled={actionLoading} onClick={() => handleAction('approve_stop')} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition">الموافقة على إيقاف النشاط</button>
                                    <button disabled={actionLoading} onClick={() => handleAction('reject_stop')} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-xl transition">رفض (إبقاء النشاط مفعل)</button>
                                  </>
                              )}
                              {selectedService.status === 'approved' && (
                                  <>
                                    <button onClick={() => setActionToConfirm('force_stop')} className="flex-1 bg-orange-600/20 text-orange-500 hover:bg-orange-600 hover:text-white font-bold py-3 rounded-xl transition border border-orange-600/30">إيقاف الخدمة (قسري)</button>
                                    <button onClick={() => setActionToConfirm('soft_delete')} className="flex-1 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white font-bold py-3 rounded-xl transition border border-red-600/30"><Trash2 size={18} className="inline mr-1 mb-1"/> حذف الخدمة (أرشفة)</button>
                                  </>
                              )}
                              {(selectedService.status === 'rejected' || selectedService.status === 'stopped' || selectedService.status === 'deleted') && (
                                  <div className="w-full text-center text-white/40 text-xs bg-black/40 py-3 rounded-xl border border-white/5">
                                      هذه الخدمة حالياً {selectedService.status === 'deleted' ? 'محذوفة ومؤرشفة' : selectedService.status === 'stopped' ? 'متوقفة' : 'مرفوضة'} ولا تتطلب إجراء.
                                  </div>
                              )}
                          </div>
                      )}

                      {/* منطقة كتابة السبب للإجراءات السلبية */}
                      {actionToConfirm && (
                          <div className="animate-in slide-in-from-bottom-2 fade-in space-y-3 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                              <h4 className="text-white text-sm font-bold flex items-center gap-2">
                                  <AlertTriangle size={16} className="text-red-400"/>
                                  {actionToConfirm === 'reject' ? 'سبب الرفض والملاحظات' : actionToConfirm === 'force_stop' ? 'سبب الإيقاف القسري' : 'سبب الحذف'}
                                  <span className="text-red-400 text-xs font-normal mr-auto">(سيتم إرساله للمزود عبر الإيميل)</span>
                              </h4>
                              <textarea 
                                  rows={3} 
                                  placeholder="اكتب الأسباب بوضوح ليتمكن المزود من تعديلها..." 
                                  value={rejectionReason} 
                                  onChange={e => setRejectionReason(e.target.value)} 
                                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[#C89B3C] outline-none"
                              />
                              <div className="flex gap-3 pt-2">
                                  <button 
                                      disabled={actionLoading} 
                                      onClick={() => handleAction(actionToConfirm)} 
                                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-lg transition flex justify-center items-center gap-2"
                                  >
                                      {actionLoading ? <Loader2 className="animate-spin" size={18}/> : <><Send size={16}/> تأكيد وإرسال الإشعار</>}
                                  </button>
                                  <button onClick={() => {setActionToConfirm(null); setRejectionReason("");}} className="px-6 bg-white/10 text-white font-bold py-2.5 rounded-lg hover:bg-white/20 transition">إلغاء الإجراء</button>
                              </div>
                          </div>
                      )}
                  </div>
               )}
            </div>

          </div>
        </div>
      )}

      {/* ✅ Lightbox (تكبير الصور والفيديو) */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-2 rounded-full"><XCircle size={32} /></button>
            <div className="relative w-full max-w-5xl h-[85vh] flex items-center justify-center">
                {isVideo(zoomedImage) ? (
                    <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                ) : (
                    <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain"/>
                )}
            </div>
        </div>
      )}

    </div>
  );
}