"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  Calendar, MapPin, Clock, Users, CheckCircle2, XCircle, Hourglass, Home, Ticket, MapIcon, Box,
  AlertCircle, CreditCard, QrCode, Timer, Loader2, Navigation, ChevronUp,
  Image as ImageIcon, FileText, Info, CheckSquare, Utensils, PlayCircle, Mountain, Wifi, Car, Flame, Waves, Sparkles, Wind, Tv, Activity, Tent, Building, ShieldCheck, HeartPulse, Coffee, ShieldAlert, CalendarDays, CalendarOff, Compass, Briefcase, X
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { QRCodeSVG } from 'qrcode.react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ✅ قاموس لترجمة جميع المميزات بدقة
const ALL_FEATURES_DICT: Record<string, any> = {
    'yard': { label: 'يوجد حوش', icon: MapPin },
    'view': { label: 'إطلالة مميزة', icon: Mountain },
    'farm': { label: 'مزرعة', icon: MapPin },
    'main_road': { label: 'على الطريق العام', icon: MapPin },
    'services_nearby': { label: 'بالقرب من خدمات', icon: MapPin },
    'wifi': { label: 'واي فاي مجاني', icon: Wifi },
    'parking': { label: 'مواقف سيارات', icon: Car },
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
    'tent': { label: 'خيمة للاستراحة', icon: Tent },
    'floor_seating': { label: 'جلسات أرضية', icon: Users },
    'chairs': { label: 'كراسي متنقلة', icon: Users },
    'water': { label: 'مياه شرب', icon: Coffee },
    'food': { label: 'وجبات طعام', icon: Utensils },
    'kiosks': { label: 'أكشاك بيع', icon: Building },
    'rides': { label: 'ملاهي وألعاب', icon: Activity },
    'seating': { label: 'جلسات عامة', icon: Users },
    'cable_car': { label: 'تلفريك', icon: MapPin },
    'live_shows': { label: 'عروض حية', icon: Tv },
    'security': { label: 'حراسة / أمان', icon: ShieldCheck },
    'firstaid': { label: 'إسعافات أولية', icon: HeartPulse },
    'breakfast': { label: 'إفطار مشمول', icon: Coffee }
};

const safeArray = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') { try { return JSON.parse(data); } catch { return []; } }
    if (typeof data === 'object') return Object.values(data);
    return [];
};

const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

const formatTime12H = (timeStr: string) => {
    if (!timeStr) return "";
    try {
        if (timeStr.includes('T')) return new Date(timeStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
        const [hourStr, minute] = timeStr.split(':');
        let hour = parseInt(hourStr, 10);
        const period = hour >= 12 ? 'مساءً' : 'صباحاً';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
    } catch { return timeStr; }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("يتم الحساب...");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const exp = new Date(expiresAt).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setTimeLeft("انتهت المهلة");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}س : ${minutes}د : ${seconds}ث`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className={`font-mono font-bold dir-ltr inline-block ${isExpired ? 'text-red-400' : 'text-blue-400'}`}>{timeLeft}</span>;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("bookings")
        .select(`*, services:service_id (*, profiles:provider_id(full_name, email, phone))`)
        .eq("user_id", session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data as any);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = trips.filter((trip) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['pending', 'approved_unpaid', 'confirmed'].includes(trip.status);
    if (filter === 'completed') return trip.status === 'completed';
    if (filter === 'cancelled') return ['cancelled', 'rejected'].includes(trip.status);
    return true;
  });

  const toggleExpand = (id: string) => {
      setExpandedTripId(expandedTripId === id ? null : id);
  };

  const getTranslatedFeature = (id: string) => {
      const feat = ALL_FEATURES_DICT[id];
      if(feat) return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><feat.icon size={14} className="text-[#C89B3C]" /> {feat.label}</span>;
      return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {id}</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/20"><CheckCircle2 size={14} /> مؤكد ومدفوع</div>;
      case 'approved_unpaid': return <div className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20"><Hourglass size={14} /> بانتظار الدفع</div>;
      case 'pending': return <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full text-xs font-bold border border-amber-400/20"><Hourglass size={14} /> قيد مراجعة المزود</div>;
      case 'completed': return <div className="flex items-center gap-1 text-gray-400 bg-gray-400/10 px-3 py-1 rounded-full text-xs font-bold border border-gray-400/20"><CheckCircle2 size={14} /> مكتملة</div>;
      case 'rejected': return <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-bold border border-red-400/20"><XCircle size={14} /> مرفوض</div>;
      case 'cancelled': return <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-bold border border-red-400/20"><XCircle size={14} /> ملغية</div>;
      default: return null;
    }
  };

  if (loading) return (
    <div className="h-[50vh] flex flex-col items-center justify-center text-[#C89B3C] gap-4">
      <Loader2 className="animate-spin w-10 h-10" />
      <p className="text-white/50 text-sm font-bold animate-pulse">جاري تحميل رحلاتك...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Calendar className="text-[#C89B3C]" /> رحلاتي وحجوزاتي</h2>
           <p className="text-white/60 text-sm">سجل كامل بجميع زياراتك وحجوزاتك وتفاصيلها.</p>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit overflow-x-auto custom-scrollbar">
          {['all', 'upcoming', 'completed', 'cancelled'].map(f => (
             <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filter === f ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}>
                {f === 'all' ? 'الكل' : f === 'upcoming' ? 'حجوزات قادمة' : f === 'completed' ? 'مكتملة' : 'ملغية/مرفوضة'}
             </button>
          ))}
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
          <Calendar size={48} className="text-white/10 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">لا توجد رحلات</h3>
          <p className="text-white/50 mb-6">لم تقم بأي حجوزات تطابق هذا الفلتر.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTrips.map((trip) => {
            const isExpanded = expandedTripId === trip.id;
            const srv = Array.isArray(trip.services) ? trip.services[0] : trip.services;
            
            const adultCount = trip.quantity || 1;
            const childCount = trip.details?.child_count || 0;
            const galleryImages = srv?.details?.images || (srv?.image_url ? [srv.image_url] : []);
            const menuItems = safeArray(srv?.menu_items);

            return (
            <div key={trip.id} className={`group flex flex-col bg-[#252525] border ${isExpanded ? 'border-[#C89B3C]/50 shadow-lg shadow-[#C89B3C]/10' : 'border-white/5 shadow-lg hover:border-[#C89B3C]/30'} rounded-2xl overflow-hidden transition-all duration-300`}>
              
              {/* القسم العلوي: البيانات الأساسية (قابل للنقر للتوسيع) */}
              <div className="flex flex-col md:flex-row cursor-pointer" onClick={() => toggleExpand(trip.id)} title="اضغط لعرض تفاصيل الخدمة">
                  <div className="relative w-full md:w-56 h-48 md:h-auto shrink-0 bg-black/40 flex items-center justify-center border-b md:border-b-0 md:border-l border-white/5 group-hover:bg-black/20 transition">
                     {srv?.image_url ? (
                         <Image src={srv.image_url} alt="Service" fill className="object-cover opacity-80 group-hover:opacity-100 transition" />
                     ) : (
                         <Image src="/logo.png" alt="Service" width={80} height={40} className="opacity-30 group-hover:opacity-60 transition" />
                     )}
                     <div className="absolute top-3 right-3 md:hidden">{getStatusBadge(trip.status)}</div>
                  </div>

                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition">{srv?.title || "خدمة محذوفة"}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
                          <span className="flex items-center gap-1.5"><MapPin size={16} className="text-[#C89B3C]" /> {srv?.location_lat ? 'اللوكيشن متاح' : 'عسير'}</span>
                          <span className="flex items-center gap-1.5"><Users size={16} className="text-[#C89B3C]"/> {adultCount + childCount} ضيوف/تذاكر</span>
                        </div>
                      </div>
                      <div className="hidden md:block">{getStatusBadge(trip.status)}</div>
                    </div>

                    <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5 mt-4 group-hover:border-white/10 transition">
                      <div className="flex items-center gap-3 text-white/80">
                          <div className="bg-white/10 p-2 rounded-lg text-[#C89B3C]"><Calendar size={18} /></div>
                          <div>
                              <p className="text-xs text-white/50 mb-1">الموعد المحدد</p>
                              <p className="text-sm font-bold font-mono">
                                {trip.execution_date ? new Date(trip.execution_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : (trip.booking_date || 'غير محدد')}
                              </p>
                          </div>
                      </div>
                      <div className="text-left">
                          <p className="text-xs text-white/50 mb-1">الإجمالي</p>
                          <p className="text-lg font-bold text-[#C89B3C] font-mono">{trip.total_price} ﷼</p>
                      </div>
                    </div>
                    
                    <div className="text-center mt-3 text-[10px] text-white/30 group-hover:text-[#C89B3C]/70 transition flex justify-center items-center gap-1">
                        اضغط لعرض تفاصيل الرحلة الشاملة <ChevronUp className={`w-3 h-3 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
                    </div>
                  </div>
              </div>

              {/* التنبيهات والأزرار العلوية */}
              {trip.status === 'rejected' && (
                  <div className="p-5 bg-red-500/10 border-t border-red-500/20 flex items-start gap-3">
                      <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                      <div>
                          <p className="text-red-400 font-bold text-sm mb-1">تم رفض الحجز من قبل مزود الخدمة</p>
                          <p className="text-white/70 text-sm leading-relaxed">{trip.rejection_reason || "لم يقم المزود بتوضيح السبب."}</p>
                      </div>
                  </div>
              )}

              {trip.status === 'approved_unpaid' && trip.expires_at && (
                  <div className="p-5 bg-blue-500/10 border-t border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full md:w-auto">
                          <Timer className="text-blue-400 shrink-0" size={24} />
                          <div>
                              <p className="text-blue-400 font-bold text-sm mb-1">تم قبول طلبك! يرجى السداد لتأكيد الحجز</p>
                              <p className="text-white/60 text-xs">ينتهي العرض بعد: <CountdownTimer expiresAt={trip.expires_at} /></p>
                          </div>
                      </div>
                      <Link href={`/checkout/${trip.id}`} className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2">
                          <CreditCard size={18} /> ادفع الآن
                      </Link>
                  </div>
              )}

              {/* ========================================== */}
              {/* القسم السفلي المخفي (التفاصيل والباركود والصور والخريطة) */}
              {/* ========================================== */}
              {isExpanded && srv && (
                  <div className="border-t border-white/10 bg-[#1a1a1a] p-6 md:p-8 animate-in slide-in-from-top-4 duration-300">
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          
                          {/* العمود الأيمن (التفاصيل والباركود) */}
                          <div className="lg:col-span-2 space-y-6">
                                
                                {/* الباركود */}
                                {trip.status === 'confirmed' && trip.ticket_qr_code && (
                                    <div className="bg-gradientto-br from-emerald-900/20 to-[#1a1a1a] border border-emerald-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between text-center md:text-right relative overflow-hidden shadow-inner gap-6">
                                        <div className="flex-1">
                                            <p className="text-emerald-400 font-bold mb-2 flex items-center justify-center md:justify-start gap-2 text-lg"><CheckCircle2/> تذكرة الدخول صالحة</p>
                                            <p className="text-white/70 text-sm leading-relaxed mb-4">تم تأكيد حجزك. يرجى إبراز هذا الرمز (الباركود) لمزود الخدمة عند وصولك.</p>
                                            <p className="text-white/40 text-xs mb-1">رمز التذكرة المرجعي</p>
                                            <p className="font-mono text-xl text-white font-bold tracking-widest bg-black/50 px-4 py-2 rounded-lg border border-white/10 select-all w-fit mx-auto md:mx-0">
                                                {trip.ticket_qr_code.split('-')[0].toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl shadow-lg ring-4 ring-white/10 shrink-0">
                                            <QRCodeSVG value={trip.ticket_qr_code} size={130} level="H" />
                                        </div>
                                    </div>
                                )}

                                {/* معلومات الموعد التفصيلية */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                        <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Calendar size={14}/> التاريخ المحدد</p>
                                        <p className="font-bold text-sm">{formatDate(trip.check_in)}</p>
                                    </div>
                                    {srv.sub_category !== 'lodging' && (
                                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                            <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Clock size={14}/> وقت الحضور</p>
                                            <p className="font-bold text-sm text-[#C89B3C] dir-ltr text-right">{formatTime12H(trip.check_in)}</p>
                                        </div>
                                    )}
                                    {srv.sub_category === 'lodging' && trip.check_out && (
                                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                            <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><CalendarOff size={14}/> تاريخ المغادرة</p>
                                            <p className="font-bold text-sm">{formatDate(trip.check_out)}</p>
                                        </div>
                                    )}
                                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                        <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Users size={14}/> {srv.sub_category === 'event' ? 'تذاكر بالغين' : srv.sub_category === 'lodging' ? 'ليالي' : 'أشخاص'}</p>
                                        <p className="font-bold text-lg">{adultCount}</p>
                                    </div>
                                    {childCount > 0 && (
                                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                            <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Users size={14}/> تذاكر أطفال</p>
                                            <p className="font-bold text-lg">{childCount}</p>
                                        </div>
                                    )}
                                </div>

                                {/* معرض الصور */}
                                {galleryImages.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2 border-b border-white/10 pb-2"><ImageIcon size={16}/> صور المكان</h4>
                                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                            {galleryImages.map((url: string, idx: number) => (
                                                <div key={idx} onClick={() => setZoomedImage(url)} className="relative w-32 h-24 shrink-0 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-[#C89B3C] transition group">
                                                    {isVideo(url) ? (
                                                        <div className="w-full h-full relative">
                                                            <video src={url} className="w-full h-full object-cover" muted />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent transition"><PlayCircle className="text-white" size={24}/></div>
                                                        </div>
                                                    ) : (
                                                        <Image src={url} fill className="object-cover group-hover:scale-110 transition duration-500" alt="img" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* تفاصيل شاملة بناءً على نوع الخدمة */}
                                <div className="space-y-6 bg-black/20 p-6 rounded-2xl border border-white/5">
                                    <h4 className="text-white font-bold flex items-center gap-2 border-b border-white/10 pb-3"><FileText size={18} className="text-[#C89B3C]"/> التفاصيل الشاملة للخدمة</h4>
                                    
                                    {/* الوصف */}
                                    {srv.description && (
                                        <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">{srv.description}</p>
                                    )}

                                    {/* تفاصيل النزل */}
                                    {srv.sub_category === 'lodging' && srv.details?.lodging_type && (
                                        <div className="space-y-4 pt-4 border-t border-white/10">
                                            <h5 className="font-bold text-sm text-[#C89B3C] flex items-center gap-2"><Home size={16}/> مواصفات النزل</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div><span className="text-white/50 block text-[10px]">نوع السكن</span>{srv.details.lodging_type === 'other' ? srv.details.custom_lodging_type : srv.details.lodging_type}</div>
                                                {srv.details.area && <div><span className="text-white/50 block text-[10px]">المساحة</span>{srv.details.area} م²</div>}
                                                {srv.max_capacity > 0 && <div><span className="text-white/50 block text-[10px]">يتسع لـ</span>{srv.max_capacity} أشخاص</div>}
                                                {srv.details.target_audience && <div><span className="text-white/50 block text-[10px]">مخصص لـ</span>{srv.details.target_audience === 'singles' ? 'عزاب' : srv.details.target_audience === 'families' ? 'عوايل' : 'الكل'}</div>}
                                            </div>
                                        </div>
                                    )}

                                    {/* تفاصيل التجربة */}
                                    {srv.sub_category === 'experience' && srv.details?.experience_info && (
                                        <div className="space-y-4 pt-4 border-t border-white/10">
                                            <h5 className="font-bold text-sm text-[#C89B3C] flex items-center gap-2"><Compass size={16}/> تفاصيل التجربة</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div><span className="text-white/50 block text-[10px]">المدة</span>{srv.details.experience_info.duration}</div>
                                                <div><span className="text-white/50 block text-[10px]">الصعوبة</span>{srv.details.experience_info.difficulty === 'easy' ? 'سهل' : srv.details.experience_info.difficulty === 'medium' ? 'متوسط' : 'صعب'}</div>
                                                <div><span className="text-white/50 block text-[10px]">الفئة</span>{srv.details.experience_info.target_audience === 'both' ? 'عوايل وعزاب' : srv.details.experience_info.target_audience === 'families' ? 'عوايل' : 'عزاب'}</div>
                                                <div><span className="text-white/50 block text-[10px]">الأطفال</span>{srv.details.experience_info.children_allowed ? 'مسموح' : 'غير مسموح'}</div>
                                            </div>
                                            
                                            {/* المشمولات */}
                                            {(safeArray(srv.details.experience_info.included_services).length > 0 || safeArray(srv.details.experience_info.custom_services).length > 0) && (
                                                <div>
                                                    <span className="text-white/50 block text-xs mb-2 mt-4">ما تشمله التجربة:</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {safeArray(srv.details.experience_info.included_services).map((item: string) => getTranslatedFeature(item))}
                                                        {safeArray(srv.details.experience_info.custom_services).map((item: string, idx: number) => <span key={`cust-${idx}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {item}</span>)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* تفاصيل الفعالية */}
                                    {srv.sub_category === 'event' && srv.details?.event_info && (
                                        <div className="space-y-4 pt-4 border-t border-white/10">
                                            <h5 className="font-bold text-sm text-[#C89B3C] flex items-center gap-2"><Ticket size={16}/> تفاصيل الفعالية والأنشطة</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div><span className="text-white/50 block text-[10px]">من تاريخ</span><span className="dir-ltr inline-block">{srv.details.event_info.dates?.startDate}</span></div>
                                                <div><span className="text-white/50 block text-[10px]">إلى تاريخ</span><span className="dir-ltr inline-block">{srv.details.event_info.dates?.endDate}</span></div>
                                                <div><span className="text-white/50 block text-[10px]">فتح الأبواب</span><span className="text-[#C89B3C]">{formatTime12H(srv.details.event_info.dates?.startTime)}</span></div>
                                                <div><span className="text-white/50 block text-[10px]">إغلاق الأبواب</span><span className="text-[#C89B3C]">{formatTime12H(srv.details.event_info.dates?.endTime)}</span></div>
                                            </div>
                                            
                                            {/* الأنشطة */}
                                            {(safeArray(srv.details.event_info.activities).length > 0 || safeArray(srv.details.event_info.custom_activities).length > 0) && (
                                                <div>
                                                    <span className="text-white/50 block text-xs mb-2 mt-4">الأنشطة المتاحة:</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {safeArray(srv.details.event_info.activities).map((item: string) => getTranslatedFeature(item))}
                                                        {safeArray(srv.details.event_info.custom_activities).map((item: string, idx: number) => <span key={`cust-${idx}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {item}</span>)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* المميزات العامة للكل (عدا التجربة والفعالية لأن لها قسمها) */}
                                    {srv.sub_category !== 'experience' && srv.sub_category !== 'event' && (safeArray(srv.details?.features).length > 0 || safeArray(srv.details?.custom_features).length > 0) && (
                                        <div className="pt-4 border-t border-white/10">
                                            <h5 className="font-bold text-sm text-[#C89B3C] flex items-center gap-2 mb-3"><Sparkles size={16}/> المميزات المتوفرة</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {safeArray(srv.details.features).map((feat: string) => getTranslatedFeature(feat))}
                                                {safeArray(srv.details.custom_features).map((feat: string, idx: number) => <span key={`c-${idx}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {feat}</span>)}
                                            </div>
                                        </div>
                                    )}

                                    {/* سياسات المكان والمزود */}
                                    <div className="pt-4 border-t border-white/10 space-y-4">
                                        <h5 className="font-bold text-sm text-red-400 flex items-center gap-2"><ShieldAlert size={16}/> السياسات وشروط الحجز</h5>
                                        {srv.details?.policies && (
                                            <div><span className="text-white/50 block text-xs mb-1">السياسات العامة:</span><p className="text-sm bg-black/40 p-3 rounded-lg leading-relaxed whitespace-pre-line">{srv.details.policies}</p></div>
                                        )}
                                        {srv.details?.experience_info?.cancellation_policy && (
                                            <div><span className="text-white/50 block text-xs mb-1">سياسة الإلغاء:</span><p className="text-sm bg-black/40 p-3 rounded-lg leading-relaxed whitespace-pre-line">{srv.details.experience_info.cancellation_policy}</p></div>
                                        )}
                                        {srv.details?.experience_info?.what_to_bring && (
                                            <div><span className="text-white/50 block text-xs mb-1">المتطلبات / أحضر معك:</span><p className="text-sm bg-black/40 p-3 rounded-lg leading-relaxed whitespace-pre-line">{srv.details.experience_info.what_to_bring}</p></div>
                                        )}
                                        {srv.details?.deposit_config?.required && (
                                            <div className="text-sm bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg text-orange-200">
                                                <strong className="text-orange-400 block mb-1">تأمين مسترد على المحتويات:</strong>
                                                يشترط دفع مبلغ تأمين {srv.details.deposit_config.paymentTime === 'with_booking' ? 'يتم سداده مع الحجز بالمنصة' : 'يُدفع نقداً للمزود عند الوصول'}.
                                                {srv.details.deposit_config.isRefundable && " (التأمين مسترد بالكامل في حال عدم وجود تلفيات)."}
                                            </div>
                                        )}
                                    </div>

                                </div>
                          </div>

                          {/* العمود الأيسر (الخريطة والمنيو/الخدمات) */}
                          <div className="lg:col-span-1 space-y-6">
                              
                              {/* الخريطة */}
                              {srv.location_lat && srv.location_lng ? (
                                  <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-xl overflow-hidden h-64 relative group">
                                      <div className="p-3 border-b border-white/10 bg-black/20 z-10 relative flex justify-between items-center">
                                          <h4 className="font-bold text-sm flex items-center gap-2"><MapIcon size={16} className="text-[#C89B3C]"/> موقع الخدمة</h4>
                                          <a href={`https://www.google.com/maps/dir/?api=1&destination=$${srv.location_lat},${srv.location_lng}`} target="_blank" rel="noreferrer" className="text-xs bg-[#C89B3C] text-black px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-white transition"><Navigation size={12}/> فتح الخرائط</a>
                                      </div>
                                      <div className="flex-1 relative w-full h-full">
                                          <Map initialViewState={{ latitude: srv.location_lat, longitude: srv.location_lng, zoom: 13 }} mapStyle="mapbox://styles/mapbox/dark-v11" mapboxAccessToken={MAPBOX_TOKEN} interactive={false}>
                                              <Marker latitude={srv.location_lat} longitude={srv.location_lng} color="#C89B3C"/>
                                          </Map>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-6 text-center text-white/40">
                                      <MapPin size={32} className="mx-auto mb-2 opacity-50"/>
                                      <p className="text-sm">لم يتم تحديد إحداثيات دقيقة للموقع</p>
                                  </div>
                              )}

                              {/* المنيو / خدمات المرفق */}
                              {srv.sub_category === 'facility' && safeArray(srv.details?.facility_services).length > 0 && (
                                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                                      <h4 className="font-bold text-sm flex items-center gap-2"><Activity size={16} className="text-[#C89B3C]"/> الخدمات المتوفرة بالداخل</h4>
                                      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                          {safeArray(srv.details.facility_services).map((fsrv: any, i: number) => (
                                              <div key={i} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl">
                                                  {fsrv.image_url ? (
                                                      <Image src={fsrv.image_url} width={40} height={40} className="rounded-lg object-cover shrink-0" alt="img"/>
                                                  ) : <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center shrink-0"><ImageIcon size={14} className="text-white/20"/></div>}
                                                  <div>
                                                      <h5 className="font-bold text-sm text-white">{fsrv.name}</h5>
                                                      {fsrv.description && <p className="text-[10px] text-white/50 mt-0.5 line-clamp-2">{fsrv.description}</p>}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {menuItems.length > 0 && (
                                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
                                      <h4 className="font-bold text-sm flex items-center gap-2">
                                          {srv.sub_category === 'food' ? <Utensils size={16} className="text-[#C89B3C]"/> : <Box size={16} className="text-[#C89B3C]"/>}
                                          {srv.sub_category === 'food' ? 'قائمة الطعام (المنيو)' : 'المنتجات المعروضة'}
                                      </h4>
                                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                          {menuItems.map((item: any, i: number) => (
                                              <div key={i} className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/10 hover:border-[#C89B3C]/30 transition group cursor-pointer" onClick={() => item.image && setZoomedImage(item.image)}>
                                                  <div className="flex items-center gap-3">
                                                      <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-black">
                                                          {item.image ? (isVideo(item.image) ? <video src={item.image} className="w-full h-full object-cover" muted /> : <Image src={item.image} fill className="object-cover group-hover:scale-110 transition" alt={item.name}/>) : (<div className="w-full h-full flex items-center justify-center text-white/20"><ImageIcon size={14}/></div>)}
                                                      </div>
                                                      <span className="font-bold text-xs text-white">{item.name}</span>
                                                  </div>
                                                  <span className="text-[#C89B3C] font-mono text-xs font-bold bg-[#C89B3C]/10 px-2 py-1 rounded">{item.price} ﷼</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* زر استكمال الدفع إذا كان الحجز معلق دفع */}
                              {trip.status === 'approved_unpaid' && (
                                  <Link href={`/checkout/${trip.id}`} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2">
                                      <CreditCard size={18} /> دفع وتأكيد الحجز الآن
                                  </Link>
                              )}
                          </div>
                      </div>
                  </div>
              )}

            </div>
            );
          })}
        </div>
      )}

      {zoomedImage && (
        <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-3 rounded-full"><X size={24} /></button>
            <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
                {isVideo(zoomedImage) ? ( <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl outline-none" onClick={(e) => e.stopPropagation()} /> ) : ( <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain drop-shadow-2xl"/> )}
            </div>
        </div>
      )}
    </div>
  );
}