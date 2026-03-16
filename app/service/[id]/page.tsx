"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  Search, MapPin, Filter, Star, Loader2, Home, Utensils, Mountain, ArrowLeft, Clock, CalendarDays, ChevronLeft,
  Users, CheckCircle, X, Info, ShieldCheck, Image as ImageIcon, PlayCircle, Calendar, Box, AlertCircle, Briefcase, Minus, Plus, Send, CheckSquare,
  Wifi, Car, Waves, Sparkles, Wind, Tv, Flame, Coffee, HeartPulse, CalendarOff, Activity, Compass, Tent, Building, Ticket, CreditCard
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast, Toaster } from "sonner";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return []; }
    }
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

const addDaysToDate = (dateStr: string, days: number): string => {
    if (!dateStr || days < 1) return dateStr;
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

// ✅ الدالة الجديدة لتوليد أوقات الفعالية المتاحة فقط بنظام 12 ساعة
const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes = 30) => {
    if (!startTime || !endTime) return [];
    const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
    };

    let startMins = parseTime(startTime);
    let endMins = parseTime(endTime);

    if (endMins <= startMins) {
        endMins += 24 * 60; // إذا كانت الفعالية تقطع منتصف الليل
    }

    const slots = [];
    for (let m = startMins; m <= endMins; m += intervalMinutes) {
        const currentMins = m % (24 * 60);
        const hours24 = Math.floor(currentMins / 60);
        const mins = currentMins % 60;
        const value24 = `${hours24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        slots.push({
            value: value24,
            label: formatTime12H(value24)
        });
    }
    return slots;
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
  const [childCount, setChildCount] = useState(0); 

  const [additionalNotes, setAdditionalNotes] = useState(""); 
  const [totalPrice, setTotalPrice] = useState(0);

  const [checkIn, setCheckIn] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [dateTimeError, setDateTimeError] = useState("");

  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchServiceDetails();
  }, []);

  useEffect(() => {
      if (!service) return;

      if (service.sub_category === 'lodging') {
          const nights = Math.max(1, guestCount);
          setTotalPrice(checkIn ? nights * service.price : 0);
      } 
      else if (service.sub_category === 'event') {
          const adultTotal = guestCount * service.price;
          const childPrice = service.details?.event_info?.child_price || 0;
          const childTotal = childCount * childPrice;
          setTotalPrice(adultTotal + childTotal);
      } 
      else {
          setTotalPrice(service.price * guestCount);
      }
  }, [guestCount, childCount, checkIn, service]);

  useEffect(() => {
      if (!service || (service.service_category !== 'experience' && service.sub_category !== 'event')) return;
      if (!bookingDate) { setDateTimeError(""); return; }

      const blockedDates = safeArray(service.blocked_dates);
      const expDates = safeArray(service.details?.experience_info?.dates); 
      const eventInfo = service.details?.event_info; 

      if (blockedDates.includes(bookingDate)) {
          setDateTimeError("هذا التاريخ مغلق ولا يمكن الحجز فيه.");
          return;
      }

      if (service.sub_category === 'event' && eventInfo?.dates) {
          // 1. التحقق من التاريخ
          if (bookingDate < eventInfo.dates.startDate || bookingDate > eventInfo.dates.endDate) {
              setDateTimeError("هذا التاريخ يقع خارج فترة إقامة الفعالية.");
              return;
          } 
          
          // 2. التحقق من الوقت باحترافية (تحويل لدقائق)
          if (bookingTime && eventInfo.dates.startTime && eventInfo.dates.endTime) {
              const parseTime = (timeStr: string) => {
                  if (!timeStr) return 0;
                  const [h, m] = timeStr.split(':').map(Number);
                  return (h * 60) + (m || 0);
              };

              const tMin = parseTime(bookingTime);
              const sMin = parseTime(eventInfo.dates.startTime);
              let eMin = parseTime(eventInfo.dates.endTime);

              // إذا كانت الفعالية تنتهي بعد منتصف الليل نضيف 24 ساعة (1440 دقيقة)
              if (eMin <= sMin) {
                  eMin += 1440;
              }

              let adjustedUserTime = tMin;
              // إذا العميل اختار وقت بعد منتصف الليل والفعالية مستمرة لبعد منتصف الليل
              if (adjustedUserTime < sMin && eMin > 1440) {
                  adjustedUserTime += 1440;
              }

              if (adjustedUserTime >= sMin && adjustedUserTime <= eMin) {
                  setDateTimeError(""); // الوقت سليم
              } else {
                  setDateTimeError("الوقت المختار خارج ساعات عمل الفعالية.");
              }
          } else {
              setDateTimeError("");
          }
          return;
      }

      if (service.sub_category === 'experience' && expDates.length > 0) {
          if (!expDates.includes(bookingDate)) {
              setDateTimeError("التجربة غير متاحة في هذا التاريخ. يرجى اختيار تاريخ من المواعيد المتاحة.");
          } else {
              setDateTimeError("");
          }
          return;
      }

      setDateTimeError("");
  }, [bookingDate, bookingTime, service]);

  const fetchServiceDetails = async () => {
    const { data, error } = await supabase.from("services").select(`*, profiles:provider_id(full_name, avatar_url)`).eq("id", id).single();
    if (data) {
        setService(data);
        const isLimited = data.service_category === 'experience' && data.sub_category !== 'event';
        if (isLimited && (data.max_capacity === 0 || data.max_capacity === null)) {
            setGuestCount(0);
        }
    }
    setLoading(false);
  };

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

  const isLimitedCapacity = service?.service_category === 'experience' && service?.sub_category !== 'event';
  const isSoldOut = isLimitedCapacity ? (service.max_capacity === null || service.max_capacity <= 0) : false;
  const quantityLabel = service?.sub_category === 'lodging' ? 'عدد الليالي' : service?.sub_category === 'event' ? 'عدد التذاكر (بالغين)' : 'عدد الأشخاص';

  const incrementGuests = () => {
      if (isLimitedCapacity) {
          if (service.max_capacity && guestCount < service.max_capacity) setGuestCount(prev => prev + 1);
          else toast.error(`عذراً، المقاعد المتبقية هي ${service.max_capacity} فقط.`);
      } else {
          if (guestCount < 50) setGuestCount(prev => prev + 1);
          else toast.error("تم الوصول للحد الأقصى المسموح للحجز الواحد.");
      }
  };
  const decrementGuests = () => { if (guestCount > (service?.sub_category === 'event' ? 0 : 1)) setGuestCount(prev => prev - 1); };

  const handleBookingRequest = async () => {
      if (!agreedToPolicies && service.details?.policies) return toast.warning("الرجاء الموافقة على سياسات المزود أولاً.");
      
      let finalCheckIn = null;
      let finalCheckOut = null;

      if (service.sub_category === 'lodging') {
          if (!checkIn) return toast.warning("الرجاء تحديد تاريخ الوصول.");
          if (guestCount < 1) return toast.warning("الرجاء اختيار عدد الليالي.");
          finalCheckIn = checkIn;
          finalCheckOut = addDaysToDate(checkIn, guestCount);
      } else {
          if (!bookingDate) return toast.warning("الرجاء تحديد تاريخ الحضور.");
          if (service.sub_category !== 'experience' && !bookingTime) return toast.warning("الرجاء تحديد وقت الحضور.");
          if (dateTimeError) return toast.error("توجد مشكلة في التاريخ أو الوقت المختار.");
          finalCheckIn = `${bookingDate} ${bookingTime || service.details?.experience_info?.start_time || '00:00'}`;
      }

      if (service.sub_category === 'event' && guestCount === 0 && childCount === 0) {
          return toast.warning("الرجاء اختيار تذكرة واحدة على الأقل.");
      }

      setBookingLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { toast.error("يجب تسجيل الدخول لإرسال طلب حجز."); router.push('/login'); return; }

          const isAutoApprove = service.sub_category === 'event';
          const bookingStatus = isAutoApprove ? 'approved_unpaid' : 'pending';

          const { data: bookingData, error: bookingError } = await supabase.from('bookings').insert([{
              user_id: session.user.id,
              service_id: service.id,
              provider_id: service.provider_id,
              quantity: guestCount,
              total_price: totalPrice,
              check_in: finalCheckIn,
              check_out: finalCheckOut,
              execution_date: finalCheckIn,
              additional_notes: additionalNotes,
              status: bookingStatus, 
              booking_date: new Date(),
              details: { child_count: childCount } 
          }]).select().single();

          if (bookingError) throw bookingError;

          if (isLimitedCapacity) {
              const { data: refreshService } = await supabase.from('services').select('max_capacity').eq('id', service.id).single();
              if (refreshService && refreshService.max_capacity >= guestCount) {
                  await supabase.from('services').update({ max_capacity: refreshService.max_capacity - guestCount }).eq('id', service.id);
              }
          }

          if (isAutoApprove) {
              toast.success("تم تأكيد الحجز المبدئي، جاري توجيهك للدفع...");
              router.push(`/checkout/${bookingData.id}`); 
          } else {
              toast.success("✅ تم إرسال طلب الحجز بنجاح! سيقوم المزود بمراجعة طلبك وإشعارك.");
              router.push('/client/dashboard'); 
          }

      } catch (error: any) {
          console.error(error);
          toast.error("حدث خطأ أثناء إرسال الطلب: " + error.message);
      } finally {
          setBookingLoading(false);
      }
  };

  const getTranslatedFeature = (id: string) => {
      const feat = ALL_FEATURES_DICT[id];
      if(feat) return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><feat.icon size={14} className="text-[#C89B3C]" /> {feat.label}</span>;
      return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {id}</span>;
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10"/></div>;
  if (!service) return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white">الخدمة غير موجودة أو تم إيقافها.</div>;

  const galleryImages = service.details?.images || (service.image_url ? [service.image_url] : []);
  const isEventOrExp = service.service_category === 'experience' || service.sub_category === 'event';
  
  const menuItems = safeArray(service.menu_items);

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
        <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] via-black/50 to-transparent" />
        
        <button onClick={() => window.history.back()} className="absolute top-6 right-6 bg-black/50 p-2 rounded-full text-white hover:bg-[#C89B3C] transition z-20">
            <ChevronLeft size={24} className="rotate-180" />
        </button>

        <div className="absolute bottom-0 w-full p-6 md:p-10">
            <div className="container mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <span className="bg-[#C89B3C] text-black text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block shadow-lg">
                            {service.sub_category === 'event' ? 'فعالية' : service.service_category === 'experience' ? 'تجربة سياحية' : service.sub_category === 'lodging' ? 'نزل سياحي' : 'مرفق / مكان'}
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">{service.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-white/80 mt-2">
                            <div className="flex items-center gap-1"><MapPin size={18} className="text-[#C89B3C]"/> {service.location_lat ? "تم تحديد الموقع" : "عسير"}</div>
                            
                            {(service.duration || service.details?.experience_info?.duration) && (
                                <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-xs border border-white/10">
                                    <Clock size={14} className="text-[#C89B3C]"/> المدة: {service.duration || service.details?.experience_info?.duration}
                                </div>
                            )}
                            
                            {(service.difficulty_level || service.details?.experience_info?.difficulty) && (
                                <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-xs border border-white/10">
                                    <Activity size={14} className="text-[#C89B3C]"/> 
                                    {(service.difficulty_level || service.details?.experience_info?.difficulty) === 'easy' ? 'سهل' : (service.difficulty_level || service.details?.experience_info?.difficulty) === 'medium' ? 'متوسط' : 'صعب'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ======================================================== */}
        {/* ================ العمود الأيمن (التفاصيل) ================ */}
        {/* ======================================================== */}
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
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Info size={20} className="text-[#C89B3C]"/> الوصف والتفاصيل</h3>
                <p className="text-gray-300 leading-loose whitespace-pre-line text-base">{service.description}</p>
            </div>

            {/* 1. ✅ تفاصيل النزل (Lodging) للعميل */}
            {service.sub_category === 'lodging' && service.details?.lodging_type && (
                 <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Home size={20} className="text-[#C89B3C]"/> مواصفات النزل</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div><p className="text-xs text-white/50 mb-1">نوع السكن</p><p className="font-bold text-[#C89B3C]">{service.details.lodging_type === 'other' ? service.details.custom_lodging_type : service.details.lodging_type}</p></div>
                        {service.details.area && <div><p className="text-xs text-white/50 mb-1">المساحة</p><p className="font-bold">{service.details.area} م²</p></div>}
                        {service.max_capacity > 0 && <div><p className="text-xs text-white/50 mb-1">يتسع لـ</p><p className="font-bold">{service.max_capacity} أشخاص</p></div>}
                        {service.details.target_audience && <div><p className="text-xs text-white/50 mb-1">مخصص لـ</p><p className="font-bold">{service.details.target_audience === 'singles' ? 'عزاب' : service.details.target_audience === 'families' ? 'عوايل' : 'الكل'}</p></div>}
                    </div>
                    
                    {/* تفاصيل الشقة */}
                    {service.details.apartment_details && (
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-xs text-white/50 mb-1">غرف النوم</span><span className="font-bold text-lg">{service.details.apartment_details.rooms}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-xs text-white/50 mb-1">عدد الأسرة</span><span className="font-bold text-lg">{service.details.apartment_details.beds}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-xs text-white/50 mb-1">دورات المياه</span><span className="font-bold text-lg">{service.details.apartment_details.bathrooms}</span></div>
                        </div>
                    )}

                    {/* تفاصيل البيت الشعبي */}
                    {service.details.house_details && (
                        <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-[10px] md:text-xs text-white/50 mb-1">عدد الأدوار</span><span className="font-bold md:text-lg">{service.details.house_details.floors}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-[10px] md:text-xs text-white/50 mb-1">غرف النوم</span><span className="font-bold md:text-lg">{service.details.house_details.bedrooms}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-[10px] md:text-xs text-white/50 mb-1">المجالس</span><span className="font-bold md:text-lg">{service.details.house_details.livingRooms}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-[10px] md:text-xs text-white/50 mb-1">الحمامات</span><span className="font-bold md:text-lg">{service.details.house_details.bathrooms}</span></div>
                        </div>
                    )}

                    {/* المميزات (الثابتة واليدوية) */}
                    {(safeArray(service.details.features).length > 0 || safeArray(service.details.custom_features).length > 0) && (
                        <div className="pt-4 border-t border-white/10">
                            <h4 className="font-bold mb-3 flex items-center gap-2"><Sparkles size={16} className="text-[#C89B3C]"/> مميزات المكان</h4>
                            <div className="flex flex-wrap gap-2">
                                {safeArray(service.details.features).map((feat: string) => getTranslatedFeature(feat))}
                                {safeArray(service.details.custom_features).map((feat: string, idx: number) => <span key={`c-${idx}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {feat}</span>)}
                            </div>
                        </div>
                    )}

                    {/* التأمين */}
                    {service.details.deposit_config?.required && (
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mt-4 flex items-start gap-3">
                            <ShieldCheck size={24} className="text-orange-400 shrink-0 mt-1"/>
                            <div>
                                <h4 className="text-orange-400 font-bold mb-1">تأمين مسترد على المحتويات</h4>
                                <p className="text-white/80 text-sm">
                                    يشترط دفع مبلغ تأمين {service.details.deposit_config.paymentTime === 'with_booking' ? 'يتم سداده مع الحجز' : 'يُدفع نقداً عند الوصول'}.
                                    {service.details.deposit_config.isRefundable && " التأمين مسترد بالكامل في حال تسليم السكن بدون تلفيات."}
                                </p>
                            </div>
                        </div>
                    )}
                 </div>
            )}

            {/* 2. ✅ تفاصيل التجربة (Experience) للعميل */}
            {service.sub_category === 'experience' && service.details?.experience_info && (
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Compass size={20} className="text-[#C89B3C]"/> تفاصيل التجربة</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5"><span className="block text-xs text-white/50 mb-1">المدة</span><span className="font-bold text-sm text-white">{service.details.experience_info.duration}</span></div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5"><span className="block text-xs text-white/50 mb-1">الصعوبة</span><span className="font-bold text-sm text-white">{service.details.experience_info.difficulty === 'easy' ? 'سهل' : service.details.experience_info.difficulty === 'medium' ? 'متوسط' : 'صعب'}</span></div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5"><span className="block text-xs text-white/50 mb-1">الفئة</span><span className="font-bold text-sm text-white">{service.details.experience_info.target_audience === 'both' ? 'عوايل وعزاب' : service.details.experience_info.target_audience === 'families' ? 'عوايل' : 'عزاب'}</span></div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5"><span className="block text-xs text-white/50 mb-1">الأطفال</span><span className={`font-bold text-sm ${service.details.experience_info.children_allowed ? 'text-emerald-400' : 'text-red-400'}`}>{service.details.experience_info.children_allowed ? 'مسموح' : 'غير مسموح'}</span></div>
                    </div>

                    {safeArray(service.details.experience_info.dates).length > 0 && (
                        <div className="pt-4 border-t border-white/10">
                            <h4 className="font-bold mb-3 flex items-center gap-2 text-sm"><CalendarDays size={16} className="text-[#C89B3C]"/> المواعيد المتاحة للتجربة</h4>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs bg-[#C89B3C] text-black px-3 py-1.5 rounded-lg font-bold">يبدأ الساعة: {formatTime12H(service.details.experience_info.start_time)}</span>
                                {safeArray(service.details.experience_info.dates).map((d: string, i: number) => <span key={i} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg dir-ltr border border-white/10">{d}</span>)}
                            </div>
                        </div>
                    )}

                    {(safeArray(service.details.experience_info.included_services).length > 0 || safeArray(service.details.experience_info.custom_services).length > 0) && (
                        <div className="pt-4 border-t border-white/10">
                            <h4 className="font-bold mb-3 flex items-center gap-2 text-sm"><Briefcase size={16} className="text-[#C89B3C]"/> ماذا تشمل التجربة؟</h4>
                            <div className="flex flex-wrap gap-2">
                                {safeArray(service.details.experience_info.included_services).map((srv: string) => getTranslatedFeature(srv))}
                                {safeArray(service.details.experience_info.custom_services).map((srv: string, idx: number) => <span key={`cust-${idx}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {srv}</span>)}
                            </div>
                        </div>
                    )}

                    {service.details.experience_info.food_details && (
                        <div className="bg-[#C89B3C]/10 border border-[#C89B3C]/20 p-4 rounded-xl space-y-2">
                            <h4 className="text-[#C89B3C] font-bold text-sm mb-2 flex items-center gap-2"><Utensils size={16}/> تفاصيل وجبة الطعام المقدمة</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                                <p><span className="text-white/50">نوع الوجبة:</span> <span className="font-bold text-white">{service.details.experience_info.food_details.mealType}</span></p>
                                {service.details.experience_info.food_details.calories && <p><span className="text-white/50">السعرات الحرارية:</span> <span className="font-bold text-white">{service.details.experience_info.food_details.calories}</span></p>}
                                <p className="md:col-span-2"><span className="text-white/50">المشروبات:</span> <span className="text-white">{service.details.experience_info.food_details.drinks}</span></p>
                                <p className="md:col-span-2"><span className="text-white/50 block mb-1">المكونات والمحتويات:</span> <span className="text-white bg-black/20 p-2 rounded block mt-1">{service.details.experience_info.food_details.contents}</span></p>
                            </div>
                        </div>
                    )}

                    {(service.details.experience_info.what_to_bring || service.details.experience_info.cancellation_policy) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                            {service.details.experience_info.what_to_bring && (
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <h4 className="text-[#C89B3C] font-bold text-sm mb-2 flex items-center gap-2"><AlertCircle size={16}/> المطلوب إحضاره</h4>
                                    <p className="text-white/80 text-xs leading-relaxed whitespace-pre-line">{service.details.experience_info.what_to_bring}</p>
                                </div>
                            )}
                            {service.details.experience_info.cancellation_policy && (
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <h4 className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2"><X size={16}/> سياسة الإلغاء والاسترجاع</h4>
                                    <p className="text-white/80 text-xs leading-relaxed whitespace-pre-line">{service.details.experience_info.cancellation_policy}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 3. ✅ تفاصيل الفعالية (Event) للعميل */}
            {service.sub_category === 'event' && service.details?.event_info && (
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Ticket size={20} className="text-[#C89B3C]"/> تفاصيل الفعالية</h3>
                    
                    <div className="bg-linear-to-r from-[#C89B3C]/10 to-transparent p-5 rounded-2xl border border-[#C89B3C]/20 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div><p className="text-[10px] text-white/50 mb-1">من تاريخ</p><p className="font-bold text-sm dir-ltr">{service.details.event_info.dates?.startDate}</p></div>
                        <div><p className="text-[10px] text-white/50 mb-1">إلى تاريخ</p><p className="font-bold text-sm dir-ltr">{service.details.event_info.dates?.endDate}</p></div>
                        <div><p className="text-[10px] text-white/50 mb-1">فتح الأبواب</p><p className="font-bold text-sm text-[#C89B3C]">{formatTime12H(service.details.event_info.dates?.startTime)}</p></div>
                        <div><p className="text-[10px] text-white/50 mb-1">إغلاق الأبواب</p><p className="font-bold text-sm text-[#C89B3C]">{formatTime12H(service.details.event_info.dates?.endTime)}</p></div>
                    </div>

                    {(safeArray(service.details.event_info.activities).length > 0 || safeArray(service.details.event_info.custom_activities).length > 0) && (
                        <div className="pt-4 border-t border-white/10">
                            <h4 className="font-bold mb-3 flex items-center gap-2 text-sm"><Activity size={16} className="text-[#C89B3C]"/> الأنشطة المتاحة</h4>
                            <div className="flex flex-wrap gap-2">
                                {safeArray(service.details.event_info.activities).map((act: string) => getTranslatedFeature(act))}
                                {safeArray(service.details.event_info.custom_activities).map((act: string, idx: number) => <span key={`cust-${idx}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {act}</span>)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* خدمات المرفق (Facility Services) */}
            {service.sub_category === 'facility' && safeArray(service.details?.facility_services).length > 0 && (
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Activity size={20} className="text-[#C89B3C]"/> الخدمات المتوفرة بالداخل</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {safeArray(service.details.facility_services).map((srv: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                                {srv.image_url ? (
                                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black cursor-pointer" onClick={() => setZoomedImage(srv.image_url)}>
                                        <Image src={srv.image_url} fill className="object-cover hover:scale-110 transition" alt={srv.name}/>
                                    </div>
                                ) : <div className="w-16 h-16 shrink-0 bg-black/40 rounded-lg flex items-center justify-center"><ImageIcon className="text-white/20"/></div>}
                                <div>
                                    <h4 className="font-bold text-white text-sm">{srv.name}</h4>
                                    {srv.description && <p className="text-xs text-white/50 mt-1 line-clamp-2">{srv.description}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* قائمة المنتجات/الطعام (للمرفق فقط) */}
            {menuItems.length > 0 && (
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        {service.sub_category === 'food' ? <Utensils size={20} className="text-[#C89B3C]"/> : <Box size={20} className="text-[#C89B3C]"/>}
                        {service.sub_category === 'food' ? 'قائمة الطعام (المنيو)' : 'المنتجات المعروضة'}
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

            {/* الخريطة (لكل الأنواع) */}
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

        {/* ======================================================== */}
        {/* ================ العمود الأيسر (كرت الحجز) ================ */}
        {/* ======================================================== */}
        <div className="space-y-6">
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-[#C89B3C]/30 sticky top-24 shadow-2xl shadow-[#C89B3C]/5">
                
                {/* بيانات المزود */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                    <div className="w-14 h-14 rounded-full bg-white/10 overflow-hidden relative border border-[#C89B3C]/50 shadow-lg shrink-0">
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

                {/* السعر والتقييم */}
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <span className="text-gray-400 text-xs font-bold block mb-1">
                            {service.sub_category === 'lodging' ? 'سعر الليلة الواحدة' : service.sub_category === 'event' ? 'تذكرة البالغين' : 'سعر الشخص الواحد'}
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-4xl font-bold text-[#C89B3C] font-mono">{service.price === 0 ? "مجاني" : service.price}</span>
                            {service.price > 0 && <span className="text-sm text-[#C89B3C] font-bold">ر.س</span>}
                        </div>
                    </div>
                    <div className="flex gap-1 text-sm bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20"><Star size={16} className="fill-yellow-400 text-yellow-400"/> 4.9</div>
                </div>

                <div className="space-y-5">
                    
                    {/* 1. نظام حجز السكن: تاريخ الوصول + عدد الليالي */}
                    {service.sub_category === 'lodging' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold px-1">تاريخ الوصول</label>
                                <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-[#C89B3C]/50 transition">
                                    <input type="date" min={todayDate} value={checkIn} onClick={(e) => e.currentTarget.showPicker()} onChange={e => setCheckIn(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-transparent p-3 outline-none text-white text-xs cursor-pointer text-center" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold px-1">عدد الليالي</label>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex justify-between items-center">
                                    <span className="text-xs text-white/60 px-2">ليلة</span>
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => guestCount > 1 && setGuestCount(guestCount - 1)} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/5"><Minus size={16} className="text-white"/></button>
                                        <span className="font-bold w-8 text-center text-xl font-mono text-[#C89B3C]">{guestCount}</span>
                                        <button type="button" onClick={() => setGuestCount(guestCount + 1)} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/5"><Plus size={16} className="text-white"/></button>
                                    </div>
                                </div>
                            </div>
                            {checkIn && guestCount >= 1 && (
                                <div className="bg-[#C89B3C]/10 border border-[#C89B3C]/30 rounded-xl p-3 text-center">
                                    <span className="text-xs text-white/60">المغادرة: </span>
                                    <span className="font-bold text-[#C89B3C] font-mono">{new Date(addDaysToDate(checkIn, guestCount)).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. نظام حجز الفعاليات والتجارب مع تحقق ذكي للتاريخ والوقت */}
                    {isEventOrExp && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold px-1">تاريخ الحضور</label>
                                    <div className={`bg-black/40 border rounded-xl flex items-center relative overflow-hidden transition ${dateTimeError ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-[#C89B3C]/50'}`}>
                                        <input type="date" min={todayDate} value={bookingDate} onClick={(e) => e.currentTarget.showPicker()} onChange={(e) => setBookingDate(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-transparent p-3 outline-none text-white text-xs cursor-pointer text-center" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold px-1">وقت الحضور</label>
                                    {service.sub_category === 'experience' && service.details?.experience_info?.start_time ? (
                                        // التجربة وقتها ثابت ولا يتغير
                                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center text-xs text-[#C89B3C] font-bold dir-ltr">
                                            {formatTime12H(service.details.experience_info.start_time)}
                                        </div>
                                    ) : (
                                        <div className={`bg-black/40 border rounded-xl flex items-center relative overflow-hidden transition ${dateTimeError ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-[#C89B3C]/50'}`}>
                                            {/* ✅ استبدال حقل الوقت المفتوح بقائمة منسدلة مغلقة بالأوقات المتاحة فقط */}
                                            {service.sub_category === 'event' && service.details?.event_info?.dates?.startTime && service.details?.event_info?.dates?.endTime ? (
                                                <select
                                                    value={bookingTime}
                                                    onChange={(e) => setBookingTime(e.target.value)}
                                                    className="w-full bg-transparent p-3 outline-none text-white text-sm cursor-pointer text-center appearance-none"
                                                    style={{ colorScheme: 'dark' }}
                                                >
                                                    <option value="" disabled hidden>اختر الوقت</option>
                                                    {generateTimeSlots(service.details.event_info.dates.startTime, service.details.event_info.dates.endTime).map((slot: any) => (
                                                        <option key={slot.value} value={slot.value} className="bg-[#1a1a1a] text-white">
                                                            {slot.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input type="time" value={bookingTime} onClick={(e) => e.currentTarget.showPicker()} onChange={(e) => setBookingTime(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-transparent p-3 outline-none text-white text-sm cursor-pointer text-center" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {dateTimeError && (
                                <p className="text-xs text-red-400 flex items-center gap-1 bg-red-500/10 p-2 rounded-lg border border-red-500/20"><AlertCircle size={14}/> {dateTimeError}</p>
                            )}
                        </div>
                    )}

                    {/* 3. العدادات (الكمية/الأشخاص) */}
                    {service.sub_category !== 'lodging' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold px-1">{quantityLabel}</label>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex justify-between items-center">
                                    <div className="flex items-center gap-2 pl-3">
                                        <Users size={18} className="text-[#C89B3C]"/>
                                        {isLimitedCapacity && <span className="text-[10px] text-red-400">متبقي: {service.max_capacity}</span>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button type="button" onClick={decrementGuests} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/5"><Minus size={16} className="text-white"/></button>
                                        <span className="font-bold w-6 text-center text-xl font-mono">{guestCount}</span>
                                        <button type="button" onClick={incrementGuests} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/5"><Plus size={16} className="text-white"/></button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* عداد الأطفال للفعاليات فقط (إذا كان في سعر أطفال) */}
                            {service.sub_category === 'event' && service.details?.event_info?.child_price !== undefined && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs text-gray-400 font-bold">تذاكر الأطفال</label>
                                        <span className="text-[10px] text-[#C89B3C]">{service.details.event_info.child_price === 0 ? 'مجاناً' : `${service.details.event_info.child_price} ر.س / طفل`}</span>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex justify-between items-center">
                                        <div className="flex items-center gap-2 pl-3">
                                            <Users size={16} className="text-white/50"/>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button type="button" onClick={() => childCount > 0 && setChildCount(childCount - 1)} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/5"><Minus size={16} className="text-white"/></button>
                                            <span className="font-bold w-6 text-center text-xl font-mono">{childCount}</span>
                                            <button type="button" onClick={() => setChildCount(childCount + 1)} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/5"><Plus size={16} className="text-white"/></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* الملاحظات */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                        <label className="text-xs text-gray-400 font-bold flex items-center gap-1 px-1">
                            <Info size={12}/> ملاحظاتك للمزود
                        </label>
                        <textarea 
                            rows={2}
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            placeholder="أي طلبات خاصة؟"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-sm resize-none focus:border-[#C89B3C]/50 transition"
                        />
                    </div>

                    {/* سياسات المكان والموافقة */}
                    {(service.details?.policies || service.sub_category === 'lodging') && (
                        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl mt-4">
                            <h4 className="text-red-400 font-bold flex items-center gap-2 text-sm mb-2"><ShieldCheck size={16} /> سياسات الحجز</h4>
                            {service.details?.policies && (
                                <div className="text-xs text-white/70 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar mb-4 pl-2 border-r-2 border-red-500/20 pr-2 whitespace-pre-line">
                                    {service.details.policies}
                                </div>
                            )}
                            <label className={`flex items-start gap-3 cursor-pointer group ${isSoldOut ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition shrink-0 ${agreedToPolicies ? 'bg-[#C89B3C] border-[#C89B3C] text-black' : 'border-white/30 group-hover:border-white'}`}>
                                    {agreedToPolicies && <CheckCircle size={14}/>}
                                </div>
                                <input type="checkbox" checked={agreedToPolicies} onChange={(e) => setAgreedToPolicies(e.target.checked)} className="hidden" disabled={isSoldOut}/>
                                <span className="text-xs text-white/80 select-none pt-0.5 leading-relaxed">قرأت وأوافق على سياسات المزود وشروط الحجز والإلغاء الموضحة.</span>
                            </label>
                        </div>
                    )}

                    {/* السعر الإجمالي */}
                    {totalPrice > 0 && (
                        <div className="bg-linear-to-r from-[#C89B3C]/5 to-[#C89B3C]/20 border border-[#C89B3C]/30 rounded-xl p-5 mt-4 flex justify-between items-center shadow-lg">
                            <span className="font-bold text-white">الإجمالي المتوقع</span>
                            <span className="text-2xl font-bold text-[#C89B3C] font-mono">{totalPrice} ر.س</span>
                        </div>
                    )}

                    {/* زر الإرسال / الدفع */}
                    <button 
                        onClick={handleBookingRequest}
                        disabled={isSoldOut || ((service.details?.policies || service.sub_category === 'lodging') && !agreedToPolicies) || bookingLoading || dateTimeError !== "" || (service.sub_category === 'lodging' && !checkIn) || (service.sub_category === 'event' && !bookingTime)}
                        className={`w-full py-5 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 mt-2
                        ${(isSoldOut || dateTimeError !== "" || (service.sub_category === 'lodging' && !checkIn) || (service.sub_category === 'event' && !bookingTime))
                            ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
                            : (!service.details?.policies && service.sub_category !== 'lodging' || agreedToPolicies) 
                                ? 'bg-[#C89B3C] text-black hover:bg-[#b38a35] shadow-[0_0_20px_rgba(200,155,60,0.3)]' 
                                : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'}`}
                    >
                        {bookingLoading ? <Loader2 className="animate-spin"/> : (isSoldOut ? 'انتهى الحجز' : (service.sub_category === 'lodging' && !checkIn) ? 'حدد تاريخ الوصول' : (service.sub_category === 'event' && !bookingTime) ? 'حدد وقت الحضور' : ((agreedToPolicies || (!service.details?.policies && service.sub_category !== 'lodging')) ? (service.sub_category === 'event' ? <><CreditCard size={20}/> متابعة للدفع مباشرة</> : <><Send size={20}/> تأكيد وإرسال الطلب</>) : 'وافق على الشروط أولاً'))}
                    </button>
                    {service.sub_category !== 'event' && <p className="text-[10px] text-center text-white/40">لن يتم خصم أي مبلغ حتى يوافق المزود على طلبك.</p>}
                </div>
            </div>
        </div>

      </div>

      {/* تكبير الصور */}
      {zoomedImage && (
        <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-3 rounded-full"><X size={24} /></button>
            <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
                {isVideo(zoomedImage) ? ( <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl outline-none" onClick={(e) => e.stopPropagation()} /> ) : ( <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain drop-shadow-2xl"/> )}
            </div>
        </div>
      )}

    </main>
  );
}