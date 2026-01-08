"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import ServiceMap from "@/components/ServiceMap";
import { 
  MapPin, ArrowRight, Share2, Star, Clock, Users, 
  CheckCircle, ShieldCheck, Calendar, Info, 
  Loader2, Tag
} from "lucide-react";
import { toast, Toaster } from "sonner";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

export default function ServiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  
  const today = new Date().toISOString().slice(0, 16);

  useEffect(() => {
    const fetchService = async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          provider:profiles!provider_id (full_name, avatar_url, email)
        `)
        .eq('id', params.id)
        .single();

      if (error) {
        console.error(error);
        toast.error("حدث خطأ في جلب البيانات");
      } else {
        setService(data);
      }
      setLoading(false);
    };

    if (params.id) fetchService();
  }, [params.id]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setVerifyingCoupon(true);
    const { data } = await supabase.from('coupons').select('*').eq('code', couponCode).eq('is_active', true).single();
    if (data && new Date(data.expiry_date) >= new Date()) {
       const discountAmount = data.type === 'percentage' ? (service.price * guests * (data.value / 100)) : data.value;
       setDiscount(discountAmount);
       setIsCouponApplied(true);
       toast.success("تم تطبيق الخصم");
    } else {
       toast.error("الكوبون غير صالح");
    }
    setVerifyingCoupon(false);
  };

  const subTotal = service ? service.price * guests : 0;
  const finalPrice = Math.max(0, subTotal - discount);

  const handleBooking = async () => {
    if (!selectedDate) {
      toast.warning("الرجاء تحديد الوقت");
      return;
    }
    setBookingLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        router.push('/login');
        return;
    }

    // إدراج الحجز
    const { error } = await supabase.from('bookings').insert({
        service_id: service.id,
        user_id: user.id,
        provider_id: service.provider_id,
        location_id: service.location_id || null, 
        booking_date: selectedDate.split('T')[0],
        booking_time: selectedDate.split('T')[1],
        guests_count: guests,
        total_price: finalPrice.toString(),
        discount_applied: discount,
        coupon_code: isCouponApplied ? couponCode : null,
        status: 'pending',
        payment_status: 'pending',
        additional_notes: additionalNotes
    });

    if (error) {
        console.error("Booking Error:", error);
        toast.error(`خطأ: ${error.message}`);
    } else {
        // إرسال إيميل للمزود
        try {
            await fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'new_booking_for_provider',
                    email: service.provider?.email, // يجب أن يكون موجوداً في جدول profiles
                    providerName: service.provider?.full_name,
                    serviceTitle: service.title,
                    name: user.user_metadata?.full_name || 'عميل',
                    reason: user.email 
                }),
            });
        } catch (e) { console.error("Email Error", e); }

        toast.success("تم إرسال الطلب بنجاح!");
        
        // التوجيه للصفحة الرئيسية
        setTimeout(() => router.push('/'), 2000);
    }
    setBookingLoading(false);
  };

  if (loading) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-[#C89B3C]"/></div>;
  if (!service) return <div className="text-center text-white p-10">الخدمة غير متاحة</div>;

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white pb-24 ${tajawal.className}`}>
      <Toaster position="top-center" richColors />
      <div className="relative h-[60vh] w-full group">
        <div className="absolute top-6 right-6 z-20">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center hover:bg-[#C89B3C] hover:text-black transition text-white border border-white/10"><ArrowRight size={20} /></button>
        </div>
        <img src={service.image_url || "/placeholder.jpg"} alt={service.title} className="w-full h-full object-cover" onError={(e:any) => e.target.src="/placeholder.jpg"} />
        <div className="absolute bottom-0 w-full p-6 md:p-12 z-10 bg-gradient-to-t from-black/80 to-transparent">
            <h1 className="text-3xl font-bold">{service.title}</h1>
            <p className="text-[#C89B3C] flex items-center gap-2"><MapPin size={16}/> {service.location}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5">
                <h2 className="text-xl font-bold mb-4 text-[#C89B3C]">تفاصيل التجربة</h2>
                <p className="text-gray-300 whitespace-pre-line">{service.description}</p>
            </div>
            {/* خريطة */}
            {service.location_lat && (
                <div className="h-64 rounded-xl overflow-hidden relative border border-white/10">
                    <ServiceMap lat={service.location_lat} lng={service.location_lng} />
                </div>
            )}
        </div>

        <div className="lg:col-span-1">
            <div className="sticky top-24 bg-[#1a1a1a] border border-[#C89B3C]/30 p-6 rounded-3xl shadow-lg">
                <div className="flex justify-between items-end mb-6 pb-4 border-b border-white/10">
                    <span className="text-gray-400">سعر الشخص</span>
                    <span className="text-2xl font-bold text-[#C89B3C]">{service.price} ر.س</span>
                </div>
                
                <div className="space-y-4">
                    <input type="datetime-local" min={today} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none" style={{colorScheme:'dark'}} />
                    
                    <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10">
                        <span className="text-sm text-gray-400">عدد الأشخاص</span>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setGuests(Math.max(1, guests-1))} className="px-2 bg-white/10 rounded">-</button>
                            <span>{guests}</span>
                            <button onClick={() => setGuests(guests+1)} className="px-2 bg-white/10 rounded">+</button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <input type="text" placeholder="كود خصم" value={couponCode} onChange={e => setCouponCode(e.target.value)} disabled={isCouponApplied} className="flex-1 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none" />
                        <button onClick={handleApplyCoupon} disabled={isCouponApplied} className="bg-white/10 px-4 rounded-xl text-sm hover:bg-[#C89B3C] hover:text-black transition">تطبيق</button>
                    </div>

                    <textarea rows={2} placeholder="ملاحظات..." value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none resize-none" />

                    <div className="border-t border-[#C89B3C]/20 pt-4 flex justify-between font-bold text-lg">
                        <span>الإجمالي</span>
                        <span className="text-[#C89B3C]">{finalPrice} ر.س</span>
                    </div>

                    <button onClick={handleBooking} disabled={bookingLoading} className="w-full bg-[#C89B3C] text-black font-bold py-4 rounded-xl hover:bg-[#b38a35] transition flex justify-center gap-2">
                        {bookingLoading ? <Loader2 className="animate-spin"/> : <ShieldCheck />}
                        {bookingLoading ? 'جاري الحجز...' : 'إرسال طلب الحجز'}
                    </button>
                    <p className="text-center text-xs text-gray-500">لن يتم الخصم حتى موافقة المزود</p>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}