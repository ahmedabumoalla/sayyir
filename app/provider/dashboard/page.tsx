"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  Wallet,
  CalendarCheck,
  Star,
  TrendingUp,
  Users,
  Plus,
  Bot,
  Sparkles,
  ChevronLeft,
  BadgeDollarSign,
  Activity,
  ShieldCheck,
  Briefcase,
} from "lucide-react";

export default function ProviderDashboard() {
  const [stats, setStats] = useState({
    earnings: 0,
    bookings: 0,
    services_count: 0,
    rating: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerName, setProviderName] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      if (profile) setProviderName(profile.full_name || "مزود خدمة");

      const { data: myServices, count: servicesCount } = await supabase
        .from("services")
        .select("id", { count: "exact" })
        .eq("provider_id", session.user.id);

      const serviceIds = myServices?.map((s) => s.id) || [];

      let bookingsCount = 0;
      let earningsTotal = 0;
      let recent: any[] = [];
      let calculatedRating = 0;

      if (serviceIds.length > 0) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("*, profiles:user_id(full_name)")
          .in("service_id", serviceIds)
          .order("created_at", { ascending: false });

        if (bookings) {
          bookingsCount = bookings.length;

          earningsTotal = bookings
            .filter((b) => b.status === "confirmed" || b.status === "completed")
            .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

          recent = bookings.slice(0, 3);
        }

        const { data: reviews, error: reviewsError } = await supabase
          .from("reviews")
          .select("rating")
          .in("service_id", serviceIds);

        if (!reviewsError && reviews && reviews.length > 0) {
          const totalRating = reviews.reduce(
            (sum, r) => sum + Number(r.rating || 0),
            0
          );
          calculatedRating = Number((totalRating / reviews.length).toFixed(1));
        }
      }

      setRecentBookings(recent);
      setStats({
        earnings: earningsTotal,
        bookings: bookingsCount,
        services_count: servicesCount || 0,
        rating: calculatedRating,
      });
    } catch (error) {
      console.error("Provider dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const welcomeName = useMemo(() => {
    if (!providerName?.trim()) return "مزود الخدمة";
    return providerName;
  }, [providerName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-[#C89B3C]">
        <div className="w-16 h-16 rounded-full border border-[#C89B3C]/20 bg-[#C89B3C]/10 flex items-center justify-center mb-4">
          <Activity className="animate-pulse" size={28} />
        </div>
        <p className="animate-pulse text-white">جاري تحميل البيانات الحية...</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 max-w-7xl mx-auto"
      dir="rtl"
    >
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-linear-to-br from-[#1a1a1a] via-[#141414] to-[#0f0f0f] shadow-2xl">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top_right,rgba(200,155,60,1),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.6),transparent_18%)]" />
        <div className="absolute -top-24 left-0 h-60 w-60 rounded-full bg-[#C89B3C]/10 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-60 w-60 rounded-full bg-[#C89B3C]/5 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 md:p-8 xl:p-10">
          <div className="xl:col-span-8 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-[#C89B3C] bg-[#C89B3C]/10 px-4 py-2 rounded-full border border-[#C89B3C]/20">
                <Sparkles size={16} />
                <span className="text-sm font-bold">لوحة مزود الخدمة الذكية</span>
              </div>

              <div className="flex items-center gap-2 text-white/70 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span className="text-sm">أداء مباشر وبيانات حية</span>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
                أهلاً بك، {welcomeName} 👋
              </h1>
              <p className="text-white/60 max-w-2xl leading-8 text-sm md:text-base">
                راقب حجوزاتك، أرباحك، تقييماتك، وخدماتك من واجهة احترافية مصممة
                لتساعدك على النمو واتخاذ القرار بسرعة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/provider/services"
                className="group rounded-2xl border border-white/10 bg-white/4 p-4 hover:border-[#C89B3C]/40 hover:bg-white/6 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#C89B3C]/10 text-[#C89B3C] flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                  <ChevronLeft className="text-white/30 group-hover:text-[#C89B3C] transition" />
                </div>
                <div className="text-white text-lg font-bold">إدارة خدماتك</div>
                <div className="text-white/45 text-xs mt-1">
                  تحديث الخدمات وإضافة المزيد
                </div>
              </Link>

              <Link
                href="/provider/bookings"
                className="group rounded-2xl border border-white/10 bg-white/4 p-4 hover:border-[#C89B3C]/40 hover:bg-white/6 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 text-white flex items-center justify-center">
                    <CalendarCheck size={20} />
                  </div>
                  <ChevronLeft className="text-white/30 group-hover:text-[#C89B3C] transition" />
                </div>
                <div className="text-white text-lg font-bold">متابعة الحجوزات</div>
                <div className="text-white/45 text-xs mt-1">
                  عرض الطلبات وحالتها بشكل لحظي
                </div>
              </Link>

              <Link
                href="/provider/assistant"
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
                    <Sparkles size={16} className="text-[#C89B3C]" />
                  </div>
                  <div className="text-white/55 text-xs mt-1">
                    مساعدتك في تطوير الأداء والخدمات
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="col-span-2 rounded-[28px] border border-white/10 bg-white/4 p-5 flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-white/45 text-xs mb-2">إجمالي الأداء</div>
                  <div className="text-3xl font-extrabold text-white">
                    {stats.bookings}
                  </div>
                  <div className="text-[#C89B3C] text-sm mt-1">
                    حجزًا عبر خدماتك
                  </div>
                </div>
                <div className="w-16 h-16 rounded-3xl bg-[#C89B3C]/10 text-[#C89B3C] flex items-center justify-center">
                  <Users size={30} />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="flex items-center justify-between mb-4">
                  <Wallet className="text-emerald-400" size={20} />
                  <span className="text-2xl font-bold text-white">
                    {stats.earnings.toLocaleString()}
                  </span>
                </div>
                <div className="text-white/60 text-sm">إجمالي الأرباح</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="flex items-center justify-between mb-4">
                  <Star className="text-[#C89B3C]" size={20} />
                  <span className="text-2xl font-bold text-white">
                    {stats.services_count}
                  </span>
                </div>
                <div className="text-white/60 text-sm">الخدمات المفعلة</div>
              </div>

              <div className="col-span-2 rounded-3xl border border-purple-500/20 bg-purple-500/6 p-5 flex items-center justify-between">
                <div>
                  <div className="text-purple-400 text-sm font-bold mb-1">
                    جودة الخدمة
                  </div>
                  <div className="text-white/60 text-sm">
                    متوسط التقييم الحالي {stats.rating}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition hover:-translate-y-1 shadow-lg">
          <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Wallet size={80} />
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Wallet size={24} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {stats.earnings.toLocaleString()}{" "}
            <span className="text-sm font-normal text-white/50">ريال</span>
          </h3>
          <p className="text-white/40 text-sm">إجمالي الأرباح</p>
        </div>

        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition hover:-translate-y-1 shadow-lg">
          <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <CalendarCheck size={80} />
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Users size={24} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {stats.bookings.toLocaleString()}
          </h3>
          <p className="text-white/40 text-sm">إجمالي الحجوزات</p>
        </div>

        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-[#C89B3C]/30 transition hover:-translate-y-1 shadow-lg">
          <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Star size={80} />
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#C89B3C]/10 text-[#C89B3C] rounded-xl">
              <Star size={24} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">
            {stats.services_count.toLocaleString()}
          </h3>
          <p className="text-white/40 text-sm">خدماتك المفعلة</p>
        </div>

        <div className="bg-[#252525] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition hover:-translate-y-1 shadow-lg">
          <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <TrendingUp size={80} />
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
              <BadgeDollarSign size={24} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats.rating}</h3>
          <p className="text-white/40 text-sm">متوسط التقييم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-[#252525] rounded-[28px] border border-white/5 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarCheck size={20} className="text-[#C89B3C]" />
              آخر الحجوزات
            </h3>
            <Link
              href="/provider/bookings"
              className="text-xs text-[#C89B3C] hover:underline"
            >
              عرض الكل
            </Link>
          </div>

          <div className="space-y-4">
            {recentBookings.length === 0 ? (
              <p className="text-white/30 text-center py-8">
                لا توجد حجوزات حديثة حتى الآن.
              </p>
            ) : (
              recentBookings.map((b: any) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition cursor-pointer border border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center font-bold text-[#C89B3C] shrink-0">
                      {b.profiles?.full_name?.charAt(0) || "ع"}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">
                        {b.profiles?.full_name || "عميل"}
                      </h4>
                      <p className="text-xs text-white/50">
                        {new Date(b.created_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 text-[10px] font-bold rounded-full border ${
                      b.status === "confirmed"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : b.status === "approved_unpaid"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : b.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {b.status === "confirmed"
                      ? "مؤكد"
                      : b.status === "approved_unpaid"
                      ? "بانتظار الدفع"
                      : b.status === "pending"
                      ? "طلب جديد"
                      : "مرفوض/ملغي"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Link
            href="/provider/assistant"
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
                    <ChevronLeft className="text-white/35 group-hover:text-[#C89B3C] transition" />
                  </div>

                  <p className="text-white/60 text-sm leading-7">
                    مساعد احترافي يساعدك على تحسين وصف خدماتك، تنظيم عروضك،
                    ورفع جودة ظهورك داخل المنصة.
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-[#C89B3C] text-sm font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    متصل وجاهز الآن
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <div className="bg-linear-to-br from-[#C89B3C]/20 to-[#252525] rounded-[28px] border border-[#C89B3C]/20 p-6 flex flex-col justify-center text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">زيادة الدخل؟</h3>
            <p className="text-white/60 text-sm mb-6 leading-7">
              أضف خدمات جديدة، حسّن عرضك، وارفع فرص ظهورك للعملاء للحصول على
              حجوزات أكثر وأرباح أعلى.
            </p>
            <Link href="/provider/services">
              <button className="w-full py-3 bg-[#C89B3C] text-black font-bold rounded-xl hover:bg-[#b38a35] transition shadow-lg shadow-[#C89B3C]/20 flex justify-center gap-2 items-center">
                <Plus size={18} />
                إضافة خدمة جديدة
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}