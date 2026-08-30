"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Building2,
  CalendarDays,
  Clock3,
  Eye,
  Landmark,
  Loader2,
  Map as MapIcon,
  MapPinned,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  TentTree,
  TriangleAlert,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useTranslation } from "../TranslationContext";

type RangeKey = "7d" | "30d" | "90d";
type EntityType = "landmark" | "facility" | "experience" | "event";

type AnalyticsData = {
  summary: {
    visits: number;
    unique_visitors: number;
    page_views: number;
    avg_duration_seconds: number;
    pages_per_visit: number;
    bounce_rate: number;
    engagement_rate: number;
    map_visits: number;
  };
  events: { platform_clicks: number; content_clicks: number; map_clicks: number };
  categories: Array<{ key: EntityType; clicks: number }>;
  topContent: Array<{
    type: EntityType;
    id: string;
    name: string;
    clicks: number;
    visitors: number;
  }>;
  cities: Array<{
    city: string;
    visits: number;
    visitors: number;
    avg_duration_seconds: number;
  }>;
  devices: Array<{ device: "mobile" | "tablet" | "desktop" | "unknown"; visits: number }>;
  series: Array<{ day: string; visits: number; page_views: number; clicks: number }>;
  recentSessions: Array<{
    id: string;
    city: string;
    device: "mobile" | "tablet" | "desktop" | "unknown";
    started_at: string;
    duration_seconds: number;
    page_views: number;
    map_views: number;
  }>;
};

const emptyData: AnalyticsData = {
  summary: {
    visits: 0,
    unique_visitors: 0,
    page_views: 0,
    avg_duration_seconds: 0,
    pages_per_visit: 0,
    bounce_rate: 0,
    engagement_rate: 0,
    map_visits: 0,
  },
  events: { platform_clicks: 0, content_clicks: 0, map_clicks: 0 },
  categories: [],
  topContent: [],
  cities: [],
  devices: [],
  series: [],
  recentSessions: [],
};

const entityConfig: Record<
  EntityType,
  { ar: string; en: string; icon: typeof Landmark; color: string; tint: string }
> = {
  landmark: { ar: "المعالم", en: "Landmarks", icon: Landmark, color: "#d5a93f", tint: "bg-[#d5a93f]/10" },
  facility: { ar: "المرافق", en: "Facilities", icon: Building2, color: "#65a9df", tint: "bg-[#65a9df]/10" },
  experience: { ar: "التجارب", en: "Experiences", icon: TentTree, color: "#53bc8a", tint: "bg-[#53bc8a]/10" },
  event: { ar: "الفعاليات", en: "Events", icon: CalendarDays, color: "#e47562", tint: "bg-[#e47562]/10" },
};

const cityNames: Record<string, string> = {
  Abha: "أبها",
  Riyadh: "الرياض",
  "Khamis Mushait": "خميس مشيط",
  Jeddah: "جدة",
  Dammam: "الدمام",
  Mecca: "مكة المكرمة",
  Medina: "المدينة المنورة",
  unknown: "غير معروف",
  "غير معروف": "غير معروف",
};

const numberFormat = new Intl.NumberFormat("ar-SA");

function formatNumber(value: number) {
  return numberFormat.format(Number(value || 0));
}

function formatDuration(totalSeconds: number, language: "ar" | "en" = "ar") {
  const seconds = Math.max(0, Math.round(Number(totalSeconds || 0)));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) return language === "ar" ? `${hours} س ${minutes} د` : `${hours}h ${minutes}m`;
  if (minutes > 0) return language === "ar" ? `${minutes} د ${remainder} ث` : `${minutes}m ${remainder}s`;
  return language === "ar" ? `${remainder} ث` : `${remainder}s`;
}

function cityLabel(city: string, language: "ar" | "en") {
  return language === "ar" ? cityNames[city] || city : city === "غير معروف" ? "Unknown" : city;
}

export default function PlatformAnalyticsPage() {
  const { language } = useTranslation();
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<AnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState(false);
  const [contentFilter, setContentFilter] = useState<EntityType | "all">("all");
  const [search, setSearch] = useState("");

  const isArabic = language === "ar";

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("missing_session");

      const response = await fetch(`/api/admin/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json();

      if (response.status === 424 || payload.error === "analytics_setup_required") {
        setSetupRequired(true);
        setData(emptyData);
        return;
      }
      if (!response.ok) throw new Error(payload.error || "analytics_fetch_failed");

      setSetupRequired(false);
      setData({ ...emptyData, ...(payload.data || {}) });
    } catch (fetchError) {
      console.error("Analytics dashboard error:", fetchError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const categoryCounts = useMemo(() => {
    const counts: Record<EntityType, number> = {
      landmark: 0,
      facility: 0,
      experience: 0,
      event: 0,
    };
    data.categories.forEach((item) => {
      if (item.key in counts) counts[item.key] = Number(item.clicks || 0);
    });
    return counts;
  }, [data.categories]);

  const filteredContent = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(isArabic ? "ar" : "en");
    return data.topContent.filter((item) => {
      const matchesType = contentFilter === "all" || item.type === contentFilter;
      const matchesSearch = !query || item.name.toLocaleLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [contentFilter, data.topContent, isArabic, search]);

  const totalDeviceVisits = data.devices.reduce((sum, item) => sum + Number(item.visits || 0), 0);

  return (
    <div className="mx-auto max-w-[1600px] pb-12 text-white animate-in fade-in duration-500">
      <div className="mb-7 flex flex-col gap-5 border-b border-white/8 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#d5a93f]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
            {isArabic ? "قياس مباشر لأداء المنصة" : "Live platform performance"}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            {isArabic ? "متابعة المنصة" : "Platform analytics"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            {isArabic
              ? "راقب حركة الزوار، المحتوى الأكثر جذباً، تفاعل الخريطة، المدن ومدة الجلسات من مكان واحد."
              : "Monitor visits, content interest, map activity, cities, and session duration in one place."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/10 bg-[#191919] p-1" role="group" aria-label={isArabic ? "النطاق الزمني" : "Date range"}>
            {(["7d", "30d", "90d"] as RangeKey[]).map((item) => (
              <button
                key={item}
                onClick={() => setRange(item)}
                className={`min-h-10 min-w-20 rounded-lg px-3 text-xs font-bold transition ${
                  range === item ? "bg-[#d5a93f] text-[#17130b]" : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isArabic ? `${item.replace("d", "")} يوم` : item.replace("d", " days")}
              </button>
            ))}
          </div>
          <button
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/65 transition hover:border-[#d5a93f]/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {isArabic ? "تحديث" : "Refresh"}
          </button>
        </div>
      </div>

      {setupRequired && (
        <StatusBanner
          icon={<TriangleAlert size={19} />}
          title={isArabic ? "التتبّع جاهز ويحتاج تفعيل قاعدة البيانات" : "Tracking is ready; database setup is required"}
          description={isArabic ? "شغّل ملف إعداد التحليلات في Supabase مرة واحدة، وبعدها ستبدأ الأرقام بالتسجيل تلقائياً." : "Run the analytics database setup once in Supabase; data collection will then start automatically."}
          tone="warning"
        />
      )}

      {error && (
        <StatusBanner
          icon={<TriangleAlert size={19} />}
          title={isArabic ? "تعذر تحميل بيانات المتابعة" : "Analytics could not be loaded"}
          description={isArabic ? "تحقق من الاتصال ثم حاول التحديث مرة أخرى." : "Check the connection, then try refreshing again."}
          tone="error"
        />
      )}

      {loading ? (
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-white/45">
            <Loader2 className="animate-spin text-[#d5a93f]" size={24} />
            {isArabic ? "جاري تجهيز قراءة الأداء..." : "Preparing performance data..."}
          </div>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-4">
            <Metric
              icon={<Users size={20} />}
              label={isArabic ? "الزيارات" : "Visits"}
              value={formatNumber(data.summary.visits)}
              detail={`${formatNumber(data.summary.unique_visitors)} ${isArabic ? "زائر مختلف" : "unique visitors"}`}
              color="text-[#d5a93f]"
            />
            <Metric
              icon={<Eye size={20} />}
              label={isArabic ? "مشاهدات الصفحات" : "Page views"}
              value={formatNumber(data.summary.page_views)}
              detail={`${data.summary.pages_per_visit || 0} ${isArabic ? "صفحة لكل زيارة" : "pages per visit"}`}
              color="text-sky-400"
            />
            <Metric
              icon={<MousePointerClick size={20} />}
              label={isArabic ? "نقرات المنصة" : "Platform clicks"}
              value={formatNumber(data.events.platform_clicks)}
              detail={`${formatNumber(data.events.content_clicks)} ${isArabic ? "فتح محتوى" : "content opens"} · ${formatNumber(data.events.map_clicks)} ${isArabic ? "على الخريطة" : "on map"}`}
              color="text-emerald-400"
            />
            <Metric
              icon={<Clock3 size={20} />}
              label={isArabic ? "متوسط مدة الجلسة" : "Average session"}
              value={formatDuration(data.summary.avg_duration_seconds, language)}
              detail={`${data.summary.engagement_rate || 0}% ${isArabic ? "معدل التفاعل" : "engagement rate"}`}
              color="text-orange-400"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.75fr)]">
            <Panel className="min-h-[390px]">
              <PanelHeader
                icon={<Activity size={18} />}
                title={isArabic ? "حركة المنصة" : "Platform activity"}
                subtitle={isArabic ? "الزيارات والنقرات خلال الفترة المحددة" : "Visits and clicks over the selected period"}
              />
              <ActivityChart series={data.series} language={language} />
            </Panel>

            <Panel>
              <PanelHeader
                icon={<MousePointerClick size={18} />}
                title={isArabic ? "الاهتمام حسب القسم" : "Interest by category"}
                subtitle={isArabic ? "الدخول إلى القسم وفتح التفاصيل" : "Category visits and detail opens"}
              />
              <div className="mt-7 space-y-6">
                {(Object.keys(entityConfig) as EntityType[]).map((key) => {
                  const config = entityConfig[key];
                  const Icon = config.icon;
                  const clicks = categoryCounts[key];
                  const max = Math.max(...Object.values(categoryCounts), 1);

                  return (
                    <div key={key}>
                      <div className="mb-2.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.tint}`} style={{ color: config.color }}>
                            <Icon size={17} />
                          </span>
                          <span className="text-sm font-bold text-white/75">{isArabic ? config.ar : config.en}</span>
                        </div>
                        <span className="font-mono text-lg font-bold">{formatNumber(clicks)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(clicks / max) * 100}%`, backgroundColor: config.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel>
              <div className="flex items-start justify-between gap-4">
                <PanelHeader
                  icon={<MapPinned size={18} />}
                  title={isArabic ? "أداء الخريطة" : "Map performance"}
                  subtitle={isArabic ? "الزيارات والتفاعل داخل الخريطة" : "Map visits and in-map interaction"}
                />
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d5a93f]/10 text-[#d5a93f]">
                  <MapIcon size={21} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <CompactMetric label={isArabic ? "زيارات الخريطة" : "Map visits"} value={formatNumber(data.summary.map_visits)} />
                <CompactMetric label={isArabic ? "نقرات الخريطة" : "Map clicks"} value={formatNumber(data.events.map_clicks)} />
              </div>

              <div className="mt-6 border-t border-white/8 pt-5">
                <p className="mb-4 text-xs font-bold text-white/40">{isArabic ? "المدن الأعلى زيارة" : "Top visitor cities"}</p>
                {data.cities.length === 0 ? (
                  <EmptyState label={isArabic ? "لا توجد بيانات مدن بعد" : "No city data yet"} />
                ) : (
                  <div className="space-y-1">
                    {data.cities.slice(0, 6).map((city, index) => (
                      <div key={city.city} className="grid grid-cols-[28px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-white/5 py-3 last:border-0">
                        <span className="font-mono text-xs text-white/25">{String(index + 1).padStart(2, "0")}</span>
                        <span className="truncate text-sm font-bold text-white/75">{cityLabel(city.city, language)}</span>
                        <span className="text-xs text-white/35">{formatDuration(city.avg_duration_seconds, language)}</span>
                        <span className="min-w-12 text-end font-mono text-sm font-bold text-[#d5a93f]">{formatNumber(city.visits)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                icon={<Smartphone size={18} />}
                title={isArabic ? "الأجهزة وجودة الجلسة" : "Devices and session quality"}
                subtitle={isArabic ? "كيف يصل الزوار إلى المنصة" : "How visitors reach the platform"}
              />
              <div className="mt-7 space-y-5">
                {data.devices.length === 0 ? (
                  <EmptyState label={isArabic ? "لا توجد بيانات أجهزة بعد" : "No device data yet"} />
                ) : (
                  data.devices.map((item) => {
                    const percentage = totalDeviceVisits ? Math.round((item.visits / totalDeviceVisits) * 100) : 0;
                    const DeviceIcon = item.device === "mobile" ? Smartphone : item.device === "tablet" ? Tablet : Monitor;
                    const label = item.device === "mobile" ? (isArabic ? "الجوال" : "Mobile") : item.device === "tablet" ? (isArabic ? "الأجهزة اللوحية" : "Tablet") : item.device === "desktop" ? (isArabic ? "الكمبيوتر" : "Desktop") : (isArabic ? "غير معروف" : "Unknown");

                    return (
                      <div key={item.device} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white/55"><DeviceIcon size={18} /></span>
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                            <span className="font-bold text-white/70">{label}</span>
                            <span className="text-white/35">{percentage}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                            <div className="h-full rounded-full bg-[#d5a93f]" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                        <span className="min-w-12 text-end font-mono font-bold">{formatNumber(item.visits)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8">
                <CompactMetric label={isArabic ? "معدل التفاعل" : "Engagement"} value={`${data.summary.engagement_rate || 0}%`} subtle />
                <CompactMetric label={isArabic ? "معدل الخروج السريع" : "Bounce rate"} value={`${data.summary.bounce_rate || 0}%`} subtle />
              </div>
            </Panel>
          </section>

          <section className="mt-6">
            <Panel>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <PanelHeader
                  icon={<Landmark size={18} />}
                  title={isArabic ? "المحتوى الأكثر جذباً" : "Top-performing content"}
                  subtitle={isArabic ? "كل معلم ومرفق وتجربة وفعالية حسب نقرات فتح التفاصيل" : "Every item ranked by detail opens"}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-white/30 ${isArabic ? "right-3" : "left-3"}`} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={isArabic ? "ابحث بالاسم" : "Search by name"}
                      className={`h-10 w-full rounded-lg border border-white/10 bg-black/20 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#d5a93f]/50 sm:w-48 ${isArabic ? "pr-9 pl-3" : "pl-9 pr-3"}`}
                    />
                  </div>
                  <select
                    value={contentFilter}
                    onChange={(event) => setContentFilter(event.target.value as EntityType | "all")}
                    className="h-10 rounded-lg border border-white/10 bg-[#202020] px-3 text-xs text-white/70 outline-none focus:border-[#d5a93f]/50"
                  >
                    <option value="all">{isArabic ? "جميع الأقسام" : "All categories"}</option>
                    {(Object.keys(entityConfig) as EntityType[]).map((key) => (
                      <option key={key} value={key}>{isArabic ? entityConfig[key].ar : entityConfig[key].en}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[650px] border-collapse text-start">
                  <thead>
                    <tr className="border-y border-white/8 text-xs text-white/30">
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "الترتيب" : "Rank"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "الاسم" : "Name"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "القسم" : "Category"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "النقرات" : "Clicks"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "الزوار" : "Visitors"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContent.map((item, index) => {
                      const config = entityConfig[item.type] || entityConfig.facility;
                      return (
                        <tr key={`${item.type}-${item.id}`} className="border-b border-white/5 transition hover:bg-white/[.025]">
                          <td className="px-3 py-4 font-mono text-xs text-white/25">{String(index + 1).padStart(2, "0")}</td>
                          <td className="max-w-[360px] px-3 py-4 text-sm font-bold text-white/80"><span className="line-clamp-1">{item.name}</span></td>
                          <td className="px-3 py-4"><span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${config.tint}`} style={{ color: config.color }}>{isArabic ? config.ar : config.en}</span></td>
                          <td className="px-3 py-4 font-mono text-base font-bold text-[#d5a93f]">{formatNumber(item.clicks)}</td>
                          <td className="px-3 py-4 font-mono text-sm text-white/50">{formatNumber(item.visitors)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredContent.length === 0 && <EmptyState label={isArabic ? "لا توجد نقرات محتوى في هذه الفترة" : "No content clicks in this period"} />}
              </div>
            </Panel>
          </section>

          <section className="mt-6">
            <Panel>
              <PanelHeader
                icon={<Clock3 size={18} />}
                title={isArabic ? "آخر الجلسات" : "Recent sessions"}
                subtitle={isArabic ? "المدينة والوقت ومدة البقاء والصفحات التي تمت زيارتها" : "City, time, duration, and pages viewed"}
              />
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-y border-white/8 text-xs text-white/30">
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "المدينة" : "City"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "الجهاز" : "Device"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "وقت الزيارة" : "Visit time"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "مدة الجلسة" : "Duration"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "الصفحات" : "Pages"}</th>
                      <th className="px-3 py-3 text-start font-medium">{isArabic ? "الخريطة" : "Map"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSessions.map((session) => (
                      <tr key={session.id} className="border-b border-white/5 text-sm transition hover:bg-white/[.025]">
                        <td className="px-3 py-4 font-bold text-white/75">{cityLabel(session.city, language)}</td>
                        <td className="px-3 py-4 text-white/45">{deviceLabel(session.device, language)}</td>
                        <td className="px-3 py-4 text-white/45">{new Date(session.started_at).toLocaleString(isArabic ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                        <td className="px-3 py-4 font-mono font-bold text-[#d5a93f]">{formatDuration(session.duration_seconds, language)}</td>
                        <td className="px-3 py-4 font-mono text-white/55">{formatNumber(session.page_views)}</td>
                        <td className="px-3 py-4 font-mono text-white/55">{formatNumber(session.map_views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.recentSessions.length === 0 && <EmptyState label={isArabic ? "لم تُسجل جلسات بعد" : "No sessions recorded yet"} />}
              </div>
            </Panel>
          </section>

          <p className="mt-5 text-center text-[11px] leading-5 text-white/25">
            {isArabic
              ? "تبدأ الأرقام من وقت تفعيل التتبّع. المدينة تقريبية بحسب شبكة الزائر، ولا يتم حفظ عنوان IP أو بيانات شخصية."
              : "Metrics begin when tracking is enabled. City is network-derived and approximate; IP addresses and personal data are not stored."}
          </p>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value, detail, color }: { icon: ReactNode; label: string; value: string; detail: string; color: string }) {
  return (
    <div className="bg-[#191919] p-4 sm:p-6">
      <div className={`mb-6 ${color}`}>{icon}</div>
      <p className="text-xs font-bold text-white/40">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-2 text-[11px] text-white/30">{detail}</p>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-[#191919] p-5 sm:p-6 ${className}`}>{children}</div>;
}

function PanelHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-base font-bold text-white/85"><span className="text-[#d5a93f]">{icon}</span>{title}</div>
      <p className="mt-1 text-xs text-white/35">{subtitle}</p>
    </div>
  );
}

function CompactMetric({ label, value, subtle = false }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div className={`${subtle ? "bg-[#161616]" : "border border-white/8 bg-black/15"} p-4`}>
      <p className="text-[11px] font-bold text-white/35">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-white/90">{value}</p>
    </div>
  );
}

function StatusBanner({ icon, title, description, tone }: { icon: ReactNode; title: string; description: string; tone: "warning" | "error" }) {
  const classes = tone === "warning" ? "border-amber-400/25 bg-amber-400/8 text-amber-300" : "border-red-400/25 bg-red-400/8 text-red-300";
  return (
    <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${classes}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-white/45">{description}</p></div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex min-h-24 items-center justify-center text-center text-xs text-white/25">{label}</div>;
}

function deviceLabel(device: string, language: "ar" | "en") {
  if (device === "mobile") return language === "ar" ? "جوال" : "Mobile";
  if (device === "tablet") return language === "ar" ? "جهاز لوحي" : "Tablet";
  if (device === "desktop") return language === "ar" ? "كمبيوتر" : "Desktop";
  return language === "ar" ? "غير معروف" : "Unknown";
}

function ActivityChart({ series, language }: { series: AnalyticsData["series"]; language: "ar" | "en" }) {
  const width = 760;
  const height = 240;
  const padding = { top: 18, right: 10, bottom: 34, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...series.flatMap((point) => [Number(point.visits), Number(point.clicks)]), 1);

  const pathFor = (key: "visits" | "clicks") =>
    series
      .map((point, index) => {
        const x = padding.left + (series.length === 1 ? chartWidth / 2 : (index / Math.max(series.length - 1, 1)) * chartWidth);
        const y = padding.top + chartHeight - (Number(point[key]) / maxValue) * chartHeight;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const labelStep = Math.max(1, Math.ceil(series.length / 6));

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-5 text-[11px] text-white/40">
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#d5a93f]" />{language === "ar" ? "الزيارات" : "Visits"}</span>
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-400" />{language === "ar" ? "النقرات" : "Clicks"}</span>
      </div>
      {series.length === 0 ? (
        <EmptyState label={language === "ar" ? "لا توجد حركة مسجلة في هذه الفترة" : "No activity in this period"} />
      ) : (
        <div className="w-full overflow-hidden" dir="ltr">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={language === "ar" ? "رسم حركة المنصة" : "Platform activity chart"}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + chartHeight - ratio * chartHeight;
              return (
                <g key={ratio}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,.07)" strokeDasharray="4 5" />
                  <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,.25)" fontSize="10">{Math.round(maxValue * ratio)}</text>
                </g>
              );
            })}
            <path d={pathFor("visits")} fill="none" stroke="#d5a93f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathFor("clicks")} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {series.map((point, index) => {
              if (index % labelStep !== 0 && index !== series.length - 1) return null;
              const x = padding.left + (series.length === 1 ? chartWidth / 2 : (index / Math.max(series.length - 1, 1)) * chartWidth);
              return <text key={point.day} x={x} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,.3)" fontSize="10">{new Date(point.day).toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB", { day: "numeric", month: "short" })}</text>;
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
