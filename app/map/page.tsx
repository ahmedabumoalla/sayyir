'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// تعديل 1: استخدام مسار Supabase الصحيح الموجود عندك
import { supabase } from "@/lib/supabaseClient"; 
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, Star, User, Loader2 } from 'lucide-react';
// تعديل 2: استدعاء مكون الخريطة الجديد الذي أنشأناه
import ServiceMap from '@/components/ServiceMap';

export default function ServiceDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  // لا نحتاج createClient هنا لأننا استوردنا supabase جاهزاً

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // جلب الخدمة
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          provider:profiles!provider_id (full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching service:', error);
      } else {
        setService(data);
      }
      setLoading(false);
    };

    getData();
  }, [id]);

  const handleBooking = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setBookingLoading(true);

    const { error } = await supabase
      .from('bookings')
      .insert({
        service_id: service.id,
        client_id: user.id,
        provider_id: service.provider_id,
        status: 'pending',
        total_price: service.price,
        booking_date: new Date().toISOString(),
      });

    setBookingLoading(false);

    if (error) {
      alert('حدث خطأ أثناء الحجز');
      console.error(error);
    } else {
      alert('تم إرسال طلب الحجز بنجاح!');
      router.push('/my-bookings'); 
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-gray-500" /></div>;
  if (!service) return <div className="text-center p-10 mt-20">الخدمة غير موجودة</div>;

  // استخدام صور من المصفوفة أو صورة افتراضية
  const mainImage = service.image_url || '/placeholder.jpg';

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10 relative font-sans">
      
      {/* زر الرجوع */}
      <div className="fixed top-0 left-0 right-0 z-30 p-4 pointer-events-none">
        <Link 
          href="/" 
          className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur shadow rounded-full text-gray-800 hover:bg-white transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      <div className="max-w-6xl mx-auto md:pt-6 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* قسم الصور */}
          <div className="lg:col-span-2">
            <div className="relative h-[300px] md:h-[450px] w-full md:rounded-2xl overflow-hidden bg-gray-100">
               <Image 
                 src={mainImage} 
                 alt={service.title} 
                 fill 
                 className="object-cover"
               />
            </div>
          </div>

          {/* التفاصيل */}
          <div className="px-5 md:px-0 mt-4 md:mt-0 space-y-6">
            
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-right">{service.title}</h1>
              
              <div className="flex items-center justify-end gap-2 text-sm text-gray-500 mb-4">
                 <span>{service.location || 'الموقع غير محدد'}</span>
                 <MapPin className="w-4 h-4" />
              </div>

              <div className="flex items-center justify-between py-3 border-y border-gray-100 flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative">
                        {service.provider?.avatar_url ? (
                            <Image src={service.provider.avatar_url} alt="Provider" fill />
                        ) : (
                            <User className="w-6 h-6 m-auto text-gray-500 mt-2" />
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">مقدم الخدمة</p>
                        <p className="text-sm font-bold text-gray-900">{service.provider?.full_name || 'مجهول'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-md">
                    <span className="font-bold text-yellow-700">4.8</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                </div>
              </div>
            </div>

            <div className="text-right">
              <h3 className="font-bold text-gray-900 mb-2">تفاصيل الخدمة</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {service.description}
              </p>
            </div>

            {/* الخريطة المصغرة */}
            {service.location_lat && service.location_lng && (
              <div className="text-right">
                <h3 className="font-bold text-gray-900 mb-2">الموقع</h3>
                <div className="h-48 rounded-xl overflow-hidden border border-gray-200 relative bg-gray-100">
                   {/* استدعاء المكون الجديد وتمرير الإحداثيات */}
                   {/* انتبه: تأكد أن أسماء الأعمدة تطابق قاعدة البيانات location_lat / location_lng */}
                   <ServiceMap lat={service.location_lat} lng={service.location_lng} />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* شريط الحجز */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 md:static md:border-0 md:mt-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 md:justify-end flex-row-reverse">
            <div className="md:hidden text-right">
                <span className="block text-gray-500 text-xs">الإجمالي</span>
                <span className="block text-xl font-bold text-blue-600">{service.price} ر.س</span>
            </div>
            
            <button 
                onClick={handleBooking}
                disabled={bookingLoading}
                className="flex-1 md:flex-none md:w-64 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
                {bookingLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'إرسال طلب حجز'}
            </button>
            
            <div className="hidden md:block text-right ml-4">
                <span className="block text-gray-500 text-xs">السعر</span>
                <span className="block text-xl font-bold text-blue-600">{service.price} ر.س</span>
            </div>
        </div>
      </div>

    </div>
  );
}