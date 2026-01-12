"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; // ✅ إضافة useRouter للتوجيه
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { 
  MapPin, Clock, Users, CheckCircle, X, 
  Info, Star, ShieldCheck, Image as ImageIcon, 
  ChevronLeft, Loader2, FileText, PlayCircle, Calendar, Box, Utensils, AlertCircle, Briefcase, Minus, Plus, Send
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function ServiceDetailsPage() {
  const { id } = useParams();
  const router = useRouter(); // ✅ تفعيل الراوتر
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false); // حالة تحميل الطلب
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);

  // ✅ متغيرات الحجز الجديدة
  const [guestCount, setGuestCount] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    fetchServiceDetails();
  }, []);

  // تحديث السعر تلقائياً عند تغيير العدد
  useEffect(() => {
      if (service) {
          setTotalPrice(service.price * guestCount);
      }
  }, [guestCount, service]);

  const fetchServiceDetails = async () => {
    const { data, error } = await supabase
      .from("services")
      .select(`*, profiles:provider_id(full_name, avatar_url)`)
      .eq("id", id)
      .single();

    if (data) {
        setService(data);
        // إذا كان المخزون 0، نصفر العداد
        if (data.max_capacity === 0) setGuestCount(0);
    }
    setLoading(false);
  };

  const isVideo = (url: string) => {
      if (!url) return false;
      return url.match(/\.(mp4|webm|ogg)$/i) || url.includes('video');
  };

  // ✅ دالة زيادة العدد (لا تتجاوز المكس)
  const incrementGuests = () => {
      if (service.max_capacity && guestCount < service.max_capacity) {
          setGuestCount(prev => prev + 1);
      } else {
          alert(`عذراً، المقاعد المتبقية لهذه التجربة هي ${service.max_capacity} فقط.`);
      }
  };

  // ✅ دالة تنقيص العدد
  const decrementGuests = () => {
      if (guestCount > 1) {
          setGuestCount(prev => prev - 1);
      }
  };

  // ✅✅ دالة إرسال طلب الحجز (المنطق الجديد)
  const handleBookingRequest = async () => {
      if (!agreedToPolicies && service.details?.policies) return alert("الرجاء الموافقة على سياسات المزود أولاً.");
      
      setBookingLoading(true);
      try {
          // 1. التحقق من تسجيل الدخول
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
              alert("يجب تسجيل الدخول لإرسال طلب حجز.");
              return; 
          }

          // 2. التحقق النهائي من التوفر (في حال حجز شخص آخر في نفس اللحظة)
          const { data: refreshService } = await supabase.from('services').select('max_capacity').eq('id', service.id).single();
          if (!refreshService || refreshService.max_capacity < guestCount) {
              throw new Error("عذراً، المقاعد نفذت قبل إتمام طلبك.");
          }

          // 3. إرسال الطلب (Pending) لجدول الحجوزات
          const { error: bookingError } = await supabase.from('bookings').insert([{
              user_id: session.user.id,
              service_id: service.id,
              provider_id: service.provider_id,
              quantity: guestCount,
              total_price: totalPrice,
              status: 'pending', // ✅ الطلب معلق بانتظار المزود
              booking_date: new Date() // تاريخ اليوم كمثال
          }]);

          if (bookingError) throw bookingError;

          // 4. خصم المخزون فوراً (عشان ما أحد يحجز نفس المقاعد والمزود يراجع الطلب)
          const newCapacity = refreshService.max_capacity - guestCount;
          const { error: updateError } = await supabase
              .from('services')
              .update({ max_capacity: newCapacity })
              .eq('id', service.id);

          if (updateError) throw updateError;

          // 5. نجاح وتوجيه
          alert(`✅ تم إرسال طلب الحجز بنجاح!\n\nعدد الأشخاص: ${guestCount}\nالسعر المتوقع: ${totalPrice} ريال\n\nسيقوم المزود بمراجعة طلبك وقبوله أو رفضه.`);
          router.push('/'); // ✅ العودة للصفحة الرئيسية

      } catch (error: any) {
          console.error(error);
          alert("حدث خطأ أثناء إرسال الطلب: " + error.message);
      } finally {
          setBookingLoading(false);
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10"/></div>;
  if (!service) return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white">الخدمة غير موجودة أو تم إيقافها.</div>;

  const galleryImages = service.details?.images || (service.image_url ? [service.image_url] : []);
  const isSoldOut = service.max_capacity === 0; // ✅ هل نفذت الكمية؟

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white pb-20 ${tajawal.className}`}>
      
      {/* Header Section */}
      <div className="relative h-[50vh] w-full group overflow-hidden">
        {galleryImages.length > 0 && isVideo(galleryImages[0]) ? (
            <video 
                src={galleryImages[0]} 
                className="w-full h-full object-cover opacity-80"
                autoPlay muted loop playsInline
            />
        ) : (
            <Image 
                src={galleryImages[0] || "/placeholder.jpg"} 
                alt={service.title} 
                fill 
                className="object-cover opacity-80"
            />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/50 to-transparent" />
        
        <button onClick={() => window.history.back()} className="absolute top-6 right-6 bg-black/50 p-2 rounded-full text-white hover:bg-[#C89B3C] transition z-20">
            <ChevronLeft size={24} className="rotate-180" />
        </button>

        <div className="absolute bottom-0 w-full p-6 md:p-10">
            <div className="container mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <span className="bg-[#C89B3C] text-black text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
                            {service.service_type === 'experience' ? 'تجربة سياحية' : 'مرفق / مكان'}
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold mb-2">{service.title}</h1>
                        <div className="flex items-center gap-2 text-white/70">
                            <MapPin size={18} className="text-[#C89B3C]"/>
                            {service.location || "عسير"}
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-3xl font-bold text-[#C89B3C] font-mono">
                            {service.price === 0 ? "دخول مجاني" : <>{service.price} <span className="text-sm text-white">ريال</span></>}
                        </p>
                        {service.price > 0 && <p className="text-xs text-white/50">{service.service_type === 'lodging' ? 'لليلة الواحدة' : 'للشخص الواحد'}</p>}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* العمود الأيمن (التفاصيل) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* معرض الصور والفيديو */}
            {galleryImages.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><ImageIcon size={20} className="text-[#C89B3C]"/> صور وفيديو المكان</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {galleryImages.map((url: string, index: number) => (
                            <div key={index} onClick={() => setZoomedImage(url)} className="relative w-32 h-24 md:w-48 md:h-32 shrink-0 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-[#C89B3C] transition group">
                                {isVideo(url) ? (
                                    <div className="w-full h-full relative">
                                        <video src={url} className="w-full h-full object-cover" muted />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent transition"><PlayCircle className="text-white" size={32}/></div>
                                    </div>
                                ) : (
                                    <Image src={url} fill className="object-cover group-hover:scale-110 transition duration-500" alt={`img-${index}`}/>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* الوصف */}
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Info size={20} className="text-[#C89B3C]"/> الوصف</h3>
                <p className="text-gray-300 leading-loose whitespace-pre-line text-lg">{service.description}</p>
            </div>

            {/* تفاصيل ومتطلبات التجربة (هام جداً) */}
            {(service.requirements || service.included_items || service.meeting_point) && (
                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 space-y-6">
                    {service.requirements && (
                        <div>
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-[#C89B3C]">
                                <AlertCircle size={20}/> المتطلبات من العميل
                            </h3>
                            <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                                {service.requirements}
                            </p>
                        </div>
                    )}
                    {service.included_items && (
                        <div className={service.requirements ? "pt-4 border-t border-white/5" : ""}>
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-[#C89B3C]">
                                <Briefcase size={20}/> ماذا تشمل التجربة؟
                            </h3>
                            <p className="text-gray-300 text-sm leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                                {service.included_items}
                            </p>
                        </div>
                    )}
                    {service.meeting_point && (
                        <div className={(service.requirements || service.included_items) ? "pt-4 border-t border-white/5" : ""}>
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-[#C89B3C]">
                                <MapPin size={20}/> نقطة التجمع (الوصف)
                            </h3>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {service.meeting_point}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* المميزات (للسكن) */}
            {service.amenities && service.amenities.length > 0 && (
                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Star size={20} className="text-[#C89B3C]"/> المميزات</h3>
                    <div className="flex flex-wrap gap-3">
                        {service.amenities.map((am: any, i: number) => (
                            <span key={i} className="px-4 py-2 bg-white/5 rounded-full text-sm border border-white/10 flex items-center gap-2">
                                <CheckCircle size={14} className="text-[#C89B3C]"/> {am}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* المنيو / المنتجات */}
            {service.menu_items && service.menu_items.length > 0 && (
                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        {service.sub_category === 'food' ? <Utensils size={20} className="text-[#C89B3C]"/> : <Box size={20} className="text-[#C89B3C]"/>}
                        {service.sub_category === 'food' ? 'قائمة الطعام' : 'المنتجات'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {service.menu_items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10 hover:border-[#C89B3C]/30 transition">
                                <div 
                                    className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black cursor-pointer"
                                    onClick={() => item.image && setZoomedImage(item.image)}
                                >
                                    {item.image ? (
                                        isVideo(item.image) ? <video src={item.image} className="w-full h-full object-cover" muted /> : <Image src={item.image} fill className="object-cover" alt={item.name}/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/20"><ImageIcon size={20}/></div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold">{item.name}</h4>
                                    <p className="text-[#C89B3C] font-mono mt-1">{item.price} ﷼</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* الخريطة */}
            {service.location_lat && (
                <div className="bg-[#1a1a1a] p-1 rounded-2xl border border-white/5 overflow-hidden h-72 relative">
                    <Map
                        initialViewState={{
                            latitude: service.location_lat,
                            longitude: service.location_lng,
                            zoom: 14
                        }}
                        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                        mapboxAccessToken={MAPBOX_TOKEN}
                    >
                        <NavigationControl position="top-left" showCompass={false}/>
                        <Marker latitude={service.location_lat} longitude={service.location_lng} color="#C89B3C"/>
                    </Map>
                    <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${service.location_lat},${service.location_lng}`}
                        target="_blank"
                        className="absolute bottom-4 left-4 right-4 bg-[#C89B3C] text-black py-3 rounded-xl font-bold text-center shadow-lg hover:bg-[#b38a35] transition"
                    >
                        فتح الموقع في Google Maps
                    </a>
                </div>
            )}
        </div>

        {/* العمود الأيسر (كرت الحجز) */}
        <div className="space-y-6">
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 sticky top-24 shadow-2xl">
                <div className="mb-6 pb-6 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden relative border border-white/10">
                            {service.profiles?.avatar_url ? (
                                <Image src={service.profiles.avatar_url} fill alt="Provider" className="object-cover"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#C89B3C] font-bold text-xl">{service.profiles?.full_name?.[0]}</div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-white/50">مقدم الخدمة</p>
                            <p className="font-bold text-white">{service.profiles?.full_name}</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-black/30 p-3 rounded-xl border border-white/5">
                        <div className="text-center flex-1 border-l border-white/10">
                            <p className="text-xs text-white/50 mb-1">المتبقي</p>
                            <div className={`flex items-center justify-center gap-1 font-bold ${service.max_capacity < 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                                <Users size={14}/> {service.max_capacity || "مفتوح"}
                            </div>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-xs text-white/50 mb-1">المدة</p>
                            <div className="flex items-center justify-center gap-1 font-bold"><Clock size={14}/> {service.duration || "-"}</div>
                        </div>
                    </div>
                </div>

                {/* ✅ قسم اختيار العدد والسعر (يختفي إذا نفذت الكمية) */}
                {!isSoldOut ? (
                    <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold">عدد الأشخاص</span>
                            <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/10">
                                <button onClick={decrementGuests} className="p-1 hover:bg-white/10 rounded transition text-white"><Minus size={16}/></button>
                                <span className="font-mono text-lg font-bold w-6 text-center">{guestCount}</span>
                                <button onClick={incrementGuests} className="p-1 hover:bg-[#C89B3C]/20 hover:text-[#C89B3C] rounded transition text-white"><Plus size={16}/></button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                            <span className="text-white/50 text-sm">الإجمالي</span>
                            <span className="text-xl font-bold text-[#C89B3C] font-mono">{totalPrice} ﷼</span>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                        <p className="text-red-400 font-bold">❌ نفذت الكمية بالكامل</p>
                        <p className="text-xs text-red-300 mt-1">تابعنا للحصول على مواعيد جديدة أو تواصل مع المزود.</p>
                    </div>
                )}

                {/* السياسات */}
                {service.details?.policies && (
                    <div className="mb-6">
                        <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm"><ShieldCheck size={16} className="text-red-400"/> سياسات المكان</h4>
                        <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl text-xs text-white/80 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar mb-3">
                            {service.details.policies}
                        </div>
                        <label className={`flex items-start gap-3 cursor-pointer group ${isSoldOut ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition ${agreedToPolicies ? 'bg-[#C89B3C] border-[#C89B3C] text-black' : 'border-white/30 group-hover:border-white'}`}>
                                {agreedToPolicies && <CheckCircle size={14}/>}
                            </div>
                            <input type="checkbox" checked={agreedToPolicies} onChange={(e) => setAgreedToPolicies(e.target.checked)} className="hidden" disabled={isSoldOut}/>
                            <span className="text-xs text-white/70 select-none">قرأت وأوافق على سياسات وشروط مقدم الخدمة أعلاه.</span>
                        </label>
                    </div>
                )}

                {/* ✅ زر إرسال الطلب (بدل الحجز المباشر) */}
                <button 
                    onClick={handleBookingRequest}
                    disabled={isSoldOut || (service.details?.policies && !agreedToPolicies) || bookingLoading}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 
                    ${isSoldOut 
                        ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
                        : (!service.details?.policies || agreedToPolicies) 
                            ? 'bg-[#C89B3C] text-black hover:bg-[#b38a35] shadow-[0_0_20px_rgba(200,155,60,0.3)]' 
                            : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                >
                    {bookingLoading ? <Loader2 className="animate-spin"/> : (isSoldOut ? 'انتهى الحجز' : (agreedToPolicies || !service.details?.policies ? <><Send size={18}/> إرسال طلب حجز</> : 'وافق على الشروط'))}
                </button>
            </div>
        </div>

      </div>

      {/* Lightbox */}
      {zoomedImage && (
        <div 
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setZoomedImage(null)}
        >
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-2 rounded-full"><X size={32} /></button>
            <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
                {isVideo(zoomedImage) ? (
                    <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl outline-none" onClick={(e) => e.stopPropagation()} />
                ) : (
                    <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain"/>
                )}
            </div>
        </div>
      )}

    </main>
  );
}