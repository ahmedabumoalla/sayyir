"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { calculateBookingPrice } from "@/lib/utils/pricing";


function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  // const supabase = createClient(); // ❌ نحذف هذا السطر

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [couponCode, setCouponCode] = useState("");
  
  const [priceDetails, setPriceDetails] = useState({
    originalPrice: 0,
    discountAmount: 0,
    finalPrice: 0,
    platformFee: 0,
    providerEarnings: 0,
    couponCode: null as string | null
  });

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) return;

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          services (
            title,
            price
          )
        `)
        .eq("id", bookingId)
        .single();

      if (error || !data) {
        alert("لم يتم العثور على الحجز");
        router.push("/my-bookings");
        return;
      }

      setBooking(data);
      const initialCalc = await calculateBookingPrice(data.services.price);
      if (initialCalc.success && initialCalc.data) {
        setPriceDetails(initialCalc.data);
      }
      setLoading(false);
    };

    fetchBookingDetails();
  }, [bookingId, router]); // حذفنا supabase من dependency array لأنه ثابت

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setProcessing(true);

    const result = await calculateBookingPrice(booking.services.price, couponCode);

    if (result.success && result.data) {
      setPriceDetails(result.data);
      alert(`تم تطبيق الخصم: ${result.data.couponCode}`);
    } else {
      alert(result.error || "الكوبون غير صالح");
      const reset = await calculateBookingPrice(booking.services.price);
      if (reset.data) setPriceDetails(reset.data);
    }
    setProcessing(false);
  };

  const handlePayment = async () => {
    setProcessing(true);

    // تحديث السجلات المالية
    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        status: "confirmed",
        original_price: priceDetails.originalPrice,
        discount_amount: priceDetails.discountAmount,
        coupon_code: priceDetails.couponCode,
        final_price: priceDetails.finalPrice,
        platform_fee: priceDetails.platformFee,
        provider_earnings: priceDetails.providerEarnings,
      })
      .eq("id", bookingId);

    if (error) {
      console.error("Error updating booking:", error);
      alert("حدث خطأ أثناء تأكيد الدفع");
    } else {
      if (priceDetails.couponCode) {
        await supabase.rpc('increment_coupon_usage', { code_input: priceDetails.couponCode });
      }
      router.push(`/payment-success?booking_id=${bookingId}`);
    }
    setProcessing(false);
  };

  if (loading) return <div className="p-10 text-white text-center">جاري تحميل الفاتورة...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-xl border border-white/10 p-6 shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-green-400">إتمام الدفع</h1>

        <div className="mb-6 pb-6 border-b border-white/10">
          <h2 className="text-lg font-semibold">{booking.services.title}</h2>
          <p className="text-gray-400 text-sm mt-1">رقم الحجز: {booking.id.slice(0, 8)}</p>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="لديك كوبون خصم؟"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-sm focus:border-green-500 outline-none"
          />
          <button
            onClick={handleApplyCoupon}
            disabled={processing}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            تطبيق
          </button>
        </div>

        <div className="space-y-3 mb-8 bg-black/30 p-4 rounded-lg">
          <div className="flex justify-between text-gray-400">
            <span>السعر الأساسي</span>
            <span>{priceDetails.originalPrice} ر.س</span>
          </div>
          
          {priceDetails.discountAmount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>قيمة الخصم ({priceDetails.couponCode})</span>
              <span>- {priceDetails.discountAmount} ر.س</span>
            </div>
          )}

          <div className="h-px bg-white/10 my-2"></div>
          
          <div className="flex justify-between text-xl font-bold">
            <span>الإجمالي للدفع</span>
            <span>{priceDetails.finalPrice} ر.س</span>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition-all flex justify-center items-center"
        >
          {processing ? "جاري المعالجة..." : `دفع ${priceDetails.finalPrice} ر.س الآن`}
        </button>
        
        <p className="text-xs text-center text-gray-500 mt-4">
          يتم الدفع عبر بيئة آمنة ومشفرة
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-white text-center p-10">جاري التحميل...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}