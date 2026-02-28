"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import { 
  Wallet, Building2, CreditCard, Send, Loader2, AlertCircle, CheckCircle, Clock, XCircle, History
} from "lucide-react";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function ProviderFinancePage() {
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [balance, setBalance] = useState(0); 
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  
  // بيانات النموذج
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // دالة جلب الرصيد الحي وسجل السحوبات
  const fetchFinancialData = async () => {
      setLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          // 1. جلب الرصيد من الدالة (RPC) التي برمجناها في SQL
          const { data: currentBalance, error: balanceError } = await supabase
              .rpc('get_provider_balance', { p_provider_id: session.user.id });

          if (!balanceError) {
              setBalance(currentBalance || 0);
          }

          // 2. جلب سجل طلبات السحب السابقة
          const { data: history } = await supabase
              .from('payout_requests')
              .select('*')
              .eq('provider_id', session.user.id)
              .order('created_at', { ascending: false });

          if (history) setPayoutHistory(history);

      } catch (error) {
          console.error("Error fetching finance data:", error);
      } finally {
          setLoading(false);
      }
  };

  const submitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !bankName || !iban) {
        alert("الرجاء تعبئة جميع البيانات");
        return;
    }

    const requestedAmount = Number(amount);

    if (requestedAmount <= 0) {
        alert("المبلغ يجب أن يكون أكبر من صفر.");
        return;
    }

    if (requestedAmount > balance) {
        alert(`المبلغ المطلوب (${requestedAmount} ريال) أكبر من رصيدك المتاح (${balance.toFixed(2)} ريال)!`);
        return;
    }

    setSubmitLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("يجب تسجيل الدخول أولاً");

      // إدخال الطلب مباشرة في قاعدة البيانات
      const { error } = await supabase
        .from('payout_requests')
        .insert([{
            provider_id: session.user.id,
            amount: requestedAmount,
            bank_name: bankName,
            iban: iban,
            status: 'pending'
        }]);

      if (error) throw error;

      alert("✅ تم إرسال طلب السحب بنجاح. سيتم مراجعته من قبل الإدارة.");
      
      // تصفير النموذج وتحديث البيانات
      setAmount("");
      setBankName("");
      setIban("");
      fetchFinancialData(); // تحديث الرصيد والسجل فوراً

    } catch (error: any) {
        console.error(error);
        alert("❌ حدث خطأ: " + error.message);
    } finally {
        setSubmitLoading(false);
    }
  };

  if (loading) {
      return <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center"><Loader2 className="animate-spin text-[#C89B3C] w-12 h-12"/></div>;
  }

  return (
    <div className={`min-h-screen bg-[#1a1a1a] text-white p-4 md:p-8 ${tajawal.className}`} dir="rtl">
      
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* === القسم الأيمن (الرصيد والطلب) === */}
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
                    <Wallet className="text-[#C89B3C]" /> المحفظة والأرباح
                </h1>
                <p className="text-white/60">إدارة أرباحك وطلب سحب الرصيد.</p>
            </header>

            {/* بطاقة الرصيد */}
            <div className="bg-gradient-to-l from-[#C89B3C]/20 to-[#C89B3C]/5 border border-[#C89B3C]/30 p-8 rounded-3xl text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C89B3C]/10 rounded-full blur-3xl"></div>
                <p className="text-[#C89B3C] font-bold mb-2">الرصيد القابل للسحب</p>
                <h2 className="text-5xl font-bold text-white font-mono">
                    {Number(balance).toFixed(2)} <span className="text-xl text-white/50">﷼</span>
                </h2>
                <p className="text-xs text-white/40 mt-3">* يتم حساب الأرباح الصافية بعد خصم عمولة المنصة والضريبة.</p>
            </div>

            {/* نموذج طلب السحب */}
            <div className="bg-[#252525] border border-white/5 rounded-3xl p-6 md:p-8 shadow-lg">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Send size={20} className="text-[#C89B3C]"/> طلب سحب رصيد
                </h3>

                <form onSubmit={submitPayout} className="space-y-5">
                    {/* المبلغ */}
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">المبلغ المراد سحبه</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                min="1"
                                max={balance}
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-5 text-white focus:border-[#C89B3C] outline-none pl-12 font-mono text-left dir-ltr"
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
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pr-12 pl-5 text-white focus:border-[#C89B3C] outline-none"
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
                                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pr-12 pl-5 text-white focus:border-[#C89B3C] outline-none font-mono text-left uppercase"
                                    placeholder="SA0000000000000000000000"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={submitLoading || balance <= 0}
                        className="w-full bg-[#C89B3C] hover:bg-[#b38a35] text-[#2B1F17] font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitLoading ? <Loader2 className="animate-spin"/> : <><Send size={20}/> تأكيد طلب السحب</>}
                    </button>
                </form>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 items-start">
                <AlertCircle className="text-blue-400 shrink-0" size={20} />
                <p className="text-sm text-white/70 leading-relaxed">
                    يتم معالجة طلبات السحب خلال <strong>24-48 ساعة</strong> عمل. سيصلك إشعار وتحديث لحالة الطلب فور إتمام التحويل.
                </p>
            </div>
        </div>

        {/* === القسم الأيسر (سجل الطلبات السابقة) === */}
        <div className="bg-[#252525] border border-white/5 rounded-3xl p-6 md:p-8 h-fit max-h-[85vh] flex flex-col">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                <History size={20} className="text-[#C89B3C]"/> سجل طلبات السحب
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {payoutHistory.length === 0 ? (
                    <div className="text-center text-white/40 py-10">
                        <Wallet size={40} className="mx-auto mb-3 opacity-20"/>
                        <p>لا توجد طلبات سحب سابقة.</p>
                    </div>
                ) : (
                    payoutHistory.map((req) => (
                        <div key={req.id} className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-lg font-bold font-mono text-white">{Number(req.amount).toFixed(2)} ﷼</p>
                                    <p className="text-xs text-white/50 mt-1">{new Date(req.created_at).toLocaleDateString('ar-SA')} - {new Date(req.created_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                                    req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                    req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-red-500/20 text-red-400'
                                }`}>
                                    {req.status === 'pending' ? <Clock size={12}/> : req.status === 'approved' ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                                    {req.status === 'pending' ? 'قيد المعالجة' : req.status === 'approved' ? 'مكتمل' : 'مرفوض'}
                                </span>
                            </div>
                            
                            <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-white/40 block mb-0.5">البنك</span>
                                    <span className="text-white/80 font-bold">{req.bank_name}</span>
                                </div>
                                <div className="text-left">
                                    <span className="text-white/40 block mb-0.5">الآيبان</span>
                                    <span className="text-white/80 font-mono dir-ltr truncate block" title={req.iban}>{req.iban.slice(0,6)}...{req.iban.slice(-4)}</span>
                                </div>
                            </div>

                            {req.status === 'rejected' && req.admin_notes && (
                                <div className="mt-2 bg-red-500/10 p-2 rounded text-xs text-red-400">
                                    <strong>سبب الرفض:</strong> {req.admin_notes}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
}