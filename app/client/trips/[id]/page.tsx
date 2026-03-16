"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
    ArrowRight, MapPin, Calendar, Clock, Map as MapIcon, 
    Loader2, Sun, Moon, Coffee, Utensils, Mountain, Camera, 
    Navigation, Share2, Printer, CheckCircle, Info, ChevronRight, Tent, CheckCircle2
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast, Toaster } from "sonner";
import { QRCodeSVG } from 'qrcode.react';

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ألوان مخصصة لكل نوع من الأنشطة
const getActivityStyles = (type: string) => {
    switch (type) {
        case 'food': return { icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
        case 'landmark': return { icon: Camera, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
        case 'experience': return { icon: Mountain, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
        case 'rest': return { icon: Coffee, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
        case 'camp': return { icon: Tent, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
        default: return { icon: MapPin, color: 'text-[#C89B3C]', bg: 'bg-[#C89B3C]/10', border: 'border-[#C89B3C]/20' };
    }
};

const safeArray = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return []; }
    }
    if (typeof data === 'object') return Object.values(data);
    return [];
};

function TripDetailsContent() {
    const { id } = useParams();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [trip, setTrip] = useState<any>(null);
    const [activeDay, setActiveDay] = useState(0); 

    useEffect(() => {
        if (id) fetchTripData();
    }, [id]);

    const fetchTripData = async () => {
        const tripId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : undefined;
        if (!tripId) return;

        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('id', tripId)
                .single();

            if (data && !error) {
                // ✅ توليد الباركود إذا كانت الرحلة مؤكدة ولم يكن لها باركود
                if (data.status === 'confirmed' && !data.ticket_qr_code) {
                    const newQrCode = `TRIP-${tripId.substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
                    
                    // تحديث قاعدة البيانات بالباركود الجديد
                    const { error: updateError } = await supabase
                        .from('trips')
                        .update({ ticket_qr_code: newQrCode })
                        .eq('id', tripId);
                    
                    if (!updateError) {
                        data.ticket_qr_code = newQrCode;
                    }
                }
                setTrip(data);
            } else {
                console.warn("لم يتم العثور على الرحلة في قاعدة البيانات، سيتم عرض تصميم تجريبي.");
                setTrip({
                    id: tripId,
                    title: "رحلة استكشاف أبها والسودة 🌲",
                    description: "جدول سياحي مخصص لمدة 3 أيام يشمل أبرز المعالم السياحية، المقاهي، والتجارب الجبلية في منطقة عسير.",
                    start_date: "2024-07-15",
                    end_date: "2024-07-17",
                    cover_image: null,
                    status: "confirmed", // ✅ جعلناها مؤكدة لإظهار الباركود
                    ticket_qr_code: `TRIP-DEMO-${Math.floor(1000 + Math.random() * 9000)}`, // ✅ باركود تجريبي
                    days: [
                        {
                            date: "2024-07-15",
                            title: "اليوم الأول: سحر الطبيعة",
                            activities: [
                                { id: 1, time: "09:00 صباحاً", title: "إفطار شعبي", description: "الاستمتاع بإفطار محلي أصيل في أحد المقاهي التراثية المطلة على الجبال.", type: "food", location: "مقهى تراث السراة", lat: 18.2164, lng: 42.5053 },
                                { id: 2, time: "11:30 صباحاً", title: "زيارة منتزه السودة", description: "جولة في غابات العرعر والتمتع بالضباب والأجواء الباردة.", type: "landmark", location: "السودة", lat: 18.2833, lng: 42.3667 },
                                { id: 3, time: "03:00 مساءً", title: "تجربة الهايكنج", description: "مسار مشي خفيف بين الجبال مع مرشد سياحي معتمد.", type: "experience", location: "مسار السحاب", lat: 18.2900, lng: 42.3700 },
                                { id: 4, time: "08:00 مساءً", title: "عشاء مطل", description: "عشاء فاخر في مطعم مطل على مدينة أبها.", type: "food", location: "الجبل الأخضر", lat: 18.2045, lng: 42.5110 }
                            ]
                        },
                        {
                            date: "2024-07-16",
                            title: "اليوم الثاني: عبق التاريخ",
                            activities: [
                                { id: 5, time: "10:00 صباحاً", title: "قرية رجال ألمع", description: "زيارة القرية التراثية المليئة بالتاريخ وفن القَط العسيري.", type: "landmark", location: "رجال ألمع", lat: 18.2114, lng: 42.2778 },
                                { id: 6, time: "02:00 مساءً", title: "استراحة قهوة", description: "جلسة هادئة في مقهى وسط المزارع المدرجة.", type: "rest", location: "مزارع رجال ألمع", lat: 18.2150, lng: 42.2800 },
                                { id: 7, time: "05:00 مساءً", title: "التلفريك", description: "تجربة النزول عبر التلفريك والتقاط صور بانورامية.", type: "experience", location: "تلفريك السودة", lat: 18.2700, lng: 42.3500 }
                            ]
                        }
                    ]
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white">
                <Loader2 className="animate-spin mb-4 text-[#C89B3C]" size={40} />
                <p className="animate-pulse font-bold">جاري تحميل مسار الرحلة...</p>
            </div>
        );
    }

    if (!trip) return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">الرحلة غير موجودة.</div>;

    const currentDayData = trip.days?.[activeDay];
    const mapMarkers = currentDayData?.activities?.filter((act: any) => act.lat && act.lng) || [];

    const initialMapLat = mapMarkers.length > 0 ? mapMarkers[0].lat : 18.2164;
    const initialMapLng = mapMarkers.length > 0 ? mapMarkers[0].lng : 42.5053;

    return (
        <div className={`min-h-screen bg-[#121212] text-white pb-20 pt-6 px-4 md:px-8 ${tajawal.className}`} dir="rtl">
            <Toaster position="top-center" richColors />
            
            {/* أزرار التحكم العلوية */}
            <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
                <button 
                    onClick={() => router.push('/client/dashboard')} 
                    className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-[#C89B3C] border border-white/10 px-5 py-2.5 rounded-xl transition duration-300 font-bold text-sm"
                >
                    <ArrowRight size={18} /> عودة للوحة التحكم
                </button>
                <div className="flex gap-2">
                    <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition text-white" title="مشاركة الرحلة">
                        <Share2 size={18} />
                    </button>
                    <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition text-white hidden md:block" title="طباعة الجدول">
                        <Printer size={18} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* ======================================================== */}
                {/* العمود الأيمن: تفاصيل الرحلة والجدول الزمني (Itinerary) */}
                {/* ======================================================== */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* رأس الرحلة (Hero Card) */}
                    <div className="relative bg-[#1e1e1e] rounded-3xl border border-white/5 shadow-2xl overflow-hidden p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        {/* تصميم خلفية دمج */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C89B3C] blur-[120px] opacity-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 blur-[120px] opacity-10 pointer-events-none"></div>
                        
                        <div className="relative z-10 flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                    <MapPin size={14}/> مسار سياحي
                                </span>
                                {trip.status === 'planned' && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold px-3 py-1.5 rounded-lg">مُخطط لها</span>}
                                {trip.status === 'ongoing' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1.5 rounded-lg animate-pulse">الرحلة جارية</span>}
                            </div>
                            
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{trip.title}</h1>
                            <p className="text-white/60 text-sm leading-relaxed max-w-2xl mb-6">{trip.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Calendar size={18} className="text-white/70"/></div>
                                    <div>
                                        <p className="text-[10px] text-white/50 mb-0.5">البداية والنهاية</p>
                                        <p className="text-sm font-bold dir-ltr">{trip.start_date} <span className="mx-1 text-[#C89B3C]">→</span> {trip.end_date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Sun size={18} className="text-white/70"/></div>
                                    <div>
                                        <p className="text-[10px] text-white/50 mb-0.5">المدة الإجمالية</p>
                                        <p className="text-sm font-bold">{trip.days?.length || 0} أيام</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ✅ الباركود (يظهر إذا كانت الرحلة مؤكدة) */}
                        {trip.status === 'confirmed' && trip.ticket_qr_code && (
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center shrink-0 w-full md:w-auto relative z-10 backdrop-blur-sm">
                                <p className="text-emerald-400 font-bold mb-3 flex items-center gap-1.5 text-sm"><CheckCircle2 size={16}/> تذكرة الرحلة</p>
                                <div className="bg-white p-3 rounded-xl shadow-lg ring-4 ring-white/10">
                                    <QRCodeSVG value={trip.ticket_qr_code} size={120} level="H" />
                                </div>
                                <p className="font-mono text-sm text-white font-bold tracking-widest mt-3">
                                    {trip.ticket_qr_code.split('-')[0].toUpperCase()}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* تبويبات الأيام (Tabs) */}
                    {trip.days && trip.days.length > 0 && (
                        <div className="bg-[#1e1e1e] p-2 rounded-2xl border border-white/5 shadow-xl flex gap-2 overflow-x-auto custom-scrollbar sticky top-4 z-30">
                            {trip.days.map((day: any, idx: number) => (
                                <button 
                                    key={idx} 
                                    onClick={() => setActiveDay(idx)}
                                    className={`flex-1 min-w-[120px] flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300
                                    ${activeDay === idx ? 'bg-[#C89B3C] text-black shadow-lg shadow-[#C89B3C]/20 scale-[1.02]' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                                >
                                    <span className="text-xs font-bold mb-1">اليوم {idx + 1}</span>
                                    <span className="text-[10px] font-mono opacity-80 dir-ltr">{day.date}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* الجدول الزمني لليوم المحدد (Timeline) */}
                    {currentDayData && (
                        <div className="bg-[#1e1e1e] p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl">
                            <h2 className="text-xl font-bold mb-8 flex items-center gap-2 border-b border-white/10 pb-4">
                                <Navigation className="text-[#C89B3C]" size={22}/> {currentDayData.title}
                            </h2>

                            <div className="relative">
                                {/* الخط العمودي للمسار */}
                                <div className="absolute right-6 md:right-[5.5rem] top-4 bottom-4 w-0.5 bg-white/10 rounded-full"></div>

                                <div className="space-y-8">
                                    {currentDayData.activities?.map((activity: any, index: number) => {
                                        const styles = getActivityStyles(activity.type);
                                        const ActIcon = styles.icon;

                                        return (
                                            <div key={activity.id} className="relative flex flex-col md:flex-row gap-6 md:gap-8 group">
                                                
                                                {/* الوقت */}
                                                <div className="md:w-20 pt-1 shrink-0 text-right md:text-left z-10">
                                                    <span className="text-xs font-bold text-[#C89B3C] bg-black/40 md:bg-transparent px-3 py-1.5 md:p-0 rounded-lg shadow-md md:shadow-none inline-block dir-ltr">
                                                        {activity.time}
                                                    </span>
                                                </div>

                                                {/* العقدة (Node) والدائرة الملونة */}
                                                <div className="absolute right-6 md:relative md:right-auto md:w-auto h-full flex items-start justify-center z-10 mt-1 md:mt-0 mr-[-2px] md:mr-0">
                                                    <div className={`w-10 h-10 rounded-full border-4 border-[#1e1e1e] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${styles.bg} ${styles.color} ${styles.border}`}>
                                                        <ActIcon size={16} />
                                                    </div>
                                                </div>

                                                {/* بطاقة النشاط */}
                                                <div className="flex-1 bg-black/30 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition mr-12 md:mr-0">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-bold text-lg text-white group-hover:text-[#C89B3C] transition">{activity.title}</h3>
                                                        <span className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded flex items-center gap-1">
                                                            <MapPin size={10}/> {activity.location}
                                                        </span>
                                                    </div>
                                                    <p className="text-white/60 text-sm leading-relaxed mb-4">{activity.description}</p>
                                                    
                                                    {activity.lat && activity.lng && (
                                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=$$${activity.lat},${activity.lng}`} target="_blank" rel="noreferrer" 
                                                           className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20 transition">
                                                            <Navigation size={12}/> احصل على الاتجاهات
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ======================================================== */}
                {/* العمود الأيسر: الخريطة التفاعلية */}
                {/* ======================================================== */}
                <div className="lg:col-span-1">
                    <div className="bg-[#1e1e1e] rounded-3xl border border-white/5 shadow-2xl overflow-hidden sticky top-8 h-[75vh] flex flex-col">
                        
                        <div className="p-5 border-b border-white/10 bg-black/20 flex justify-between items-center z-10 relative">
                            <h3 className="font-bold flex items-center gap-2"><MapIcon size={18} className="text-[#C89B3C]"/> خريطة مسار اليوم</h3>
                            <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-lg">اليوم {activeDay + 1}</span>
                        </div>

                        <div className="flex-1 relative w-full h-full bg-black/50">
                            {mapMarkers.length > 0 ? (
                                <Map 
                                    initialViewState={{ latitude: initialMapLat, longitude: initialMapLng, zoom: 11 }} 
                                    mapStyle="mapbox://styles/mapbox/dark-v11" 
                                    mapboxAccessToken={MAPBOX_TOKEN}
                                >
                                    <NavigationControl position="bottom-right" showCompass={false}/>
                                    
                                    {mapMarkers.map((marker: any, i: number) => {
                                        const styles = getActivityStyles(marker.type);
                                        return (
                                            <Marker key={i} latitude={marker.lat} longitude={marker.lng}>
                                                <div className="relative group cursor-pointer flex flex-col items-center">
                                                    <div className="bg-black/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-8">
                                                        {marker.title}
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-2xl shadow-black ${styles.bg} ${styles.color} border-white/20`}>
                                                        <span className="font-bold text-xs">{i + 1}</span>
                                                    </div>
                                                </div>
                                            </Marker>
                                        );
                                    })}
                                </Map>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 p-6 text-center">
                                    <MapIcon size={48} className="mb-4 opacity-50"/>
                                    <p className="text-sm">لا توجد إحداثيات خرائط متوفرة لمسار هذا اليوم.</p>
                                </div>
                            )}

                            {/* تلميح إرشادي على الخريطة */}
                            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs text-white/70 shadow-xl flex items-start gap-2">
                                <Info size={16} className="text-[#C89B3C] shrink-0"/>
                                <p>الأرقام على الخريطة تمثل الترتيب الزمني للأنشطة والزيارات في هذا اليوم.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function TripDetailsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#121212] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin"/></div>}>
            <TripDetailsContent />
        </Suspense>
    );
}