"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Building2, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, Compass, Eye, Landmark, Loader2, LogIn, Map as MapIcon,
  MapPinned, Monitor, MousePointerClick, RefreshCw, Route, Smartphone, Tablet,
  TentTree, User, UserRoundCheck, Users, X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useTranslation } from "../TranslationContext";

type RangeKey = "7d" | "30d" | "90d";
type EntityType = "landmark" | "facility" | "experience" | "event";
type Language = "ar" | "en";

type AnalyticsData = {
  summary: { visits: number; unique_visitors: number; page_views: number; avg_duration_seconds: number; pages_per_visit: number; map_visits: number };
  events: { platform_clicks: number; content_clicks: number; map_clicks: number };
  actions: { directions: number; bookingStarts: number; bookingsCreated: number };
  categories: Array<{ key: EntityType; clicks: number }>;
  topContent: Array<{ type: EntityType; id: string; name: string; clicks: number; visitors: number }>;
};

type SessionSummary = {
  id: string; userId: string | null; userName: string; isAuthenticated: boolean;
  city: string; device: string; startedAt: string; lastSeenAt: string;
  durationSeconds: number; pageViews: number; clicks: number; mapViews: number; landingPage: string;
};

type JourneyEvent = {
  id: string; type: string; occurredAt: string; pagePath: string | null;
  entityType: EntityType | null; entityId: string | null; entityName: string | null;
  metadata: Record<string, unknown>;
};

type SessionDetail = { session: SessionSummary; journey: JourneyEvent[] };

const emptyData: AnalyticsData = {
  summary: { visits: 0, unique_visitors: 0, page_views: 0, avg_duration_seconds: 0, pages_per_visit: 0, map_visits: 0 },
  events: { platform_clicks: 0, content_clicks: 0, map_clicks: 0 },
  actions: { directions: 0, bookingStarts: 0, bookingsCreated: 0 },
  categories: [], topContent: [],
};

const entityConfig: Record<EntityType, { ar: string; en: string; icon: typeof Landmark; color: string; tint: string }> = {
  landmark: { ar: "المعالم", en: "Landmarks", icon: Landmark, color: "#d5a93f", tint: "bg-[#d5a93f]/10" },
  facility: { ar: "المرافق", en: "Facilities", icon: Building2, color: "#65a9df", tint: "bg-[#65a9df]/10" },
  experience: { ar: "التجارب", en: "Experiences", icon: TentTree, color: "#53bc8a", tint: "bg-[#53bc8a]/10" },
  event: { ar: "الفعاليات", en: "Events", icon: CalendarDays, color: "#e47562", tint: "bg-[#e47562]/10" },
};

const cityNames: Record<string, string> = {
  Abha: "أبها", Riyadh: "الرياض", "Khamis Mushait": "خميس مشيط", Jeddah: "جدة",
  Dammam: "الدمام", Mecca: "مكة المكرمة", Medina: "المدينة المنورة",
  unknown: "غير معروف", "غير معروف": "غير معروف",
};

const numberFormat = new Intl.NumberFormat("ar-SA");
const formatNumber = (value: number) => numberFormat.format(Number(value || 0));

function formatDuration(totalSeconds: number, language: Language) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds || 0)));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) return language === "ar" ? `${hours} س ${minutes} د` : `${hours}h ${minutes}m`;
  if (minutes > 0) return language === "ar" ? `${minutes} د ${remainder} ث` : `${minutes}m ${remainder}s`;
  return language === "ar" ? `${remainder} ث` : `${remainder}s`;
}

function cityLabel(city: string, language: Language) {
  return language === "ar" ? cityNames[city] || city : city === "غير معروف" ? "Unknown" : city;
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export default function PlatformAnalyticsPage() {
  const { language } = useTranslation();
  const isArabic = language === "ar";
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<AnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contentFilter, setContentFilter] = useState<EntityType | "all">("all");
  const [visitsOpen, setVisitsOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsTotalPages, setSessionsTotalPages] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadAnalytics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("missing_session");
      const response = await fetch(`/api/admin/analytics?range=${range}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "analytics_fetch_failed");
      setData({ ...emptyData, ...(payload.data || {}) });
    } catch (fetchError) {
      console.error("Analytics dashboard error:", fetchError);
      setError(true);
    } finally { if (!silent) setLoading(false); }
  }, [range]);

  const loadSessions = useCallback(async (page = 1) => {
    setSessionsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("missing_session");
      const response = await fetch(`/api/admin/analytics/sessions?range=${range}&page=${page}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "sessions_fetch_failed");
      setSessions(payload.sessions || []);
      setSessionsPage(payload.page || 1);
      setSessionsTotalPages(payload.totalPages || 1);
    } catch (sessionsError) {
      console.error("Analytics sessions error:", sessionsError);
      setSessions([]);
    } finally { setSessionsLoading(false); }
  }, [range]);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setDetailLoading(true);
    setSessionDetail(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("missing_session");
      const response = await fetch(`/api/admin/analytics/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "journey_fetch_failed");
      setSessionDetail(payload);
    } catch (detailError) { console.error("Session journey error:", detailError); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => { const interval = window.setInterval(() => void loadAnalytics(true), 30_000); return () => window.clearInterval(interval); }, [loadAnalytics]);
  useEffect(() => { if (visitsOpen) void loadSessions(1); }, [loadSessions, visitsOpen]);
  useEffect(() => { if (!visitsOpen) { setSelectedSessionId(null); setSessionDetail(null); } }, [visitsOpen]);

  const categoryCounts = useMemo(() => {
    const counts: Record<EntityType, number> = { landmark: 0, facility: 0, experience: 0, event: 0 };
    data.categories.forEach((item) => { if (item.key in counts) counts[item.key] = Number(item.clicks || 0); });
    return counts;
  }, [data.categories]);

  const filteredContent = useMemo(() => data.topContent.filter((item) => contentFilter === "all" || item.type === contentFilter), [contentFilter, data.topContent]);
  const totalClicks = Number(data.events.platform_clicks || 0) + Number(data.events.map_clicks || 0);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-white/45"><Loader2 className="me-3 animate-spin text-[#d5a93f]" size={24} />{isArabic ? "جاري تحميل الأداء..." : "Loading performance..."}</div>;

  return (
    <div className="mx-auto max-w-[1500px] pb-12 text-white animate-in fade-in duration-300">
      <header className="mb-7 flex flex-col gap-5 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#d5a93f]"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.75)]" />{isArabic ? "متابعة مباشرة" : "Live monitoring"}</div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{isArabic ? "أداء المنصة" : "Platform performance"}</h1>
          <p className="mt-2 text-sm text-white/45">{isArabic ? "الأرقام المهمة أولاً، وتفاصيل رحلة كل زائر عند الحاجة." : "Key numbers first, with every visitor journey one click away."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/10 bg-[#191919] p-1" role="group" aria-label={isArabic ? "النطاق الزمني" : "Date range"}>
            {(["7d", "30d", "90d"] as RangeKey[]).map((item) => <button key={item} onClick={() => setRange(item)} className={`min-h-10 min-w-20 rounded-lg px-3 text-xs font-bold transition ${range === item ? "bg-[#d5a93f] text-[#17130b]" : "text-white/45 hover:bg-white/5 hover:text-white"}`}>{isArabic ? `${item.replace("d", "")} يوم` : item.replace("d", " days")}</button>)}
          </div>
          <button onClick={() => void loadAnalytics()} className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/65 transition hover:border-[#d5a93f]/40 hover:text-white"><RefreshCw size={16} />{isArabic ? "تحديث" : "Refresh"}</button>
        </div>
      </header>

      {error && <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/8 p-4 text-sm text-red-300">{isArabic ? "تعذر تحميل البيانات. حاول التحديث مرة أخرى." : "Could not load analytics. Please refresh."}</div>}

      <section className="grid gap-4 lg:grid-cols-2">
        <PrimaryMetric icon={<Users size={26} />} label={isArabic ? "إجمالي الزيارات" : "Total visits"} value={formatNumber(data.summary.visits)} detail={`${formatNumber(data.summary.unique_visitors)} ${isArabic ? "زائر مختلف" : "unique visitors"}`} hint={isArabic ? "اضغط لعرض المستخدمين ورحلاتهم" : "Open visitors and journeys"} onClick={() => setVisitsOpen(true)} accent="gold" />
        <PrimaryMetric icon={<MousePointerClick size={26} />} label={isArabic ? "إجمالي النقرات" : "Total clicks"} value={formatNumber(totalClicks)} detail={`${formatNumber(data.events.content_clicks)} ${isArabic ? "تفاعل مع المحتوى" : "content interactions"}`} hint={isArabic ? "يشمل الأزرار والروابط والخريطة" : "Buttons, links, and map"} onClick={() => document.getElementById("content-performance")?.scrollIntoView({ behavior: "smooth" })} accent="green" />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
        <MiniMetric icon={<Eye size={18} />} label={isArabic ? "الصفحات المشاهدة" : "Page views"} value={formatNumber(data.summary.page_views)} />
        <MiniMetric icon={<Clock3 size={18} />} label={isArabic ? "متوسط الجلسة" : "Average session"} value={formatDuration(data.summary.avg_duration_seconds, language)} />
        <MiniMetric icon={<MapIcon size={18} />} label={isArabic ? "زيارات الخريطة" : "Map visits"} value={formatNumber(data.summary.map_visits)} />
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#191919] p-5 sm:p-6">
        <SectionHeader icon={<Route size={19} />} title={isArabic ? "مسار التحويل" : "Conversion journey"} description={isArabic ? "من الزيارة إلى إنشاء الحجز" : "From visit to booking"} />
        <div className="mt-6 grid gap-2 md:grid-cols-5">
          <FunnelStep number={data.summary.visits} label={isArabic ? "زيارة" : "Visits"} icon={<Users size={18} />} active />
          <FunnelStep number={data.events.content_clicks} label={isArabic ? "فتح محتوى" : "Content opens"} icon={<Eye size={18} />} />
          <FunnelStep number={data.actions.directions} label={isArabic ? "طلب اتجاهات" : "Directions"} icon={<Compass size={18} />} />
          <FunnelStep number={data.actions.bookingStarts} label={isArabic ? "بدأ الحجز" : "Booking starts"} icon={<LogIn size={18} />} />
          <FunnelStep number={data.actions.bookingsCreated} label={isArabic ? "أنشأ حجزاً" : "Bookings created"} icon={<CheckCircle2 size={18} />} success />
        </div>
      </section>

      <section id="content-performance" className="mt-6 grid scroll-mt-6 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-[#191919] p-5 sm:p-6">
          <SectionHeader icon={<MousePointerClick size={19} />} title={isArabic ? "نقرات الأقسام" : "Category clicks"} description={isArabic ? "أين يتركز اهتمام الزوار" : "Where interest is focused"} />
          <div className="mt-6 space-y-4">
            {(Object.keys(entityConfig) as EntityType[]).map((key) => {
              const config = entityConfig[key]; const Icon = config.icon; const max = Math.max(...Object.values(categoryCounts), 1);
              return <div key={key}><div className="mb-2 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-bold text-white/70"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.tint}`} style={{ color: config.color }}><Icon size={17} /></span>{isArabic ? config.ar : config.en}</div><span className="font-mono text-lg font-bold">{formatNumber(categoryCounts[key])}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/6"><div className="h-full rounded-full" style={{ width: `${(categoryCounts[key] / max) * 100}%`, backgroundColor: config.color }} /></div></div>;
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#191919] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeader icon={<Landmark size={19} />} title={isArabic ? "المحتوى الأكثر جذباً" : "Top content"} description={isArabic ? "كل عنصر بالاسم" : "Every item by name"} />
            <select value={contentFilter} onChange={(event) => setContentFilter(event.target.value as EntityType | "all")} className="h-10 rounded-lg border border-white/10 bg-[#222] px-3 text-xs text-white/70 outline-none"><option value="all">{isArabic ? "جميع الأقسام" : "All categories"}</option>{(Object.keys(entityConfig) as EntityType[]).map((key) => <option key={key} value={key}>{isArabic ? entityConfig[key].ar : entityConfig[key].en}</option>)}</select>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse"><thead><tr className="border-y border-white/8 text-xs text-white/30"><th className="px-3 py-3 text-start font-medium">#</th><th className="px-3 py-3 text-start font-medium">{isArabic ? "المحتوى" : "Content"}</th><th className="px-3 py-3 text-start font-medium">{isArabic ? "القسم" : "Category"}</th><th className="px-3 py-3 text-start font-medium">{isArabic ? "النقرات" : "Clicks"}</th><th className="px-3 py-3 text-start font-medium">{isArabic ? "الزوار" : "Visitors"}</th></tr></thead>
              <tbody>{filteredContent.slice(0, 15).map((item, index) => { const config = entityConfig[item.type] || entityConfig.facility; return <tr key={`${item.type}-${item.id}`} className="border-b border-white/5 transition hover:bg-white/[.025]"><td className="px-3 py-4 font-mono text-xs text-white/25">{String(index + 1).padStart(2, "0")}</td><td className="max-w-[320px] px-3 py-4 text-sm font-bold text-white/80"><span className="line-clamp-1">{item.name}</span></td><td className="px-3 py-4"><span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${config.tint}`} style={{ color: config.color }}>{isArabic ? config.ar : config.en}</span></td><td className="px-3 py-4 font-mono font-bold text-[#d5a93f]">{formatNumber(item.clicks)}</td><td className="px-3 py-4 font-mono text-white/45">{formatNumber(item.visitors)}</td></tr>; })}</tbody>
            </table>
            {filteredContent.length === 0 && <Empty label={isArabic ? "لا توجد تفاعلات محتوى بعد" : "No content interactions yet"} />}
          </div>
        </div>
      </section>

      <p className="mt-5 text-center text-[11px] text-white/25">{isArabic ? "المستخدم المسجّل يظهر بالاسم، والزائر غير المسجّل يظهر بمعرّف مجهول." : "Signed-in users appear by name; anonymous visitors use a private identifier."}</p>

      {visitsOpen && <VisitsExplorer language={language} sessions={sessions} loading={sessionsLoading} page={sessionsPage} totalPages={sessionsTotalPages} selectedId={selectedSessionId} detail={sessionDetail} detailLoading={detailLoading} onClose={() => setVisitsOpen(false)} onPage={(page) => void loadSessions(page)} onSelect={(id) => void loadSessionDetail(id)} onBack={() => { setSelectedSessionId(null); setSessionDetail(null); }} />}
    </div>
  );
}

function PrimaryMetric({ icon, label, value, detail, hint, onClick, accent }: { icon: ReactNode; label: string; value: string; detail: string; hint: string; onClick: () => void; accent: "gold" | "green" }) {
  const color = accent === "gold" ? "text-[#d5a93f]" : "text-emerald-400";
  return <button onClick={onClick} className="group min-h-44 rounded-2xl border border-white/10 bg-[#191919] p-6 text-start transition hover:-translate-y-0.5 hover:border-[#d5a93f]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5a93f]/50"><div className="flex items-start justify-between gap-4"><span className={color}>{icon}</span><span className="flex items-center gap-1 text-[11px] font-bold text-white/30 transition group-hover:text-white/60">{hint}<ArrowLeft className="rtl:block ltr:hidden" size={14} /><ArrowRight className="rtl:hidden ltr:block" size={14} /></span></div><p className="mt-7 text-xs font-bold text-white/45">{label}</p><div className="mt-2 flex items-end justify-between gap-4"><p className="font-mono text-4xl font-bold tracking-tight sm:text-5xl">{value}</p><p className="pb-1 text-xs text-white/30">{detail}</p></div></button>;
}

function MiniMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex items-center gap-4 bg-[#191919] p-5"><span className="text-[#d5a93f]">{icon}</span><div><p className="text-[11px] font-bold text-white/35">{label}</p><p className="mt-1 font-mono text-xl font-bold">{value}</p></div></div>; }
function SectionHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) { return <div><h2 className="flex items-center gap-2 text-base font-bold text-white/85"><span className="text-[#d5a93f]">{icon}</span>{title}</h2><p className="mt-1 text-xs text-white/35">{description}</p></div>; }
function FunnelStep({ number, label, icon, active = false, success = false }: { number: number; label: string; icon: ReactNode; active?: boolean; success?: boolean }) { return <div className={`flex min-h-24 items-center gap-3 rounded-xl border p-4 ${success ? "border-emerald-400/20 bg-emerald-400/6" : active ? "border-[#d5a93f]/25 bg-[#d5a93f]/7" : "border-white/8 bg-black/15"}`}><span className={success ? "text-emerald-400" : "text-[#d5a93f]"}>{icon}</span><div><p className="font-mono text-2xl font-bold">{formatNumber(number)}</p><p className="text-[11px] font-bold text-white/40">{label}</p></div></div>; }
function Empty({ label }: { label: string }) { return <div className="flex min-h-28 items-center justify-center text-center text-xs text-white/25">{label}</div>; }

function VisitsExplorer(props: { language: Language; sessions: SessionSummary[]; loading: boolean; page: number; totalPages: number; selectedId: string | null; detail: SessionDetail | null; detailLoading: boolean; onClose: () => void; onPage: (page: number) => void; onSelect: (id: string) => void; onBack: () => void }) {
  const isArabic = props.language === "ar";
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm md:items-center md:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
    <section className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#151515] shadow-2xl md:h-[86vh] md:rounded-2xl" dir={isArabic ? "rtl" : "ltr"}>
      <header className="flex min-h-18 items-center justify-between gap-4 border-b border-white/8 px-5 py-4"><div className="flex items-center gap-3">{props.selectedId && <button onClick={props.onBack} aria-label={isArabic ? "العودة للجلسات" : "Back"} className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-white/60 lg:hidden">{isArabic ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}</button>}<div><h2 className="text-lg font-bold">{props.selectedId ? (isArabic ? "خريطة رحلة الزائر" : "Visitor journey") : (isArabic ? "الزيارات والمستخدمون" : "Visits and users")}</h2><p className="mt-1 text-xs text-white/35">{isArabic ? "اختر زيارة لمشاهدة كل خطوة ونقرة" : "Select a visit to inspect every step"}</p></div></div><button onClick={props.onClose} aria-label={isArabic ? "إغلاق" : "Close"} className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-white"><X size={20} /></button></header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[390px_minmax(0,1fr)]">
        <div className={`${props.selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-white/8 lg:border-e`}>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{props.loading ? <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[#d5a93f]" size={24} /></div> : props.sessions.length === 0 ? <Empty label={isArabic ? "لا توجد زيارات في هذه الفترة" : "No visits in this period"} /> : <div className="space-y-2">{props.sessions.map((session) => <SessionRow key={session.id} session={session} language={props.language} active={props.selectedId === session.id} onClick={() => props.onSelect(session.id)} />)}</div>}</div>
          <div className="flex items-center justify-between border-t border-white/8 p-3"><button disabled={props.page <= 1 || props.loading} onClick={() => props.onPage(props.page - 1)} className="flex h-10 items-center gap-1 rounded-lg bg-white/5 px-3 text-xs disabled:opacity-30">{isArabic ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}{isArabic ? "السابق" : "Previous"}</button><span className="text-xs text-white/35">{props.page} / {props.totalPages}</span><button disabled={props.page >= props.totalPages || props.loading} onClick={() => props.onPage(props.page + 1)} className="flex h-10 items-center gap-1 rounded-lg bg-white/5 px-3 text-xs disabled:opacity-30">{isArabic ? "التالي" : "Next"}{isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button></div>
        </div>
        <div className={`${props.selectedId ? "flex" : "hidden lg:flex"} min-h-0 flex-col overflow-y-auto`}>{!props.selectedId ? <div className="flex h-full flex-col items-center justify-center px-6 text-center"><Route size={42} className="mb-4 text-[#d5a93f]/35" /><p className="font-bold text-white/55">{isArabic ? "اختر زيارة من القائمة" : "Select a visit"}</p><p className="mt-2 text-xs text-white/25">{isArabic ? "ستظهر رحلة الزائر من أول صفحة حتى الاتجاهات والحجز." : "The full visitor journey will appear here."}</p></div> : props.detailLoading ? <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[#d5a93f]" size={28} /></div> : props.detail ? <JourneyDetail detail={props.detail} language={props.language} /> : <Empty label={isArabic ? "تعذر تحميل تفاصيل الزيارة" : "Could not load this visit"} />}</div>
      </div>
    </section>
  </div>;
}

function SessionRow({ session, language, active, onClick }: { session: SessionSummary; language: Language; active: boolean; onClick: () => void }) {
  const isArabic = language === "ar"; const Device = session.device === "mobile" ? Smartphone : session.device === "tablet" ? Tablet : Monitor;
  return <button onClick={onClick} className={`w-full rounded-xl border p-4 text-start transition ${active ? "border-[#d5a93f]/40 bg-[#d5a93f]/8" : "border-white/7 bg-white/[.025] hover:border-white/15"}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${session.isAuthenticated ? "bg-emerald-400/10 text-emerald-400" : "bg-white/5 text-white/40"}`}>{session.isAuthenticated ? <UserRoundCheck size={18} /> : <User size={18} />}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white/80">{session.userName}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-white/30"><Device size={12} />{cityLabel(session.city, language)}</p></div></div><time className="shrink-0 text-[10px] text-white/25">{new Date(session.startedAt).toLocaleTimeString(isArabic ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</time></div><div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white/8"><RowStat label={isArabic ? "نقرات" : "Clicks"} value={session.clicks} /><RowStat label={isArabic ? "صفحات" : "Pages"} value={session.pageViews} /><RowStat label={isArabic ? "المدة" : "Duration"} value={formatDuration(session.durationSeconds, language)} /></div></button>;
}

function RowStat({ label, value }: { label: string; value: string | number }) { return <div className="bg-[#181818] px-2 py-2 text-center"><p className="font-mono text-xs font-bold text-white/70">{value}</p><p className="mt-1 text-[9px] text-white/25">{label}</p></div>; }

function JourneyDetail({ detail, language }: { detail: SessionDetail; language: Language }) {
  const isArabic = language === "ar";
  const events = detail.journey.filter((event) => event.type === "page_view" || event.type === "entity_open" || event.type === "map_click" || (event.type === "platform_click" && typeof event.metadata.action === "string"));
  return <div className="p-4 sm:p-6"><div className="rounded-xl border border-white/8 bg-white/[.025] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-lg ${detail.session.isAuthenticated ? "bg-emerald-400/10 text-emerald-400" : "bg-white/5 text-white/45"}`}>{detail.session.isAuthenticated ? <UserRoundCheck size={20} /> : <User size={20} />}</span><div><h3 className="font-bold text-white/85">{detail.session.userName}</h3><p className="mt-1 text-xs text-white/30">{cityLabel(detail.session.city, language)} · {deviceLabel(detail.session.device, language)}</p></div></div><div className="flex flex-wrap gap-2"><SummaryPill label={isArabic ? "نقرات" : "Clicks"} value={formatNumber(detail.session.clicks)} /><SummaryPill label={isArabic ? "صفحات" : "Pages"} value={formatNumber(detail.session.pageViews)} /><SummaryPill label={isArabic ? "مدة" : "Duration"} value={formatDuration(detail.session.durationSeconds, language)} /></div></div></div>
    <div className="mt-6 flex items-center justify-between gap-4"><div><h3 className="flex items-center gap-2 font-bold"><Route size={18} className="text-[#d5a93f]" />{isArabic ? "مسار الحركة داخل المنصة" : "Journey through the platform"}</h3><p className="mt-1 text-xs text-white/30">{new Date(detail.session.startedAt).toLocaleString(isArabic ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</p></div><span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/30">{events.length} {isArabic ? "خطوة" : "steps"}</span></div>
    {events.length === 0 ? <Empty label={isArabic ? "لا توجد خطوات مسجلة" : "No journey steps"} /> : <ol className="relative mt-6 space-y-0 before:absolute before:bottom-5 before:top-5 before:w-px before:bg-white/10 before:content-[''] rtl:before:right-[19px] ltr:before:left-[19px]">{events.map((event, index) => <JourneyStep key={event.id} event={event} previous={events[index - 1]} language={language} />)}</ol>}</div>;
}

function JourneyStep({ event, previous, language }: { event: JourneyEvent; previous?: JourneyEvent; language: Language }) {
  const view = journeyPresentation(event, language); const Icon = view.icon;
  const delta = previous ? Math.max(0, Math.round((new Date(event.occurredAt).getTime() - new Date(previous.occurredAt).getTime()) / 1000)) : 0;
  return <li className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-3 pb-5 last:pb-0"><span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border ${view.tone}`}><Icon size={16} /></span><div className="min-w-0 rounded-xl border border-white/7 bg-white/[.025] p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold text-white/80">{view.title}</p>{view.detail && <p className="mt-1 truncate text-xs text-white/35">{view.detail}</p>}</div><time className="shrink-0 font-mono text-[10px] text-white/25">{new Date(event.occurredAt).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div>{delta > 0 && <p className="mt-2 text-[10px] text-[#d5a93f]/55">{language === "ar" ? `بعد ${formatDuration(delta, language)}` : `${formatDuration(delta, language)} later`}</p>}</div></li>;
}

function journeyPresentation(event: JourneyEvent, language: Language) {
  const ar = language === "ar"; const action = typeof event.metadata.action === "string" ? event.metadata.action : null;
  if (action === "directions_click") return { icon: Compass, tone: "border-sky-400/30 bg-sky-400/10 text-sky-400", title: ar ? "ضغط زر الاتجاهات" : "Opened directions", detail: ar ? `انتقل إلى خرائط Google${event.entityName ? ` من ${event.entityName}` : ""}` : `Opened Google Maps${event.entityName ? ` from ${event.entityName}` : ""}` };
  if (action === "booking_start") return { icon: LogIn, tone: "border-orange-400/30 bg-orange-400/10 text-orange-400", title: ar ? "بدأ إنشاء حجز" : "Started a booking", detail: event.entityName };
  if (action === "booking_created") return { icon: CheckCircle2, tone: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400", title: ar ? "أنشأ الحجز بنجاح" : "Booking created", detail: event.entityName };
  if (event.type === "entity_open") return { icon: Eye, tone: "border-[#d5a93f]/30 bg-[#d5a93f]/10 text-[#d5a93f]", title: event.entityName ? (ar ? `شاهد: ${event.entityName}` : `Viewed: ${event.entityName}`) : pageLabel(String(event.metadata.target || event.pagePath || ""), language), detail: event.entityName ? (entityConfig[event.entityType || "facility"]?.[language] || null) : null };
  if (event.type === "map_click") { const mapAction = String(event.metadata.action || ""); const title = mapAction === "marker_open" ? (ar ? "ضغط علامة على الخريطة" : "Opened a map marker") : mapAction === "open_details" ? (ar ? "فتح التفاصيل من الخريطة" : "Opened details from map") : mapAction === "search_result" ? (ar ? "اختار نتيجة من بحث الخريطة" : "Selected a map result") : (ar ? "تفاعل مع الخريطة" : "Interacted with the map"); return { icon: MapPinned, tone: "border-violet-400/30 bg-violet-400/10 text-violet-400", title, detail: event.entityName }; }
  return { icon: pageIcon(event.pagePath), tone: "border-white/15 bg-white/5 text-white/55", title: pageLabel(event.pagePath || "/", language), detail: event.pagePath || "/" };
}

function pageLabel(path: string, language: Language) {
  const ar = language === "ar";
  if (path === "/") return ar ? "دخل الصفحة الرئيسية" : "Entered the homepage";
  if (path.startsWith("/facilities")) return ar ? "فتح قسم المرافق" : "Opened facilities";
  if (path.startsWith("/landmarks")) return ar ? "فتح قسم المعالم" : "Opened landmarks";
  if (path.startsWith("/experiences")) return ar ? "فتح قسم التجارب" : "Opened experiences";
  if (path.startsWith("/events")) return ar ? "فتح قسم الفعاليات" : "Opened events";
  if (path === "/map") return ar ? "زار الخريطة" : "Visited the map";
  if (path.startsWith("/service/")) return ar ? "دخل تفاصيل خدمة" : "Opened service details";
  if (path.startsWith("/place/")) return ar ? "دخل تفاصيل معلم" : "Opened landmark details";
  if (path.startsWith("/checkout/")) return ar ? "دخل صفحة الدفع للحجز" : "Opened booking checkout";
  if (path.startsWith("/client/trips")) return ar ? "راجع رحلاته وحجوزاته" : "Viewed trips and bookings";
  if (path.startsWith("/client/dashboard")) return ar ? "دخل لوحة العميل" : "Opened client dashboard";
  if (path.startsWith("/login")) return ar ? "دخل صفحة تسجيل الدخول" : "Opened login";
  return ar ? `زار الصفحة ${path}` : `Visited ${path}`;
}

function pageIcon(path: string | null) { if (path === "/map") return MapPinned; if (path?.startsWith("/checkout")) return CheckCircle2; if (path?.startsWith("/login")) return LogIn; return Eye; }
function deviceLabel(device: string, language: Language) { if (device === "mobile") return language === "ar" ? "جوال" : "Mobile"; if (device === "tablet") return language === "ar" ? "جهاز لوحي" : "Tablet"; if (device === "desktop") return language === "ar" ? "كمبيوتر" : "Desktop"; return language === "ar" ? "غير معروف" : "Unknown"; }
function SummaryPill({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-white/5 px-3 py-2"><p className="text-[9px] text-white/25">{label}</p><p className="mt-1 font-mono text-xs font-bold text-white/70">{value}</p></div>; }
