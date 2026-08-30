import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function requireAnalyticsAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { response: NextResponse.json({ error: "missing_token" }, { status: 401 }) };
  }

  const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !authData.user) {
    return { response: NextResponse.json({ error: "invalid_session" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("is_admin, is_super_admin")
    .eq("id", authData.user.id)
    .single();

  if (profileError || (!profile?.is_admin && !profile?.is_super_admin)) {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return { userId: authData.user.id };
}

