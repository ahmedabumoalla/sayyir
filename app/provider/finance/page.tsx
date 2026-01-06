"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; // تأكد من مسار العميل
import { 
  Wallet, Building2, CreditCard, Send, Loader2, AlertCircle, CheckCircle 
} from "lucide-react";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function ProviderFinancePage() {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(1500); // رصيد افتراضي للتجربة (لاحقاً تجلبه من قاعدة البيانات)
  
  // بيانات النموذج
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");

  // الدالة التي سألت عنها (تم دمجها هنا)
  const submitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !bankName || !iban) {
        alert("الرجاء تعبئة جميع البيانات");
        return;
    }

    if (Number(amount) > balance) {
        alert("المبلغ المطلوب أكبر من رصيدك الحالي!");
        return;
    }

    setLoading(true);

    try {
      // 1. جلب بيانات المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
          alert("يجب تسجيل الدخول أولاً");
          return;
      }

      // 2. استدعاء الـ API (نفس الكود اللي سألت عنه)
      const res = await fetch('/api/provider/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: user.id,
          providerName: user.user_metadata?.full_name || "مزود خدمة",
          amount: Number(amount),
          iban: iban, 
          bankName: bankName
        })
      });
      
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "فشل الطلب");

      // 3. نجاح العملية
      alert("✅ " + data.message);
      
      // تصفير النموذج
      setAmount("");
      setBankName("");
      setIban("");

    } catch (error: any) {
        console.error(error);
        alert("❌ حدث خطأ: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#1a1a1a] text-white p-6 ${tajawal.className}`} dir="rtl">
      
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* العنوان */}
        <header>
            <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
                <Wallet className="text-[#C89B3C]" /> المحفظة والأرباح
            </h1>
            <p className="text-white/60">إدارة أرباحك وطلب سحب الرصيد.</p>
        </header>

        {/* بطاقة الرصيد */}
        <div className="bg-gradient-to-l from-[#C89B3C]/20 to-[#C89B3C]/5 border border-[#C89B3C]/30 p-8 rounded-3xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C89B3C]/10 rounded-full blur-3xl"></div>
            <p className="text-[#C89B3C] font-bold mb-2">الرصيد القابل للسحب</p>
            <h2 className="text-5xl font-bold text-white">{balance} <span className="text-xl text-white/50">﷼</span></h2>
        </div>

        {/* نموذج طلب السحب */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Send size={20} className="text-[#C89B3C]"/> طلب سحب جديد
            </h3>

            <form onSubmit={submitPayout} className="space-y-5">
                
                {/* المبلغ */}
                <div>
                    <label className="text-sm text-white/60 mb-2 block">المبلغ المراد سحبه</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-xl py-4 px-5 text-white focus:border-[#C89B3C] outline-none pl-12"
                            placeholder="0.00"
                        />
                        <span className="absolute left-5 top-4 text-white/30 font-bold">SAR</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* اسم البنك */}
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">اسم البنك</label>
                        <div className="relative">
                            <Building2 className="absolute right-4 top-4 text-white/30" size={20}/>
                            <input 
                                type="text" 
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl py-4 pr-12 pl-5 text-white focus:border-[#C89B3C] outline-none"
                                placeholder="مثال: مصرف الراجحي"
                            />
                        </div>
                    </div>

                    {/* الآيبان */}
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">رقم الآيبان (IBAN)</label>
                        <div className="relative">
                            <CreditCard className="absolute right-4 top-4 text-white/30" size={20}/>
                            <input 
                                type="text" 
                                value={iban}
                                onChange={(e) => setIban(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl py-4 pr-12 pl-5 text-white focus:border-[#C89B3C] outline-none font-mono text-left"
                                placeholder="SA0000000000000000000000"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#C89B3C] hover:bg-[#b38a35] text-[#2B1F17] font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 mt-4"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <><Send size={20}/> إرسال الطلب</>}
                </button>

            </form>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 items-start">
            <AlertCircle className="text-blue-400 shrink-0" size={20} />
            <p className="text-sm text-white/70 leading-relaxed">
                يتم معالجة طلبات السحب خلال <strong>24-48 ساعة</strong> عمل. سيصلك إشعار وتحديث لحالة الطلب فور إتمام التحويل من قبل الإدارة.
            </p>
        </div>

      </div>
    </div>
  );
}