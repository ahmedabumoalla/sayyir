import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAnalyticsAdmin } from "@/lib/analyticsAdminAuth";

const allowedRanges = new Map([
  ["7d", 7],
  ["30d", 30],
  ["90d", 90],
]);

export async function GET(request: Request) {
  const admin = await requireAnalyticsAdmin(request);
  if ("response" in admin) return admin.response;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "30d";
  const days = allowedRanges.get(range) || 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseServer.rpc("get_platform_analytics", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) {
    const setupRequired =
      error.code === "PGRST202" ||
      error.code === "42883" ||
      error.message.includes("get_platform_analytics");

    console.error("Admin analytics error:", error.code, error.message);
    return NextResponse.json(
      { error: setupRequired ? "analytics_setup_required" : "analytics_query_failed" },
      { status: setupRequired ? 424 : 500 }
    );
  }

  const { data: actionRows } = await supabaseServer
    .from("analytics_events")
    .select("metadata")
    .eq("event_type", "platform_click")
    .gte("occurred_at", from.toISOString())
    .lt("occurred_at", to.toISOString())
    .limit(10000);

  const actions = {
    directions: 0,
    bookingStarts: 0,
    bookingsCreated: 0,
  };

  for (const row of actionRows || []) {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};

    if (metadata.action === "directions_click") actions.directions += 1;
    if (metadata.action === "booking_start") actions.bookingStarts += 1;
    if (metadata.action === "booking_created") actions.bookingsCreated += 1;
  }

  return NextResponse.json({
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    data: {
      ...(data && typeof data === "object" ? data : {}),
      actions,
    },
  });
}
