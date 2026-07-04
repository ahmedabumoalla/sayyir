import { NextResponse } from "next/server";
import { requireAdminByRequesterId, writeAdminLog } from "@/lib/adminApi";
import { supabaseServer } from "@/lib/supabaseServer";

async function getProviderLinkState(providerId: string) {
  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("id, full_name, email, phone, is_provider")
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

  return {
    profile,
    servicesCount: servicesCount || 0,
    isLinked: Boolean(profile?.id || (servicesCount || 0) > 0),
  };
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

  const { data: codeRow, error } = await supabaseServer
    .from("provider_maintenance_codes")
    .select("provider_id, maintenance_code")
    .eq("maintenance_code", maintenanceCode)
    .single();

  if (error || !codeRow) {
    return NextResponse.json({ error: "رقم الصيانة غير صحيح" }, { status: 404 });
  }

  const providerId = String(codeRow.provider_id || "").trim();
  const providerState = await getProviderLinkState(providerId);

  if (!providerState.isLinked) {
    return NextResponse.json(
      { error: "provider_not_found_or_not_linked" },
      { status: 404 }
    );
  }

  await writeAdminLog(
    admin.adminId,
    "enter_maintenance_mode",
    `Entered maintenance mode for provider ${providerId}`
  );

  return NextResponse.json({ providerId });
}
