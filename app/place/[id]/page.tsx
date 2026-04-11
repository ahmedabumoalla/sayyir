"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import { Tajawal } from "next/font/google";
import { 
  MapPin, ArrowRight, Share2, Star, Wifi, Car, Coffee, 
  Utensils, Calendar, Users, Clock, CheckCircle, 
  ShieldCheck, AlertCircle, Compass, Activity, Loader2, Info, ImageIcon, X, ChevronRight, ChevronLeft, Heart
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast, Toaster } from "sonner"; 

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

interface Place {
  id: string;
  name: string;
  type: 'landmark' | 'accommodation' | 'experience';
  subtype?: string;
  description: string;
  media_urls: string[];
  lat: number;
  lng: number;
  price?: number;
  city?: string;
  amenities?: string[];
  duration?: string;
  difficulty?: string;
  owner_name?: string;
}

export default function PlaceDetails() {
  const params = useParams();
  const router = useRouter();
  
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // حالة المفضلة
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(true);

  // حالة الحجز
  const [guests, setGuests] = useState(1);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState(""); 

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const today = new Date().toISOString().slice(0, 16);

  useEffect(() => {
    fetchPlaceDetails();
  }, []);

  useEffect(() => {
    if (place) checkFavorite();
  }, [place]);

  const checkFavorite = async () => {
     const { data: { session } } = await supabase.auth.getSession();
     if (!session) { setFavLoading(false); return; }
     
     // ✅ استخدام place_id
     const { data } = await supabase.from('favorites').select('id').eq('user_id', session.user.id).eq('place_id', place?.id).single();
     if (data) setIsFavorite(true);
     setFavLoading(false);
  };

  const toggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("يجب تسجيل الدخول للإضافة للمفضلة");
    
    // ✅ استخدام place_id
    if (isFavorite) {
       setIsFavorite(false);
       await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('place_id', place?.id);
       toast.success("تم الإزالة من المفضلة");
    } else {
       setIsFavorite(true);
       await supabase.from('favorites').insert({ user_id: session.user.id, place_id: place?.id });
       toast.success("تمت الإضافة للمفضلة");
    }
  };

  useEffect(() => {
    if (!place?.price) return;
    if (place.type === 'accommodation' && checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (end > start) {
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          const finalDays = diffDays === 0 ? 1 : diffDays;
          setTotalPrice(finalDays * place.price);
      } else {
          setTotalPrice(0);
      }
    } else if (place.type === 'experience') {
      setTotalPrice(guests * place.price);
    } else {
      setTotalPrice(place.price);
    }
  }, [guests, checkIn, checkOut, place]);

  const fetchPlaceDetails = async () => {
    if (!params?.id) return;
    const { data, error } = await supabase.from('places').select('*').eq('id', params.id).single();
    if (data) setPlace(data);
    setLoading(false);
  };

  const handleOpenLocation = () => {
    if (place?.lat && place?.lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=$${place.lat},${place.lng}`, '_blank');
    } else {
      toast.error("الموقع غير متوفر");
    }
  };

  const handleConfirmBooking = async () => {
    if (place?.type === 'experience' && !checkIn) { toast.warning("الرجاء تحديد وقت وتاريخ التجربة"); return; }
    if (place?.type === 'accommodation' && (!checkIn || !checkOut)) { toast.warning("الرجاء تحديد وقت الوصول والمغادرة"); return; }
    if (place?.type === 'accommodation' && new Date(checkOut) <= new Date(checkIn)) { toast.warning("وقت المغادرة يجب أن يكون بعد وقت الوصول"); return; }

    setBookingLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        toast.error("يجب تسجيل الدخول لإتمام الحجز");
        setBookingLoading(false);
        return;
    }

    const { data: bookingData, error } = await supabase.from('bookings').insert({
            user_id: user.id,
            service_id: place?.id, 
            check_in: checkIn || null,
            check_out: checkOut || null,
            total_price: totalPrice,
            additional_notes: additionalNotes,
            status: 'pending'
        }).select().single();

    if (error) {
        toast.error("حدث خطأ أثناء الحجز، حاول مرة أخرى");
    } else {
        // ✅ جلب بيانات العميل لإرسالها في الإيميل
        const { data: clientProfile } = await supabase.from("profiles").select("full_name, email, phone").eq("id", user.id).single();

        // ✅ تشغيل API الإشعارات لإرسال الإيميلات والواتساب للطرفين
        try {
            await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "new_booking_request",
                    clientEmail: user.email || clientProfile?.email,
                    clientPhone: clientProfile?.phone,
                    clientName: clientProfile?.full_name,
                    // بما أن الأماكن (Places) تضاف من الإدارة، نرسل الإشعار لإيميل المنصة
                    providerEmail: 'info@sayyir.sa', 
                    providerPhone: '', // ضف رقم جوال الإدارة هنا إذا تبي واتساب للإدارة
                    providerName: 'إدارة سيّر',
                    serviceTitle: place?.name,
                }),
            });
        } catch (notifyError) {
            console.error("فشل إرسال الإشعار:", notifyError);
        }

        toast.success("تم إرسال طلب الحجز بنجاح!");
        setCheckIn(""); setCheckOut(""); setAdditionalNotes("");
    }
    setBookingLoading(false);
  };

  const getAmenityIcon = (name: string) => {
    if (name.includes("واي")) return <Wifi size={18} />;
    if (name.includes("موقف")) return <Car size={18} />;
    if (name.includes("طعام") || name.includes("إفطار")) return <Utensils size={18} />;
    if (name.includes("قهوة")) return <Coffee size={18} />;
    return <CheckCircle size={18} />;
  };

  const openModal = (index: number) => { setCurrentImageIndex(index); setIsImageModalOpen(true); };
  const nextImage = () => { if (place?.media_urls && currentImageIndex < place.media_urls.length - 1) setCurrentImageIndex(prev => prev + 1); };
  const prevImage = () => { if (currentImageIndex > 0) setCurrentImageIndex(prev => prev - 1); };

  if (loading) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>;
  if (!place) return <div className="text-white text-center p-20">عفواً، المكان غير موجود</div>;

  const isBooking = place.type === 'accommodation' || place.type === 'experience';

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white pb-24 ${tajawal.className}`} dir="rtl">
      <Toaster position="top-center" richColors />
      
      <div className="relative h-[60vh] w-full group">
        <div className="absolute inset-0 z-10 bg-gradientto-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent pointer-events-none" />
        
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-[#C89B3C] hover:text-black transition text-white border border-white/10">
            <ArrowRight size={20} />
          </button>
          <div className="flex items-center gap-2">
              <button onClick={toggleFavorite} disabled={favLoading} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-[#C89B3C] hover:text-black transition text-white border border-white/10">
                {favLoading ? <Loader2 size={16} className="animate-spin"/> : <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500 animate-in zoom-in" : ""} />}
              </button>
              <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-[#C89B3C] hover:text-black transition text-white border border-white/10">
                <Share2 size={18} />
              </button>
          </div>
        </div>

        <img src={place.media_urls?.[0] || "/placeholder.jpg"} alt={place.name} onClick={() => { if(place.media_urls?.length) openModal(0); }} className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${place.media_urls?.length ? 'cursor-pointer' : ''}`} />

        <div className={`absolute bottom-3 right-3 md:bottom-4 md:right-4 backdrop-blur text-white text-[9px] md:text-[10px] px-2 py-1 rounded-md md:rounded-lg font-bold shadow-lg z-10 ${isBooking && place.price && place.price > 0 ? 'bg-[#C89B3C]/90 text-black' : 'bg-emerald-500/90'}`}>
          {isBooking && place.price && place.price > 0 ? `${place.price} ريال` : 'دخول مجاني'}
        </div>

        <div className="absolute bottom-0 w-full p-6 md:p-12 z-20 pointer-events-none">
            <div className="container mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-auto">
                    <div>
                        <div className="flex gap-2 mb-3">
                            <span className="bg-[#C89B3C] text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">{place.subtype || (place.type === 'accommodation' ? 'سكن' : place.type === 'experience' ? 'تجربة' : 'معلم')}</span>
                            {place.city && <span className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full border border-white/10 shadow-lg">{place.city}</span>}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold mb-2 drop-shadow-lg">{place.name}</h1>
                        <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-2 text-white/80">
                                <MapPin size={18} className="text-[#C89B3C]" />
                                <span>عسير، السعودية</span>
                            </div>
                            <button onClick={handleOpenLocation} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition border border-white/10 flex items-center gap-1 shadow-md">
                                <Compass size={14} /> عرض في الخرائط
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-20 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><AlertCircle className="text-[#C89B3C]" size={24}/> عن {place.type === 'experience' ? 'التجربة' : 'المكان'}</h2>
                    <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line">{place.description}</p>

                    {place.type === 'experience' && (
                        <div className="flex gap-6 mt-6 p-4 bg-black/30 rounded-2xl border border-white/5">
                            {place.duration && (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#C89B3C]/10 flex items-center justify-center text-[#C89B3C]"><Clock size={20}/></div>
                                    <div><div className="text-xs text-gray-400">المدة</div><div className="font-bold">{place.duration}</div></div>
                                </div>
                            )}
                            {place.difficulty && (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400"><Activity size={20}/></div>
                                    <div><div className="text-xs text-gray-400">المستوى</div><div className="font-bold">{place.difficulty}</div></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {place.amenities && place.amenities.length > 0 && (
                    <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                        <h2 className="text-xl font-bold mb-6">المميزات والخدمات</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {place.amenities.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition">
                                    <span className="text-[#C89B3C]">{getAmenityIcon(item)}</span>
                                    <span className="text-sm font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {place.media_urls && place.media_urls.length > 1 && (
                    <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><ImageIcon className="text-[#C89B3C]" size={20}/> معرض الصور</h2>
                        <div className="flex overflow-x-auto gap-4 pb-2 custom-scrollbar">
                            {place.media_urls.map((url, idx) => (
                                <div key={idx} onClick={() => openModal(idx)} className="w-32 h-32 shrink-0 rounded-xl overflow-hidden cursor-pointer group border border-transparent hover:border-[#C89B3C] transition-all relative">
                                    <img src={url} alt={`${place.name} - صورة ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="lg:col-span-1">
                {isBooking ? (
                    <div className="sticky top-24 bg-[#1a1a1a] border border-[#C89B3C]/30 p-6 rounded-3xl shadow-2xl shadow-[#C89B3C]/10">
                        <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                            <div>
                                <span className="text-gray-400 text-sm">السعر</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-[#C89B3C]">{place.price}</span>
                                    <span className="text-sm text-[#C89B3C]">ر.س</span>
                                    <span className="text-gray-400 text-sm">/ {place.type === 'accommodation' ? 'ليلة' : 'شخص'}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 text-sm"><Star size={16} className="fill-yellow-400 text-yellow-400"/> 4.9</div>
                        </div>

                        <div className="space-y-4">
                            {place.type === 'experience' && (
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold">وقت وتاريخ التجربة</label>
                                    <div className="bg-black/30 border border-white/10 rounded-xl flex items-center relative overflow-hidden group hover:border-[#C89B3C]/50 transition">
                                        <div className="absolute right-3 pointer-events-none text-[#C89B3C] z-10"><Calendar size={18} /></div>
                                        <input type="datetime-local" min={today} value={checkIn} onClick={(e) => e.currentTarget.showPicker()} onChange={(e) => setCheckIn(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-transparent p-3 pr-10 outline-none text-white text-sm cursor-pointer" />
                                    </div>
                                </div>
                            )}

                            {place.type === 'accommodation' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 font-bold">وصول</label>
                                        <div className="bg-black/30 border border-white/10 rounded-xl flex items-center relative overflow-hidden group hover:border-[#C89B3C]/50 transition">
                                            <input type="datetime-local" min={today} value={checkIn} onClick={(e) => e.currentTarget.showPicker()} onChange={e => setCheckIn(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-transparent p-3 outline-none text-white text-xs cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 font-bold">مغادرة</label>
                                        <div className="bg-black/30 border border-white/10 rounded-xl flex items-center relative overflow-hidden group hover:border-[#C89B3C]/50 transition">
                                            <input type="datetime-local" min={checkIn || today} value={checkOut} onClick={(e) => e.currentTarget.showPicker()} onChange={e => setCheckOut(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-transparent p-3 outline-none text-white text-xs cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold">الضيوف</label>
                                <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex justify-between items-center">
                                    <Users size={18} className="text-[#C89B3C]"/>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setGuests(Math.max(1, guests - 1))} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition">-</button>
                                        <span className="font-bold w-4 text-center">{guests}</span>
                                        <button onClick={() => setGuests(guests + 1)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition">+</button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5 mt-4">
                                <label className="text-xs text-gray-400 font-bold flex items-center gap-1"><Info size={12}/> ملاحظاتك</label>
                                <textarea rows={2} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="أي طلبات خاصة؟" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 outline-none text-white text-sm resize-none focus:border-[#C89B3C]/50 transition" />
                            </div>

                            {totalPrice > 0 && (
                                <div className="bg-[#C89B3C]/10 border border-[#C89B3C]/20 rounded-xl p-4 mt-4 space-y-2">
                                    <div className="flex justify-between font-bold text-[#C89B3C]"><span>الإجمالي</span><span>{totalPrice} ر.س</span></div>
                                </div>
                            )}

                            <button onClick={handleConfirmBooking} disabled={bookingLoading} className={`w-full bg-[#C89B3C] text-black font-bold py-4 rounded-xl hover:bg-[#b38a35] transition shadow-lg shadow-[#C89B3C]/20 mt-4 flex justify-center items-center gap-2 ${bookingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {bookingLoading ? <Loader2 className="animate-spin"/> : <ShieldCheck size={20} />}
                                {bookingLoading ? 'جاري الحجز...' : 'تأكيد الحجز'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="sticky top-24 bg-[#1a1a1a] border border-white/10 p-6 rounded-3xl shadow-xl">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Compass className="text-[#C89B3C]" size={24}/> استكشف المكان</h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">هذا المعلم مفتوح للزيارة العامة ولا يتطلب حجزاً مسبقاً. احصل على الاتجاهات الآن وابدأ رحلتك.</p>
                        <button onClick={handleOpenLocation} className="w-full bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition flex justify-center items-center gap-2 border border-white/5"><MapPin size={20} /> ابدأ المسار (Google Maps)</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {isImageModalOpen && place?.media_urls && (
        <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradientto-b from-black/80 to-transparent">
            <button onClick={() => setIsImageModalOpen(false)} className="p-3 bg-white/10 hover:bg-red-500/80 hover:text-white rounded-full transition-colors backdrop-blur-md"><X size={24} /></button>
            <div className="bg-black/50 px-4 py-2 rounded-full font-bold tracking-widest border border-white/10 shadow-lg">{currentImageIndex + 1} / {place.media_urls.length}</div>
          </div>
          <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
            <img src={place.media_urls[currentImageIndex]} alt="Fullscreen View" className="max-w-full max-h-full object-contain drop-shadow-2xl animate-in zoom-in-95 duration-300" />
          </div>
          {place.media_urls.length > 1 && (
            <>
              <button onClick={prevImage} disabled={currentImageIndex === 0} className={`absolute right-4 md:right-10 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-[#C89B3C] hover:text-black rounded-full transition backdrop-blur-md border border-white/10 ${currentImageIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}><ChevronRight size={32} /></button>
              <button onClick={nextImage} disabled={currentImageIndex === place.media_urls.length - 1} className={`absolute left-4 md:left-10 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-[#C89B3C] hover:text-black rounded-full transition backdrop-blur-md border border-white/10 ${currentImageIndex === place.media_urls.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}><ChevronLeft size={32} /></button>
            </>
          )}
        </div>
      )}
    </main>
  );
}