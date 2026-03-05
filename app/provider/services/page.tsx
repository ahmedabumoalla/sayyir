"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Plus, Loader2, X, MapPin, 
  Clock, Eye, Wifi, Car, Waves, Sparkles, Box, 
  Tv, Wind, ShieldCheck, Coffee, Flame, HeartPulse,
  Mountain, Calendar, Image as ImageIcon, FileText, PauseCircle, AlertTriangle, Info,
  Utensils, Video, CheckSquare, Activity, Users, Tent, Building, Home, Compass, Ticket, ShieldAlert
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import Link from "next/link";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ✅ ترجمة جميع المميزات
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

export default function ProviderServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [viewService, setViewService] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

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
    if (srvs) setServices(srvs);
    setLoading(false);
  };

  const handleRequestStop = async (service: any) => {
    const reason = prompt("فضلاً، اكتب سبب إيقاف الخدمة (سيظهر للإدارة):");
    if (!reason) return;

    try {
        const { error } = await supabase
            .from('services')
            .update({
                status: 'stop_requested',
                details: { ...service.details, stop_reason: reason }
            })
            .eq('id', service.id);

        if (error) throw error;

        await fetch('/api/emails/send', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ 
                type: 'new_service_notification', 
                providerName: providerInfo?.full_name, 
                serviceTitle: `${service.title} (طلب إيقاف: ${reason})` 
            }) 
        });

        alert("تم رفع طلب الإيقاف بنجاح.");
        setViewService(null);
        fetchInitialData();
    } catch (e: any) {
        alert("حدث خطأ: " + e.message);
    }
  };

  const getTranslatedFeature = (id: string) => {
      const feat = ALL_FEATURES_DICT[id];
      if(feat) return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><feat.icon size={14} className="text-[#C89B3C]" /> {feat.label}</span>;
      return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {id}</span>;
  };

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

  return (
    <div className={`space-y-8 animate-in fade-in p-6 ${tajawal.className}`} dir="rtl">
       <div className="flex justify-between items-center mb-8">
          <div>
             <h1 className="text-2xl font-bold text-white">إدارة خدماتي</h1>
             <p className="text-white/50 text-sm">أضف خدماتك (أكل، حرف، نزل، فعاليات) أو تجاربك السياحية.</p>
          </div>
          <Link href="/provider/services/add" className="bg-[#C89B3C] text-black px-5 py-2.5 rounded-xl font-bold hover:bg-[#b38a35] transition flex items-center gap-2 shadow-lg">
              <Plus size={18}/> خدمة جديدة
          </Link>
       </div>

       {/* قائمة الخدمات (الكروت) */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {services.length === 0 && !loading && (
               <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-white/5 text-white/30">
                   لا توجد خدمات مضافة بعد. ابدأ بإضافة خدمتك الأولى!
               </div>
           )}
           {loading ? (
               <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
           ) : (
               services.map(s => (
                   <div key={s.id} onClick={() => setViewService(s)} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden p-5 shadow-lg relative group hover:border-[#C89B3C]/50 transition cursor-pointer flex flex-col h-full">
                       
                       <div className="absolute top-4 left-4">
                           <span className={`px-2 py-1 rounded text-[10px] font-bold shadow-lg ${
                               s.status === 'approved' ? 'bg-emerald-500 text-black' : 
                               s.status === 'rejected' ? 'bg-red-500 text-white' : 
                               s.status === 'stop_requested' ? 'bg-orange-500 text-black' :
                               s.status === 'stopped' ? 'bg-gray-500 text-white' :
                               'bg-yellow-500 text-black'
                           }`}>
                               {s.status === 'approved' ? 'مفعلة' : 
                                s.status === 'rejected' ? 'مرفوضة' : 
                                s.status === 'stop_requested' ? 'جاري إيقافها' :
                                s.status === 'stopped' ? 'متوقفة' :
                                'بانتظار المراجعة'}
                           </span>
                       </div>

                       <h3 className="font-bold mb-1 text-lg group-hover:text-[#C89B3C] transition pr-16 line-clamp-1">{s.title}</h3>
                       <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded mb-3 inline-block w-fit">
                           {s.service_category === 'experience' ? 'تجربة سياحية' : `مرفق/فعالية: ${
                             s.sub_category === 'event' ? 'فعالية' : 
                             s.sub_category === 'lodging' ? 'نزل وتأجير' : 
                             s.sub_category === 'food' ? 'أكل ومشروبات' : 'حرف ومنتجات'
                           }`}
                       </span>
                       <p className="text-sm text-white/70 line-clamp-2 mb-4">{s.description}</p>

                       <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
                            <span className="font-bold text-[#C89B3C]">
                                {s.price === 0 ? "مجاني" : `${s.price} ﷼`}
                            </span>
                            <span className="text-xs text-white/40 flex items-center gap-1 group-hover:text-white transition">عرض التفاصيل <Eye size={12}/></span>
                       </div>
                   </div>
               ))
           )}
       </div>

       {/* نافذة عرض التفاصيل الكاملة للمزود */}
       {viewService && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1e1e1e] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
               
               {/* Header */}
               <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
                  <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-white">تفاصيل الخدمة المُدخلة</h2>
                  </div>
                  <button onClick={() => setViewService(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><X size={20}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                  
                  {/* ⚠️ تنبيهات الحالات المرفوضة والموقفة */}
                  {(viewService.status === 'deleted' || viewService.status === 'stopped' || viewService.status === 'rejected') && viewService.rejection_reason && (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
                          <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2"><Info size={20}/> {viewService.status === 'deleted' ? 'سبب الحذف (الأرشفة)' : viewService.status === 'stopped' ? 'سبب الإيقاف القسري من الإدارة' : 'سبب الرفض'}</h3>
                          <p className="text-white text-sm whitespace-pre-line bg-black/20 p-3 rounded-lg leading-relaxed">{viewService.rejection_reason}</p>
                      </div>
                  )}
                  {viewService.status === 'stop_requested' && viewService.details?.stop_reason && (
                      <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mb-6 animate-pulse">
                          <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle size={20}/> طلب إيقاف الخدمة قيد المراجعة</h3>
                          <p className="text-white text-sm">السبب المُرسل للإدارة: <span className="font-bold bg-orange-500/20 px-2 py-1 rounded">{viewService.details.stop_reason}</span></p>
                      </div>
                  )}

                  {/* ✅ معرض الصور والفيديو */}
                  {viewService.details?.images && viewService.details.images.length > 0 && (
                      <div className="mb-8">
                          <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><ImageIcon size={16}/> صور / فيديو العرض</h3>
                          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                              {viewService.details.images.map((url: string, i: number) => (
                                  <div key={i} onClick={() => setZoomedImage(url)} className="relative w-40 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 group cursor-pointer hover:border-[#C89B3C]/50 transition">
                                      {isVideo(url) ? ( <><video src={url} className="w-full h-full object-cover" muted /><div className="absolute inset-0 flex items-center justify-center bg-black/40"><Video className="text-white/80" size={24}/></div></> ) : ( <Image src={url} fill className="object-cover group-hover:scale-110 transition duration-500" alt={`Image ${i}`}/> )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* ========= العمود الأول (اليمين) ========= */}
                      <div className="space-y-6">
                          
                          {/* البيانات الأساسية */}
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                              <h3 className="text-[#C89B3C] font-bold text-sm mb-2">البيانات الأساسية</h3>
                              <div><p className="text-xs text-white/50">العنوان</p><p className="font-bold text-lg">{viewService.title}</p></div>
                              
                              {viewService.sub_category !== 'event' && (
                                  <div>
                                      <p className="text-xs text-white/50">{viewService.sub_category === 'lodging' ? 'سعر الليلة' : 'السعر'}</p>
                                      <p className="font-bold text-[#C89B3C] text-xl font-mono">{viewService.price === 0 ? 'مجاني' : `${viewService.price} ﷼`}</p>
                                  </div>
                              )}
                              
                              {viewService.sub_category === 'event' && viewService.details?.event_info?.child_price !== undefined && (
                                  <div>
                                      <p className="text-xs text-white/50">رسوم الأطفال</p>
                                      <p className="font-bold text-[#C89B3C] text-lg font-mono">{viewService.details.event_info.child_price === 0 ? 'مجاني' : `${viewService.details.event_info.child_price} ﷼`}</p>
                                  </div>
                              )}

                              <div><p className="text-xs text-white/50">الوصف</p><p className="text-white/80 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 whitespace-pre-line">{viewService.description}</p></div>
                          </div>

                          {/* ✅ تفاصيل النزل (Lodging) */}
                          {viewService.sub_category === 'lodging' && viewService.details?.lodging_type && (
                               <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                                  <h3 className="text-[#C89B3C] font-bold text-sm mb-2 flex items-center gap-2"><Home size={16}/> تفاصيل النزل السياحي</h3>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div><p className="text-xs text-white/50">نوع النزل</p><p className="font-bold">{viewService.details.lodging_type === 'other' ? viewService.details.custom_lodging_type : viewService.details.lodging_type}</p></div>
                                      <div><p className="text-xs text-white/50">عدد الوحدات/الغرف</p><p>{viewService.details.number_of_units || 'غير محدد'}</p></div>
                                      {viewService.details.area && <div><p className="text-xs text-white/50">المساحة</p><p>{viewService.details.area} م²</p></div>}
                                      {viewService.max_capacity && <div><p className="text-xs text-white/50">السعة (أشخاص)</p><p>{viewService.max_capacity}</p></div>}
                                      {viewService.details.target_audience && <div><p className="text-xs text-white/50">مخصص لـ</p><p>{viewService.details.target_audience === 'singles' ? 'عزاب' : viewService.details.target_audience === 'families' ? 'عوايل' : 'الكل'}</p></div>}
                                  </div>
                                  
                                  {viewService.details.apartment_details && (
                                      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-sm text-center">
                                          <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">غرف</span>{viewService.details.apartment_details.rooms}</div>
                                          <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">أسرة</span>{viewService.details.apartment_details.beds}</div>
                                          <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">حمامات</span>{viewService.details.apartment_details.bathrooms}</div>
                                      </div>
                                  )}
                                  {viewService.details.house_details && (
                                      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-4 gap-2 text-sm text-center">
                                          <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">أدوار</span>{viewService.details.house_details.floors}</div>
                                          <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">غرف نوم</span>{viewService.details.house_details.bedrooms}</div>
                                          <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">مجالس</span>{viewService.details.house_details.livingRooms}</div>
                                          <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">حمامات</span>{viewService.details.house_details.bathrooms}</div>
                                      </div>
                                  )}

                                  {viewService.details.deposit_config?.required && (
                                      <div className="mt-3 bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg text-xs">
                                          <p className="text-orange-400 font-bold mb-1"><ShieldCheck size={12} className="inline mr-1"/> تأمين مطلوب</p>
                                          <p className="text-white/80">الدفع: {viewService.details.deposit_config.paymentTime === 'with_booking' ? 'مع الحجز بالمنصة' : 'نقداً عند الوصول'}</p>
                                          <p className="text-white/80">الحالة: {viewService.details.deposit_config.isRefundable ? 'مسترد' : 'غير مسترد'}</p>
                                      </div>
                                  )}
                               </div>
                          )}

                          {/* ✅ تفاصيل التجربة (Experience) */}
                          {viewService.sub_category === 'experience' && viewService.details?.experience_info && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                  <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Compass size={16}/> تفاصيل التجربة السياحية</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div><p className="text-xs text-white/50">مستوى الصعوبة</p><p className="font-bold text-sm">{viewService.details.experience_info.difficulty}</p></div>
                                      <div><p className="text-xs text-white/50">مدة التجربة</p><p className="font-bold text-sm">{viewService.details.experience_info.duration}</p></div>
                                      <div><p className="text-xs text-white/50">الفئة المستهدفة</p><p className="font-bold text-sm">{viewService.details.experience_info.target_audience === 'both' ? 'الكل' : viewService.details.experience_info.target_audience === 'families' ? 'عوايل' : 'عزاب'}</p></div>
                                      <div><p className="text-xs text-white/50">دخول الأطفال</p><p className="font-bold text-sm">{viewService.details.experience_info.children_allowed ? 'مسموح' : 'ممنوع'}</p></div>
                                  </div>
                                  
                                  {safeArray(viewService.details.experience_info.dates).length > 0 && (
                                      <div>
                                          <p className="text-xs text-white/50 mb-1">تواريخ الانعقاد والوقت</p>
                                          <div className="flex flex-wrap gap-1.5">
                                              <span className="text-xs bg-[#C89B3C] text-black px-2 py-1 rounded font-bold">{viewService.details.experience_info.start_time}</span>
                                              {safeArray(viewService.details.experience_info.dates).map((d: string, i: number) => <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded dir-ltr">{d}</span>)}
                                          </div>
                                      </div>
                                  )}

                                  {(safeArray(viewService.details.experience_info.included_services).length > 0 || safeArray(viewService.details.experience_info.custom_services).length > 0) && (
                                      <div>
                                          <p className="text-xs text-white/50 mb-1">الخدمات المشمولة</p>
                                          <div className="flex flex-wrap gap-1">
                                              {safeArray(viewService.details.experience_info.included_services).map((srv: string, i: number) => (
                                                  <span key={i} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">{ALL_FEATURES_DICT[srv]?.label || srv}</span>
                                              ))}
                                              {safeArray(viewService.details.experience_info.custom_services).map((srv: string, i: number) => (
                                                  <span key={`cust-${i}`} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">{srv}</span>
                                              ))}
                                          </div>
                                      </div>
                                  )}

                                  {viewService.details.experience_info.food_details && (
                                      <div className="bg-white/5 p-3 rounded-lg text-xs space-y-1">
                                          <p className="text-[#C89B3C] font-bold mb-1">تفاصيل الطعام</p>
                                          <p><span className="text-white/50">النوع:</span> {viewService.details.experience_info.food_details.mealType}</p>
                                          <p><span className="text-white/50">المشروبات:</span> {viewService.details.experience_info.food_details.drinks}</p>
                                          <p><span className="text-white/50">المكونات:</span> {viewService.details.experience_info.food_details.contents}</p>
                                          {viewService.details.experience_info.food_details.calories && <p><span className="text-white/50">السعرات:</span> {viewService.details.experience_info.food_details.calories}</p>}
                                      </div>
                                  )}

                                  {viewService.details.experience_info.what_to_bring && <div><p className="text-xs text-white/50">المطلوب إحضاره</p><p className="text-sm bg-white/5 p-2 rounded-lg mt-1">{viewService.details.experience_info.what_to_bring}</p></div>}
                                  {viewService.details.experience_info.cancellation_policy && <div><p className="text-xs text-white/50">سياسة الإلغاء</p><p className="text-sm bg-white/5 p-2 rounded-lg mt-1">{viewService.details.experience_info.cancellation_policy}</p></div>}
                              </div>
                          )}

                          {/* ✅ تفاصيل الفعالية (Event) */}
                          {viewService.sub_category === 'event' && viewService.details?.event_info && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                  <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Ticket size={16}/> تفاصيل وتواريخ الفعالية</h3>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm bg-white/5 p-3 rounded-lg">
                                      <div><p className="text-xs text-white/50">من تاريخ</p><p className="font-bold dir-ltr">{viewService.details.event_info.dates?.startDate}</p></div>
                                      <div><p className="text-xs text-white/50">إلى تاريخ</p><p className="font-bold dir-ltr">{viewService.details.event_info.dates?.endDate}</p></div>
                                      <div><p className="text-xs text-white/50">من الساعة</p><p className="font-bold dir-ltr">{viewService.details.event_info.dates?.startTime}</p></div>
                                      <div><p className="text-xs text-white/50">إلى الساعة</p><p className="font-bold dir-ltr">{viewService.details.event_info.dates?.endTime}</p></div>
                                  </div>

                                  {(safeArray(viewService.details.event_info.activities).length > 0 || safeArray(viewService.details.event_info.custom_activities).length > 0) && (
                                      <div>
                                          <p className="text-xs text-white/50 mb-2">الفعاليات الداخلية المتاحة</p>
                                          <div className="flex flex-wrap gap-1.5">
                                              {safeArray(viewService.details.event_info.activities).map((act: string, i: number) => (
                                                  <span key={i} className="text-xs bg-[#C89B3C]/10 text-[#C89B3C] px-2 py-1 rounded">{ALL_FEATURES_DICT[act]?.label || act}</span>
                                              ))}
                                              {safeArray(viewService.details.event_info.custom_activities).map((act: string, i: number) => (
                                                  <span key={`cust-${i}`} className="text-xs bg-[#C89B3C]/10 text-[#C89B3C] px-2 py-1 rounded">{act}</span>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}

                          {/* الترخيص التجاري */}
                          {viewService.commercial_license && (
                              <div className="bg-[#C89B3C]/10 p-4 rounded-xl border border-[#C89B3C]/20 flex justify-between items-center">
                                  <div><h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><FileText size={16}/> الترخيص التجاري</h3><p className="text-xs text-white/50 mt-1">مرفق من قبلك</p></div>
                                  <a href={viewService.commercial_license} target="_blank" rel="noreferrer" className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-white transition flex items-center gap-2"><Eye size={14}/> عرض المرفق</a>
                              </div>
                          )}

                      </div>

                      {/* ========= العمود الثاني (اليسار) ========= */}
                      <div className="space-y-6">
                          
                          {/* الخريطة */}
                          {viewService.location_lat && viewService.location_lng && (
                              <div className="h-64 rounded-xl overflow-hidden border border-white/10 relative shadow-lg">
                                  <Map initialViewState={{ latitude: viewService.location_lat, longitude: viewService.location_lng, zoom: 12 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN}>
                                      <NavigationControl showCompass={false}/>
                                      <Marker latitude={viewService.location_lat} longitude={viewService.location_lng} color="#C89B3C"/>
                                  </Map>
                                  <a href={`http://googleusercontent.com/maps.google.com/4{viewService.location_lat},${viewService.location_lng}`} target="_blank" className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#C89B3C] hover:text-black transition"><MapPin size={14}/> عرض في الخرائط</a>
                              </div>
                          )}

                          {/* ✅ خدمات المرفق الديناميكية (Facility) */}
                          {viewService.sub_category === 'facility' && safeArray(viewService.details?.facility_services).length > 0 && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                  <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Activity size={16}/> الخدمات المتوفرة في المرفق</h3>
                                  <div className="space-y-2">
                                      {safeArray(viewService.details.facility_services).map((srv: any, i: number) => (
                                          <div key={i} className="flex gap-3 bg-white/5 p-3 rounded-lg items-center border border-white/5">
                                              {srv.image_url ? <Image src={srv.image_url} width={40} height={40} className="rounded object-cover" alt={srv.name}/> : <div className="w-10 h-10 bg-black/40 rounded flex items-center justify-center"><ImageIcon size={14} className="text-white/20"/></div>}
                                              <div><p className="text-sm font-bold text-white">{srv.name}</p>{srv.description && <p className="text-xs text-white/50">{srv.description}</p>}</div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* ✅ مميزات النزل (Lodging) */}
                          {viewService.sub_category === 'lodging' && (safeArray(viewService.details?.features).length > 0 || safeArray(viewService.details?.custom_features).length > 0) && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                  <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Sparkles size={16}/> مميزات النزل</h3>
                                  <div className="flex flex-wrap gap-2">
                                      {safeArray(viewService.details.features).map((feat: string, i: number) => getTranslatedFeature(feat))}
                                      {safeArray(viewService.details.custom_features).map((feat: string, i: number) => <span key={`c-${i}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {feat}</span>)}
                                  </div>
                              </div>
                          )}

                          {/* سياسات المكان */}
                          {viewService.details?.policies && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                                  <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><ShieldAlert size={16}/> سياسات وشروط المكان</h3>
                                  <p className="text-sm text-white/80 whitespace-pre-line bg-white/5 p-3 rounded-lg border border-white/5">{viewService.details.policies}</p>
                              </div>
                          )}

                          {/* ✅ أوقات الدوام للمرافق والنزل */}
                          {safeArray(viewService.work_schedule).length > 0 && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                  <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Clock size={16}/> أوقات العمل والدوام</h3>
                                  <div className="space-y-2">
                                      {safeArray(viewService.work_schedule).map((day: any, i: number) => (
                                          <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                              <span className="text-white/70 font-bold">{day.day}</span>
                                              {day.active ? (
                                                  <div className="flex flex-wrap justify-end gap-1.5">
                                                      {safeArray(day.shifts).map((s:any, idx:number) => <span key={idx} className="bg-white/10 px-2 py-0.5 rounded text-xs dir-ltr">{s.from} - {s.to}</span>)}
                                                  </div>
                                              ) : <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">مغلق</span>}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* زر طلب الإيقاف للمزود */}
                          {viewService.status === 'approved' && (
                              <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mt-8">
                                  <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2"><PauseCircle size={20}/> إيقاف الخدمة</h3>
                                  <p className="text-xs text-white/60 mb-4">يمكنك طلب إيقاف هذه الخدمة مؤقتاً أو نهائياً من العرض للعملاء.</p>
                                  <button 
                                    onClick={() => handleRequestStop(viewService)}
                                    className="w-full bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/50 font-bold py-3 rounded-lg transition text-sm flex items-center justify-center gap-2"
                                  >
                                    <AlertTriangle size={16}/> تقديم طلب إيقاف للخدمة
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
               </div>
            </div>
         </div>
       )}

       {/* تكبير الصور */}
       {zoomedImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-3 rounded-full"><X size={32} /></button>
            <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
                {zoomedImage.match(/mp4|webm|ogg/) ? (
                    <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl outline-none" onClick={(e) => e.stopPropagation()} />
                ) : (
                    <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain"/>
                )}
            </div>
        </div>
       )}

    </div>
  );
}