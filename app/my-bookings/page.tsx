"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; // تأكدنا من استخدام المتغير المصدر
import { calculateBookingPrice } from "@/lib/utils/pricing";
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

      // حساب السعر المبدئي (سيجلب الخصم العام تلقائياً إذا كان مفعلاً في pricing.ts)
      const initialCalc = await calculateBookingPrice(data.services.price);
      if (initialCalc.success && initialCalc.data) {
        setPriceDetails(initialCalc.data);
      }

      setLoading(false);
    };

    fetchBookingDetails();
  }, [bookingId, router]);

  // 2. تطبيق الكوبون
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setProcessing(true);

    const result = await calculateBookingPrice(
      booking.services.price,
      couponCode
    );

    if (result.success && result.data) {
      setPriceDetails(result.data);
      alert("✅ تم تطبيق الكوبون بنجاح!");
    } else {
      alert(result.error || "❌ الكوبون غير صالح");
      // إعادة الحساب لإزالة الكوبون الخاطئ (مع الإبقاء على الخصم العام إن وجد)
      const reset = await calculateBookingPrice(booking.services.price);
      if (reset.data) setPriceDetails(reset.data);
      setCouponCode("");
    }

    setProcessing(false);
  };

  // 3. إتمام الدفع
  const handlePayment = async () => {
    setProcessing(true);

    // محاكاة تأخير الدفع
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        status: "confirmed", // تحويل الحالة إلى مؤكد
        original_price: priceDetails.originalPrice,
        discount_amount: priceDetails.discountAmount,
        coupon_code: priceDetails.couponCode,
        final_price: priceDetails.finalPrice,
        platform_fee: priceDetails.platformFee,
        provider_earnings: priceDetails.providerEarnings,
      })
      .eq("id", bookingId);

    if (!error) {
      // زيادة عداد استخدام الكوبون
      if (priceDetails.couponCode) {
        await supabase.rpc("increment_coupon_usage", {
          code_input: priceDetails.couponCode,
        });
      }

      // التوجيه لصفحة النجاح
      router.push(`/payment-success?booking_id=${bookingId}`);
    } else {
      alert("حدث خطأ أثناء الدفع، يرجى المحاولة مرة أخرى.");
    }

    setProcessing(false);
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
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="KSA2030"
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#C89B3C] outline-none placeholder:text-gray-600"
                />
                <button 
                  onClick={handleApplyCoupon}
                  disabled={processing || !couponCode}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Tag size={18} />
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