"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { Loader2, CheckCircle, CreditCard, ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import Image from "next/image";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<'test' | 'live'>('test');

  useEffect(() => {
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    // 1. جلب تفاصيل الحجز
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*, services(title, price)')
      .eq('id', bookingId)
      .single();
    
    if (bookingData) setBooking(bookingData);

    // 2. جلب وضع الدفع من الإعدادات
    const { data: setting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'payment_mode')
      .single();
    
    if (setting) setPaymentMode(setting.value as any);
    
    setLoading(false);
  };

  const handlePayment = async () => {
    setProcessing(true);

    try {
        if (paymentMode === 'test') {
            // === محاكاة الدفع الوهمي ===
            // تأخير بسيط للمحاكاة
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 1. تحديث حالة الحجز
            await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);

            // 2. تسجيل عملية دفع في جدول payments
            const { error: payError } = await supabase.from('payments').insert([{
                user_id: booking.user_id,
                amount: booking.total_price,
                currency: 'SAR',
                status: 'succeeded',
                description: `حجز خدمة: ${booking.services.title}`,
                payment_method: 'Test Card (Visa 4242)'
            }]);

            if (payError) throw payError;

            // 3. توجيه لصفحة النجاح
            alert("✅ تمت عملية الدفع (التجريبية) بنجاح!");
            router.push('/client/trips');

        } else {
            // === الدفع الحقيقي (ميسر) ===
            // هنا سيتم وضع كود ميسر لاحقاً
            alert("نظام الدفع المباشر قيد التفعيل. يرجى استخدام الوضع التجريبي حالياً.");
        }
    } catch (error: any) {
        alert("فشلت العملية: " + error.message);
    } finally {
        setProcessing(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#1a1a1a] text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10"/></div>;
  if (!booking) return <div className="h-screen flex items-center justify-center text-white">لم يتم العثور على الحجز</div>;

  return (
    <main dir="rtl" className={`min-h-screen bg-[#121212] flex items-center justify-center p-4 ${tajawal.className}`}>
      <div className="bg-[#1E1E1E] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#252525] p-6 border-b border-white/5 text-center">
            <h1 className="text-xl font-bold text-white mb-2">إتمام عملية الدفع</h1>
            <p className="text-white/50 text-sm">أنت على بعد خطوة واحدة من تأكيد حجزك.</p>
        </div>

        <div className="p-8">
            
            {/* ملخص الطلب */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-8">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                    <span className="text-white/60 text-sm">الخدمة</span>
                    <span className="text-white font-bold">{booking.services.title}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60 text-sm">عدد الضيوف</span>
                    <span className="text-white">{booking.guests_count}</span>
                </div>
                <div className="flex justify-between items-center text-[#C89B3C] font-bold text-lg pt-2">
                    <span>الإجمالي للدفع</span>
                    <span>{booking.total_price} ريال</span>
                </div>
            </div>

            {/* طريقة الدفع */}
            <div className="space-y-4">
                {paymentMode === 'test' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
                        <div>
                            <h4 className="text-amber-500 font-bold text-sm mb-1">وضع الدفع التجريبي</h4>
                            <p className="text-amber-200/60 text-xs">النظام يعمل في وضع المحاكاة. لن يتم خصم أي مبالغ من بطاقتك. اضغط على دفع لإتمام التجربة.</p>
                        </div>
                    </div>
                )}

                {/* زر الدفع */}
                <button 
                    onClick={handlePayment}
                    disabled={processing}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition transform active:scale-95 ${
                        paymentMode === 'test' 
                        ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                        : 'bg-[#C89B3C] hover:bg-[#b38a35] text-black'
                    }`}
                >
                    {processing ? <Loader2 className="animate-spin"/> : (
                        <>
                            {paymentMode === 'test' ? 'موافق، محاكاة الدفع' : 'الدفع الآمن الآن'}
                            <CreditCard size={20}/> 
                        </>
                    )}
                </button>

                <div className="flex justify-center gap-4 mt-6 opacity-50">
                    <div className="flex items-center gap-1 text-[10px] text-white">
                        <Lock size={10} />
                        تشفير SSL آمن
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white">
                        <ShieldCheck size={10} />
                        ضمان استرجاع
                    </div>
                </div>
            </div>

        </div>
      </div>
    </main>
  );
}