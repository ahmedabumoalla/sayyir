import { NextResponse } from "next/server";
import { requireAnalyticsAdmin } from "@/lib/analyticsAdminAuth";
import { supabaseServer } from "@/lib/supabaseServer";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAnalyticsAdmin(request);
  if ("response" in admin) return admin.response;

  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseServer
    .from("analytics_sessions")
    .select("*")
    .eq("session_id", id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const { data: eventRows, error: eventsError } = await supabaseServer
    .from("analytics_events")
    .select("id, event_type, occurred_at, page_path, entity_type, entity_id, entity_name, metadata")
    .eq("session_id", id)
    .order("occurred_at", { ascending: true })
    .limit(500);

  if (eventsError) {
    return NextResponse.json({ error: "journey_query_failed" }, { status: 500 });
  }

  const events = eventRows || [];
  let userId: string | null = null;
  for (const event of events) {
    const metadata = getMetadata(event.metadata);
    if (typeof metadata.user_id === "string") {
      userId = metadata.user_id;
      break;
    }
  }

  let userName: string | null = null;
  if (userId) {
    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    userName = profile?.full_name || "مستخدم مسجل";
  }

  const journey = events.map((event) => ({
    id: String(event.id),
    type: event.event_type,
    occurredAt: event.occurred_at,
    pagePath: event.page_path,
    entityType: event.entity_type,
    entityId: event.entity_id,
    entityName: event.entity_name,
    metadata: getMetadata(event.metadata),
  }));

  if (userId) {
    const sessionEnd = new Date(
      Math.max(
        new Date(session.last_seen_at).getTime(),
        new Date(session.started_at).getTime() + Number(session.duration_seconds || 0) * 1000
      ) + 5 * 60 * 1000
    ).toISOString();

    const { data: bookings } = await supabaseServer
      .from("bookings")
      .select("id, created_at, status, payment_status, service_id, services:service_id(title)")
      .eq("user_id", userId)
      .gte("created_at", session.started_at)
      .lte("created_at", sessionEnd)
      .order("created_at", { ascending: true });

    for (const booking of bookings || []) {
      const alreadyTracked = journey.some(
        (event) => event.metadata.booking_id === booking.id
      );
      if (alreadyTracked) continue;

      const relatedService = Array.isArray(booking.services)
        ? booking.services[0]
        : booking.services;

      journey.push({
        id: `booking-${booking.id}`,
        type: "platform_click",
        occurredAt: booking.created_at,
        pagePath: null,
        entityType: "facility",
        entityId: booking.service_id,
        entityName: relatedService?.title || "حجز",
        metadata: {
          action: "booking_created",
          booking_id: booking.id,
          booking_status: booking.status,
          payment_status: booking.payment_status,
          user_id: userId,
          source: "bookings_table",
        },
      });
    }
  }

  journey.sort(
    (first, second) =>
      new Date(first.occurredAt).getTime() - new Date(second.occurredAt).getTime()
  );

  const visitorCode = String(session.visitor_id).replaceAll("-", "").slice(0, 6).toUpperCase();
  const clicks = events.filter(
    (event) => event.event_type === "platform_click" || event.event_type === "map_click"
  ).length;

  return NextResponse.json({
    session: {
      id: session.session_id,
      userId,
      userName: userName || `زائر #${visitorCode}`,
      isAuthenticated: Boolean(userId),
      city: session.city || "غير معروف",
      device: session.device_type || "unknown",
      startedAt: session.started_at,
      lastSeenAt: session.last_seen_at,
      durationSeconds: session.duration_seconds || 0,
      pageViews: session.page_views || 0,
      clicks,
      mapViews: session.map_views || 0,
      landingPage: session.landing_page || "/",
    },
    journey,
  });
}

