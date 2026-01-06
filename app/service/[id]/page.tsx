'use client';
import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, CheckCircle, Info } from 'lucide-react'; 
import { toast, Toaster } from 'sonner'; // استدعاء Toaster هنا لضمان عمل التنبيهات

export default function ServiceDetails({ params }: { params: { id: string } }) {
  
  const router = useRouter();
  // التأكد من أن الـ id موجود
  const serviceId = params?.id;

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // متغيرات الحجز
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // جلب البيانات
  useEffect(() => {
    async function getService() {
      if (!serviceId) return;

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) {
        console.error('Error fetching service:', error);
        toast.error('فشل في تحميل بيانات الخدمة');
      } else {
        setService(data);
      }
      setLoading(false);
    }
    getService();
  }, [serviceId, supabase]);

  // دالة فتح الموقع
  const handleOpenLocation = () => {
    if (service?.latitude && service?.longitude) {
      // فتح خرائط جوجل
      const url = `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`;
      window.open(url, '_blank');
    } else {
      toast.error('الموقع الجغرافي غير محدد لهذه الخدمة');
    }
  };

  // دالة الحجز
  const handleConfirmBooking = async () => {
    if (!checkIn || !checkOut) {
      toast.warning('الرجاء تحديد تواريخ الوصول والمغادرة');
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.warning('تاريخ المغادرة يجب أن يكون بعد الوصول');
      return;
    }

    setIsBooking(true);

    // 1. التحقق من المستخدم
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      // توجيه لصفحة الدخول (تأكد من مسار صفحة الدخول لديك)
      router.push('/login'); 
      setIsBooking(false);
      return;
    }

    // 2. إرسال الحجز
    const { error } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        service_id: serviceId,
        check_in: checkIn,
        check_out: checkOut,
        additional_notes: additionalNotes,
        status: 'pending',
        total_price: service.price // يمكن تطويره لحساب الأيام × السعر
      });

    if (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الحجز. حاول مرة أخرى.');
    } else {
      toast.success('تم إرسال طلب الحجز بنجاح!');
      // تفريغ الحقول
      setCheckIn('');
      setCheckOut('');
      setAdditionalNotes('');
    }
    setIsBooking(false);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">جاري التحميل...</div>;
  if (!service) return <div className="p-10 text-center text-red-500">الخدمة غير موجودة</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 pb-20 relative">
      {/* مكون التنبيهات مهم جداً لظهور الرسائل */}
      <Toaster position="top-center" richColors />

      {/* تفاصيل الخدمة */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.title}</h1>
        <p className="text-gray-500 mb-4 text-lg leading-relaxed">{service.description}</p>
        
        <div className="flex flex-wrap items-center justify-between mt-6 gap-4">
          <span className="text-2xl font-bold text-green-600 bg-green-50 px-4 py-1 rounded-lg">
            {service.price} ر.س <span className="text-sm font-normal text-gray-500">/ ليلة</span>
          </span>
          
          <button 
            onClick={handleOpenLocation}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition shadow-lg"
          >
            <MapPin size={18} />
            عرض الموقع على الخريطة
          </button>
        </div>
      </div>

      {/* نموذج الحجز */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
        <div className="border-b pb-4 mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <Calendar className="text-blue-600" />
            بيانات الحجز
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">تاريخ الوصول</label>
            <input 
              type="date" 
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">تاريخ المغادرة</label>
            <input 
              type="date" 
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Info size={16} className="text-gray-400" />
            خدمات إضافية / ملاحظات
          </label>
          <textarea 
            rows={3}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="اكتب هنا أي طلبات خاصة..."
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition resize-none"
          />
        </div>

        <div className="mt-8">
          <button 
            onClick={handleConfirmBooking}
            disabled={isBooking}
            className={`w-full py-4 text-white text-lg font-bold rounded-xl flex items-center justify-center gap-2 shadow-xl transition-all
              ${isBooking ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.01]'}
            `}
          >
            {isBooking ? 'جاري المعالجة...' : 'تأكيد الحجز الآن'}
            {!isBooking && <CheckCircle size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}