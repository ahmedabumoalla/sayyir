import { NextResponse } from "next/server";
import { requireAdminByRequesterId, writeAdminLog } from "@/lib/adminApi";
import { supabaseServer } from "@/lib/supabaseServer";
import { ADMIN_MAINTENANCE_SESSION_COOKIE } from "@/lib/requireProvider";

async function getProviderLinkState(providerId: string) {
  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("id")
    .eq("id", providerId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const { count: servicesCount, error: servicesError } = await supabaseServer
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", providerId);

  if (servicesError) {
    throw servicesError;
  }

  return Boolean(profile?.id || (servicesCount || 0) > 0);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requesterId = String(body.requesterId || "").trim();
  const admin = await requireAdminByRequesterId(requesterId);

  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const maintenanceCode = String(body.maintenanceCode || "").replace(/\D/g, "");

  if (!maintenanceCode) {
    return NextResponse.json({ error: "رقم الصيانة مطلوب" }, { status: 400 });
  }

  const { data: codeRow, error: codeError } = await supabaseServer
    .from("provider_maintenance_codes")
    .select("id, provider_id, maintenance_code")
    .eq("maintenance_code", maintenanceCode)
    .single();

  if (codeError || !codeRow) {
    return NextResponse.json({ error: "رقم الصيانة غير صحيح" }, { status: 404 });
  }

  const providerId = String(codeRow.provider_id || "").trim();
  const isLinkedProvider = await getProviderLinkState(providerId);

  if (!isLinkedProvider) {
    return NextResponse.json(
      { error: "provider_not_found_or_not_linked" },
      { status: 404 }
    );
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const { data: sessionRow, error: sessionError } = await supabaseServer
    .from("admin_provider_maintenance_sessions")
    .insert({
      admin_id: admin.adminId,
      provider_id: providerId,
      maintenance_code_id: codeRow.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (sessionError || !sessionRow) {
    return NextResponse.json(
      { error: sessionError?.message || "تعذر إنشاء جلسة الصيانة" },
      { status: 500 }
    );
  }

  await writeAdminLog(
    admin.adminId,
    "start_provider_maintenance_session",
    `Started provider maintenance session for provider ${providerId}`
  );

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/provider/dashboard",
  });

  response.cookies.set(ADMIN_MAINTENANCE_SESSION_COOKIE, sessionRow.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
