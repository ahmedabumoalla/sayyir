"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation"; 
import { 
  Plus, Loader2, X, MapPin, CheckCircle, 
  Clock, Eye, Wifi, Car, Waves, Sparkles, Box, User, XCircle,
  Tv, Wind, ShieldCheck, Coffee, Flame, HeartPulse, PlayCircle,
  Mountain, Calendar, Image as ImageIcon, FileText, PauseCircle, AlertTriangle, Info,
  Utensils, Video, CheckSquare, Activity, Users, Tent, Building, Home, Compass, Ticket, ShieldAlert, Edit, Trash2, Send, Filter, CalendarDays, CalendarOff, LayoutList, Check
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import Image from "next/image";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const ALL_FEATURES_DICT: Record<string, any> = {
    'yard': { label: 'يوجد حوش', icon: MapPin },
    'view': { label: 'إطلالة مميزة', icon: Mountain },
    'farm': { label: 'مزرعة', icon: MapPin },
    'main_road': { label: 'على الطريق العام', icon: MapPin },
    'services_nearby': { label: 'بالقرب من خدمات', icon: MapPin },
    'wifi': { label: 'واي فاي', icon: Wifi },
    'parking': { label: 'مواقف خاصة', icon: Car },
    'bbq': { label: 'منطقة شواء', icon: Flame },
    'pool': { label: 'مسبح خاص', icon: Waves },
    'cleaning': { label: 'خدمة تنظيف', icon: Sparkles },
    'ac': { label: 'تكييف', icon: Wind },
    'tv': { label: 'تلفزيون', icon: Tv },
    'kitchen': { label: 'مطبخ مجهز', icon: Utensils },
    'volleyball': { label: 'ملعب طائرة', icon: Activity },
    'football': { label: 'ملعب كرة قدم', icon: Activity },
    'men_majlis': { label: 'مجلس رجال', icon: Users },
    'women_majlis': { label: 'مجلس نساء', icon: Users },
    'kids_area': { label: 'ألعاب أطفال', icon: Activity },
    'green_area': { label: 'مسطحات خضراء', icon: MapPin },
    'transport': { label: 'مركبة للنقل', icon: Car },
    'tent': { label: 'خيمة', icon: Tent },
    'floor_seating': { label: 'جلسات أرضية', icon: Users },
    'chairs': { label: 'كراسي', icon: Users },
    'water': { label: 'مياه شرب', icon: Coffee },
    'food': { label: 'وجبات طعام', icon: Utensils },
    'kiosks': { label: 'أكشاك بيع', icon: Building },
    'rides': { label: 'ملاهي وألعاب', icon: Activity },
    'seating': { label: 'جلسات عامة', icon: Users },
    'cable_car': { label: 'تلفريك', icon: MapPin },
    'live_shows': { label: 'عروض حية', icon: Tv }
};

const safeArray = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') { try { return JSON.parse(data); } catch { return []; } }
    if (typeof data === 'object') return Object.values(data);
    return [];
};

const formatTime12H = (time24: string) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const period = hour >= 12 ? 'مساءً' : 'صباحاً';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
};

export default function ProviderServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [viewService, setViewService] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [filter, setFilter] = useState("all");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const [actionModal, setActionModal] = useState<'stop' | 'delete' | null>(null); 
  const [actionLoading, setActionLoading] = useState(false);

  const [stopForm, setStopForm] = useState({ reason: '', startDate: '', endDate: '' });
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProviderInfo(profile);
    
    const { data: srvs, error } = await supabase.from('services').select('*').eq('provider_id', session.user.id).order('created_at', { ascending: false });
    if (error) console.error("Error fetching services:", error);
    
    if (srvs) {
        setServices(srvs);
        const counts = srvs.reduce((acc: any, curr: any) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {});
        setStatusCounts(counts);
    }
    setLoading(false);
  };

  const handleOpenAction = (type: 'stop' | 'delete', service: any) => {
      setActionModal(type);
      if (type === 'stop') {
          setStopForm({ reason: '', startDate: '', endDate: '' });
      } else if (type === 'delete') {
          setDeleteReason('');
      }
  };

  const submitStopRequest = async () => {
      if (!stopForm.reason.trim()) return alert("يرجى كتابة سبب الإيقاف.");
      setActionLoading(true);
      try {
          const stopDates = (stopForm.startDate || stopForm.endDate) ? { start: stopForm.startDate, end: stopForm.endDate } : null;
          const { error } = await supabase.from('services')
              .update({ status: 'stop_requested', stop_dates: stopDates, details: { ...viewService.details, stop_reason: stopForm.reason } })
              .eq('id', viewService.id);
          if (error) throw error;
          await notifyAdmin(`طلب إيقاف لخدمة: ${viewService.title} (السبب: ${stopForm.reason})`);
          alert("تم إرسال طلب الإيقاف للإدارة بنجاح.");
          closeAndRefresh();
      } catch (e: any) { alert("حدث خطأ: " + e.message); } finally { setActionLoading(false); }
  };

  const submitDeleteRequest = async () => {
      if (!deleteReason.trim()) return alert("يرجى كتابة سبب الحذف.");
      setActionLoading(true);
      try {
          const { error } = await supabase.from('services')
              .update({ status: 'delete_requested', delete_reason: deleteReason })
              .eq('id', viewService.id);
          if (error) throw error;
          await notifyAdmin(`طلب حذف نهائي لخدمة: ${viewService.title} (السبب: ${deleteReason})`);
          alert("تم إرسال طلب الحذف للإدارة بنجاح.");
          closeAndRefresh();
      } catch (e: any) { alert("حدث خطأ: " + e.message); } finally { setActionLoading(false); }
  };

  const notifyAdmin = async (title: string) => {
      await fetch('/api/emails/send', { 
          method: 'POST', 
          headers: {'Content-Type': 'application/json'}, 
          body: JSON.stringify({ type: 'new_service_notification', providerName: providerInfo?.full_name, serviceTitle: title }) 
      }).catch(e => console.error(e));
  };

  const closeAndRefresh = () => {
      setActionModal(null);
      setViewService(null);
      fetchInitialData();
  };

  const getTranslatedFeature = (id: string) => {
      const feat = ALL_FEATURES_DICT[id];
      if(feat) return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><feat.icon size={14} className="text-[#C89B3C]" /> {feat.label}</span>;
      return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {id}</span>;
  };

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'approved': return { text: 'مفعلة ونشطة', class: 'bg-emerald-500 text-black' };
          case 'rejected': return { text: 'مرفوضة', class: 'bg-red-500 text-white' };
          case 'stopped': return { text: 'موقفة من الإدارة', class: 'bg-gray-500 text-white' };
          case 'deleted': return { text: 'محذوفة', class: 'bg-red-900 text-white' };
          case 'stop_requested': return { text: 'طلب إيقاف قيد المراجعة', class: 'bg-orange-500 text-black' };
          case 'delete_requested': return { text: 'طلب حذف قيد المراجعة', class: 'bg-red-600 text-white' };
          case 'update_requested': return { text: 'طلب تعديل قيد المراجعة', class: 'bg-blue-500 text-white' };
          default: return { text: 'بانتظار المراجعة الأولية', class: 'bg-yellow-500 text-black' };
      }
  };

  const filteredServices = services.filter(s => filter === "all" || s.status === filter);

  return (
    <div className={`space-y-8 animate-in fade-in p-6 ${tajawal.className}`} dir="rtl">
       <div className="flex justify-between items-center mb-2">
          <div>
             <h1 className="text-2xl font-bold text-white">إدارة خدماتي</h1>
             <p className="text-white/50 text-sm mt-1">أضف خدماتك وتجاربك أو اطلب تعديلها وإيقافها.</p>
          </div>
          <Link href="/provider/services/add" className="bg-[#C89B3C] text-black px-5 py-2.5 rounded-xl font-bold hover:bg-[#b38a35] transition flex items-center gap-2 shadow-lg">
              <Plus size={18}/> <span className="hidden sm:inline">خدمة جديدة</span>
          </Link>
       </div>

       <div className="flex gap-3 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        {[
            { key: 'all', label: 'الكل', icon: Filter },
            { key: 'approved', label: 'المفعلة والنشطة', icon: CheckCircle }, 
            { key: 'pending', label: 'بانتظار المراجعة', icon: Clock }, 
            { key: 'update_requested', label: 'طلبات التعديل', icon: Edit }, 
            { key: 'stop_requested', label: 'طلبات الإيقاف', icon: PauseCircle }, 
            { key: 'stopped', label: 'المتوقفة', icon: PauseCircle }, 
            { key: 'rejected', label: 'المرفوضة', icon: XCircle }, 
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl border transition whitespace-nowrap ${filter === f.key ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'bg-black/20 text-white/60 border-white/10 hover:bg-white/5'}`}>
            <f.icon size={16} /> 
            {f.label}
            {f.key !== 'all' && statusCounts[f.key] > 0 && (
                <span className="bg-red-500 text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                    {statusCounts[f.key]}
                </span>
            )}
          </button>
        ))}
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredServices.length === 0 && !loading && (
               <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-white/5 text-white/30">
                   لا توجد خدمات تطابق هذا الفلتر.
               </div>
           )}
           {loading ? (
               <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
           ) : (
               filteredServices.map(s => {
                   const badge = getStatusBadge(s.status);
                   return (
                       <div key={s.id} onClick={() => setViewService(s)} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden p-5 shadow-lg relative group hover:border-[#C89B3C]/50 transition cursor-pointer flex flex-col h-full">
                           <div className="absolute top-4 left-4 z-10">
                               <span className={`px-2 py-1 rounded text-[10px] font-bold shadow-lg ${badge.class}`}>
                                   {badge.text}
                               </span>
                           </div>
                           <h3 className="font-bold mb-1 text-lg group-hover:text-[#C89B3C] transition pr-16 line-clamp-1">{s.title}</h3>
                           <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded mb-3 inline-block w-fit">
                               {s.service_category === 'experience' ? 'تجربة سياحية' : `مرفق/فعالية: ${s.sub_category}`}
                           </span>
                           <p className="text-sm text-white/70 line-clamp-2 mb-4">{s.description}</p>
                           <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
                                <span className="font-bold text-[#C89B3C] font-mono">{s.price === 0 ? "مجاني" : `${s.price} ﷼`}</span>
                                <span className="text-xs text-white/40 flex items-center gap-1 group-hover:text-white transition">عرض التفاصيل <Eye size={12}/></span>
                           </div>
                       </div>
                   );
               })
           )}
       </div>

       {/* ========================================================== */}
       {/* نافذة عرض التفاصيل الكاملة والعميقة للمزود (كل شي حرفياً) */}
       {/* ========================================================== */}
       {viewService && !actionModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1e1e1e] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
               
               <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl shrink-0">
                  <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-white"><LayoutList className="text-[#C89B3C]" size={24}/> إدارة وتفاصيل الخدمة</h2>
                  </div>
                  <button onClick={() => setViewService(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><X size={20}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8">
                  
                  {/* 1. التنبيهات والطلبات */}
                  {['stop_requested', 'delete_requested', 'update_requested', 'pending', 'rejected'].includes(viewService.status) && (
                      <div className={`border p-4 rounded-xl flex items-start gap-3 ${['rejected'].includes(viewService.status) ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                          <Info className={['rejected'].includes(viewService.status) ? 'text-red-400 shrink-0' : 'text-blue-400 shrink-0'} size={20}/>
                          <div>
                              <h3 className={`font-bold mb-1 ${['rejected'].includes(viewService.status) ? 'text-red-400' : 'text-blue-400'}`}>{getStatusBadge(viewService.status).text}</h3>
                              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">{viewService.rejection_reason ? `سبب الرفض: ${viewService.rejection_reason}` : 'هذه الخدمة قيد المراجعة حالياً من قبل الإدارة.'}</p>
                          </div>
                      </div>
                  )}

                  {/* 2. معرض الصور والفيديو (الشامل) */}
                  <div className="space-y-4">
                      <h3 className="text-[#C89B3C] font-bold text-sm border-r-4 border-[#C89B3C] pr-3 flex items-center gap-2">الوسائط المرئية <ImageIcon size={14}/></h3>
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                          {/* الصورة الرئيسية */}
                          {viewService.image_url && (
                             <div className="relative w-48 h-32 shrink-0 rounded-2xl overflow-hidden border border-[#C89B3C]/50 shadow-lg group cursor-zoom-in" onClick={() => setZoomedImage(viewService.image_url)}>
                                 {isVideo(viewService.image_url) ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black/40">
                                        <video src={`${viewService.image_url}#t=0.1`} className="w-full h-full object-cover opacity-80" muted playsInline/>
                                        <PlayCircle className="absolute text-white/80" size={32}/>
                                    </div>
                                 ) : <img src={viewService.image_url} className="w-full h-full object-cover" alt="Main"/>}
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white">صورة الغلاف</div>
                             </div>
                          )}
                          {/* مصفوفة الصور والفيديوهات في details */}
                          {safeArray(viewService.details?.images).map((url: string, i: number) => (
                              <div key={i} onClick={() => setZoomedImage(url)} className="relative w-48 h-32 shrink-0 rounded-2xl overflow-hidden border border-white/10 group cursor-zoom-in bg-black/40">
                                  {isVideo(url) ? (
                                      <div className="w-full h-full flex items-center justify-center">
                                          <video src={`${url}#t=0.1`} className="w-full h-full object-cover opacity-60" muted playsInline/>
                                          <PlayCircle className="absolute text-white/80" size={32}/>
                                      </div>
                                  ) : <img src={url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" alt={`Media ${i}`}/>}
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* ========= العمود الأول والوسط (بيانات شاملة) ========= */}
                      <div className="lg:col-span-2 space-y-8">
                          
                          {/* البيانات الأساسية */}
                          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-5">
                              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                                  <div>
                                      <h3 className="text-[#C89B3C] font-bold text-sm mb-1 uppercase tracking-wider">البيانات الأساسية للخدمة</h3>
                                      <h4 className="text-xl font-bold">{viewService.title}</h4>
                                  </div>
                                  <div className="text-left">
                                      <p className="text-xs text-white/50 mb-1">{viewService.sub_category === 'event' ? 'سعر التذكرة للبالغ' : viewService.sub_category === 'lodging' ? 'سعر الليلة' : 'السعر'}</p>
                                      <p className="text-2xl font-bold font-mono text-[#C89B3C]">{viewService.price === 0 ? 'مجاني' : `${viewService.price} ﷼`}</p>
                                  </div>
                              </div>
                              
                              {viewService.sub_category === 'event' && viewService.details?.event_info?.child_price !== undefined && (
                                  <div className="bg-black/20 p-3 rounded-lg flex items-center justify-between border border-white/5">
                                      <span className="text-sm font-bold text-white/70">سعر تذكرة الأطفال:</span>
                                      <span className="font-mono text-[#C89B3C] font-bold">{viewService.details.event_info.child_price === 0 ? 'مجاني' : `${viewService.details.event_info.child_price} ﷼`}</span>
                                  </div>
                              )}

                              <div>
                                  <p className="text-xs text-white/50 mb-2">الوصف التفصيلي</p>
                                  <div className="text-sm text-white/80 leading-loose bg-black/20 p-4 rounded-xl border border-white/5 whitespace-pre-line">{viewService.description}</div>
                              </div>
                          </div>

                          {/* تفاصيل النوع (Dynamic Logic) */}
                          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-6">
                              <h3 className="text-[#C89B3C] font-bold text-sm border-r-4 border-[#C89B3C] pr-3 flex items-center gap-2">المواصفات التقنية والبيانات <CheckCircle size={14}/></h3>
                              
                              {/* أ. النزل (Lodging) */}
                              {viewService.sub_category === 'lodging' && viewService.details && (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">نوع السكن</p><p className="font-bold text-sm">{viewService.details.lodging_type === 'other' ? viewService.details.custom_lodging_type : viewService.details.lodging_type}</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">المساحة</p><p className="font-bold text-sm">{viewService.details.area || 'غير محدد'} م²</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">الوحدات</p><p className="font-bold text-sm">{viewService.details.number_of_units || 'غير محدد'}</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">يتسع لـ</p><p className="font-bold text-sm">{viewService.max_capacity ? `${viewService.max_capacity} أشخاص` : 'غير محدد'}</p></div>
                                      
                                      {viewService.details.apartment_details && (
                                          <div className="col-span-full grid grid-cols-3 gap-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-center">
                                              <div><span className="block text-[10px] text-white/40">غرف النوم</span><span className="font-bold">{viewService.details.apartment_details.rooms || '0'}</span></div>
                                              <div><span className="block text-[10px] text-white/40">عدد الأسرة</span><span className="font-bold">{viewService.details.apartment_details.beds || '0'}</span></div>
                                              <div><span className="block text-[10px] text-white/40">دورات المياه</span><span className="font-bold">{viewService.details.apartment_details.bathrooms || '0'}</span></div>
                                          </div>
                                      )}

                                      {viewService.details.house_details && (
                                          <div className="col-span-full grid grid-cols-4 gap-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-center">
                                              <div><span className="block text-[10px] text-white/40">الأدوار</span><span className="font-bold">{viewService.details.house_details.floors || '0'}</span></div>
                                              <div><span className="block text-[10px] text-white/40">غرف النوم</span><span className="font-bold">{viewService.details.house_details.bedrooms || '0'}</span></div>
                                              <div><span className="block text-[10px] text-white/40">المجالس</span><span className="font-bold">{viewService.details.house_details.livingRooms || '0'}</span></div>
                                              <div><span className="block text-[10px] text-white/40">حمامات</span><span className="font-bold">{viewService.details.house_details.bathrooms || '0'}</span></div>
                                          </div>
                                      )}
                                  </div>
                              )}

                              {/* ب. التجربة (Experience) */}
                              {viewService.service_category === 'experience' && viewService.details?.experience_info && (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">المدة</p><p className="font-bold text-sm">{viewService.details.experience_info.duration || 'غير محدد'}</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">المستوى</p><p className="font-bold text-sm">{viewService.details.experience_info.difficulty === 'easy' ? 'سهل' : viewService.details.experience_info.difficulty === 'medium' ? 'متوسط' : viewService.details.experience_info.difficulty === 'hard' ? 'صعب' : 'غير محدد'}</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">الأطفال</p><p className="font-bold text-sm">{viewService.details.experience_info.children_allowed ? 'مسموح' : 'ممنوع'}</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">وقت البدء</p><p className="font-bold text-sm">{viewService.details.experience_info.start_time || 'غير محدد'}</p></div>
                                      
                                      <div className="col-span-full">
                                          <p className="text-xs text-white/50 mb-2">تواريخ الانعقاد المتاحة للتجربة</p>
                                          {safeArray(viewService.details.experience_info.dates).length > 0 ? (
                                              <div className="flex flex-wrap gap-2">
                                                  {safeArray(viewService.details.experience_info.dates).sort().map((d: string, i: number) => <span key={i} className="text-xs bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/30 px-3 py-1.5 rounded-lg dir-ltr font-mono">{d}</span>)}
                                              </div>
                                          ) : <p className="text-xs text-white/30 italic">لا توجد تواريخ محددة</p>}
                                      </div>

                                      {viewService.details.experience_info.what_to_bring && (
                                          <div className="col-span-full bg-black/20 p-4 rounded-xl border border-white/5">
                                              <p className="text-xs text-orange-400 font-bold mb-2">المطلوب إحضاره من العميل</p>
                                              <p className="text-sm text-white/80 whitespace-pre-line">{viewService.details.experience_info.what_to_bring}</p>
                                          </div>
                                      )}

                                      {viewService.details.experience_info.food_details && (
                                          <div className="col-span-full bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                                              <p className="text-xs text-emerald-400 font-bold mb-2 flex items-center gap-1"><Utensils size={14}/> تفاصيل الوجبات والمشروبات المشمولة</p>
                                              <p className="text-sm text-white/80 leading-relaxed"><span className="text-white/40 text-xs">النوع:</span> {viewService.details.experience_info.food_details.mealType || 'غير محدد'}</p>
                                              <p className="text-sm text-white/80 leading-relaxed"><span className="text-white/40 text-xs">المحتوى:</span> {viewService.details.experience_info.food_details.contents || 'غير محدد'}</p>
                                              <p className="text-sm text-white/80 leading-relaxed"><span className="text-white/40 text-xs">المشروبات:</span> {viewService.details.experience_info.food_details.drinks || 'غير محدد'}</p>
                                              {viewService.details.experience_info.food_details.calories && <p className="text-sm text-white/80 leading-relaxed"><span className="text-white/40 text-xs">السعرات:</span> {viewService.details.experience_info.food_details.calories}</p>}
                                          </div>
                                      )}
                                  </div>
                              )}

                              {/* ج. الفعالية (Event) */}
                              {viewService.sub_category === 'event' && viewService.details?.event_info && (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">تاريخ البدء</p><p className="font-bold text-sm dir-ltr text-right">{viewService.details.event_info.dates?.startDate || 'غير محدد'}</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">تاريخ الانتهاء</p><p className="font-bold text-sm dir-ltr text-right">{viewService.details.event_info.dates?.endDate || 'غير محدد'}</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">وقت البدء</p><p className="font-bold text-sm dir-ltr text-right">{viewService.details.event_info.dates?.startTime || 'غير محدد'}</p></div>
                                      <div className="bg-black/20 p-3 rounded-xl"><p className="text-[10px] text-white/40 mb-1">وقت الانتهاء</p><p className="font-bold text-sm dir-ltr text-right">{viewService.details.event_info.dates?.endTime || 'غير محدد'}</p></div>
                                  </div>
                              )}

                              {/* د. المرفق (Facility Services) */}
                              {viewService.sub_category === 'facility' && safeArray(viewService.details?.facility_services).length > 0 && (
                                  <div className="space-y-3 pt-2">
                                      <p className="text-xs text-[#C89B3C] font-bold">الخدمات والمرافق الداخلية:</p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {safeArray(viewService.details.facility_services).map((srv: any, i: number) => (
                                              <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5 flex gap-3 items-center">
                                                  {srv.image_url ? <img src={srv.image_url} className="w-12 h-12 rounded-lg object-cover" alt="img"/> : <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center"><ImageIcon size={14} className="text-white/20"/></div>}
                                                  <div>
                                                      <p className="text-sm font-bold text-white">{srv.name}</p>
                                                      {srv.description && <p className="text-[10px] text-white/50 line-clamp-1">{srv.description}</p>}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* المميزات المشمولة (للجميع) */}
                              <div className="space-y-3 pt-4 border-t border-white/10">
                                  <p className="text-xs text-white/40 font-bold">المميزات والخدمات المختارة والمضافة للخدمة:</p>
                                  <div className="flex flex-wrap gap-2">
                                      {/* مميزات النزل */}
                                      {safeArray(viewService.details?.features).map((f: string, i: number) => getTranslatedFeature(f))}
                                      {safeArray(viewService.details?.custom_features).map((f: string, i: number) => <span key={`c1-${i}`} className="text-[10px] bg-white/5 text-white/80 px-2 py-1 rounded border border-white/10 font-medium"><CheckSquare size={12} className="inline ml-1 text-[#C89B3C]"/> {f}</span>)}
                                      
                                      {/* مميزات التجربة */}
                                      {safeArray(viewService.details?.experience_info?.included_services).map((f: string, i: number) => getTranslatedFeature(f))}
                                      {safeArray(viewService.details?.experience_info?.custom_services).map((f: string, i: number) => <span key={`c2-${i}`} className="text-[10px] bg-white/5 text-white/80 px-2 py-1 rounded border border-white/10 font-medium"><CheckSquare size={12} className="inline ml-1 text-[#C89B3C]"/> {f}</span>)}
                                      
                                      {/* أنشطة الفعالية */}
                                      {safeArray(viewService.details?.event_info?.activities).map((f: string, i: number) => getTranslatedFeature(f))}
                                      {safeArray(viewService.details?.event_info?.custom_activities).map((f: string, i: number) => <span key={`c3-${i}`} className="text-[10px] bg-white/5 text-white/80 px-2 py-1 rounded border border-white/10 font-medium"><CheckSquare size={12} className="inline ml-1 text-[#C89B3C]"/> {f}</span>)}

                                      {/* إذا كان فارغاً */}
                                      {safeArray(viewService.details?.features).length === 0 && safeArray(viewService.details?.custom_features).length === 0 && 
                                       safeArray(viewService.details?.experience_info?.included_services).length === 0 && safeArray(viewService.details?.experience_info?.custom_services).length === 0 &&
                                       safeArray(viewService.details?.event_info?.activities).length === 0 && safeArray(viewService.details?.event_info?.custom_activities).length === 0 && (
                                           <span className="text-xs text-white/30 italic">لم يتم تحديد أي مميزات إضافية</span>
                                      )}
                                  </div>
                              </div>
                          </div>

                          {/* جدول المواعيد والدوام */}
                          {safeArray(viewService.work_schedule).length > 0 && (
                               <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                  <h3 className="text-[#C89B3C] font-bold text-sm mb-4 border-r-4 border-[#C89B3C] pr-3 flex items-center gap-2">أوقات العمل وجدول الدوام <Clock size={14}/></h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {safeArray(viewService.work_schedule).map((day: any, i: number) => (
                                          <div key={i} className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                              <span className="text-xs font-bold text-white/70">{day.day}</span>
                                              {day.active ? (
                                                  <div className="flex flex-col gap-1 items-end">
                                                      {safeArray(day.shifts).map((s:any, idx:number) => <span key={idx} className="text-[9px] bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 px-1.5 py-0.5 rounded font-mono dir-ltr">{formatTime12H(s.from)} - {formatTime12H(s.to)}</span>)}
                                                  </div>
                                              ) : <span className="text-[10px] text-red-400 bg-red-400/5 px-2 py-1 rounded">مغلق</span>}
                                          </div>
                                      ))}
                                  </div>
                               </div>
                          )}
                      </div>

                      {/* ========= العمود الثالث (جانبي: لوجستيات وأمان) ========= */}
                      <div className="space-y-6">
                          
                          {/* معلومات الموقع */}
                          <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                              <h3 className="text-white font-bold text-xs flex items-center gap-2"><MapPin size={14} className="text-[#C89B3C]"/> الموقع الجغرافي</h3>
                              {viewService.location_lat && viewService.location_lng ? (
                                  <div className="h-40 rounded-xl overflow-hidden border border-white/10 relative group">
                                      <Map initialViewState={{ latitude: viewService.location_lat, longitude: viewService.location_lng, zoom: 11 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN}>
                                          <Marker latitude={viewService.location_lat} longitude={viewService.location_lng} color="#C89B3C"/>
                                      </Map>
                                      <a href={`http://googleusercontent.com/maps.google.com/maps?q=${viewService.location_lat},${viewService.location_lng}`} target="_blank" className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-[#C89B3C] hover:text-black transition"><Compass size={10}/> فتح الخريطة</a>
                                  </div>
                              ) : <div className="h-40 bg-white/5 rounded-xl flex items-center justify-center text-xs text-white/30 italic">الموقع غير محدد</div>}
                          </div>

                          {/* الأوراق والسياسات */}
                          <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                              <h3 className="text-white font-bold text-xs flex items-center gap-2"><ShieldCheck size={14} className="text-[#C89B3C]"/> الأمان والسياسات</h3>
                              
                              {/* الترخيص */}
                              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                  <p className="text-[10px] text-white/40 mb-2">مرفق الترخيص التجاري / المهني:</p>
                                  {viewService.commercial_license ? (
                                      <a href={viewService.commercial_license} target="_blank" className="flex items-center justify-between group bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition">
                                          <span className="text-xs text-blue-400 font-bold">عرض المستند</span>
                                          <Eye size={14} className="text-blue-400"/>
                                      </a>
                                  ) : <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded block w-fit">لم يتم رفع ترخيص</span>}
                              </div>

                              {/* الملاحظات والسياسات المكتوبة */}
                              {viewService.details?.policies && (
                                  <div>
                                      <p className="text-[10px] text-[#C89B3C] font-bold mb-1">شروط وسياسات الحجز للمزود:</p>
                                      <div className="text-xs text-white/80 bg-white/5 p-3 rounded-lg leading-relaxed max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-line border border-white/5">{viewService.details.policies}</div>
                                  </div>
                              )}
                              
                              {viewService.details?.experience_info?.cancellation_policy && (
                                  <div>
                                      <p className="text-[10px] text-red-400 font-bold mb-1">سياسة الإلغاء والاسترجاع:</p>
                                      <div className="text-xs text-white/80 bg-red-500/5 p-3 rounded-lg leading-relaxed whitespace-pre-line border border-red-500/10">{viewService.details.experience_info.cancellation_policy}</div>
                                  </div>
                              )}
                          </div>

                          {/* التواريخ المحجوزة/المغلقة (للنزل والمرافق غالباً) */}
                          {safeArray(viewService.blocked_dates).length > 0 && (
                               <div className="bg-red-500/5 p-5 rounded-2xl border border-red-500/10 space-y-3">
                                  <h3 className="text-red-400 font-bold text-xs flex items-center gap-2"><CalendarOff size={14}/> التواريخ المغلقة (لا يمكن الحجز فيها)</h3>
                                  <div className="flex flex-wrap gap-1.5">
                                      {safeArray(viewService.blocked_dates).sort().map((d: string) => <span key={d} className="text-[10px] font-mono text-white/90 bg-red-500/20 px-2 py-1 rounded border border-red-500/30">{d}</span>)}
                                  </div>
                               </div>
                          )}

                          {/* إعدادات التأمين */}
                          {viewService.details?.deposit_config && viewService.details.deposit_config.required && (
                              <div className="bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20 space-y-2">
                                  <h3 className="text-orange-400 font-bold text-xs flex items-center gap-2"><ShieldAlert size={14}/> تأمين مسترد للمكان</h3>
                                  <p className="text-sm font-bold text-white">{viewService.details.deposit_config.amount} ﷼</p>
                                  <p className="text-[10px] text-white/70">يُدفع: {viewService.details.deposit_config.paymentTime === 'with_booking' ? 'عند الحجز عبر المنصة' : 'نقداً عند الوصول للمكان'}</p>
                                  <p className="text-[10px] text-white/70">حالة الاسترداد: {viewService.details.deposit_config.isRefundable ? 'مسترد بالكامل عند تسليم المكان سليم' : 'غير مسترد'}</p>
                              </div>
                          )}

                      </div>
                  </div>

               </div>
               
               {/* Footer */}
               <div className="p-6 border-t border-white/10 bg-black/40 rounded-b-3xl shrink-0 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                      <Clock size={14}/> تمت إضافة هذه الخدمة في: {new Date(viewService.created_at).toLocaleDateString('ar-SA')}
                  </div>
                  <div className="flex flex-wrap gap-3">
                      {viewService.status === 'approved' && (
                         <>
                            <button onClick={() => router.push(`/provider/services/${viewService.id}/edit`)} className="bg-[#C89B3C]/10 text-[#C89B3C] hover:bg-[#C89B3C] hover:text-black border border-[#C89B3C]/30 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2"><Edit size={16}/> طلب تعديل</button>
                            <button onClick={() => handleOpenAction('stop', viewService)} className="bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-black border border-orange-500/30 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2"><PauseCircle size={16}/> إيقاف مؤقت</button>
                            <button onClick={() => handleOpenAction('delete', viewService)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2"><Trash2 size={16}/> إيقاف نهائي (حذف)</button>
                         </>
                      )}
                      <button onClick={() => setViewService(null)} className="px-6 py-2 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition">إغلاق</button>
                  </div>
               </div>
            </div>
         </div>
       )}

       {/* ================= نوافذ الإجراءات المنبثقة (Modals) ================= */}
       
       {/* 1. نافذة طلب الإيقاف */}
       {actionModal === 'stop' && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95">
               <div className="bg-[#1e1e1e] w-full max-w-lg rounded-3xl border border-orange-500/20 shadow-2xl overflow-hidden flex flex-col">
                   <div className="p-6 border-b border-white/10 bg-orange-500/10 flex justify-between items-center">
                       <h2 className="text-xl font-bold flex items-center gap-2 text-orange-400"><PauseCircle size={20}/> طلب إيقاف الخدمة</h2>
                       <button onClick={() => setActionModal(null)} className="text-white/50 hover:text-white transition"><X size={24}/></button>
                   </div>
                   <div className="p-6 space-y-5">
                       <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                           <p className="text-sm text-orange-200">بمجرد إرسال الطلب، سيتم إخفاء الخدمة مؤقتاً عن العملاء لحين مراجعة الإدارة.</p>
                       </div>
                       <div>
                           <label className="block text-sm text-white/70 mb-2">سبب الإيقاف (إجباري)</label>
                           <textarea rows={3} placeholder="مثال: صيانة للمكان، سفر، ظروف خاصة..." value={stopForm.reason} onChange={e => setStopForm({...stopForm, reason: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-orange-500 outline-none resize-none" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs text-white/50 mb-1">من تاريخ (اختياري)</label>
                               <input type="date" value={stopForm.startDate} onChange={e => setStopForm({...stopForm, startDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white/80 focus:border-orange-500 outline-none dir-ltr text-right" />
                           </div>
                           <div>
                               <label className="block text-xs text-white/50 mb-1">إلى تاريخ (اختياري)</label>
                               <input type="date" value={stopForm.endDate} onChange={e => setStopForm({...stopForm, endDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white/80 focus:border-orange-500 outline-none dir-ltr text-right" />
                           </div>
                       </div>
                   </div>
                   <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
                       <button onClick={() => setActionModal(null)} className="px-6 py-2.5 rounded-xl hover:bg-white/10 transition text-white">تراجع</button>
                       <button onClick={submitStopRequest} disabled={actionLoading} className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-orange-500/20">{actionLoading ? <Loader2 className="animate-spin"/> : <><Send size={18}/> تأكيد الإيقاف</>}</button>
                   </div>
               </div>
           </div>
       )}

       {/* 2. نافذة طلب الحذف */}
       {actionModal === 'delete' && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95">
               <div className="bg-[#1e1e1e] w-full max-w-lg rounded-3xl border border-red-500/20 shadow-2xl overflow-hidden flex flex-col">
                   <div className="p-6 border-b border-white/10 bg-red-500/10 flex justify-between items-center">
                       <h2 className="text-xl font-bold flex items-center gap-2 text-red-500"><Trash2 size={20}/> طلب إيقاف نهائي (حذف)</h2>
                       <button onClick={() => setActionModal(null)} className="text-white/50 hover:text-white transition"><X size={24}/></button>
                   </div>
                   <div className="p-6 space-y-5">
                       <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                           <h3 className="font-bold text-red-400 mb-1 flex items-center gap-2"><AlertTriangle size={18}/> تحذير هام</h3>
                           <p className="text-sm text-red-200">طلب الحذف سيؤدي إلى إخفاء الخدمة فوراً. إذا وافقت الإدارة، سيتم أرشفة الخدمة بشكل نهائي ولن تتمكن من استعادتها.</p>
                       </div>
                       <div>
                           <label className="block text-sm text-white/70 mb-2">لماذا ترغب بحذف الخدمة؟ (إجباري)</label>
                           <textarea rows={3} placeholder="اكتب السبب هنا..." value={deleteReason} onChange={e => setDeleteReason(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-red-500 outline-none resize-none" />
                       </div>
                   </div>
                   <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
                       <button onClick={() => setActionModal(null)} className="px-6 py-2.5 rounded-xl hover:bg-white/10 transition text-white">تراجع</button>
                       <button onClick={submitDeleteRequest} disabled={actionLoading} className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-500/20">{actionLoading ? <Loader2 className="animate-spin"/> : <><Trash2 size={18}/> تقديم طلب الحذف</>}</button>
                   </div>
               </div>
           </div>
       )}

       {/* تكبير الصور */}
       {zoomedImage && (
        <div className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-3 rounded-full"><X size={32} /></button>
            <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
                {isVideo(zoomedImage) ? ( 
                    <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl outline-none" onClick={(e) => e.stopPropagation()} /> 
                ) : ( 
                    <img src={zoomedImage} className="max-w-full max-h-full object-contain drop-shadow-2xl" alt="Zoomed" onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}/> 
                )}
            </div>
        </div>
       )}

    </div>
  );
}