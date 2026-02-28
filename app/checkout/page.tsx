"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  CreditCard, Tag, ArrowRight, ShieldCheck, Loader2, 
  FileText, CheckCircle, AlertCircle, MapPin, Clock, 
  Info, PlayCircle, Star, Box, X, CalendarDays, CalendarOff, Calendar
} from "lucide-react";
import Image from "next/image";
import Link from "next/link"; // ✅ تم إضافة استدعاء Link للزر

// ✅ دالة ذكية لضمان قراءة بيانات الجداول (JSON) وعرضها دائماً
const safeArray = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return []; }
    }
    if (typeof data === 'object') return Object.values(data);
    return [];
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  
  // الكوبونات والخصومات
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");

  // إعدادات المنصة (للخصم العام)
  const [settings, setSettings] = useState<any>({
    commission_tourist: 10,
    commission_housing: 15,
    commission_food: 5,
    general_discount_percent: 0,
    is_general_discount_active: false
  });

  // تفاصيل الفاتورة
  const [totals, setTotals] = useState({
    subtotal: 0,
    generalDiscountAmount: 0, 
    couponDiscountAmount: 0,  
    totalDiscount: 0,         
    vat: 0,
    total: 0
  });

  // دالة مساعدة للتحقق من الفيديو
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

  // 1. جلب البيانات (حجز + خدمة + إعدادات)
  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) {
          setLoading(false);
          return;
      }

      try {
          // أ) جلب الحجز
          const { data: bookingData, error: bookingError } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

          if (bookingError || !bookingData) {
            console.error("Booking Error:", bookingError);
            alert("عذراً، لم يتم العثور على الحجز.");
            setLoading(false);
            return;
          }

          // ب) جلب تفاصيل الخدمة
          const { data: serviceData, error: serviceError } = await supabase
            .from("services")
            .select("*") 
            .eq("id", bookingData.service_id)
            .single();

          if (serviceError) {
             console.error("Service Fetch Error:", serviceError);
          }

          // ج) جلب إعدادات المنصة
          const { data: settingsData } = await supabase
            .from("platform_settings")
            .select("*")
            .single();

          if (settingsData) setSettings(settingsData);

          // دمج البيانات
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

  // 2. حساب الفاتورة (يحدث عند تغيير الكوبون أو الإعدادات)
  useEffect(() => {
    if (!booking || !booking.services) return;

    const quantity = booking.quantity || 1;
    const unitPrice = Number(booking.services.price || 0);
    const subtotal = unitPrice * quantity;

    // 1. حساب خصم المنصة العام
    let generalDisc = 0;
    if (settings.is_general_discount_active && settings.general_discount_percent > 0) {
        generalDisc = (subtotal * settings.general_discount_percent) / 100;
    }

    // 2. حساب خصم الكوبون
    let couponDisc = 0;
    if (appliedCoupon) {
        couponDisc = (subtotal * appliedCoupon.discount_percent) / 100;
    }

    const totalDisc = generalDisc + couponDisc;
    const taxableAmount = Math.max(0, subtotal - totalDisc);
    const vat = taxableAmount * 0.15;
    const finalTotal = taxableAmount + vat;

    setTotals({
        subtotal,
        generalDiscountAmount: generalDisc,
        couponDiscountAmount: couponDisc,
        totalDiscount: totalDisc,
        vat,
        total: finalTotal
    });

  }, [booking, appliedCoupon, settings]);

  // 3. تطبيق الكوبون
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

  // ✅ 4. تنفيذ الدفع (الربط مع بي موب)
  const handlePayment = async () => {
    setProcessing(true);

    try {
        const response = await fetch('/api/paymob/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookingId: bookingId,
                couponCode: appliedCoupon ? appliedCoupon.code : null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "فشل في إنشاء رابط الدفع");
        }

        // إذا كان المبلغ 0 ريال، يتم تجاوز الدفع وتأكيد الحجز فوراً
        if (data.skipPayment) {
            await supabase.from("bookings").update({ status: "confirmed", payment_status: "paid" }).eq("id", bookingId);
            alert("✅ تم تأكيد الحجز بنجاح (مجاني)!");
            router.replace("/my-bookings");
            return;
        }

        // توجيه العميل لصفحة الدفع الخاصة بـ Paymob
        if (data.iframeUrl) {
            window.location.href = data.iframeUrl;
        }

    } catch (err: any) {
        console.error(err);
        alert("حدث خطأ أثناء الاتصال ببوابة الدفع: " + err.message);
        setProcessing(false); 
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4 text-[#C89B3C]" size={40} />
        <p className="animate-pulse">جاري تحضير صفحة الدفع...</p>
      </div>
    );
  }

  if (!booking) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">لا يوجد بيانات للعرض.</div>;

  const mainImage = booking.services?.image_url || (booking.services?.details?.images?.[0]) || "/placeholder.jpg";
  
  const workHours = safeArray(booking.services?.work_hours);
  const blockedDates = safeArray(booking.services?.blocked_dates);
  const sessions = safeArray(booking.services?.details?.sessions);
  const hasScheduleData = workHours.length > 0 || blockedDates.length > 0 || sessions.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4 md:px-8 font-tajawal" dir="rtl">
      
      {/* ✅ زر الرجوع للصفحة الرئيسية */}
      <div className="max-w-6xl mx-auto mb-6">
        <Link 
            href="/" 
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-[#C89B3C] border border-white/10 px-5 py-2.5 rounded-xl transition duration-300 w-fit font-bold text-sm"
        >
            <ArrowRight size={18} />
            العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- القسم الأيمن: تفاصيل الخدمة الكاملة --- */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-hidden">
            
            {/* الهيدر: الصورة والعنوان */}
            <div className="relative h-48 md:h-64 w-full group">
                {isVideo(mainImage) ? (
                    <video src={mainImage} className="w-full h-full object-cover opacity-60" autoPlay muted loop />
                ) : (
                    <Image src={mainImage} fill alt="Service Cover" className="object-cover opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] to-transparent" />
                
                <div className="absolute bottom-6 right-6">
                    <span className="bg-[#C89B3C] text-black text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">
                        {booking.services?.service_category === 'experience' ? 'تجربة سياحية' : 'مرفق / خدمة'}
                    </span>
                    <h2 className="text-3xl font-bold text-white mb-1">{booking.services?.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                        <span className="flex items-center gap-1"><MapPin size={16} className="text-[#C89B3C]"/> {booking.services?.location || "عسير"}</span>
                        {booking.services?.duration && <span className="flex items-center gap-1"><Clock size={16} className="text-[#C89B3C]"/> {booking.services.duration}</span>}
                    </div>
                </div>
            </div>

            {/* تفاصيل الحجز الدقيقة */}
            <div className="p-6">
                
                {/* 1. الوصف */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-[#C89B3C] mb-2 flex items-center gap-2"><Info size={18}/> تفاصيل الخدمة</h3>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {booking.services?.description || "لا يوجد وصف متاح."}
                    </p>
                </div>

                {/* ✅ جدول الأوقات والمواعيد والأيام المستثناة */}
                {hasScheduleData && (
                    <div className="mb-6 bg-black/20 p-5 rounded-xl border border-white/5 space-y-5">
                        {/* أوقات العمل */}
                        {workHours.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                                    <Clock size={16} className="text-[#C89B3C]"/> أوقات العمل الرسمية
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {workHours.map((day: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-xs">
                                            <span className="text-white/80 font-bold">{day.day}</span>
                                            {day.active ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    {safeArray(day.shifts).map((s:any, idx:number) => (
                                                        <span key={idx} className="bg-black/40 px-2 py-0.5 rounded font-mono dir-ltr">{s.from} - {s.to}</span>
                                                    ))}
                                                </div>
                                            ) : <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold">مغلق</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* الجلسات والمواعيد المحددة */}
                        {sessions.length > 0 && (
                            <div className={workHours.length > 0 ? "pt-4 border-t border-white/10" : ""}>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                                    <CalendarDays size={16} className="text-[#C89B3C]"/> الجلسات المتاحة
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {sessions.map((session: any, i: number) => (
                                        <div key={i} className="bg-white/5 p-3 rounded-lg border border-[#C89B3C]/10 text-xs flex items-start gap-3">
                                            <Calendar size={16} className="text-[#C89B3C] mt-0.5 shrink-0"/>
                                            {session.type === 'range' ? (
                                                <div className="space-y-1.5 w-full">
                                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                                        <span className="text-white/50">بدء:</span> 
                                                        <span className="dir-ltr font-bold text-white font-mono">{session.startDate} | {session.startTime}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-0.5">
                                                        <span className="text-white/50">انتهاء:</span> 
                                                        <span className="dir-ltr font-bold text-white font-mono">{session.endDate} | {session.endTime}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-white/50">موعد الجلسة:</span>
                                                    <span className="dir-ltr font-bold text-[#C89B3C] font-mono">{session.date} | {session.time}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* الأيام المستثناة */}
                        {blockedDates.length > 0 && (
                            <div className={(workHours.length > 0 || sessions.length > 0) ? "pt-4 border-t border-white/10" : ""}>
                                <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-red-400">
                                    <CalendarOff size={16}/> أيام مغلقة
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {blockedDates.map((date: string, idx: number) => (
                                        <span key={idx} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-mono dir-ltr">{date}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. ماذا تشمل التجربة؟ (إذا وجدت) */}
                {booking.services?.included_items && (
                    <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Box size={16}/> تشمل هذه التجربة:</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">{booking.services.included_items}</p>
                    </div>
                )}

                {/* 3. نقطة التجمع (إذا وجدت) */}
                {booking.services?.meeting_point && (
                    <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><MapPin size={16}/> نقطة التجمع:</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">{booking.services.meeting_point}</p>
                    </div>
                )}

                {/* 4. ملخص الحجز الرقمي */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10">
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">رقم الحجز</span>
                        <span className="font-mono text-white">#{booking.id?.slice(0, 6).toUpperCase()}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">الموعد المحدد</span>
                        <span className="font-mono text-[#C89B3C]">
                            {booking.execution_date ? new Date(booking.execution_date).toLocaleDateString('ar-SA') : (booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('ar-SA') : 'غير محدد')}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">الكمية / العدد</span>
                        <span className="text-white font-bold">{booking.quantity}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">الحالة</span>
                        <span className="text-blue-400 font-bold text-xs bg-blue-400/10 px-2 py-1 rounded">بانتظار الدفع</span>
                    </div>
                </div>
            </div>
          </div>

          {/* طرق الدفع */}
          <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5">
            <h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard size={20} className="text-[#C89B3C]"/> اختر طريقة الدفع</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-[#C89B3C] bg-[#C89B3C]/10 cursor-pointer transition ring-1 ring-[#C89B3C]/50">
                <input type="radio" name="payment" defaultChecked className="accent-[#C89B3C] w-5 h-5"/>
                <div className="flex flex-col"><span className="font-bold text-white">بطاقة مدى / ائتمانية</span><span className="text-xs text-white/50">دفع آمن ومباشر</span></div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 hover:bg-white/5 cursor-not-allowed opacity-50 grayscale">
                <input type="radio" name="payment" disabled className="w-5 h-5"/>
                <div className="flex flex-col"><span className="font-bold text-white">Apple Pay</span><span className="text-xs text-white/50">قريباً</span></div>
              </label>
            </div>
          </div>
        </div>

        {/* --- القسم الأيسر: ملخص الفاتورة والدفع --- */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5 sticky top-10 shadow-2xl">
            <h3 className="font-bold text-lg mb-6 border-b border-white/10 pb-4 flex justify-between items-center">
                ملخص الفاتورة
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white/50 font-normal">ضريبية</span>
            </h3>

            {/* إدخال الكوبون */}
            <div className="mb-6">
              <label className="text-xs text-gray-400 mb-2 block">هل لديك كود خصم إضافي؟</label>
              <div className="flex gap-2">
                <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="SAYYIR2024" disabled={!!appliedCoupon} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#C89B3C] outline-none disabled:opacity-50"/>
                {!appliedCoupon ? (
                    <button onClick={handleApplyCoupon} disabled={!couponCode} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 font-bold text-xs">تطبيق</button>
                ) : (
                    <button onClick={() => {setAppliedCoupon(null); setCouponCode("");}} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg transition"><CheckCircle size={18} /></button>
                )}
              </div>
              {couponError && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12}/> {couponError}</p>}
              {appliedCoupon && <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1"><CheckCircle size={12}/> تم تطبيق الكوبون: {appliedCoupon.code}</p>}
            </div>

            {/* تفاصيل الأرقام المالية */}
            <div className="space-y-3 text-sm mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between text-gray-400">
                  <span>المجموع الفرعي ({booking.quantity}x)</span>
                  <span className="font-mono">{totals.subtotal.toFixed(2)} ر.س</span>
              </div>
              
              {/* عرض خصم المنصة (إذا وجد) */}
              {totals.generalDiscountAmount > 0 && (
                  <div className="flex justify-between text-indigo-400">
                      <span className="flex items-center gap-1"><Tag size={12}/> خصم المنصة ({settings.general_discount_percent}%)</span>
                      <span className="font-mono">-{totals.generalDiscountAmount.toFixed(2)} ر.س</span>
                  </div>
              )}

              {/* عرض خصم الكوبون (إذا وجد) */}
              {totals.couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                      <span className="flex items-center gap-1"><Tag size={12}/> كود خصم ({appliedCoupon.code})</span>
                      <span className="font-mono">-{totals.couponDiscountAmount.toFixed(2)} ر.س</span>
                  </div>
              )}

              <div className="flex justify-between text-gray-400">
                  <span>الضريبة (15%)</span>
                  <span className="font-mono">{totals.vat.toFixed(2)} ر.س</span>
              </div>
              
              <div className="h-px bg-white/10 my-2"></div>
              
              <div className="flex justify-between text-white font-bold text-lg items-center">
                  <span>الإجمالي النهائي</span>
                  <span className="text-[#C89B3C] font-mono text-2xl">{totals.total.toFixed(2)} <span className="text-xs text-white/50">ر.س</span></span>
              </div>
              <p className="text-[10px] text-gray-500 text-center mt-1">شامل ضريبة القيمة المضافة</p>
            </div>

            <button onClick={handlePayment} disabled={processing} className="w-full bg-[#C89B3C] hover:bg-[#b38a35] text-[#1a1a1a] font-bold py-4 rounded-xl shadow-lg shadow-yellow-900/20 transition-all flex justify-center items-center gap-2 group relative overflow-hidden">
              {processing ? (<><Loader2 className="animate-spin" size={20}/> جاري معالجة الدفع...</>) : (<>تأكيد الدفع <ArrowRight size={20} className="group-hover:-translate-x-1 transition-transform"/></>)}
            </button>
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-500"><ShieldCheck size={12} /> جميع العمليات مشفرة ومحمية 100%</div>
          </div>
        </div>
      </div>
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