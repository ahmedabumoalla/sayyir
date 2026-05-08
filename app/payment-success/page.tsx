"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const bookingId =
      params.get("booking_id") ||
      params.get("merchant_order_id");

    if (bookingId) {
      router.replace(`/client/trips/${bookingId}`);
    } else {
      router.replace("/client/trips");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-[#C89B3C]" size={40} />
        <p>جاري تحويلك إلى التذكرة...</p>
      </div>
    </div>
  );
}