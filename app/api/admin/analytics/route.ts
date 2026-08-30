import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const allowedRanges = new Map([
  ["7d", 7],
  ["30d", 30],
  ["90d", 90],
]);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("is_admin, is_super_admin")
    .eq("id", authData.user.id)
    .single();

  if (profileError || (!profile?.is_admin && !profile?.is_super_admin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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

  return NextResponse.json({
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    data,
  });
}

