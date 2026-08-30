import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const allowedEventTypes = new Set([
  "session_start",
  "page_view",
  "heartbeat",
  "entity_open",
  "map_click",
  "platform_click",
]);

const allowedEntityTypes = new Set([
  "landmark",
  "facility",
  "experience",
  "event",
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) || null : null;
}

function getLocationHeader(request: Request, names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (!value) continue;
    try {
      return decodeURIComponent(value).slice(0, 120);
    } catch {
      return value.slice(0, 120);
    }
  }
  return null;
}

function getDeviceType(userAgent: string) {
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "cross_site_request" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const eventType = cleanText(body.eventType, 32);
  const sessionId = cleanText(body.sessionId, 36);
  const visitorId = cleanText(body.visitorId, 36);

  if (
    !eventType ||
    !allowedEventTypes.has(eventType) ||
    !sessionId ||
    !visitorId ||
    !uuidPattern.test(sessionId) ||
    !uuidPattern.test(visitorId)
  ) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const entityType = cleanText(body.entityType, 32);
  if (entityType && !allowedEntityTypes.has(entityType)) {
    return NextResponse.json({ error: "invalid_entity_type" }, { status: 400 });
  }

  const rawMetadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {};
  const { user_id: _untrustedUserId, ...clientMetadata } = rawMetadata;
  void _untrustedUserId;

  let authenticatedUserId: string | null = null;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const { data: authData } = await supabaseServer.auth.getUser(token);
    authenticatedUserId = authData.user?.id || null;
  }

  const enrichedMetadata = authenticatedUserId
    ? { ...clientMetadata, user_id: authenticatedUserId }
    : clientMetadata;
  const metadata = JSON.stringify(enrichedMetadata).length <= 2_000 ? enrichedMetadata : {};
  const userAgent = request.headers.get("user-agent") || "";
  const city = getLocationHeader(request, [
    "x-vercel-ip-city",
    "cf-ipcity",
    "x-appengine-city",
  ]);
  const region = getLocationHeader(request, [
    "x-vercel-ip-country-region",
    "cf-region",
  ]);
  const country = getLocationHeader(request, [
    "x-vercel-ip-country",
    "cf-ipcountry",
  ]);

  const { error } = await supabaseServer.rpc("record_platform_analytics_event", {
    p_session_id: sessionId,
    p_visitor_id: visitorId,
    p_event_type: eventType,
    p_page_path: cleanText(body.pagePath, 500),
    p_entity_type: entityType,
    p_entity_id: cleanText(body.entityId, 160),
    p_entity_name: cleanText(body.entityName, 240),
    p_duration_seconds: Math.min(Math.max(Number(body.durationSeconds) || 0, 0), 86_400),
    p_city: city,
    p_region: region,
    p_country: country,
    p_device_type: getDeviceType(userAgent),
    p_referrer_domain: cleanText(body.referrerDomain, 240),
    p_metadata: metadata,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return new NextResponse(null, { status: 204 });
    }
    console.error("Analytics tracking error:", error.code, error.message);
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503 });
  }

  return new NextResponse(null, { status: 204 });
}
