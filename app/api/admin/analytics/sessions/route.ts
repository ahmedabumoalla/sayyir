import { NextResponse } from "next/server";
import { requireAnalyticsAdmin } from "@/lib/analyticsAdminAuth";
import { supabaseServer } from "@/lib/supabaseServer";

const allowedRanges = new Map([
  ["7d", 7],
  ["30d", 30],
  ["90d", 90],
]);

function getMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(request: Request) {
  const admin = await requireAnalyticsAdmin(request);
  if ("response" in admin) return admin.response;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "30d";
  const days = allowedRanges.get(range) || 30;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const offset = (page - 1) * pageSize;

  const { data: sessionRows, count, error } = await supabaseServer
    .from("analytics_sessions")
    .select(
      "session_id, visitor_id, started_at, last_seen_at, duration_seconds, page_views, map_views, city, device_type, landing_page",
      { count: "exact" }
    )
    .gte("started_at", from)
    .order("started_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: "sessions_query_failed" }, { status: 500 });
  }

  const rows = sessionRows || [];
  const sessionIds = rows.map((row) => row.session_id);
  const clickCounts = new Map<string, number>();
  const userIdsBySession = new Map<string, string>();

  if (sessionIds.length > 0) {
    const { data: events } = await supabaseServer
      .from("analytics_events")
      .select("session_id, event_type, metadata")
      .in("session_id", sessionIds)
      .in("event_type", ["platform_click", "map_click", "page_view"])
      .limit(5000);

    for (const event of events || []) {
      if (event.event_type === "platform_click" || event.event_type === "map_click") {
        clickCounts.set(event.session_id, (clickCounts.get(event.session_id) || 0) + 1);
      }

      const metadata = getMetadata(event.metadata);
      const userId = typeof metadata.user_id === "string" ? metadata.user_id : null;
      if (userId && !userIdsBySession.has(event.session_id)) {
        userIdsBySession.set(event.session_id, userId);
      }
    }
  }

  const userIds = [...new Set(userIdsBySession.values())];
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseServer
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    for (const profile of profiles || []) {
      names.set(profile.id, profile.full_name || "مستخدم مسجل");
    }
  }

  const sessions = rows.map((row) => {
    const userId = userIdsBySession.get(row.session_id) || null;
    const visitorCode = String(row.visitor_id).replaceAll("-", "").slice(0, 6).toUpperCase();

    return {
      id: row.session_id,
      userId,
      userName: userId ? names.get(userId) || "مستخدم مسجل" : `زائر #${visitorCode}`,
      isAuthenticated: Boolean(userId),
      city: row.city || "غير معروف",
      device: row.device_type || "unknown",
      startedAt: row.started_at,
      lastSeenAt: row.last_seen_at,
      durationSeconds: row.duration_seconds || 0,
      pageViews: row.page_views || 0,
      clicks: clickCounts.get(row.session_id) || 0,
      mapViews: row.map_views || 0,
      landingPage: row.landing_page || "/",
    };
  });

  return NextResponse.json({
    sessions,
    page,
    pageSize,
    total: count || 0,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  });
}

