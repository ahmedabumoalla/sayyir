"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function CheckoutButton({ amount, user }: { amount: number, user: any }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/paymob/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount, // مبلغ الحجز (مثلاً 150)
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone,
        }),
      });

      const data = await res.json();
      
      if (data.url) {
        // توجيه العميل لصفحة الدفع الآمنة الخاصة بـ Paymob
        window.location.href = data.url;
      } else {
        alert("حدث خطأ أثناء تجهيز الدفع");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePayment} 
      disabled={loading}
      className="bg-[#C89B3C] text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:bg-[#b38a35] transition"
    >
      {loading ? <Loader2 className="animate-spin" /> : "إتمام الدفع"}
    </button>
  );
}