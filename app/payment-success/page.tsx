"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

function PaymentSuccessContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const merchantOrderId =
      params.get("merchant_order_id") ||
      params.get("order") ||
      params.get("order_id") ||
      params.get("booking_id");

    let bookingId = merchantOrderId || "";

    if (bookingId.startsWith("SAYYIR__")) {
      bookingId = bookingId.replace("SAYYIR__", "");
    }

    if (bookingId.startsWith("SAYYIR-")) {
      bookingId = bookingId.replace("SAYYIR-", "");
    }

    bookingId = bookingId.split("_")[0];

    const timer = setTimeout(() => {
      if (bookingId) {
        router.replace(`/client/trips/${bookingId}`);
      } else {
        router.replace("/client/trips");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [params, router]);

  return (
    <div
      className="min-h-screen bg-[#121212] flex items-center justify-center text-white px-4"
      dir="rtl"
    >
      <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="text-emerald-400" size={34} />
        </div>

        <h1 className="text-xl font-bold mb-3">
          تم استلام عملية الدفع
        </h1>

        <p className="text-white/60 text-sm leading-relaxed mb-6">
          جاري تأكيد الحجز وتحويلك إلى صفحة التذكرة.
        </p>

        <div className="flex items-center justify-center gap-2 text-[#C89B3C] text-sm font-bold">
          <Loader2 className="animate-spin" size={18} />
          جاري التحويل...
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-[#121212] flex items-center justify-center text-white"
          dir="rtl"
        >
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-[#C89B3C]" size={40} />
            <p>جاري تحميل نتيجة الدفع...</p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}