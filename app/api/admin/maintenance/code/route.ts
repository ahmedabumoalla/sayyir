import { NextRequest, NextResponse } from "next/server";
import { requireAdminByRequesterId, writeAdminLog } from "@/lib/adminApi";
import { supabaseServer } from "@/lib/supabaseServer";

function makeMaintenanceCode() {
  const length = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0 ? 6 : 8;
  const max = 10 ** length;
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % max;
  return value.toString().padStart(length, "0");
}

async function generateUniqueCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const maintenanceCode = makeMaintenanceCode();
    const { data } = await supabaseServer
      .from("provider_maintenance_codes")
      .select("id")
      .eq("maintenance_code", maintenanceCode)
      .maybeSingle();

    if (!data) return maintenanceCode;
  }

  throw new Error("تعذر إنشاء رقم صيانة فريد");
}

export async function GET(req: NextRequest) {
  const requesterId = req.nextUrl.searchParams.get("requesterId") || "";
  const admin = await requireAdminByRequesterId(requesterId);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const providerIdsParam = req.nextUrl.searchParams.get("providerIds") || "";
  const providerIds = providerIdsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (providerIds.length === 0) {
    return NextResponse.json({ codes: [] });
  }

  const { data, error } = await supabaseServer
    .from("provider_maintenance_codes")
    .select("provider_id, maintenance_code")
    .in("provider_id", providerIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data || [] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requesterId = String(body.requesterId || "").trim();
  const admin = await requireAdminByRequesterId(requesterId);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const providerId = String(body.providerId || "").trim();

  if (!providerId) {
    return NextResponse.json({ error: "providerId مطلوب" }, { status: 400 });
  }

  const { data: provider, error: providerError } = await supabaseServer
    .from("profiles")
    .select("id, full_name, email, is_provider")
    .eq("id", providerId)
    .single();

  if (providerError || !provider?.is_provider) {
    return NextResponse.json({ error: "مزود الخدمة غير موجود" }, { status: 404 });
  }

  const { data: existing, error: existingError } = await supabaseServer
    .from("provider_maintenance_codes")
    .select("provider_id, maintenance_code")
    .eq("provider_id", providerId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ code: existing.maintenance_code });
  }

  const maintenanceCode = await generateUniqueCode();
  const { data: created, error: insertError } = await supabaseServer
    .from("provider_maintenance_codes")
    .insert({
      provider_id: providerId,
      maintenance_code: maintenanceCode,
    })
    .select("provider_id, maintenance_code")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await writeAdminLog(
    admin.adminId,
    "create_maintenance_code",
    `Created maintenance code for provider ${providerId}`
  );

  return NextResponse.json({ code: created.maintenance_code });
}
