import { NextResponse } from "next/server";
import { requireAdminFromCookies, writeAdminLog } from "@/lib/adminApi";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const admin = await requireAdminFromCookies();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await req.json().catch(() => ({}));
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

  const { data: provider, error: providerError } = await supabaseServer
    .from("profiles")
    .select("id, full_name, email, phone, is_provider")
    .eq("id", codeRow.provider_id)
    .single();

  if (providerError || !provider?.is_provider) {
    return NextResponse.json({ error: "مزود الخدمة غير موجود" }, { status: 404 });
  }

  await writeAdminLog(
    admin.adminId,
    "enter_maintenance_mode",
    `Entered maintenance mode for provider ${provider.id}`
  );

  return NextResponse.json({ providerId: provider.id, provider });
}
