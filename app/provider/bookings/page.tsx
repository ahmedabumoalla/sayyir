"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Clock, CheckCircle, XCircle, AlertCircle, Calendar,
  User, MapPin, DollarSign, FileText, ChevronLeft,
  Loader2, Filter, Send, X, ShieldAlert, Receipt, Coffee,
  Mail, Phone, Briefcase, Info, Compass, Home, Utensils,
  Mountain, Wifi, Car, Flame, Waves, Sparkles, Wind, Tv,
  Activity, Users, Tent, Building, HeartPulse, CheckSquare, Image as ImageIcon, PlayCircle, ShieldCheck, Ticket, CalendarOff, Navigation
} from "lucide-react";
import Image from "next/image";
import { Tajawal } from "next/font/google";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const ALL_FEATURES_DICT: Record<string, any> = {
  yard: { label: "يوجد حوش", icon: MapPin },
  view: { label: "إطلالة مميزة", icon: Mountain },
  farm: { label: "مزرعة", icon: MapPin },
  main_road: { label: "على الطريق العام", icon: MapPin },
  services_nearby: { label: "بالقرب من خدمات", icon: MapPin },
  wifi: { label: "واي فاي مجاني", icon: Wifi },
  parking: { label: "مواقف سيارات", icon: Car },
  bbq: { label: "منطقة شواء", icon: Flame },
  pool: { label: "مسبح خاص", icon: Waves },
  cleaning: { label: "خدمة تنظيف", icon: Sparkles },
  ac: { label: "تكييف", icon: Wind },
  tv: { label: "تلفزيون", icon: Tv },
  kitchen: { label: "مطبخ مجهز", icon: Utensils },
  volleyball: { label: "ملعب طائرة", icon: Activity },
  football: { label: "ملعب كرة قدم", icon: Activity },
  men_majlis: { label: "مجلس رجال", icon: Users },
  women_majlis: { label: "مجلس نساء", icon: Users },
  kids_area: { label: "ألعاب أطفال", icon: Activity },
  green_area: { label: "مسطحات خضراء", icon: MapPin },
  transport: { label: "مركبة للنقل", icon: Car },
  tent: { label: "خيمة للاستراحة", icon: Tent },
  floor_seating: { label: "جلسات أرضية", icon: Users },
  chairs: { label: "كراسي متنقلة", icon: Users },
  water: { label: "مياه شرب", icon: Coffee },
  food: { label: "وجبات طعام", icon: Utensils },
  kiosks: { label: "أكشاك بيع", icon: Building },
  rides: { label: "ملاهي وألعاب", icon: Activity },
  seating: { label: "جلسات عامة", icon: Users },
  cable_car: { label: "تلفريك", icon: MapPin },
  live_shows: { label: "عروض حية", icon: Tv },
  security: { label: "حراسة / أمان", icon: ShieldCheck },
  firstaid: { label: "إسعافات أولية", icon: HeartPulse },
  breakfast: { label: "إفطار مشمول", icon: Coffee }
};

const safeArray = (data: any) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (typeof data === "object") return Object.values(data);
  return [];
};

const formatTime12H = (timeStr: string) => {
  if (!timeStr) return "";
  try {
    if (timeStr.includes("T")) {
      return new Date(timeStr).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    }
    const [hourStr, minute] = timeStr.split(":");
    let hour = parseInt(hourStr, 10);
    const period = hour >= 12 ? "مساءً" : "صباحاً";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour.toString().padStart(2, "0")}:${minute} ${period}`;
  } catch {
    return timeStr;
  }
};

const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes("video");

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    setLoading(true);
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("bookings")
      .select(`
        *,
        profiles:user_id (full_name, email, phone, avatar_url),
        services:service_id (*)
      `)
      .eq("provider_id", session.user.id)
      .order("created_at", { ascending: false });

    if (filter === "pending") query = query.eq("status", "pending");
    if (filter === "active") query = query.in("status", ["confirmed", "approved_unpaid"]);
    if (filter === "history") query = query.in("status", ["rejected", "cancelled", "expired", "completed"]);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching bookings:", error);
    }

    if (data) setBookings(data);
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);

    try {
      const response = await fetch("/api/provider/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: "approve"
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "فشل قبول الحجز");
      }

      alert("✅ تم قبول الطلب وإرسال رابط الدفع للعميل.");
      setSelectedBooking(null);
      setShowRejectModal(false);
      setRejectReason("");
      await fetchBookings();
    } catch (err: any) {
      alert("خطأ: " + (err?.message || "حدث خطأ غير متوقع"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBooking || !rejectReason.trim()) {
      alert("الرجاء كتابة سبب الرفض");
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch("/api/provider/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: "reject",
          rejectReason: rejectReason.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "فشل رفض الحجز");
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      await supabase.from("admin_notifications").insert([
        {
          booking_id: selectedBooking.id,
          type: "booking_rejected",
          message: `قام المزود برفض الحجز رقم #${selectedBooking.id.slice(0, 6)}`,
          provider_name: session?.user?.user_metadata?.full_name || "مزود خدمة",
          details: {
            reason: rejectReason.trim(),
            service: selectedBooking.services?.title
          }
        }
      ]);

      alert("تم رفض الطلب وإرسال السبب للعميل.");
      setShowRejectModal(false);
      setSelectedBooking(null);
      setRejectReason("");
      await fetchBookings();
    } catch (err: any) {
      alert("خطأ: " + (err?.message || "حدث خطأ غير متوقع"));
    } finally {
      setActionLoading(false);
    }
  };

  const getTranslatedFeature = (id: string) => {
    const feat = ALL_FEATURES_DICT[id];
    if (feat) {
      return (
        <span
          key={id}
          className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"
        >
          <feat.icon size={14} className="text-[#C89B3C]" /> {feat.label}
        </span>
      );
    }

    return (
      <span
        key={id}
        className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"
      >
        <CheckSquare size={14} className="text-[#C89B3C]" /> {id}
      </span>
    );
  };

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 ${tajawal.className}`}>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">إدارة الحجوزات</h1>
          <p className="text-white/50 text-sm">تابع الطلبات الواردة واتخذ الإجراءات.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto pb-2">
        {[
          { k: "active", l: "نشطة ومؤكدة", i: Clock },
          { k: "pending", l: "طلبات جديدة", i: AlertCircle },
          { k: "history", l: "السجل السابق", i: FileText }
        ].map((tab) => (
          <button
            key={tab.k}
            onClick={() => setFilter(tab.k)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl transition relative whitespace-nowrap ${
              filter === tab.k ? "text-[#C89B3C] bg-white/5" : "text-white/50 hover:text-white"
            }`}
          >
            <tab.i size={18} />
            <span className="font-bold">{tab.l}</span>
            {filter === tab.k && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C89B3C]" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#C89B3C]" size={40} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <FileText size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/40">لا توجد حجوزات في هذه القائمة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((bookingItem) => (
            <div
              key={bookingItem.id}
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 hover:border-[#C89B3C]/50 transition group relative flex flex-col"
            >
              <div
                className={`absolute top-4 left-4 px-2 py-1 rounded text-[10px] font-bold ${
                  bookingItem.status === "pending"
                    ? "bg-yellow-500 text-black"
                    : bookingItem.status === "approved_unpaid"
                    ? "bg-blue-500 text-white"
                    : bookingItem.status === "confirmed"
                    ? "bg-emerald-500 text-black"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {bookingItem.status === "pending"
                  ? "طلب جديد"
                  : bookingItem.status === "approved_unpaid"
                  ? "بانتظار دفع العميل"
                  : bookingItem.status === "confirmed"
                  ? "مؤكد ومدفوع"
                  : bookingItem.status === "rejected"
                  ? "مرفوض"
                  : "ملغي/منتهي"}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden relative border border-white/5">
                  {bookingItem.profiles?.avatar_url ? (
                    <Image src={bookingItem.profiles.avatar_url} fill alt="Client" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#C89B3C] font-bold">
                      <User />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{bookingItem.profiles?.full_name || "عميل"}</p>
                  <p className="text-xs text-white/50 dir-ltr">
                    {new Date(bookingItem.created_at).toLocaleDateString("ar-SA")}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6 bg-black/40 p-4 rounded-xl border border-white/5 flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">الخدمة المطلوبة:</span>
                  <span className="text-white font-bold truncate max-w-[150px]">{bookingItem.services?.title}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">الموعد:</span>
                  <span className="text-[#C89B3C] font-mono">
                    {bookingItem.booking_date || bookingItem.execution_date?.split("T")[0] || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">الكمية/العدد:</span>
                  <span className="text-white">{bookingItem.quantity}</span>
                </div>
                <div className="flex justify-between text-xs pt-3 border-t border-white/10 mt-2">
                  <span className="text-white/50">الإجمالي المستحق:</span>
                  <span className="text-lg font-bold text-[#C89B3C] font-mono">{bookingItem.total_price} ﷼</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(bookingItem)}
                className="mt-auto w-full py-3 bg-white/5 hover:bg-[#C89B3C] hover:text-black rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 border border-white/5 group-hover:border-[#C89B3C]"
              >
                <FileText size={16} /> عرض التفاصيل لاتخاذ إجراء
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#1e1e1e] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedBooking.status === "pending" ? (
                    <AlertCircle className="text-yellow-500" />
                  ) : (
                    <Receipt className="text-[#C89B3C]" />
                  )}
                  تفاصيل الحجز الشاملة #{selectedBooking.id.slice(0, 8)}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setShowRejectModal(false);
                }}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2">
                      <User size={18} /> بيانات العميل
                    </h3>
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 bg-black/30 p-5 rounded-2xl border border-white/5">
                      <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden relative shrink-0">
                        {selectedBooking.profiles?.avatar_url ? (
                          <Image src={selectedBooking.profiles.avatar_url} fill alt="Client" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#C89B3C]">
                            <User size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 w-full text-center md:text-right">
                        <p className="text-white font-bold text-lg mb-2">{selectedBooking.profiles?.full_name}</p>
                        <div className="flex flex-col gap-2 text-white/60 text-sm justify-center md:justify-start">
                          <span className="flex items-center justify-center md:justify-start gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                            <Mail size={14} /> {selectedBooking.profiles?.email}
                          </span>
                          {selectedBooking.profiles?.phone && (
                            <span className="flex items-center justify-center md:justify-start gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                              <Phone size={14} /> <span className="dir-ltr">{selectedBooking.profiles.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2">
                      <Receipt size={18} /> تفاصيل الحجز المالي
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                        <p className="text-xs text-white/50 mb-1">التاريخ المحدد</p>
                        <p className="font-bold text-sm font-mono text-white">
                          {selectedBooking.execution_date
                            ? new Date(selectedBooking.execution_date).toLocaleString("ar-SA")
                            : selectedBooking.booking_date || "غير محدد"}
                        </p>
                      </div>
                      <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                        <p className="text-xs text-white/50 mb-1">الكمية / العدد</p>
                        <p className="font-bold text-xl">{selectedBooking.quantity}</p>
                      </div>
                      <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                        <p className="text-xs text-white/50 mb-1">حالة الدفع</p>
                        <p
                          className={`font-bold text-sm ${
                            selectedBooking.payment_status === "paid" ? "text-emerald-400" : "text-yellow-500"
                          }`}
                        >
                          {selectedBooking.payment_status === "paid" ? "مدفوع" : "غير مدفوع"}
                        </p>
                      </div>
                      <div className="bg-[#C89B3C]/10 p-4 rounded-xl border border-[#C89B3C]/30 text-center shadow-inner">
                        <p className="text-xs text-[#C89B3C] mb-1 font-bold">الإجمالي المستحق</p>
                        <p className="font-bold text-2xl font-mono text-[#C89B3C]">
                          {selectedBooking.total_price} ﷼
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedBooking.notes && (
                    <div className="bg-yellow-500/10 p-5 rounded-xl border border-yellow-500/20">
                      <p className="text-yellow-500 text-sm font-bold mb-2 flex items-center gap-2">
                        <Info size={16} /> ملاحظات من العميل:
                      </p>
                      <p className="text-white/80 text-sm leading-relaxed">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2">
                    <Briefcase size={18} /> الخدمة المحجوزة
                  </h3>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 relative overflow-hidden">
                    <div
                      className={`absolute top-0 right-0 bottom-0 w-1 ${
                        selectedBooking.services?.service_category === "experience"
                          ? "bg-emerald-500"
                          : selectedBooking.services?.sub_category === "lodging"
                          ? "bg-blue-500"
                          : "bg-orange-500"
                      }`}
                    ></div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/70">
                          {selectedBooking.services?.service_category === "experience"
                            ? "تجربة سياحية"
                            : selectedBooking.services?.sub_category === "lodging"
                            ? "سكن ونزل"
                            : "مرفق / طعام"}
                        </span>
                      </div>
                      <p className="font-bold text-xl text-white">{selectedBooking.services?.title}</p>
                      <p className="text-sm text-white/50 mt-2 line-clamp-2 leading-relaxed">
                        {selectedBooking.services?.description}
                      </p>
                    </div>

                    {selectedBooking.services?.sub_category === "lodging" &&
                      selectedBooking.services?.details?.lodging_type && (
                        <div className="grid grid-cols-2 gap-3 text-sm border-t border-white/5 pt-4">
                          <div>
                            <span className="block text-white/40 text-xs">نوع السكن</span>
                            {selectedBooking.services.details.lodging_type}
                          </div>
                          {selectedBooking.services.details.area && (
                            <div>
                              <span className="block text-white/40 text-xs">المساحة</span>
                              {selectedBooking.services.details.area} م²
                            </div>
                          )}
                        </div>
                      )}

                    {selectedBooking.services?.sub_category === "experience" &&
                      selectedBooking.services?.details?.experience_info && (
                        <div className="grid grid-cols-2 gap-3 text-sm border-t border-white/5 pt-4">
                          <div>
                            <span className="block text-white/40 text-xs">مدة التجربة</span>
                            {selectedBooking.services.details.experience_info.duration}
                          </div>
                          <div>
                            <span className="block text-white/40 text-xs">الفئة</span>
                            {selectedBooking.services.details.experience_info.target_audience === "both"
                              ? "عوايل وعزاب"
                              : "عزاب"}
                          </div>
                        </div>
                      )}

                    {selectedBooking.services?.sub_category === "event" &&
                      selectedBooking.services?.details?.event_info && (
                        <div className="grid grid-cols-2 gap-3 text-sm border-t border-white/5 pt-4">
                          <div>
                            <span className="block text-white/40 text-xs">يفتح</span>
                            <span className="dir-ltr inline-block">
                              {selectedBooking.services.details.event_info.dates?.startTime}
                            </span>
                          </div>
                          <div>
                            <span className="block text-white/40 text-xs">يغلق</span>
                            <span className="dir-ltr inline-block">
                              {selectedBooking.services.details.event_info.dates?.endTime}
                            </span>
                          </div>
                        </div>
                      )}

                    {(safeArray(selectedBooking.services?.details?.features).length > 0 ||
                      safeArray(selectedBooking.services?.details?.custom_features).length > 0) && (
                      <div className="pt-4 border-t border-white/5">
                        <span className="text-xs text-white/40 mb-2 block">المميزات:</span>
                        <div className="flex flex-wrap gap-2">
                          {safeArray(selectedBooking.services.details.features).map((feat: string) =>
                            getTranslatedFeature(feat)
                          )}
                          {safeArray(selectedBooking.services.details.custom_features).map(
                            (feat: string, idx: number) => (
                              <span
                                key={`c-${idx}`}
                                className="text-xs bg-white/5 text-white/90 px-2 py-1 rounded-lg border border-white/10"
                              >
                                {feat}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {selectedBooking.services?.location_lat && selectedBooking.services?.location_lng && (
                      <div className="mt-4 h-32 rounded-xl overflow-hidden relative">
                        <Map
                          initialViewState={{
                            latitude: selectedBooking.services.location_lat,
                            longitude: selectedBooking.services.location_lng,
                            zoom: 12
                          }}
                          mapStyle="mapbox://styles/mapbox/dark-v11"
                          mapboxAccessToken={MAPBOX_TOKEN}
                          interactive={false}
                        >
                          <Marker
                            latitude={selectedBooking.services.location_lat}
                            longitude={selectedBooking.services.location_lng}
                            color="#C89B3C"
                          />
                        </Map>
                        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs backdrop-blur-md border border-white/10 flex items-center gap-1">
                          <MapPin size={10} className="text-[#C89B3C]" />{" "}
                          {selectedBooking.services.location || "الموقع محدد"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedBooking.status === "rejected" && selectedBooking.rejection_reason && (
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-start gap-3">
                  <XCircle className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-400 font-bold text-sm mb-1">سبب الرفض المرسل للعميل:</p>
                    <p className="text-white/80 text-sm whitespace-pre-line">{selectedBooking.rejection_reason}</p>
                  </div>
                </div>
              )}

              {selectedBooking.status === "approved_unpaid" && selectedBooking.expires_at && (
                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex items-center gap-3">
                  <Clock className="text-blue-400" />
                  <div>
                    <p className="text-blue-400 font-bold text-sm">تم القبول، بانتظار دفع العميل</p>
                    <p className="text-white/60 text-xs">
                      تلغى الفاتورة تلقائياً في:{" "}
                      <span className="text-white font-mono dir-ltr">
                        {new Date(selectedBooking.expires_at).toLocaleString("ar-SA")}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-[#151515] rounded-b-3xl mt-auto">
              {selectedBooking.status === "pending" &&
                (!showRejectModal ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                    >
                      {actionLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          <CheckCircle size={20} /> قبول الطلب وإصدار الفاتورة
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="sm:w-1/3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/50 font-bold py-4 rounded-xl transition"
                    >
                      رفض الطلب
                    </button>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 bg-red-500/5 p-5 rounded-2xl border border-red-500/20">
                    <label className="text-sm text-red-400 font-bold mb-3 flex items-center gap-2">
                      <ShieldAlert size={16} /> سبب الرفض (سيتم إرساله للعميل):
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-red-500 mb-4 transition"
                      placeholder="نعتذر لعدم التوفر في هذا الوقت..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleReject}
                        disabled={actionLoading || !rejectReason.trim()}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <>
                            <Send size={18} /> إرسال الرفض
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(false)}
                        className="px-8 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {zoomedImage && (
        <div
          className="fixed inset-0 z-100 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-3 rounded-full">
            <X size={24} />
          </button>
          <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
            {isVideo(zoomedImage) ? (
              <video
                src={zoomedImage}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-2xl shadow-2xl outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain drop-shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}