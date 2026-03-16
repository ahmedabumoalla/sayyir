"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  CreditCard, Tag, ArrowRight, ShieldCheck, Loader2, 
  FileText, CheckCircle, AlertCircle, AlertTriangle, MapPin, Clock, 
  Info, Box, CalendarDays, CalendarOff, Calendar, Apple, PlayCircle,
  Mountain, Wifi, Car, Flame, Waves, Sparkles, Wind, Tv, Utensils, Activity, Users, Tent, Building, ShieldAlert, Compass, CheckSquare, Image as ImageIcon, Video, Ticket,
  Coffee, Home, Briefcase, X, Lock
} from "lucide-react";
import Image from "next/image";
import Link from "next/link"; 
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ✅ قاموس المميزات
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
    'live_shows': { label: 'عروض حية', icon: Tv }
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
    try {
        if (time24.includes('T')) return new Date(time24).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
        const [hourStr, minute] = time24.split(':');
        let hour = parseInt(hourStr, 10);
        const period = hour >= 12 ? 'مساءً' : 'صباحاً';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
    } catch { return time24; }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  
  // ✅ دعم التقاط الآيدي سواء من مسار الصفحة /checkout/[id] أو من الـ Query
  const bookingId = (params.id as string) || searchParams.get("booking_id");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // ✅ اختيار طريقة الدفع
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'applepay'>('card');

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");

  const [settings, setSettings] = useState<any>({
    commission_tourist: 10,
    commission_housing: 15,
    commission_food: 5,
    general_discount_percent: 0,
    is_general_discount_active: false
  });

  const [totals, setTotals] = useState({
    baseAmount: 0,
    generalDiscountAmount: 0, 
    couponDiscountAmount: 0,  
    totalDiscount: 0,         
    vat: 0,
    total: 0
  });

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) {
          setLoading(false);
          return;
      }

      try {
          const { data: bookingData, error: bookingError } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

          if (bookingError || !bookingData) {
            alert("عذراً، لم يتم العثور على الحجز.");
            router.replace('/client/dashboard');
            return;
          }

          const { data: serviceData, error: serviceError } = await supabase
            .from("services")
            .select(`*, profiles:provider_id(full_name, email, phone)`) 
            .eq("id", bookingData.service_id)
            .single();

          const { data: settingsData } = await supabase
            .from("platform_settings")
            .select("*")
            .single();

          if (settingsData) setSettings(settingsData);

          setBooking({
              ...bookingData,
              services: serviceData || {} 
          });

      } catch (e) {
          console.error("Critical Error:", e);
      } finally {
          setLoading(false);
      }
    };

    fetchData();
  }, [bookingId, router]);

  useEffect(() => {
    if (!booking || !booking.services) return;

    const quantity = booking.quantity || 1;
    const totalServicePrice = Number(booking.services.price || 0) * quantity;

    let generalDisc = 0;
    if (settings.is_general_discount_active && settings.general_discount_percent > 0) {
        generalDisc = (totalServicePrice * settings.general_discount_percent) / 100;
    }

    let couponDisc = 0;
    if (appliedCoupon) {
        couponDisc = (totalServicePrice * appliedCoupon.discount_percent) / 100;
    }

    const totalDisc = generalDisc + couponDisc;
    
    const finalTotal = Math.max(0, totalServicePrice - totalDisc);

    const baseAmount = finalTotal / 1.15;
    const vat = finalTotal - baseAmount;

    setTotals({
        baseAmount,
        generalDiscountAmount: generalDisc,
        couponDiscountAmount: couponDisc,
        totalDiscount: totalDisc,
        vat,
        total: finalTotal 
    });

  }, [booking, appliedCoupon, settings]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError("");
    setAppliedCoupon(null);

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .single();

    if (error || !data) {
      setCouponError("الكوبون غير صالح");
      return;
    }

    setAppliedCoupon(data);
    alert(`تم تطبيق خصم الكوبون ${data.discount_percent}% بنجاح!`);
  };

  const handlePayment = async () => {
    setProcessing(true);

    try {
        const response = await fetch('/api/paymob/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookingId: bookingId,
                couponCode: appliedCoupon ? appliedCoupon.code : null,
                paymentMethod: selectedPaymentMethod // ✅ إرسال 'card' أو 'applepay' للـ API
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "فشل في إنشاء رابط الدفع");
        }

        if (data.skipPayment) {
            await supabase.from("bookings").update({ status: "confirmed", payment_status: "paid" }).eq("id", bookingId);
            alert("✅ تم تأكيد الحجز بنجاح (مجاني)!");
            router.replace("/client/dashboard");
            return;
        }

        if (data.iframeUrl) {
            window.location.href = data.iframeUrl;
        }

    } catch (err: any) {
        console.error(err);
        alert("حدث خطأ أثناء الاتصال ببوابة الدفع: " + err.message);
        setProcessing(false); 
    }
  };

  const getTranslatedFeature = (id: string) => {
      const feat = ALL_FEATURES_DICT[id];
      if(feat) return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><feat.icon size={14} className="text-[#C89B3C]" /> {feat.label}</span>;
      return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {id}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4 text-[#C89B3C]" size={40} />
        <p className="animate-pulse">جاري تحضير صفحة الدفع والبيانات...</p>
      </div>
    );
  }

  if (!booking || !booking.services) return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">لا يوجد بيانات للعرض.</div>;

  const service = booking.services;
  const galleryImages = service.details?.images || (service.image_url ? [service.image_url] : []);
  const menuItems = safeArray(service.menu_items);
  const adultCount = booking.quantity || 1;
  const childCount = booking.details?.child_count || 0;

  return (
    <div className={`min-h-screen bg-[#121212] text-white py-12 px-4 md:px-8 ${tajawal.className}`} dir="rtl">
      
      {/* رأس الصفحة */}
      <div className="max-w-7xl mx-auto mb-8">
        <button 
            onClick={() => window.history.back()} 
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-[#C89B3C] border border-white/10 px-5 py-2.5 rounded-xl transition duration-300 w-fit font-bold text-sm mb-6"
        >
            <ArrowRight size={18} /> رجوع
        </button>
        <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <ShieldCheck className="text-emerald-500" size={32}/> إتمام الدفع وتأكيد الحجز
            </h1>
            <p className="text-white/50 text-sm mt-2">يرجى مراجعة تفاصيل الخدمة والطلب بدقة قبل إتمام عملية الدفع الآمنة.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        
        {/* ======================================================== */}
        {/* ================ العمود الأيمن (تفاصيل الخدمة كاملة) ================ */}
        {/* ======================================================== */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* 1. التذكرة وملخص الموعد */}
            <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-[#C89B3C]"></div>
                <h3 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-3"><Calendar size={20} className="text-[#C89B3C]"/> تفاصيل الحجز والموعد</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                        <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Calendar size={14}/> التاريخ المحدد</p>
                        <p className="font-bold text-sm">{formatDate(booking.check_in)}</p>
                    </div>
                    {service.sub_category !== 'lodging' && (
                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Clock size={14}/> وقت الحضور</p>
                            <p className="font-bold text-sm text-[#C89B3C] dir-ltr text-right">{formatTime12H(booking.check_in)}</p>
                        </div>
                    )}
                    {service.sub_category === 'lodging' && booking.check_out && (
                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><CalendarOff size={14}/> تاريخ المغادرة</p>
                            <p className="font-bold text-sm">{formatDate(booking.check_out)}</p>
                        </div>
                    )}
                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                        <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Users size={14}/> {service.sub_category === 'event' ? 'تذاكر بالغين' : service.sub_category === 'lodging' ? 'ليالي' : 'أشخاص'}</p>
                        <p className="font-bold text-lg">{adultCount}</p>
                    </div>
                    {childCount > 0 && (
                        <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            <p className="text-xs text-white/50 mb-1 flex items-center gap-1"><Users size={14}/> تذاكر أطفال</p>
                            <p className="font-bold text-lg">{childCount}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. معرض الصور للخدمة */}
            {galleryImages.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><ImageIcon size={20} className="text-[#C89B3C]"/> صور الخدمة</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {galleryImages.map((url: string, index: number) => (
                            <div key={index} onClick={() => setZoomedImage(url)} className="relative w-40 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-[#C89B3C] transition group">
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

            {/* 3. الوصف الأساسي */}
            <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                    <span className="bg-[#C89B3C] text-black text-[10px] font-bold px-2 py-1 rounded-md">
                        {service.sub_category === 'event' ? 'فعالية' : service.service_category === 'experience' ? 'تجربة سياحية' : service.sub_category === 'lodging' ? 'نزل سياحي' : 'مرفق / مكان'}
                    </span>
                    <h3 className="text-xl font-bold text-white line-clamp-1">{service.title}</h3>
                </div>
                <p className="text-white/70 leading-loose whitespace-pre-line text-sm">{service.description}</p>
            </div>

            {/* 4. ✅ تفاصيل النزل (Lodging) */}
            {service.sub_category === 'lodging' && service.details?.lodging_type && (
                 <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Home size={20} className="text-[#C89B3C]"/> مواصفات النزل</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div><p className="text-xs text-white/50 mb-1">نوع السكن</p><p className="font-bold text-[#C89B3C]">{service.details.lodging_type === 'other' ? service.details.custom_lodging_type : service.details.lodging_type}</p></div>
                        {service.details.area && <div><p className="text-xs text-white/50 mb-1">المساحة</p><p className="font-bold">{service.details.area} م²</p></div>}
                        {service.max_capacity > 0 && <div><p className="text-xs text-white/50 mb-1">يتسع لـ</p><p className="font-bold">{service.max_capacity} أشخاص</p></div>}
                        {service.details.target_audience && <div><p className="text-xs text-white/50 mb-1">مخصص لـ</p><p className="font-bold">{service.details.target_audience === 'singles' ? 'عزاب' : service.details.target_audience === 'families' ? 'عوايل' : 'الكل'}</p></div>}
                    </div>
                    
                    {service.details.apartment_details && (
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-xs text-white/50 mb-1">غرف النوم</span><span className="font-bold text-lg">{service.details.apartment_details.rooms}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-xs text-white/50 mb-1">عدد الأسرة</span><span className="font-bold text-lg">{service.details.apartment_details.beds}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-xs text-white/50 mb-1">دورات المياه</span><span className="font-bold text-lg">{service.details.apartment_details.bathrooms}</span></div>
                        </div>
                    )}

                    {service.details.house_details && (
                        <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-[10px] md:text-xs text-white/50 mb-1">عدد الأدوار</span><span className="font-bold md:text-lg">{service.details.house_details.floors}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-[10px] md:text-xs text-white/50 mb-1">غرف النوم</span><span className="font-bold md:text-lg">{service.details.house_details.bedrooms}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-[10px] md:text-xs text-white/50 mb-1">المجالس</span><span className="font-bold md:text-lg">{service.details.house_details.livingRooms}</span></div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3"><span className="block text-[10px] md:text-xs text-white/50 mb-1">الحمامات</span><span className="font-bold md:text-lg">{service.details.house_details.bathrooms}</span></div>
                        </div>
                    )}

                    {(safeArray(service.details.features).length > 0 || safeArray(service.details.custom_features).length > 0) && (
                        <div className="pt-4 border-t border-white/10">
                            <h4 className="font-bold mb-3 flex items-center gap-2"><Sparkles size={16} className="text-[#C89B3C]"/> مميزات المكان</h4>
                            <div className="flex flex-wrap gap-2">
                                {safeArray(service.details.features).map((feat: string) => getTranslatedFeature(feat))}
                                {safeArray(service.details.custom_features).map((feat: string, idx: number) => <span key={`c-${idx}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {feat}</span>)}
                            </div>
                        </div>
                    )}
                 </div>
            )}

            {/* 5. ✅ تفاصيل التجربة (Experience) */}
            {service.sub_category === 'experience' && service.details?.experience_info && (
                <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Compass size={20} className="text-[#C89B3C]"/> تفاصيل التجربة السياحية</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5"><span className="block text-xs text-white/50 mb-1">المدة</span><span className="font-bold text-sm text-white">{service.details.experience_info.duration}</span></div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5"><span className="block text-xs text-white/50 mb-1">الصعوبة</span><span className="font-bold text-sm text-white">{service.details.experience_info.difficulty === 'easy' ? 'سهل' : service.details.experience_info.difficulty === 'medium' ? 'متوسط' : 'صعب'}</span></div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5"><span className="block text-xs text-white/50 mb-1">الفئة</span><span className="font-bold text-sm text-white">{service.details.experience_info.target_audience === 'both' ? 'عوايل وعزاب' : service.details.experience_info.target_audience === 'families' ? 'عوايل' : 'عزاب'}</span></div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5"><span className="block text-xs text-white/50 mb-1">الأطفال</span><span className={`font-bold text-sm ${service.details.experience_info.children_allowed ? 'text-emerald-400' : 'text-red-400'}`}>{service.details.experience_info.children_allowed ? 'مسموح' : 'غير مسموح'}</span></div>
                    </div>

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
                            <h4 className="text-[#C89B3C] font-bold text-sm mb-2 flex items-center gap-2"><Utensils size={16}/> تفاصيل الوجبة</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                                <p><span className="text-white/50">نوع الوجبة:</span> <span className="font-bold text-white">{service.details.experience_info.food_details.mealType}</span></p>
                                <p className="md:col-span-2"><span className="text-white/50">المكونات:</span> <span className="text-white bg-black/20 p-2 rounded block mt-1">{service.details.experience_info.food_details.contents}</span></p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 6. ✅ تفاصيل الفعالية (Event) */}
            {service.sub_category === 'event' && service.details?.event_info && (
                <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
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

            {/* 7. ✅ خدمات المرفق (Facility Services) */}
            {service.sub_category === 'facility' && safeArray(service.details?.facility_services).length > 0 && (
                <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-white/5 shadow-xl">
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

            {/* 8. ✅ سياسات المكان (متطلبات، تأمين، إلغاء) */}
            <div className="bg-red-500/5 p-6 rounded-3xl border border-red-500/20 shadow-xl space-y-5">
                <h3 className="text-xl font-bold flex items-center gap-2 text-red-400 border-b border-red-500/20 pb-3"><AlertTriangle size={20}/> السياسات وشروط الحجز</h3>
                
                {service.details?.policies && (
                    <div>
                        <h4 className="text-sm font-bold text-white mb-2">السياسات العامة:</h4>
                        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line bg-black/40 p-4 rounded-xl">{service.details.policies}</p>
                    </div>
                )}

                {service.details?.experience_info?.what_to_bring && (
                    <div>
                        <h4 className="text-sm font-bold text-[#C89B3C] mb-2">المتطلبات (ماذا تحضر معك):</h4>
                        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line bg-black/40 p-4 rounded-xl">{service.details.experience_info.what_to_bring}</p>
                    </div>
                )}

                {service.details?.experience_info?.cancellation_policy && (
                    <div>
                        <h4 className="text-sm font-bold text-white mb-2">سياسة الإلغاء:</h4>
                        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line bg-black/40 p-4 rounded-xl">{service.details.experience_info.cancellation_policy}</p>
                    </div>
                )}

                {service.details?.deposit_config?.required && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3">
                        <ShieldCheck size={24} className="text-orange-400 shrink-0 mt-1"/>
                        <div>
                            <h4 className="text-orange-400 font-bold mb-1">تأمين مسترد على المحتويات</h4>
                            <p className="text-white/80 text-sm">
                                يشترط دفع مبلغ تأمين {service.details.deposit_config.paymentTime === 'with_booking' ? 'يتم سداده مع الحجز بالمنصة' : 'يُدفع نقداً للمزود عند الوصول'}.
                                {service.details.deposit_config.isRefundable && " (التأمين مسترد بالكامل في حال عدم وجود تلفيات)."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 9. ✅ الخريطة */}
            {service.location_lat && service.location_lng && (
                <div className="bg-[#1e1e1e] p-2 rounded-3xl border border-white/5 shadow-xl overflow-hidden h-80 relative group">
                    <Map initialViewState={{ latitude: service.location_lat, longitude: service.location_lng, zoom: 14 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN} interactive={false}>
                        <NavigationControl position="top-left" showCompass={false}/>
                        <Marker latitude={service.location_lat} longitude={service.location_lng} color="#C89B3C"/>
                    </Map>
                    <div className="absolute top-6 right-6 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                        <MapPin size={18} className="text-[#C89B3C]"/>
                        <span className="text-sm font-bold">موقع تقديم الخدمة</span>
                    </div>
                </div>
            )}
        </div>

        {/* ======================================================== */}
        {/* ================ العمود الأيسر (طرق الدفع والملخص) ================ */}
        {/* ======================================================== */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e1e1e] p-6 md:p-8 rounded-3xl border border-[#C89B3C]/30 sticky top-10 shadow-2xl shadow-[#C89B3C]/5">
            
            <h3 className="font-bold text-xl mb-6 border-b border-white/10 pb-4 flex justify-between items-center">
                ملخص الفاتورة
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white/50 font-normal">شامل الضريبة</span>
            </h3>

            {/* إدخال الكوبون */}
            <div className="mb-6">
              <label className="text-xs text-gray-400 mb-2 block">هل لديك كود خصم إضافي؟</label>
              <div className="flex gap-2">
                <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="SAYYIR2024" disabled={!!appliedCoupon} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#C89B3C] outline-none disabled:opacity-50 tracking-wider font-mono"/>
                {!appliedCoupon ? (
                    <button onClick={handleApplyCoupon} disabled={!couponCode} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 font-bold text-xs">تطبيق</button>
                ) : (
                    <button onClick={() => {setAppliedCoupon(null); setCouponCode("");}} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition" title="إلغاء الكوبون"><X size={18} /></button>
                )}
              </div>
              {couponError && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12}/> {couponError}</p>}
              {appliedCoupon && <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1"><CheckCircle size={12}/> تم تطبيق الكوبون بنجاح</p>}
            </div>

            {/* تفاصيل الأرقام المالية */}
            <div className="space-y-3 text-sm mb-6 bg-black/20 p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between text-gray-400">
                  <span>المبلغ الأساسي للخدمة</span>
                  <span className="font-mono">{totals.baseAmount.toFixed(2)} ر.س</span>
              </div>
              
              {totals.generalDiscountAmount > 0 && (
                  <div className="flex justify-between text-indigo-400">
                      <span className="flex items-center gap-1"><Tag size={12}/> خصم المنصة</span>
                      <span className="font-mono">-{totals.generalDiscountAmount.toFixed(2)} ر.س</span>
                  </div>
              )}

              {totals.couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                      <span className="flex items-center gap-1"><Tag size={12}/> خصم الكوبون</span>
                      <span className="font-mono">-{totals.couponDiscountAmount.toFixed(2)} ر.س</span>
                  </div>
              )}

              <div className="flex justify-between text-gray-400">
                  <span>الضريبة المضافة (15%)</span>
                  <span className="font-mono">{totals.vat.toFixed(2)} ر.س</span>
              </div>
              
              <div className="h-px bg-white/10 my-3"></div>
              
              <div className="flex justify-between text-white font-bold text-lg items-center">
                  <span>الإجمالي النهائي</span>
                  <span className="text-[#C89B3C] font-mono text-3xl">{totals.total.toFixed(2)} <span className="text-xs text-white/50">ر.س</span></span>
              </div>
            </div>

            {/* ✅ اختيار طريقة الدفع المحدثة لأبل باي */}
            <h4 className="font-bold text-sm mb-3">اختر طريقة الدفع:</h4>
            <div className="space-y-3 mb-8">
                
                {/* Apple Pay Option */}
                <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedPaymentMethod === 'applepay' ? 'bg-white text-black border-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'applepay' ? 'border-black' : 'border-white/30'}`}>
                            {selectedPaymentMethod === 'applepay' && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                        </div>
                        <span className="font-bold text-xl mt-1 font-mono tracking-wide">Pay</span>
                    </div>
                    <Apple size={28} className={selectedPaymentMethod === 'applepay' ? 'text-black' : 'text-white'} />
                </label>

                {/* Mada / Credit Card Option */}
                <label className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedPaymentMethod === 'card' ? 'bg-[#C89B3C] text-black border-[#C89B3C] shadow-[0_0_15px_rgba(200,155,60,0.2)]' : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === 'card' ? 'border-black' : 'border-white/30'}`}>
                            {selectedPaymentMethod === 'card' && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                        </div>
                        <span className="font-bold text-sm">البطاقات البنكية</span>
                    </div>
                    <div className="flex gap-1.5">
                        <div className="w-8 h-5 bg-linear-to-r from-green-400 to-emerald-600 rounded flex items-center justify-center text-[7px] font-bold text-white shadow-sm">mada</div>
                        <div className="w-8 h-5 bg-white rounded flex items-center justify-center text-[7px] font-bold text-blue-900 italic shadow-sm">VISA</div>
                    </div>
                </label>

            </div>

            {/* زر تأكيد الدفع */}
            <button 
                onClick={handlePayment} 
                disabled={processing} 
                className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 shadow-lg group
                ${processing ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}`}
            >
                {processing ? (
                    <><Loader2 className="animate-spin" size={20}/> جاري إنشاء رابط الدفع...</>
                ) : (
                    <>ادفع {totals.total.toFixed(2)} ر.س الآن <Lock size={16} className="text-black/50 ml-1"/></>
                )}
            </button>
            <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-gray-500">
                <ShieldCheck size={14} /> الدفع محمي ومشفر بالكامل عبر مزود الخدمة Paymob
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

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin"/></div>}>
      <CheckoutContent />
    </Suspense>
  );
}