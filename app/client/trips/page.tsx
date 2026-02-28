"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  Calendar, MapPin, Clock, Users, CheckCircle2, XCircle, Hourglass, 
  AlertCircle, CreditCard, QrCode, Timer, Loader2, Navigation, ChevronUp,
  ImageIcon, FileText, Info, CheckSquare, Utensils
} from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';

interface Booking {
  id: string;
  booking_date: string;
  execution_date?: string;
  status: 'pending' | 'approved_unpaid' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  payment_status: string;
  guests_count: number;
  quantity: number;
  total_price: string;
  rejection_reason?: string;
  expires_at?: string;
  ticket_qr_code?: string;
  services: any; // نتلقى كائن الخدمة من Supabase
}

// قاموس لترجمة المميزات
const amenityLabels: Record<string, string> = {
    'wifi': 'واي فاي (Wi-Fi)', 'parking': 'مواقف خاصة', 'pool': 'مسبح خاص', 
    'cleaning': 'خدمة تنظيف', 'ac': 'تكييف', 'tv': 'تلفزيون / ستالايت', 
    'kitchen': 'مطبخ مجهز', 'bbq': 'منطقة شواء', 'breakfast': 'إفطار مشمول', 
    'security': 'حراسة / أمان', 'firstaid': 'إسعافات أولية', 'view': 'إطلالة مميزة'
};

const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("يتم الحساب...");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const exp = new Date(expiresAt).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setTimeLeft("انتهت المهلة");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}س : ${minutes}د : ${seconds}ث`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className={`font-mono font-bold dir-ltr inline-block ${isExpired ? 'text-red-400' : 'text-blue-400'}`}>{timeLeft}</span>;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("bookings")
        .select(`*, services:service_id (*)`)
        .eq("user_id", session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data as any);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = trips.filter((trip) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['pending', 'approved_unpaid', 'confirmed'].includes(trip.status);
    if (filter === 'completed') return trip.status === 'completed';
    if (filter === 'cancelled') return ['cancelled', 'rejected'].includes(trip.status);
    return true;
  });

  const toggleExpand = (id: string) => {
      setExpandedTripId(expandedTripId === id ? null : id);
  };

  // ✅ رابط خرائط جوجل يعتمد على lat و lng
  const getGoogleMapsLink = (lat?: number, lng?: number) => {
      if (lat && lng) {
          return `https://www.google.com/maps?q=${lat},${lng}`;
      }
      return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/20"><CheckCircle2 size={14} /> مؤكد ومدفوع</div>;
      case 'approved_unpaid': return <div className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20"><Hourglass size={14} /> بانتظار الدفع</div>;
      case 'pending': return <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full text-xs font-bold border border-amber-400/20"><Hourglass size={14} /> قيد مراجعة المزود</div>;
      case 'completed': return <div className="flex items-center gap-1 text-gray-400 bg-gray-400/10 px-3 py-1 rounded-full text-xs font-bold border border-gray-400/20"><CheckCircle2 size={14} /> مكتملة</div>;
      case 'rejected': return <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-bold border border-red-400/20"><XCircle size={14} /> مرفوض</div>;
      case 'cancelled': return <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-bold border border-red-400/20"><XCircle size={14} /> ملغية</div>;
      default: return null;
    }
  };

  if (loading) return (
    <div className="h-[50vh] flex flex-col items-center justify-center text-[#C89B3C] gap-4">
      <Loader2 className="animate-spin w-10 h-10" />
      <p className="text-white/50 text-sm font-bold animate-pulse">جاري تحميل رحلاتك...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Calendar className="text-[#C89B3C]" /> رحلاتي وحجوزاتي</h2>
           <p className="text-white/60 text-sm">سجل كامل بجميع زياراتك وحجوزاتك وتفاصيلها.</p>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit overflow-x-auto custom-scrollbar">
          {['all', 'upcoming', 'completed', 'cancelled'].map(f => (
             <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filter === f ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}>
                {f === 'all' ? 'الكل' : f === 'upcoming' ? 'حجوزات قادمة' : f === 'completed' ? 'مكتملة' : 'ملغية/مرفوضة'}
             </button>
          ))}
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
          <Calendar size={48} className="text-white/10 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">لا توجد رحلات</h3>
          <p className="text-white/50 mb-6">لم تقم بأي حجوزات تطابق هذا الفلتر.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTrips.map((trip) => {
            const isExpanded = expandedTripId === trip.id;
            
            // ✅ المعالجة الصحيحة لكائن الخدمة القادم من Supabase
            const srv = Array.isArray(trip.services) ? trip.services[0] : trip.services;
            
            // ✅ قراءة رابط جوجل ماب من الأعمدة الصحيحة في قاعدة البيانات
            const mapLink = getGoogleMapsLink(srv?.location_lat, srv?.location_lng);

            return (
            <div key={trip.id} className={`group flex flex-col bg-[#252525] border ${isExpanded ? 'border-[#C89B3C]/50 shadow-lg shadow-[#C89B3C]/10' : 'border-white/5 shadow-lg hover:border-[#C89B3C]/30'} rounded-2xl overflow-hidden transition-all duration-300`}>
              
              {/* القسم العلوي: البيانات الأساسية (قابل للنقر للتوسيع في جميع الحالات) */}
              <div className="flex flex-col md:flex-row cursor-pointer" onClick={() => toggleExpand(trip.id)} title="اضغط لعرض تفاصيل الخدمة">
                  <div className="relative w-full md:w-56 h-48 md:h-auto shrink-0 bg-black/40 flex items-center justify-center border-b md:border-b-0 md:border-l border-white/5 group-hover:bg-black/20 transition">
                     {srv?.image_url ? (
                         <Image src={srv.image_url} alt="Service" fill className="object-cover opacity-80 group-hover:opacity-100 transition" />
                     ) : (
                         <Image src="/logo.png" alt="Service" width={80} height={40} className="opacity-30 group-hover:opacity-60 transition" />
                     )}
                     <div className="absolute top-3 right-3 md:hidden">{getStatusBadge(trip.status)}</div>
                  </div>

                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition">{srv?.title || "خدمة محذوفة"}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
                          <span className="flex items-center gap-1.5"><MapPin size={16} className="text-[#C89B3C]" /> {srv?.location_lat ? 'اللوكيشن متاح' : 'عسير'}</span>
                          <span className="flex items-center gap-1.5"><Users size={16} className="text-[#C89B3C]"/> {trip.quantity || trip.guests_count} ضيوف/تذاكر</span>
                        </div>
                      </div>
                      <div className="hidden md:block">{getStatusBadge(trip.status)}</div>
                    </div>

                    <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5 mt-4 group-hover:border-white/10 transition">
                      <div className="flex items-center gap-3 text-white/80">
                          <div className="bg-white/10 p-2 rounded-lg text-[#C89B3C]"><Calendar size={18} /></div>
                          <div>
                              <p className="text-xs text-white/50 mb-1">الموعد المحدد</p>
                              <p className="text-sm font-bold font-mono">
                                {trip.execution_date ? new Date(trip.execution_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : (trip.booking_date || 'غير محدد')}
                              </p>
                          </div>
                      </div>
                      <div className="text-left">
                          <p className="text-xs text-white/50 mb-1">الإجمالي</p>
                          <p className="text-lg font-bold text-[#C89B3C] font-mono">{trip.total_price} ﷼</p>
                      </div>
                    </div>
                    
                    {/* تلميح صغير للضغط والتوسيع */}
                    <div className="text-center mt-3 text-[10px] text-white/30 group-hover:text-[#C89B3C]/70 transition flex justify-center items-center gap-1">
                        اضغط لعرض تفاصيل الرحلة الشاملة <ChevronUp className={`w-3 h-3 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
                    </div>
                  </div>
              </div>

              {/* التنبيهات والأزرار */}
              {trip.status === 'rejected' && (
                  <div className="p-5 bg-red-500/10 border-t border-red-500/20 flex items-start gap-3">
                      <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                      <div>
                          <p className="text-red-400 font-bold text-sm mb-1">تم رفض الحجز من قبل مزود الخدمة</p>
                          <p className="text-white/70 text-sm leading-relaxed">{trip.rejection_reason || "لم يقم المزود بتوضيح السبب."}</p>
                      </div>
                  </div>
              )}

              {trip.status === 'approved_unpaid' && trip.expires_at && (
                  <div className="p-5 bg-blue-500/10 border-t border-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full md:w-auto">
                          <Timer className="text-blue-400 shrink-0" size={24} />
                          <div>
                              <p className="text-blue-400 font-bold text-sm mb-1">تم قبول طلبك! يرجى السداد لتأكيد الحجز</p>
                              <p className="text-white/60 text-xs">ينتهي العرض بعد: <CountdownTimer expiresAt={trip.expires_at} /></p>
                          </div>
                      </div>
                      <Link href={`/checkout?booking_id=${trip.id}`} className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2">
                          <CreditCard size={18} /> ادفع الآن
                      </Link>
                  </div>
              )}


              {/* ========================================== */}
              {/* القسم السفلي المخفي (التفاصيل والباركود والصور) */}
              {/* يظهر دائمًا إذا ضغط العميل على البطاقة، مهما كانت حالة الحجز */}
              {/* ========================================== */}
              {isExpanded && srv && (
                  <div className="border-t border-white/10 bg-[#1a1a1a] p-6 md:p-8 animate-in slide-in-from-top-4 duration-300">
                      
                      {/* ✅ 1. عرض صور المكان/الفعالية من الـ JSON (details.images) */}
                      {srv?.details?.images && srv.details.images.length > 0 && (
                          <div className="mb-8">
                              <h4 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><ImageIcon size={16}/> صور المكان والخدمة</h4>
                              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                  {srv.details.images.map((url: string, idx: number) => (
                                      <div key={idx} className="relative w-40 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10">
                                          {url.match(/mp4|webm|ogg/) ? (
                                              <video src={url} className="w-full h-full object-cover" muted autoPlay loop />
                                          ) : (
                                              <Image src={url} fill className="object-cover" alt="Service Image" />
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          
                          {/* عمود التذكرة (يظهر فقط إذا كان الحجز مؤكد ومدفوع) */}
                          {trip.status === 'confirmed' && (
                              <div className="bg-gradient-to-br from-emerald-900/20 to-[#1a1a1a] border border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner h-fit">
                                  <p className="text-emerald-400 font-bold mb-6 flex items-center gap-2 text-lg"><CheckCircle2/> تذكرة الدخول صالحة</p>
                                  {trip.ticket_qr_code ? (
                                      <div className="bg-white p-4 rounded-xl shadow-lg mb-4 ring-4 ring-white/10">
                                          <QRCodeSVG value={trip.ticket_qr_code} size={180} level="H" />
                                      </div>
                                  ) : (
                                      <div className="w-48 h-48 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center mb-4 text-white/30 text-sm">لا يوجد كود</div>
                                  )}
                                  <p className="text-white/60 text-xs mb-1 mt-4">رمز التذكرة المرجعي</p>
                                  <p className="font-mono text-2xl text-white font-bold tracking-widest bg-black/50 px-6 py-2 rounded-lg border border-white/10 select-all">
                                      {trip.ticket_qr_code?.split('-')[0].toUpperCase()}
                                  </p>
                                  <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full">
                                    <p className="text-red-400 text-xs font-bold leading-relaxed">
                                      ⚠️ هذه التذكرة صالحة للاستخدام مرة واحدة فقط. أبرزها لمزود الخدمة عند وصولك.
                                    </p>
                                  </div>
                              </div>
                          )}

                          {/* عمود تفاصيل الخدمة والوصول (يأخذ المساحة كاملة إذا لم يكن هناك تذكرة) */}
                          <div className={`space-y-6 ${trip.status !== 'confirmed' ? 'lg:col-span-2' : ''}`}>
                              <h4 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4 flex items-center gap-2">
                                  <FileText size={20} className="text-[#C89B3C]"/> التفاصيل الشاملة للخدمة
                              </h4>
                              
                              <div className="space-y-4 text-sm text-white/80 bg-black/20 p-5 rounded-2xl border border-white/5">
                                  
                                  {/* الوصف الشامل */}
                                  {srv?.description && (
                                      <div className="mb-4 pb-4 border-b border-white/5">
                                          <span className="block text-white/40 text-xs mb-2">وصف الخدمة:</span>
                                          <p className="leading-relaxed whitespace-pre-line text-white/90">{srv.description}</p>
                                      </div>
                                  )}

                                  {/* تفاصيل عامة */}
                                  {srv?.duration && (
                                      <div className="flex gap-3">
                                          <Clock className="text-[#C89B3C] shrink-0" size={18}/>
                                          <div><span className="block text-white/40 text-xs mb-1">المدة المتوقعة</span><span className="font-bold">{srv.duration}</span></div>
                                      </div>
                                  )}
                                  
                                  {srv?.difficulty_level && (
                                      <div className="flex gap-3 pt-3 border-t border-white/5">
                                          <AlertCircle className="text-[#C89B3C] shrink-0" size={18}/>
                                          <div><span className="block text-white/40 text-xs mb-1">مستوى الصعوبة</span><span className="font-bold">{srv.difficulty_level === 'easy' ? 'سهل' : srv.difficulty_level === 'medium' ? 'متوسط' : 'صعب/متقدم'}</span></div>
                                      </div>
                                  )}

                                  {/* ✅ 2. المميزات للنزل (يتم قراءتها من الأعمدة الصحيحة) */}
                                  {srv?.amenities && srv.amenities.length > 0 && (
                                      <div className="flex gap-3 pt-3 border-t border-white/5">
                                          <CheckSquare className="text-emerald-400 shrink-0" size={18}/>
                                          <div>
                                              <span className="block text-emerald-400/70 text-xs mb-2">المميزات المتوفرة:</span>
                                              <div className="flex flex-wrap gap-2">
                                                  {srv.amenities.map((am: string, idx: number) => (
                                                      <span key={idx} className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md text-xs border border-emerald-500/20">
                                                          {amenityLabels[am] || am}
                                                      </span>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                  )}

                                  {/* مميزات مخصصة إضافية (مخزنة داخل كائن details) */}
                                  {srv?.details?.custom_amenities && (
                                      <div className="flex gap-3 pt-3 border-t border-white/5">
                                          <CheckSquare className="text-emerald-400 shrink-0" size={18}/>
                                          <div><span className="block text-emerald-400/70 text-xs mb-1">إضافات ومميزات أخرى:</span><span className="leading-relaxed whitespace-pre-line">{srv.details.custom_amenities}</span></div>
                                      </div>
                                  )}

                                  {/* ما تشمله التجربة */}
                                  {srv?.included_items && (
                                      <div className="flex gap-3 pt-3 border-t border-white/5">
                                          <CheckCircle2 className="text-blue-400 shrink-0" size={18}/>
                                          <div><span className="block text-blue-400/70 text-xs mb-1">ما تشمله التجربة (متوفر لك):</span><span className="leading-relaxed whitespace-pre-line">{srv.included_items}</span></div>
                                      </div>
                                  )}

                                  {/* متطلبات العميل */}
                                  {srv?.requirements && (
                                      <div className="flex gap-3 pt-3 border-t border-white/5">
                                          <AlertCircle className="text-amber-400 shrink-0" size={18}/>
                                          <div><span className="block text-amber-400/70 text-xs mb-1">متطلبات يجب إحضارها أو توفرها معك:</span><span className="leading-relaxed whitespace-pre-line">{srv.requirements}</span></div>
                                      </div>
                                  )}

                                  {/* نقطة التجمع */}
                                  {srv?.meeting_point && (
                                      <div className="flex gap-3 pt-3 border-t border-white/5">
                                          <Navigation className="text-purple-400 shrink-0" size={18}/>
                                          <div><span className="block text-purple-400/70 text-xs mb-1">نقطة التجمع / الوصول المحددة:</span><span className="leading-relaxed font-bold">{srv.meeting_point}</span></div>
                                      </div>
                                  )}

                                  {/* سياسات المكان / شروط الإلغاء (مخزنة داخل details) */}
                                  {srv?.details?.policies && (
                                      <div className="flex gap-3 pt-3 border-t border-white/5">
                                          <Info className="text-red-400 shrink-0" size={18}/>
                                          <div><span className="block text-red-400/70 text-xs mb-1">سياسات وشروط المكان (يرجى القراءة بعناية):</span><span className="leading-relaxed whitespace-pre-line">{srv.details.policies}</span></div>
                                      </div>
                                  )}
                              </div>

                              {/* عرض قائمة الطعام / المنتجات إذا وجدت */}
                              {srv?.menu_items && srv.menu_items.length > 0 && (
                                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5 mt-4">
                                      <h4 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Utensils size={16}/> المنتجات / المنيو المقدم</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                          {srv.menu_items.map((item: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg text-xs">
                                                  {item.image ? (
                                                      <Image src={item.image} width={30} height={30} alt="Item" className="rounded object-cover" />
                                                  ) : <div className="w-8 h-8 bg-white/10 rounded" />}
                                                  <div className="flex-1 truncate">{item.name}</div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              {/* ✅ زر خرائط جوجل المرتبط بالإحداثيات المباشرة */}
                              {mapLink ? (
                                  <div className="pt-4 mt-6">
                                      <a 
                                        href={mapLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full py-4 bg-white/5 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition rounded-xl flex items-center justify-center gap-2 font-bold text-blue-400 border border-blue-500/30 shadow-lg"
                                      >
                                          <MapPin size={20}/>
                                          فتح الموقع الدقيق في خرائط جوجل (Google Maps)
                                      </a>
                                  </div>
                              ) : (
                                  <div className="pt-4 mt-6 text-center text-xs text-white/40 bg-white/5 p-3 rounded-lg border border-dashed border-white/10">
                                      لم يقم المزود بتحديد موقع دقيق على الخريطة
                                  </div>
                              )}
                          </div>

                      </div>
                  </div>
              )}

            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}