"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  MapPin, Star, User, Calendar, Users, CheckCircle, 
  Share2, Heart, ArrowLeft, Loader2, ShieldCheck, Info 
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

export default function ServiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const serviceId = resolvedParams.id;
  const router = useRouter();

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // حالة الحجز
  const [guests, setGuests] = useState(1);
  const [date, setDate] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    fetchServiceDetails();
  }, [serviceId]);

  // حساب السعر عند تغيير المدخلات
  useEffect(() => {
    if (service) {
      // منطق بسيط: السعر * عدد الضيوف (يمكن تعديله ليكون بالليلة للسكن)
      setTotalPrice(service.price * guests);
    }
  }, [guests, service]);

  const fetchServiceDetails = async () => {
    try {
      // 1. جلب تفاصيل الخدمة مع بيانات المزود
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          profiles:provider_id (full_name, avatar_url, is_approved)
        `)
        .eq("id", serviceId)
        .single();

      if (error) throw error;
      setService(data);

      // 2. التحقق من المفضلة (إذا كان المستخدم مسجلاً)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: fav } = await supabase
          .from("favorites")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("service_id", serviceId) // تأكدنا من وجود هذا العمود أو location_id
          .single();
        if (fav) setIsFavorite(true);
      }

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!date) return alert("الرجاء اختيار تاريخ الحجز");
    
    setBookingLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("يجب تسجيل الدخول لإتمام الحجز");
      router.push("/login?redirect=/service/" + serviceId);
      return;
    }

    try {
      // إدراج الحجز في قاعدة البيانات
      const { error } = await supabase.from("bookings").insert([
        {
          user_id: session.user.id,
          service_id: serviceId,
          booking_date: date,
          guests_count: guests,
          total_price: totalPrice,
          status: "pending", // معلق حتى الدفع أو الموافقة
          provider_id: service.provider_id // لسهولة الاستعلام للمزود
        }
      ]);

      if (error) throw error;

      // توجيه لصفحة نجاح أو دفع
      // router.push(`/payment/${newBookingId}`); // مستقبلاً
      alert("✅ تم استلام طلب الحجز! سيتم التواصل معك قريباً.");
      router.push("/client/trips");

    } catch (error: any) {
      alert("حدث خطأ أثناء الحجز: " + error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const toggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("سجل دخولك لإضافة المفضلة");

    if (isFavorite) {
      await supabase.from("favorites").delete().eq("service_id", serviceId).eq("user_id", session.user.id);
      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert([{ service_id: serviceId, user_id: session.user.id }]);
      setIsFavorite(true);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10"/></div>;
  if (!service) return <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-white">الخدمة غير موجودة</div>;

  // استخراج الصور من التفاصيل (JSON) أو استخدام صورة افتراضية
  const images = service.details?.images || ["/hero-bg.jpg"]; 

  return (
    <main dir="rtl" className={`min-h-screen bg-[#121212] text-white pb-20 ${tajawal.className}`}>
      
      {/* --- Header Image & Nav --- */}
      <div className="relative h-[50vh] lg:h-[60vh] w-full">
        <Image src={images[0]} alt={service.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#121212]" />
        
        {/* Navbar العائم */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
          <button onClick={() => router.back()} className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-3">
            <button className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition text-white">
              <Share2 size={20} />
            </button>
            <button onClick={toggleFavorite} className={`p-3 backdrop-blur-md rounded-full transition ${isFavorite ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}>
              <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-10 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- Right Column: Details --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Title & Stats */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="bg-[#C89B3C] text-[#2B1F17] px-3 py-1 rounded-full text-xs font-bold">
                  {service.service_type === 'housing' ? '🏡 سكن' : service.service_type === 'food' ? '🍽️ تجربة طعام' : '🧗 مغامرة'}
                </span>
                <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400"/> 4.8 (120 تقييم)
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">{service.title}</h1>
              <div className="flex items-center gap-2 text-white/60">
                <MapPin size={16} className="text-[#C89B3C]"/>
                <span>عسير، المملكة العربية السعودية</span>
              </div>
            </div>

            {/* Provider Info */}
            <div className="flex items-center justify-between bg-[#1E1E1E] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C] font-bold text-xl">
                  {service.profiles?.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-white/50">مقدم الخدمة</p>
                  <h3 className="font-bold flex items-center gap-1">
                    {service.profiles?.full_name} 
                    {service.profiles?.is_approved && <ShieldCheck size={14} className="text-blue-400"/>}
                  </h3>
                </div>
              </div>
              <button className="bg-white/5 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition">عرض الملف</button>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold border-r-4 border-[#C89B3C] pr-3">الوصف</h3>
              <p className="text-white/70 leading-loose text-justify">
                {service.description}
              </p>
            </div>

            {/* Amenities / Details Grid (From JSON) */}
            {service.details && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold border-r-4 border-[#C89B3C] pr-3">المميزات والتفاصيل</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(service.details).map(([key, value]) => {
                    if (typeof value !== 'object' && key !== 'images') {
                      return (
                        <div key={key} className="bg-[#1E1E1E] p-4 rounded-xl text-center border border-white/5">
                          <p className="text-white/40 text-xs mb-1">{key}</p>
                          <p className="font-bold text-[#C89B3C]">{String(value)}</p>
                        </div>
                      )
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Map */}
            {service.location_lat && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold border-r-4 border-[#C89B3C] pr-3">الموقع</h3>
                <div className="h-64 rounded-2xl overflow-hidden border border-white/10 relative">
                  <Map
                    initialViewState={{ latitude: service.location_lat, longitude: service.location_lng, zoom: 14 }}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                  >
                    <Marker latitude={service.location_lat} longitude={service.location_lng} color="#C89B3C" />
                    <NavigationControl position="top-left" />
                  </Map>
                </div>
              </div>
            )}

          </div>

          {/* --- Left Column: Booking Card (Sticky) --- */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-[#1E1E1E] border border-white/5 rounded-3xl p-6 shadow-2xl">
              
              <div className="flex justify-between items-end mb-6">
                <div>
                  <span className="text-3xl font-bold text-white">{service.price}</span>
                  <span className="text-sm text-[#C89B3C] mr-1">ريال</span>
                </div>
                <span className="text-white/40 text-sm">/ للشخص (أو الليلة)</span>
              </div>

              <div className="space-y-4 mb-6">
                {/* Date Picker */}
                <div className="space-y-2">
                  <label className="text-xs text-white/60 font-bold flex items-center gap-1"><Calendar size={14}/> تاريخ الحجز</label>
                  <input 
                    type="date" 
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none"
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* Guests Counter */}
                <div className="space-y-2">
                  <label className="text-xs text-white/60 font-bold flex items-center gap-1"><Users size={14}/> عدد الضيوف</label>
                  <div className="flex items-center justify-between bg-[#121212] border border-white/10 rounded-xl px-4 py-2">
                    <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-xl">-</button>
                    <span className="font-bold text-lg">{guests}</span>
                    <button onClick={() => setGuests(guests + 1)} className="w-8 h-8 rounded-full bg-[#C89B3C] text-black hover:bg-[#b38a35] flex items-center justify-center font-bold text-xl">+</button>
                  </div>
                </div>
              </div>

              {/* Total Price */}
              <div className="bg-[#121212] rounded-xl p-4 mb-6 flex justify-between items-center border border-white/5">
                <span className="text-white/60 text-sm">الإجمالي (تقريبي)</span>
                <span className="text-xl font-bold text-[#C89B3C]">{totalPrice.toLocaleString()} ريال</span>
              </div>

              <button 
                onClick={handleBooking}
                disabled={bookingLoading}
                className="w-full bg-gradient-to-r from-[#C89B3C] to-[#b38a35] text-[#2B1F17] py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(200,155,60,0.3)] transition transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
              >
                {bookingLoading ? <Loader2 className="animate-spin" /> : "حجز الآن 🚀"}
              </button>

              <div className="mt-4 text-center">
                <p className="text-[10px] text-white/30 flex items-center justify-center gap-1">
                  <Info size={12}/> لن يتم خصم المبلغ حتى تأكيد المزود
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}