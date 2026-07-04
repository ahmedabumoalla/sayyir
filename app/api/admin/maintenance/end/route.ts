import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { ADMIN_MAINTENANCE_SESSION_COOKIE } from "@/lib/requireProvider";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ADMIN_MAINTENANCE_SESSION_COOKIE)?.value;

  if (sessionId) {
    await supabaseServer
      .from("admin_provider_maintenance_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", sessionId)
      .is("revoked_at", null);
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/admin/maintenance",
  });

  response.cookies.set(ADMIN_MAINTENANCE_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
