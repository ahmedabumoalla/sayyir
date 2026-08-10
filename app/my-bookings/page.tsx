"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; // تأكدنا من استخدام المتغير المصدر
import { CreditCard, Tag, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [couponCode, setCouponCode] = useState("");

  // حالة تفاصيل السعر
  const [priceDetails, setPriceDetails] = useState({
    originalPrice: 0,
    discountAmount: 0, // يشمل خصم الكوبون
    finalPrice: 0,
    platformFee: 0,
    providerEarnings: 0,
    couponCode: null as string | null,
  });

  // 1. جلب بيانات الحجز عند التحميل
  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) return;

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          services (
            title,
            price,
            city,
            image_url
          )
        `)
        .eq("id", bookingId)
        .single();

      if (error || !data) {
        console.error("Error fetching booking:", error);
        router.push("/my-bookings");
        return;
      }

      setBooking(data);

      const originalPrice = Number(
        data.subtotal ?? Number(data.services.price || 0) * Number(data.quantity ?? 1)
      );
      setPriceDetails({
        originalPrice,
        discountAmount: 0,
        finalPrice: originalPrice,
        platformFee: 0,
        providerEarnings: 0,
        couponCode: null,
      });

      setLoading(false);
    };

    fetchBookingDetails();
  }, [bookingId, router]);

  // 2. تطبيق الكوبون
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setProcessing(true);

    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, bookingId }),
      });
      const result = await response.json();

      if (!response.ok || !result.applied) {
        alert(result.error || "❌ الكوبون غير صالح");
        return;
      }

      setCouponCode(result.code);
      setPriceDetails((current) => ({
        ...current,
        originalPrice: result.subtotal,
        discountAmount: result.discountAmount,
        finalPrice: result.finalAmount,
        couponCode: result.code,
      }));
      alert("✅ تم تطبيق الكوبون بنجاح!");
    } catch {
      alert("تعذر التحقق من كود الخصم");
    } finally {
      setProcessing(false);
    }
  };

  // 3. إتمام الدفع
  const handlePayment = async () => {
    setProcessing(true);

    try {
      const response = await fetch("/api/paymob/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          discountCode: priceDetails.couponCode,
          paymentMethod: "card",
        }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "فشل بدء عملية الدفع");

      if (result.skipPayment) {
        const freeResponse = await fetch("/api/paymob/free-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, paymentMethod: "مجاني" }),
        });
        const freeResult = await freeResponse.json();
        if (!freeResponse.ok) throw new Error(freeResult.error || "فشل تأكيد الحجز المجاني");
        router.push(`/payment-success?booking_id=${bookingId}`);
        return;
      }

      if (!result.iframeUrl) throw new Error("لم يتم استلام رابط الدفع");
      window.location.href = result.iframeUrl;
    } catch (error: any) {
      alert(error.message || "حدث خطأ أثناء الدفع، يرجى المحاولة مرة أخرى.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4 text-[#C89B3C]" size={40} />
        <p>جاري تجهيز الفاتورة...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white py-12 px-4 md:px-8 font-tajawal" dir="rtl">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* العمود الأيمن: ملخص الطلب */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ShieldCheck className="text-[#C89B3C]" /> تفاصيل الحجز
            </h2>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
               {/* صورة الخدمة (اختياري) */}
               <div className="w-full md:w-32 h-24 bg-white/10 rounded-lg overflow-hidden relative">
                  {/* يمكنك إضافة Image هنا إذا كانت متوفرة في booking.services.image_url */}
                  <div className="absolute inset-0 flex items-center justify-center text-white/20 font-bold">
                    LOGO
                  </div>
               </div>

               <div className="flex-1">
                 <h3 className="text-lg font-bold text-white mb-2">{booking.services.title}</h3>
                 <div className="text-sm text-gray-400 space-y-1">
                   <p>رقم الحجز: <span className="font-mono text-white/70">{booking.id.slice(0, 8)}</span></p>
                   <p>التاريخ: <span className="text-white/70">{booking.booking_date}</span></p>
                   <p>المدينة: <span className="text-white/70">{booking.services.city || "عسير"}</span></p>
                 </div>
               </div>
            </div>
          </div>

          {/* طرق الدفع (محاكاة) */}
          <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5 opacity-80 cursor-not-allowed">
            <h3 className="font-bold mb-4 flex items-center gap-2">
               <CreditCard size={20}/> طريقة الدفع
            </h3>
            <div className="flex gap-4">
              <div className="border border-[#C89B3C] bg-[#C89B3C]/10 px-4 py-2 rounded-lg text-[#C89B3C] font-bold text-sm">
                بطاقة مدى / ائتمانية
              </div>
              <div className="border border-white/10 px-4 py-2 rounded-lg text-gray-500 text-sm">
                Apple Pay
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">* هذه نسخة تجريبية، لن يتم خصم مبالغ فعلية.</p>
          </div>
        </div>

        {/* العمود الأيسر: الفاتورة والدفع */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5 sticky top-24">
            <h3 className="font-bold text-lg mb-6 border-b border-white/10 pb-4">ملخص الدفع</h3>

            {/* إدخال الكوبون */}
            <div className="mb-6">
              <label className="text-xs text-gray-400 mb-2 block">هل لديك كوبون خصم؟</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setCouponCode(value);
                    if (priceDetails.couponCode && value !== priceDetails.couponCode) {
                      setPriceDetails((current) => ({
                        ...current,
                        discountAmount: 0,
                        finalPrice: current.originalPrice,
                        couponCode: null,
                      }));
                    }
                  }}
                  placeholder="KSA2030"
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#C89B3C] outline-none placeholder:text-gray-600"
                />
                <button 
                  onClick={handleApplyCoupon}
                  disabled={processing || !couponCode}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Tag size={18} /> تطبيق الكود
                </button>
              </div>
            </div>

            {/* الحسابات */}
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-gray-400">
                <span>سعر الخدمة</span>
                <span>{priceDetails.originalPrice} ر.س</span>
              </div>
              
              {priceDetails.discountAmount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>خصم {priceDetails.couponCode ? `(${priceDetails.couponCode})` : "المنصة"}</span>
                  <span>- {priceDetails.discountAmount} ر.س</span>
                </div>
              )}

              <div className="h-px bg-white/10 my-2"></div>

              <div className="flex justify-between text-white font-bold text-lg">
                <span>الإجمالي</span>
                <span>{priceDetails.finalPrice} ر.س</span>
              </div>
            </div>

            {/* زر الدفع */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full bg-[#C89B3C] hover:bg-[#b38a35] text-[#1a1a1a] font-bold py-4 rounded-xl shadow-lg shadow-yellow-900/20 transition-all flex justify-center items-center gap-2 group"
            >
              {processing ? (
                <>
                  <Loader2 className="animate-spin" size={20}/> جاري المعالجة...
                </>
              ) : (
                <>
                  دفع {priceDetails.finalPrice} ر.س <ArrowRight size={20} className="group-hover:-translate-x-1 transition-transform"/>
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
               <ShieldCheck size={14} /> عملية دفع آمنة ومشفرة
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// المكون الرئيسي الذي يصدر للصفحة
export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212] flex items-center justify-center text-[#C89B3C]">جاري التحميل...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
