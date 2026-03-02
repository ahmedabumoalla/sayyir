"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { 
  MapPin, Clock, Users, CheckCircle, X, 
  Info, Star, ShieldCheck, Image as ImageIcon, 
  ChevronLeft, Loader2, FileText, PlayCircle, Calendar, Box, Utensils, AlertCircle, Briefcase, Minus, Plus, Send,
  Wifi, Car, Waves, Sparkles, Wind, Tv, Flame, Coffee, HeartPulse, Mountain, CalendarDays, CalendarOff, Activity, Compass
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Tajawal } from "next/font/google";
import { toast, Toaster } from "sonner";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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

const safeArray = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return []; }
    }
    if (typeof data === 'object') return Object.values(data);
    return [];
};

// ✅ دالة ذكية لتحويل الوقت من 24 ساعة إلى 12 ساعة (صباحاً/مساءً) للعميل
const formatTime12H = (time24: string) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const period = hour >= 12 ? 'مساءً' : 'صباحاً';
    
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    
    return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
};

export default function ServiceDetailsPage() {
  const { id } = useParams();
  const router = useRouter(); 
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false); 
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);

  const [guestCount, setGuestCount] = useState(1);
  const [additionalNotes, setAdditionalNotes] = useState(""); 
  const [totalPrice, setTotalPrice] = useState(0);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [dateTimeError, setDateTimeError] = useState("");

  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchServiceDetails();
  }, []);

  useEffect(() => {
      if (!service?.price) return;

      if (service.sub_category === 'lodging' && checkIn && checkOut) {
          const start = new Date(checkIn);
          const end = new Date(checkOut);
          if (end > start) {
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              const finalDays = diffDays === 0 ? 1 : diffDays;
              setTotalPrice(finalDays * service.price);
          } else {
              setTotalPrice(0);
          }
      } else {
          setTotalPrice(service.price * guestCount);
      }
  }, [guestCount, checkIn, checkOut, service]);

  useEffect(() => {
      if (!service || (service.service_category !== 'experience' && service.sub_category !== 'event')) return;
      if (!bookingDate) { setDateTimeError(""); return; }

      const blockedDates = safeArray(service.blocked_dates);
      const sessions = safeArray(service.details?.sessions);
      const workHours = safeArray(service.work_schedule);

      if (blockedDates.includes(bookingDate)) {
          setDateTimeError("هذا التاريخ مغلق ولا يمكن الحجز فيه.");
          return;
      }

      if (sessions.length > 0) {
          let isValidDate = false;
          let isValidTime = false;

          for (const s of sessions) {
              if (s.type === 'single') {
                  if (s.date === bookingDate) {
                      isValidDate = true;
                      if (!bookingTime || s.time === bookingTime) isValidTime = true;
                  }
              } else if (s.type === 'range') {
                  if (bookingDate >= s.startDate && bookingDate <= s.endDate) {
                      isValidDate = true;
                      if (!bookingTime || (bookingTime >= s.startTime && bookingTime <= s.endTime)) isValidTime = true;
                  }
              }
          }

          if (!isValidDate) {
              setDateTimeError("التاريخ المختار خارج أوقات الفعالية/التجربة.");
          } else if (bookingTime && !isValidTime) {
              setDateTimeError("الوقت المختار خارج أوقات عمل الفعالية في هذا اليوم.");
          } else {
              setDateTimeError(""); 
          }
          return;
      }

      if (workHours.length > 0) {
          const dateObj = new Date(bookingDate);
          const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
          const dayName = dayNames[dateObj.getDay()];
          
          const daySchedule = workHours.find((d: any) => d.day === dayName);

          if (!daySchedule || !daySchedule.active) {
              setDateTimeError("المكان لا يعمل في هذا اليوم من الأسبوع.");
              return;
          }

          if (bookingTime) {
              let timeFits = false;
              for (const shift of safeArray(daySchedule.shifts)) {
                  if (bookingTime >= shift.from && bookingTime <= shift.to) timeFits = true;
              }
              if (!timeFits) {
                  setDateTimeError("الوقت المختار يقع خارج ساعات العمل الرسمية.");
                  return;
              }
          }
      }

      setDateTimeError("");
  }, [bookingDate, bookingTime, service]);

  const fetchServiceDetails = async () => {
    const { data, error } = await supabase
      .from("services")
      .select(`*, profiles:provider_id(full_name, avatar_url)`)
      .eq("id", id)
      .single();

    if (data) {
        setService(data);
        const isLimited = data.service_category === 'experience' && data.sub_category !== 'event';
        if (isLimited && (data.max_capacity === 0 || data.max_capacity === null)) {
            setGuestCount(0);
        }
    }
    setLoading(false);
  };

  const isVideo = (url: string) => {
      if (!url) return false;
      return url.match(/\.(mp4|webm|ogg)$/i) || url.includes('video');
  };

  const isLimitedCapacity = service?.service_category === 'experience' && service?.sub_category !== 'event';
  const isSoldOut = isLimitedCapacity ? (service.max_capacity === null || service.max_capacity <= 0) : false;
  const quantityLabel = service?.sub_category === 'lodging' ? 'عدد الليالي / الوحدات' : 
                        service?.sub_category === 'event' ? 'عدد التذاكر' : 'عدد الأشخاص';

  const incrementGuests = () => {
      if (isLimitedCapacity) {
          if (service.max_capacity && guestCount < service.max_capacity) setGuestCount(prev => prev + 1);
          else toast.error(`عذراً، المقاعد المتبقية هي ${service.max_capacity} فقط.`);
      } else {
          if (guestCount < 50) setGuestCount(prev => prev + 1);
          else toast.error("تم الوصول للحد الأقصى المسموح للحجز الواحد.");
      }
  };

  const decrementGuests = () => {
      if (guestCount > 1) setGuestCount(prev => prev - 1);
  };

  const handleBookingRequest = async () => {
      if (!agreedToPolicies && service.details?.policies) return toast.warning("الرجاء الموافقة على سياسات المزود أولاً.");
      
      let finalCheckIn = null;
      let finalCheckOut = null;

      if (service.sub_category === 'lodging') {
          if (!checkIn || !checkOut) return toast.warning("الرجاء تحديد تاريخ الوصول والمغادرة.");
          finalCheckIn = checkIn;
          finalCheckOut = checkOut;
      } else {
          if (!bookingDate || !bookingTime) return toast.warning("الرجاء تحديد تاريخ ووقت الحضور.");
          if (dateTimeError) return toast.error("توجد مشكلة في التاريخ أو الوقت المختار.");
          finalCheckIn = `${bookingDate} ${bookingTime}`;
      }

      setBookingLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
              toast.error("يجب تسجيل الدخول لإرسال طلب حجز.");
              router.push('/login'); return; 
          }

          let newCapacity = null;
          if (isLimitedCapacity) {
              const { data: refreshService } = await supabase.from('services').select('max_capacity').eq('id', service.id).single();
              if (!refreshService || refreshService.max_capacity < guestCount) throw new Error("عذراً، المقاعد نفذت قبل إتمام طلبك.");
              newCapacity = refreshService.max_capacity - guestCount;
          }

          const { error: bookingError } = await supabase.from('bookings').insert([{
              user_id: session.user.id,
              service_id: service.id,
              provider_id: service.provider_id,
              quantity: guestCount,
              total_price: totalPrice,
              check_in: finalCheckIn,
              check_out: finalCheckOut,
              additional_notes: additionalNotes,
              status: 'pending', 
              booking_date: new Date()
          }]);

          if (bookingError) throw bookingError;

          if (isLimitedCapacity && newCapacity !== null) {
              const { error: updateError } = await supabase.from('services').update({ max_capacity: newCapacity }).eq('id', service.id);
              if (updateError) throw updateError;
          }

          toast.success("✅ تم إرسال طلب الحجز بنجاح! سيقوم المزود بمراجعة طلبك وإشعارك.");
          router.push('/'); 

      } catch (error: any) {
          console.error(error);
          toast.error("حدث خطأ أثناء إرسال الطلب: " + error.message);
      } finally {
          setBookingLoading(false);
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10"/></div>;
  if (!service) return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white">الخدمة غير موجودة أو تم إيقافها.</div>;

  const galleryImages = service.details?.images || (service.image_url ? [service.image_url] : []);
  
  const workHours = safeArray(service.work_schedule);
  const blockedDates = safeArray(service.blocked_dates);
  const sessions = safeArray(service.details?.sessions);
  const menuItems = safeArray(service.menu_items);
  
  const hasSessions = sessions.length > 0;
  const displayWorkHours = workHours.length > 0 && !hasSessions;
  const hasScheduleData = displayWorkHours || blockedDates.length > 0 || hasSessions;

  const isEventOrExp = service.service_category === 'experience' || service.sub_category === 'event';

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white pb-20 ${tajawal.className}`} dir="rtl">
      <Toaster position="top-center" richColors />
      
      {/* Header Section */}
      <div className="relative h-[50vh] w-full group overflow-hidden">
        {galleryImages.length > 0 && isVideo(galleryImages[0]) ? (
            <video src={galleryImages[0]} className="w-full h-full object-cover opacity-80" autoPlay muted loop playsInline />
        ) : (
            <Image src={galleryImages[0] || "/placeholder.jpg"} alt={service.title} fill className="object-cover opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/50 to-transparent" />
        
        <button onClick={() => window.history.back()} className="absolute top-6 right-6 bg-black/50 p-2 rounded-full text-white hover:bg-[#C89B3C] transition z-20">
            <ChevronLeft size={24} className="rotate-180" />
        </button>

        <div className="absolute bottom-0 w-full p-6 md:p-10">
            <div className="container mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <span className="bg-[#C89B3C] text-black text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block shadow-lg">
                            {service.service_category === 'experience' ? 'تجربة سياحية' : 'مرفق / مكان'}
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">{service.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-white/80 mt-2">
                            <div className="flex items-center gap-1">
                                <MapPin size={18} className="text-[#C89B3C]"/>
                                {service.location_lat ? "تم تحديد الموقع" : "عسير"}
                            </div>
                            {service.duration && (
                                <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-xs border border-white/10">
                                    <Clock size={14} className="text-[#C89B3C]"/> المدة: {service.duration}
                                </div>
                            )}
                            {service.difficulty_level && (
                                <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-xs border border-white/10">
                                    <Activity size={14} className="text-[#C89B3C]"/> {service.difficulty_level === 'easy' ? 'سهل' : service.difficulty_level === 'medium' ? 'متوسط' : 'صعب'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* العمود الأيمن (التفاصيل) */}
        <div className="lg:col-span-2 space-y-8">
            
            {galleryImages.length > 1 && (
                <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><ImageIcon size={20} className="text-[#C89B3C]"/> معرض الصور</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {galleryImages.slice(1).map((url: string, index: number) => (
                            <div key={index} onClick={() => setZoomedImage(url)} className="relative w-32 h-24 md:w-48 md:h-32 shrink-0 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-[#C89B3C] transition group">
                                {isVideo(url) ? (
                                    <div className="w-full h-full relative">
                                        <video src={url} className="w-full h-full object-cover" muted />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent transition"><PlayCircle className="text-white" size={32}/></div>
                                    </div>
                                ) : (
                                    <Image src={url} fill className="object-cover group-hover:scale-110 transition duration-500" alt={`img-${index}`}/>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Info size={20} className="text-[#C89B3C]"/> الوصف</h3>
                <p className="text-gray-300 leading-loose whitespace-pre-line text-lg">{service.description}</p>
            </div>

            {/* ✅ جدول الأوقات والمواعيد والأيام المستثناة */}
            {hasScheduleData && (
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-[#C89B3C]/20 shadow-xl space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent opacity-50"></div>

                    {hasSessions && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                                <CalendarDays size={20} className="text-[#C89B3C]"/> المواعيد المتاحة
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sessions.map((session: any, i: number) => (
                                    <div key={i} className="bg-gradient-to-br from-white/5 to-black/40 p-4 rounded-xl border border-[#C89B3C]/10 text-sm flex items-start gap-4 hover:border-[#C89B3C]/30 transition shadow-lg">
                                        <div className="bg-[#C89B3C]/10 p-2 rounded-lg text-[#C89B3C]">
                                            <Calendar size={20}/>
                                        </div>
                                        {session.type === 'range' ? (
                                            <div className="space-y-2 w-full">
                                                <div className="flex justify-between border-b border-white/5 pb-2">
                                                    <span className="text-white/50 text-xs">من:</span> 
                                                    <span className="font-bold text-white text-xs">{session.startDate} | {formatTime12H(session.startTime)}</span>
                                                </div>
                                                <div className="flex justify-between pt-1">
                                                    <span className="text-white/50 text-xs">إلى:</span> 
                                                    <span className="font-bold text-white text-xs">{session.endDate} | {formatTime12H(session.endTime)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col w-full justify-center h-full gap-1">
                                                <span className="text-white/50 text-xs">موعد الجلسة:</span>
                                                <span className="font-bold text-[#C89B3C] text-base">{session.date} | {formatTime12H(session.time)}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {displayWorkHours && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                                <Clock size={20} className="text-[#C89B3C]"/> أوقات العمل
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {workHours.map((day: any, i: number) => (
                                    <div key={i} className={`flex justify-between items-center p-3.5 rounded-xl border text-sm transition ${day.active ? 'bg-black/40 border-white/5 hover:border-white/10' : 'bg-red-500/5 border-red-500/10'}`}>
                                        <span className={day.active ? "text-white/80 font-bold" : "text-red-400 font-bold"}>{day.day}</span>
                                        {day.active ? (
                                            <div className="flex flex-col items-end gap-1">
                                                {safeArray(day.shifts).map((s:any, idx:number) => (
                                                    <span key={idx} className="bg-white/10 text-white px-2 py-0.5 rounded text-xs font-bold flex gap-1">
                                                        <span>{formatTime12H(s.from)}</span>
                                                        <span className="text-[#C89B3C]">-</span>
                                                        <span>{formatTime12H(s.to)}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg text-xs font-bold">مغلق</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {blockedDates.length > 0 && (
                        <div className={(displayWorkHours || hasSessions) ? "pt-6 border-t border-white/10 mt-2" : ""}>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-red-400">
                                <CalendarOff size={20}/> أيام مغلقة (لا يمكن الحجز فيها)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {blockedDates.map((date: string, idx: number) => (
                                    <span key={idx} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                                        <X size={14}/> {date}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(service.requirements || service.included_items || service.meeting_point) && (
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
                    {service.requirements && (
                        <div>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#C89B3C]"><AlertCircle size={20}/> المتطلبات من العميل</h3>
                            <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">{service.requirements}</p>
                        </div>
                    )}
                    {service.included_items && (
                        <div className={service.requirements ? "pt-4 border-t border-white/5" : ""}>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#C89B3C]"><Briefcase size={20}/> ماذا تشمل التجربة؟</h3>
                            <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">{service.included_items}</p>
                        </div>
                    )}
                    {service.meeting_point && (
                        <div className={(service.requirements || service.included_items) ? "pt-4 border-t border-white/5" : ""}>
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#C89B3C]"><MapPin size={20}/> نقطة التجمع</h3>
                            <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">{service.meeting_point}</p>
                        </div>
                    )}
                </div>
            )}

            {safeArray(service.amenities).length > 0 && (
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Star size={20} className="text-[#C89B3C]"/> المميزات والخدمات</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {safeArray(service.amenities).map((am: any, i: number) => {
                            const amenityObj = AMENITIES_DICT[am];
                            const IconComponent = amenityObj?.icon || CheckCircle;
                            return (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition">
                                    <IconComponent size={18} className="text-[#C89B3C]" />
                                    <span className="text-sm">{amenityObj ? amenityObj.label : am}</span>
                                </div>
                            );
                        })}
                    </div>
                    {service.details?.custom_amenities && (
                        <div className="pt-4 border-t border-white/10 mt-4">
                            <h4 className="text-sm text-white/50 mb-2">مميزات إضافية للمكان:</h4>
                            <p className="text-white/90 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 whitespace-pre-line">{service.details.custom_amenities}</p>
                        </div>
                    )}
                </div>
            )}

            {menuItems.length > 0 && (
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        {service.sub_category === 'food' ? <Utensils size={20} className="text-[#C89B3C]"/> : <Box size={20} className="text-[#C89B3C]"/>}
                        {service.sub_category === 'food' ? 'قائمة الطعام' : 'المنتجات المتوفرة'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {menuItems.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10 hover:border-[#C89B3C]/30 transition group">
                                <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black cursor-pointer" onClick={() => item.image && setZoomedImage(item.image)}>
                                    {item.image ? (isVideo(item.image) ? <video src={item.image} className="w-full h-full object-cover" muted /> : <Image src={item.image} fill className="object-cover group-hover:scale-110 transition duration-500" alt={item.name}/>) : (<div className="w-full h-full flex items-center justify-center text-white/20"><ImageIcon size={20}/></div>)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                    <p className="text-[#C89B3C] font-mono mt-1">{item.price} ﷼</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {service.location_lat && service.location_lng && (
                <div className="bg-[#1a1a1a] p-2 rounded-3xl border border-white/5 shadow-xl overflow-hidden h-80 relative group">
                    <Map initialViewState={{ latitude: service.location_lat, longitude: service.location_lng, zoom: 14 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN}>
                        <NavigationControl position="top-left" showCompass={false}/>
                        <Marker latitude={service.location_lat} longitude={service.location_lng} color="#C89B3C"/>
                    </Map>
                    <a href={`https://www.google.com/maps/search/?api=1&query=$${service.location_lat},${service.location_lng}`} target="_blank" className="absolute bottom-6 left-6 right-6 bg-[#C89B3C] text-black py-4 rounded-xl font-bold text-center shadow-lg hover:bg-[#b38a35] transition flex justify-center items-center gap-2"><Compass size={18}/> فتح الموقع في خرائط Google</a>
                </div>
            )}
        </div>

        {/* العمود الأيسر (كرت الحجز الذكي) */}
        <div className="space-y-6">
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-[#C89B3C]/30 sticky top-24 shadow-2xl shadow-[#C89B3C]/5">
                
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                    <div className="w-14 h-14 rounded-full bg-white/10 overflow-hidden relative border border-[#C89B3C]/50 shadow-lg">
                        {service.profiles?.avatar_url ? (
                            <Image src={service.profiles.avatar_url} fill alt="Provider" className="object-cover"/>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#C89B3C] font-bold text-xl bg-[#C89B3C]/10">{service.profiles?.full_name?.[0]}</div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-[#C89B3C] font-bold tracking-wider mb-1 uppercase">مقدم الخدمة</p>
                        <p className="font-bold text-white text-lg">{service.profiles?.full_name}</p>
                    </div>
                </div>

                <div className="flex justify-between items-end mb-6">
                    <div>
                        <span className="text-gray-400 text-sm">السعر المتوقع</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-4xl font-bold text-[#C89B3C] font-mono">{service.price === 0 ? "مجاني" : service.price}</span>
                            {service.price > 0 && <span className="text-sm text-[#C89B3C] font-bold">ر.س</span>}
                        </div>
                    </div>
                    <div className="flex gap-1 text-sm bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20"><Star size={16} className="fill-yellow-400 text-yellow-400"/> 4.9</div>
                </div>

                <div className="space-y-5">
                    
                    {/* 1. نظام حجز السكن (نطاق تواريخ) */}
                    {service.sub_category === 'lodging' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold px-1">تاريخ الوصول</label>
                                <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-[#C89B3C]/50 transition">
                                    <input type="date" min={todayDate} value={checkIn} onClick={(e) => e.currentTarget.showPicker()} onChange={e => setCheckIn(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-transparent p-3 outline-none text-white text-xs cursor-pointer text-center" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold px-1">تاريخ المغادرة</label>
                                <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-[#C89B3C]/50 transition">
                                    <input type="date" min={checkIn || todayDate} value={checkOut} onClick={(e) => e.currentTarget.showPicker()} onChange={e => setCheckOut(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-transparent p-3 outline-none text-white text-xs cursor-pointer text-center" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. نظام حجز الفعاليات والتجارب مع تحقق ذكي */}
                    {isEventOrExp && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold px-1">التاريخ المطلوب</label>
                                    <div className={`bg-black/40 border rounded-xl flex items-center relative overflow-hidden transition ${dateTimeError ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-[#C89B3C]/50'}`}>
                                        <input 
                                            type="date" 
                                            min={todayDate} 
                                            value={bookingDate}
                                            onClick={(e) => e.currentTarget.showPicker()} 
                                            onChange={(e) => setBookingDate(e.target.value)} 
                                            style={{ colorScheme: 'dark' }}
                                            className="w-full bg-transparent p-3 outline-none text-white text-sm cursor-pointer" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold px-1">وقت الحضور</label>
                                    <div className={`bg-black/40 border rounded-xl flex items-center relative overflow-hidden transition ${dateTimeError ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-[#C89B3C]/50'}`}>
                                        <input 
                                            type="time" 
                                            value={bookingTime}
                                            onClick={(e) => e.currentTarget.showPicker()} 
                                            onChange={(e) => setBookingTime(e.target.value)} 
                                            style={{ colorScheme: 'dark' }}
                                            className="w-full bg-transparent p-3 outline-none text-white text-sm cursor-pointer" 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {dateTimeError && (
                                <p className="text-xs text-red-400 flex items-center gap-1 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                    <AlertCircle size={14}/> {dateTimeError}
                                </p>
                            )}
                            
                            {!dateTimeError && (hasSessions || displayWorkHours) && (
                                <p className="text-[10px] text-white/40 px-1">يرجى التأكد من مطابقة التاريخ والوقت مع المواعيد الموضحة في تفاصيل الخدمة.</p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold px-1">{quantityLabel}</label>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex justify-between items-center">
                            <div className="flex items-center gap-2 pl-3">
                                <Users size={18} className="text-[#C89B3C]"/>
                                {isLimitedCapacity && <span className="text-[10px] text-red-400">متبقي: {service.max_capacity}</span>}
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={decrementGuests} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/5"><Minus size={16} className="text-white"/></button>
                                <span className="font-bold w-6 text-center text-xl font-mono">{guestCount}</span>
                                <button onClick={incrementGuests} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/5"><Plus size={16} className="text-white"/></button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-xs text-gray-400 font-bold flex items-center gap-1 px-1">
                            <Info size={12}/> ملاحظات للمزود
                        </label>
                        <textarea 
                            rows={3}
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            placeholder="أي طلبات خاصة؟"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none text-white text-sm resize-none focus:border-[#C89B3C]/50 transition"
                        />
                    </div>

                    {service.details?.policies && (
                        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl mt-4">
                            <h4 className="text-red-400 font-bold flex items-center gap-2 text-sm mb-2"><ShieldCheck size={16} /> سياسات المكان</h4>
                            <div className="text-xs text-white/70 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar mb-4 pl-2 border-r-2 border-red-500/20 pr-2 whitespace-pre-line">
                                {service.details.policies}
                            </div>
                            <label className={`flex items-start gap-3 cursor-pointer group ${isSoldOut ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition ${agreedToPolicies ? 'bg-[#C89B3C] border-[#C89B3C] text-black' : 'border-white/30 group-hover:border-white'}`}>
                                    {agreedToPolicies && <CheckCircle size={14}/>}
                                </div>
                                <input type="checkbox" checked={agreedToPolicies} onChange={(e) => setAgreedToPolicies(e.target.checked)} className="hidden" disabled={isSoldOut}/>
                                <span className="text-xs text-white/80 select-none pt-0.5">أوافق على سياسات وشروط مقدم الخدمة</span>
                            </label>
                        </div>
                    )}

                    {totalPrice > 0 && (
                        <div className="bg-gradient-to-r from-[#C89B3C]/5 to-[#C89B3C]/20 border border-[#C89B3C]/30 rounded-xl p-5 mt-4 flex justify-between items-center shadow-lg">
                            <span className="font-bold text-white">الإجمالي</span>
                            <span className="text-2xl font-bold text-[#C89B3C] font-mono">{totalPrice} ر.س</span>
                        </div>
                    )}

                    <button 
                        onClick={handleBookingRequest}
                        disabled={isSoldOut || (service.details?.policies && !agreedToPolicies) || bookingLoading || dateTimeError !== ""}
                        className={`w-full py-5 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 mt-2
                        ${(isSoldOut || dateTimeError !== "")
                            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
                            : (!service.details?.policies || agreedToPolicies) 
                                ? 'bg-[#C89B3C] text-black hover:bg-[#b38a35] shadow-[0_0_20px_rgba(200,155,60,0.3)]' 
                                : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                    >
                        {bookingLoading ? <Loader2 className="animate-spin"/> : (isSoldOut ? 'انتهى الحجز' : (agreedToPolicies || !service.details?.policies ? <><Send size={20}/> تأكيد وإرسال الطلب</> : 'وافق على الشروط'))}
                    </button>
                </div>
            </div>
        </div>

      </div>

      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-3 rounded-full"><X size={24} /></button>
            <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
                {isVideo(zoomedImage) ? (
                    <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl outline-none" onClick={(e) => e.stopPropagation()} />
                ) : (
                    <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain drop-shadow-2xl"/>
                )}
            </div>
        </div>
      )}

    </main>
  );
}