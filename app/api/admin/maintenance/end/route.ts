import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabaseServer";
import { ADMIN_MAINTENANCE_SESSION_COOKIE } from "@/lib/requireProvider";

function isAdminProfile(profile: any) {
  const role = String(profile?.role || "").trim().toLowerCase();

  return (
    profile?.is_super_admin === true ||
    profile?.is_admin === true ||
    role === "admin" ||
    role === "super_admin"
  );
}

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ADMIN_MAINTENANCE_SESSION_COOKIE)?.value;
  let redirectTo = "/login";

  if (sessionId) {
    await supabaseServer
      .from("admin_provider_maintenance_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", sessionId)
      .is("revoked_at", null);
  }

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (user?.id) {
    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("id, is_provider, is_admin, is_super_admin, role")
      .eq("id", user.id)
      .maybeSingle();

    if (isAdminProfile(profile)) {
      redirectTo = "/admin/maintenance";
    } else if (profile?.is_provider === true) {
      redirectTo = "/provider/dashboard";
    }
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo,
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
