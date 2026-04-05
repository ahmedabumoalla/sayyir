"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  Sparkles,
  Loader2,
  Calendar,
  Heart,
  ArrowUpLeft,
  Clock,
  Map as MapIcon,
  Bot,
  ChevronLeft,
  Ticket,
  WalletCards,
  ShieldCheck,
  Stars,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// مكون العداد التنازلي المصغر
function CountdownTimer({ expiryDate }: { expiryDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiryDate).getTime() - now;

      if (distance < 0) {
        setTimeLeft("منتهي");
        clearInterval(interval);
      } else {
        const hours = Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (distance % (1000 * 60 * 60)) / (1000 * 60)
        );
        setTimeLeft(`${hours}س ${minutes}د`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryDate]);

  return (
    <span className="text-xs font-mono font-bold text-red-400 dir-ltr">
      {timeLeft}
    </span>
  );
}

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  const [stats, setStats] = useState({
    total_trips: 0,
    upcoming_trips: 0,
    pending_approval: 0,
    favorites_count: 0,
  });

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (suggestions.length > 1) {
      const interval = setInterval(() => {
        setFade(false);
        setTimeout(() => {
          setCurrentSuggestionIndex(
            (prev) => (prev + 1) % suggestions.length
          );
          setFade(true);
        }, 300);
      }, 7000);

      return () => clearInterval(interval);
    }
  }, [suggestions]);

  const fetchDashboardData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      if (profile) setUserName(profile.full_name);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("status")
        .eq("user_id", session.user.id);

      const total = bookings?.length || 0;
      const upcoming =
        bookings?.filter((b) => b.status === "confirmed").length || 0;
      const pending =
        bookings?.filter((b) => b.status === "pending").length || 0;

      const { count: favCount } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      setStats({
        total_trips: total,
        upcoming_trips: upcoming,
        pending_approval: pending,
        favorites_count: favCount || 0,
      });

      const { data: recent } = await supabase
        .from("bookings")
        .select(`
          id, status, booking_date, total_price, expires_at,
          services:service_id (title, image_url)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(4);

      if (recent) setRecentBookings(recent);

      const { data: services } = await supabase
        .from("services")
        .select("id, title, description, image_url, price")
        .limit(3);

      const { data: landmarks } = await supabase
        .from("places")
        .select("id, name, description, media_urls, price")
        .limit(3);

      const mixedSuggestions = [
        ...(services || []).map((s) => ({
          ...s,
          type: "service",
          name: s.title,
          media: s.image_url,
        })),
        ...(landmarks || []).map((l) => ({
          ...l,
          type: "landmark",
          title: l.name,
          media: l.media_urls?.[0],
        })),
      ].sort(() => 0.5 - Math.random());

      setSuggestions(mixedSuggestions);
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const isVideo = (url: string) =>
    url?.match(/\.(mp4|webm|ogg)$/i) || url?.includes("video");

  const currentSuggestion = suggestions[currentSuggestionIndex];

  const welcomeName = useMemo(() => {
    if (!userName?.trim()) return "ضيفنا العزيز";
    return userName;
  }, [userName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-[#C89B3C]">
        <Loader2 className="animate-spin w-10 h-10 mb-4" />
        <p className="animate-pulse text-white">جاري تجهيز لوحتك...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-linear-to-br from-[#1a1a1a] via-[#141414] to-[#0f0f0f] shadow-2xl">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top_right,rgba(200,155,60,1),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.6),transparent_18%)]" />
        <div className="absolute -top-24 left-0 h-60 w-60 rounded-full bg-[#C89B3C]/10 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-60 w-60 rounded-full bg-[#C89B3C]/5 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 md:p-8 xl:p-10">
          <div className="xl:col-span-8 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-[#C89B3C] bg-[#C89B3C]/10 px-4 py-2 rounded-full border border-[#C89B3C]/20">
                <Sparkles size={16} />
                <span className="text-sm font-bold">لوحتك الذكية في سيّر</span>
              </div>

              <div className="flex items-center gap-2 text-white/70 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span className="text-sm">تجربة شخصية ومباشرة</span>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
                أهلاً بك، {welcomeName} 👋
              </h1>
              <p className="text-white/60 max-w-2xl leading-8 text-sm md:text-base">
                كل ما يخص حجوزاتك، مفضلتك، واقتراحاتك القادمة في مكان واحد،
                بتجربة أكثر أناقة ووضوحًا وسرعة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/client/trips"
                className="group rounded-2xl border border-white/10 bg-white/4 p-4 hover:border-[#C89B3C]/40 hover:bg-white/6 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#C89B3C]/10 text-[#C89B3C] flex items-center justify-center">
                    <Ticket size={20} />
                  </div>
                  <ChevronLeft className="text-white/30 group-hover:text-[#C89B3C] transition" />
                </div>
                <div className="text-white text-lg font-bold">
                  استعراض حجوزاتي
                </div>
                <div className="text-white/45 text-xs mt-1">
                  متابعة الحالة والدفع والتفاصيل
                </div>
              </Link>

              <Link
                href="/map"
                className="group rounded-2xl border border-white/10 bg-white/4 p-4 hover:border-[#C89B3C]/40 hover:bg-white/6 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 text-white flex items-center justify-center">
                    <MapIcon size={20} />
                  </div>
                  <ChevronLeft className="text-white/30 group-hover:text-[#C89B3C] transition" />
                </div>
                <div className="text-white text-lg font-bold">
                  اكتشف الخريطة
                </div>
                <div className="text-white/45 text-xs mt-1">
                  معالم وتجارب حولك الآن
                </div>
              </Link>

              <Link
                href="/client/guide"
                className="group rounded-2xl border border-[#C89B3C]/25 bg-linear-to-br from-[#C89B3C]/12 to-transparent p-4 hover:border-[#C89B3C]/50 transition relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_top_left,rgba(200,155,60,0.18),transparent_45%)]" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#C89B3C] text-[#2B1F17] flex items-center justify-center shadow-lg shadow-[#C89B3C]/20">
                      <Bot size={20} />
                    </div>
                    <ChevronLeft className="text-white/30 group-hover:text-[#C89B3C] transition" />
                  </div>
                  <div className="text-white text-lg font-bold flex items-center gap-2">
                    المساعد الذكي
                    <Stars size={16} className="text-[#C89B3C]" />
                  </div>
                  <div className="text-white/55 text-xs mt-1">
                    اسأل، خطط، واكتشف عسير بذكاء
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="col-span-2 rounded-[28px] border border-white/10 bg-white/4 p-5 flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-white/45 text-xs mb-2">إجمالي نشاطك</div>
                  <div className="text-3xl font-extrabold text-white">
                    {stats.total_trips}
                  </div>
                  <div className="text-[#C89B3C] text-sm mt-1">
                    حجوزات وتجارب محفوظة
                  </div>
                </div>
                <div className="w-16 h-16 rounded-3xl bg-[#C89B3C]/10 text-[#C89B3C] flex items-center justify-center">
                  <Compass size={30} />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="flex items-center justify-between mb-4">
                  <Calendar className="text-[#C89B3C]" size={20} />
                  <span className="text-2xl font-bold text-white">
                    {stats.upcoming_trips}
                  </span>
                </div>
                <div className="text-white/60 text-sm">رحلات مؤكدة</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="flex items-center justify-between mb-4">
                  <Heart className="text-red-400" size={20} />
                  <span className="text-2xl font-bold text-white">
                    {stats.favorites_count}
                  </span>
                </div>
                <div className="text-white/60 text-sm">في المفضلة</div>
              </div>

              <div className="col-span-2 rounded-3xl border border-yellow-500/20 bg-yellow-500/6 p-5 flex items-center justify-between">
                <div>
                  <div className="text-yellow-400 text-sm font-bold mb-1">
                    بانتظارك الآن
                  </div>
                  <div className="text-white/60 text-sm">
                    {stats.pending_approval} طلب بانتظار الموافقة
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                  <WalletCards size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/client/trips"
          className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-[#C89B3C]/50 transition-all hover:-translate-y-1 shadow-lg"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#C89B3C]/10 rounded-xl text-[#C89B3C]">
              <Calendar size={24} />
            </div>
            <span className="text-3xl font-bold text-white">
              {stats.upcoming_trips}
            </span>
          </div>
          <p className="text-white/60 font-medium text-sm">رحلات مؤكدة</p>
        </Link>

        <div className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-yellow-500/50 transition-all hover:-translate-y-1 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500">
              <Clock size={24} />
            </div>
            <span className="text-3xl font-bold text-white">
              {stats.pending_approval}
            </span>
          </div>
          <p className="text-white/60 font-medium text-sm">بانتظار الموافقة</p>
        </div>

        <Link
          href="/client/trips"
          className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-emerald-500/50 transition-all hover:-translate-y-1 shadow-lg"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Compass size={24} />
            </div>
            <span className="text-3xl font-bold text-white">
              {stats.total_trips}
            </span>
          </div>
          <p className="text-white/60 font-medium text-sm">إجمالي الحجوزات</p>
        </Link>

        <Link
          href="/client/favorites"
          className="group bg-[#252525] p-6 rounded-2xl border border-white/5 hover:border-red-500/50 transition-all hover:-translate-y-1 shadow-lg"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
              <Heart size={24} />
            </div>
            <span className="text-3xl font-bold text-white">
              {stats.favorites_count}
            </span>
          </div>
          <p className="text-white/60 font-medium text-sm">المفضلة</p>
        </Link>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        {/* bookings */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock size={20} className="text-[#C89B3C]" />
              <span>آخر الحجوزات</span>
            </h3>
            <Link
              href="/client/trips"
              className="text-sm text-[#C89B3C] hover:text-white transition"
            >
              عرض الكل
            </Link>
          </div>

          <div className="space-y-4">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={
                    booking.status === "approved_unpaid"
                      ? `/checkout/${booking.id}`
                      : `/client/trips`
                  }
                  className="block bg-[#252525] border border-white/5 rounded-[24px] p-4 hover:border-[#C89B3C]/30 transition group relative overflow-hidden shadow-md"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_right,rgba(200,155,60,0.08),transparent_35%)]" />
                  <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
                    <div className="w-full md:w-28 h-28 rounded-2xl overflow-hidden relative bg-black shrink-0 border border-white/10">
                      {isVideo(booking.services?.image_url) ? (
                        <video
                          src={booking.services?.image_url}
                          className="w-full h-full object-cover"
                          muted
                          autoPlay
                          loop
                          playsInline
                        />
                      ) : (
                        <Image
                          src={booking.services?.image_url || "/placeholder.jpg"}
                          alt="Service"
                          fill
                          className="object-cover group-hover:scale-110 transition duration-500"
                        />
                      )}
                    </div>

                    <div className="flex-1 text-center md:text-right w-full">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-2">
                        <h4 className="font-bold text-white text-lg line-clamp-1">
                          {booking.services?.title || "خدمة محذوفة"}
                        </h4>

                        {booking.status === "approved_unpaid" && (
                          <div className="bg-red-500/10 text-red-400 px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border border-red-500/20 md:shrink-0">
                            <Clock size={12} />
                            متبقي:{" "}
                            <CountdownTimer expiryDate={booking.expires_at} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            booking.status === "confirmed"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : booking.status === "approved_unpaid"
                              ? "bg-blue-500/10 text-blue-400 animate-pulse"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {booking.status === "confirmed"
                            ? "مؤكد"
                            : booking.status === "approved_unpaid"
                            ? "بانتظار الدفع"
                            : "بانتظار الموافقة"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-2 md:shrink-0">
                      <span className="text-[#C89B3C] font-bold text-lg dir-ltr bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                        {booking.total_price} SAR
                      </span>
                      <div className="text-white/35 text-[11px]">
                        اضغط للتفاصيل
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-14 bg-[#252525] rounded-[28px] border border-white/5 border-dashed">
                <p className="text-white/50 mb-4">لم تقم بأي حجوزات بعد</p>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#C89B3C] text-[#2B1F17] rounded-xl hover:bg-[#b38a35] transition font-bold text-sm shadow-lg"
                >
                  تصفح الخدمات
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* right rail */}
        <div className="lg:col-span-4 space-y-6">
          {/* smart assistant */}
          <Link
            href="/client/guide"
            className="group block rounded-[28px] overflow-hidden border border-[#C89B3C]/20 bg-linear-to-br from-[#1d1710] via-[#171717] to-[#101010] shadow-2xl"
          >
            <div className="relative p-6">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_top_right,rgba(200,155,60,0.18),transparent_35%)]" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#C89B3C] text-[#2B1F17] flex items-center justify-center shadow-lg shadow-[#C89B3C]/20 shrink-0">
                  <Bot size={28} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                      المساعد الذكي
                      <Sparkles size={16} className="text-[#C89B3C]" />
                    </h3>
                    <ArrowUpLeft className="text-white/35 group-hover:text-[#C89B3C] transition" />
                  </div>

                  <p className="text-white/60 text-sm leading-7">
                    اسأله عن المعالم، خطط رحلتك، أو اطلب اقتراحات ذكية حسب
                    اهتماماتك داخل عسير.
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-[#C89B3C] text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    متصل وجاهز الآن
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* suggestion */}
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-[#C89B3C]" />
              <span>نقترح عليك</span>
            </h3>

            {currentSuggestion ? (
              <div
                className={`group relative h-[430px] rounded-[28px] overflow-hidden shadow-2xl transition-opacity duration-500 border border-white/10 ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              >
                {isVideo(currentSuggestion.media) ? (
                  <video
                    src={currentSuggestion.media}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <Image
                    src={currentSuggestion.media || "/placeholder.jpg"}
                    alt={currentSuggestion.name || currentSuggestion.title}
                    fill
                    className="object-cover transition duration-1000 group-hover:scale-110"
                  />
                )}

                <div className="absolute inset-0 bg-linear-to-t from-[#121212] via-[#121212]/60 to-transparent" />

                <div className="absolute top-0 left-0 h-1 bg-[#C89B3C] w-full animate-[progress_7s_linear_infinite] origin-left"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col h-full justify-end">
                  <span className="bg-[#C89B3C] text-black text-[10px] font-bold px-3 py-1 rounded-full mb-auto inline-flex w-fit shadow-lg">
                    {currentSuggestion.type === "service"
                      ? "تجربة مميزة"
                      : "معلم سياحي"}
                  </span>

                  <h4 className="text-2xl font-extrabold text-white mb-2">
                    {currentSuggestion.title || currentSuggestion.name}
                  </h4>

                  <p className="text-white/60 mb-4 line-clamp-2 text-xs leading-relaxed">
                    {currentSuggestion.description ||
                      "استمتع بجمال عسير وتعرف على ثقافتها العريقة."}
                  </p>

                  <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                    <div>
                      <span className="text-[#C89B3C] font-extrabold text-lg dir-ltr">
                        {currentSuggestion.price > 0
                          ? `${currentSuggestion.price} SAR`
                          : "دخول مجاني"}
                      </span>
                    </div>

                    <Link
                      href={
                        currentSuggestion.type === "service"
                          ? `/service/${currentSuggestion.id}`
                          : `/landmarks`
                      }
                      className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-[#C89B3C] transition flex items-center gap-1 text-xs shadow-lg"
                    >
                      <span>التفاصيل</span>
                      <ArrowUpLeft size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[430px] bg-[#252525] rounded-[28px] flex flex-col items-center justify-center border border-white/5 p-8 text-center relative overflow-hidden">
                <MapIcon size={40} className="text-white/20 mb-4" />
                <h4 className="font-bold text-white mb-2">
                  الخريطة بانتظارك
                </h4>
                <p className="text-white/50 text-xs mb-6">
                  تصفح الخريطة لاكتشاف آلاف المعالم
                </p>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C89B3C] text-[#2B1F17] rounded-xl hover:bg-[#b38a35] transition font-bold text-sm"
                >
                  الذهاب للخريطة
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}