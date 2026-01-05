"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Wallet, ArrowUpRight, Plus } from "lucide-react";

export default function ProviderFinancePage() {
  const [balance, setBalance] = useState(0);
  const [payouts, setPayouts] = useState<any[]>([]);

  useEffect(() => {
     // هنا يتم جلب الأرباح الحقيقية وطلبات السحب
     // (مماثل لكود الداشبورد ولكن بتفاصيل أكثر)
  }, []);

  const handleRequestPayout = async () => {
      // منطق إرسال طلب سحب جديد لجدول payout_requests
      alert("سيتم إتاحة السحب قريباً بعد ربط الحساب البنكي.");
  };

  return (
    <div className="space-y-8">
        <div className="bg-gradient-to-r from-[#C89B3C]/20 to-[#252525] border border-[#C89B3C]/20 p-8 rounded-3xl flex justify-between items-center">
            <div>
                <p className="text-[#C89B3C] mb-2 font-bold">الرصيد القابل للسحب</p>
                <h2 className="text-4xl font-bold text-white">{balance.toLocaleString()} ريال</h2>
            </div>
            <button onClick={handleRequestPayout} className="bg-[#C89B3C] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#b38a35] flex items-center gap-2">
                <Plus size={20}/> طلب سحب
            </button>
        </div>

        <div>
            <h3 className="text-xl font-bold text-white mb-4">سجل العمليات</h3>
            <div className="bg-[#252525] rounded-2xl border border-white/5 p-6 text-center text-white/40">
                لا توجد عمليات سحب سابقة.
            </div>
        </div>
    </div>
  );
}