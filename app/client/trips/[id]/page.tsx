"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
    ArrowRight, MapPin, Calendar, Clock, Map as MapIcon, Navigation, X,
    Loader2, Users, AlertCircle, Share2, Printer, CheckCircle2,
    Info, ChevronUp, Image as ImageIcon, PlayCircle, ShieldCheck, Ticket, Home, Compass, Activity, CheckSquare
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast, Toaster } from "sonner";
import { QRCodeSVG } from 'qrcode.react';

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const safeArray = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return []; }
    }
    if (typeof data === 'object') return Object.values(data);
    return [];
};

const formatTime12H = (timeStr: string) => {
    if (!timeStr) return "";
    try {
        if (timeStr.includes('T')) return new Date(timeStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
        const [hourStr, minute] = timeStr.split(':');
        let hour = parseInt(hourStr, 10);
        const period = hour >= 12 ? 'مساءً' : 'صباحاً';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
    } catch { return timeStr; }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

function BookingDetailsContent() {
    const { id } = useParams();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState<any>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        if (id) fetchBookingData();
    }, [id]);

    const fetchBookingData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/login');
                return;
            }

            // جلب بيانات الحجز مع الخدمة والمزود
            const { data: bookingData, error: bookingError } = await supabase
                .from('bookings')
                .select(`
                    *,
                    services (*, profiles:provider_id(full_name, email, phone))
                `)
                .eq('id', id)
                .single();

            if (bookingError || !bookingData) {
                toast.error("عذراً، لم يتم العثور على الحجز.");
                router.replace('/client/dashboard');
                return;
            }

            setBooking(bookingData);
        } catch (e: any) {
            console.error(e);
            toast.error("حدث خطأ أثناء تحميل بيانات الحجز.");
        } finally {
            setLoading(false);
        }
    };

    const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes('video');

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white">
                <Loader2 className="animate-spin mb-4 text-[#C89B3C]" size={40} />
                <p className="animate-pulse font-bold">جاري تحميل تفاصيل التذكرة...</p>
            </div>
        );
    }

    if (!booking || !booking.services) return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">بيانات الحجز غير متوفرة.</div>;

    const service = booking.services;
    const galleryImages = service.details?.images || (service.image_url ? [service.image_url] : []);
    const mainImage = galleryImages[0] || "/placeholder.jpg";

    const adultCount = booking.quantity || 1;
    const childCount = booking.details?.child_count || 0;

    return (
        <div className={`min-h-screen bg-[#121212] text-white pb-20 pt-6 px-4 md:px-8 ${tajawal.className}`} dir="rtl">
            <Toaster position="top-center" richColors />
            
            {/* أزرار التحكم العلوية */}
            <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center border-b border-white/10 pb-4">
                <button 
                    onClick={() => router.push('/client/trips')} 
                    className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-[#C89B3C] border border-white/10 px-5 py-2.5 rounded-xl transition duration-300 font-bold text-sm"
                >
                    <ArrowRight size={18} /> عودة لرحلاتي
                </button>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-white">
                        <CheckCircle2 className="text-[#C89B3C]" size={24}/> تفاصيل الحجز وتذكرة الدخول
                    </h1>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* ======================================================== */}
                {/* العمود الأيمن: التذكرة وتفاصيل الحجز المباشرة */}
                {/* ======================================================== */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* رأس الخدمة (Hero Card) مع الباركود */}
                    <div className="relative bg-[#1e1e1e] rounded-3xl border border-[#C89B3C]/30 shadow-2xl overflow-hidden p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C89B3C] blur-[120px] opacity-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 blur-[120px] opacity-10 pointer-events-none"></div>
                        
                        <div className="relative z-10 flex-1 w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                    {service.sub_category === 'event' ? 'فعالية' : service.service_category === 'experience' ? 'تجربة سياحية' : 'نزل سياحي / مرفق'}
                                </span>
                                {booking.status === 'confirmed' ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><CheckCircle2 size={12}/> حجز مؤكد</span>
                                ) : (
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-3 py-1.5 rounded-lg">قيد المعالجة / غير مؤكد</span>
                                )}
                            </div>
                            
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{service.title}</h2>
                            <p className="text-white/50 text-xs mb-6">رقم الحجز: <span className="font-mono bg-black/40 px-2 py-1 rounded">#{booking.id?.split('-')[0].toUpperCase()}</span></p>
                            
                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                                <div>
                                    <p className="text-[10px] text-white/50 mb-1">تاريخ الحضور / الوصول</p>
                                    <p className="text-sm font-bold">{formatDate(booking.check_in)}</p>
                                </div>
                                {service.sub_category !== 'lodging' && (
                                    <div>
                                        <p className="text-[10px] text-white/50 mb-1">وقت الحضور</p>
                                        <p className="text-sm font-bold text-[#C89B3C] dir-ltr text-right w-fit">{formatTime12H(booking.check_in)}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] text-white/50 mb-1">الكمية / التذاكر</p>
                                    <p className="text-sm font-bold">{adultCount} {service.sub_category === 'lodging' ? 'ليالي' : 'تذكرة بالغين'} {childCount > 0 ? ` + ${childCount} أطفال` : ''}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/50 mb-1">المبلغ الإجمالي</p>
                                    <p className="text-sm font-bold font-mono text-[#C89B3C]">{booking.total_price} ﷼</p>
                                </div>
                            </div>
                        </div>

                        {/* ✅ الباركود (يظهر إذا كانت الرحلة مؤكدة) */}
                        {booking.status === 'confirmed' && booking.ticket_qr_code ? (
                            <div className="bg-white/5 p-5 rounded-3xl border border-white/10 flex flex-col items-center justify-center shrink-0 w-full md:w-auto relative z-10 backdrop-blur-sm">
                                <p className="text-emerald-400 font-bold mb-4 flex items-center gap-1.5 text-sm"><CheckCircle2 size={16}/> تذكرة الدخول صالحة</p>
                                <div className="bg-white p-3 rounded-2xl shadow-lg ring-4 ring-white/10">
                                    <QRCodeSVG value={booking.ticket_qr_code} size={130} level="H" />
                                </div>
                                <p className="font-mono text-sm text-white font-bold tracking-widest mt-4 bg-black/50 px-4 py-1.5 rounded-lg select-all">
                                    {booking.ticket_qr_code.split('-')[0].toUpperCase()}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center justify-center shrink-0 w-full md:w-48 h-48 relative z-10 text-center">
                                <Info size={32} className="text-white/20 mb-2"/>
                                <p className="text-xs text-white/40 leading-relaxed">الباركود يظهر فقط للحجوزات المؤكدة والمدفوعة</p>
                            </div>
                        )}
                    </div>

                    {/* معلومات إضافية من الخدمة الأساسية */}
                    <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
                        <h3 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-4"><Info size={20} className="text-[#C89B3C]"/> تفاصيل وتوجيهات الخدمة</h3>
                        
                        <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                            <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden relative shrink-0">
                                {service.profiles?.avatar_url ? (
                                    <Image src={service.profiles.avatar_url} fill alt="Provider" className="object-cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#C89B3C] font-bold">{service.profiles?.full_name?.[0]}</div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-white/50 mb-0.5">مقدم الخدمة / المنظم</p>
                                <p className="font-bold text-white text-sm">{service.profiles?.full_name}</p>
                            </div>
                        </div>

                        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{service.description}</p>
                        
                        {(service.details?.experience_info?.what_to_bring || service.details?.policies) && (
                            <div className="pt-4 border-t border-white/10 space-y-4">
                                {service.details?.experience_info?.what_to_bring && (
                                    <div>
                                        <h4 className="text-sm font-bold text-[#C89B3C] mb-2 flex items-center gap-2"><AlertCircle size={16}/> ماذا تحضر معك؟</h4>
                                        <p className="text-white/60 text-xs leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">{service.details.experience_info.what_to_bring}</p>
                                    </div>
                                )}
                                {service.details?.policies && (
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-2">سياسات المزود:</h4>
                                        <p className="text-white/60 text-xs leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">{service.details.policies}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ======================================================== */}
                {/* العمود الأيسر: الخريطة التفاعلية والصور */}
                {/* ======================================================== */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* الخريطة والموقع */}
                    {service.location_lat && service.location_lng && (
                        <div className="bg-[#1e1e1e] rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col h-80 relative group">
                            <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center z-10 relative">
                                <h3 className="font-bold flex items-center gap-2 text-sm"><MapIcon size={16} className="text-[#C89B3C]"/> موقع الفعالية / المكان</h3>
                            </div>
                            <div className="flex-1 relative w-full h-full bg-black/50">
                                <Map 
                                    initialViewState={{ latitude: service.location_lat, longitude: service.location_lng, zoom: 12 }} 
                                    mapStyle="mapbox://styles/mapbox/dark-v11" 
                                    mapboxAccessToken={MAPBOX_TOKEN}
                                    interactive={false}
                                >
                                    <Marker latitude={service.location_lat} longitude={service.location_lng} color="#C89B3C"/>
                                </Map>
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=$$$${service.location_lat},${service.location_lng}`} target="_blank" rel="noreferrer" 
                                   className="absolute bottom-4 left-4 right-4 bg-[#C89B3C] text-black py-3 rounded-xl font-bold text-sm text-center shadow-lg hover:bg-[#b38a35] transition flex justify-center items-center gap-2">
                                    <Navigation size={16}/> احصل على الاتجاهات الدقيقة
                                </a>
                            </div>
                        </div>
                    )}

                    {/* الصور المصغرة للخدمة */}
                    {galleryImages.length > 0 && (
                        <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-white/5 shadow-xl">
                            <h3 className="text-sm font-bold flex items-center gap-2 mb-4 border-b border-white/10 pb-3"><ImageIcon size={16} className="text-[#C89B3C]"/> صور إضافية</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {galleryImages.slice(0, 4).map((url: string, index: number) => (
                                    <div key={index} onClick={() => setZoomedImage(url)} className="relative w-full h-24 shrink-0 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-[#C89B3C] transition group">
                                        {isVideo(url) ? (
                                            <div className="w-full h-full relative">
                                                <video src={url} className="w-full h-full object-cover" muted />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent transition"><PlayCircle className="text-white" size={24}/></div>
                                            </div>
                                        ) : (
                                            <Image src={url} fill className="object-cover group-hover:scale-110 transition duration-500" alt={`img-${index}`}/>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* نافذة التكبير للصور */}
            {zoomedImage && (
                <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
                    <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-3 rounded-full"><X size={24} /></button>
                    <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
                        {isVideo(zoomedImage) ? ( <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl outline-none" onClick={(e) => e.stopPropagation()} /> ) : ( <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain drop-shadow-2xl"/> )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TripDetailsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#121212] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin"/></div>}>
            <BookingDetailsContent />
        </Suspense>
    );
}