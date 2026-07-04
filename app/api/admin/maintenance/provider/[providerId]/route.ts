import { NextResponse } from "next/server";
import { requireAdminFromCookies } from "@/lib/adminApi";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  _req: Request,
  context: { params: any }
) {
  const admin = await requireAdminFromCookies();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { providerId } = await context.params;

  const { data: provider, error: providerError } = await supabaseServer
    .from("profiles")
    .select("id, full_name, email, phone, city, is_provider, created_at")
    .eq("id", providerId)
    .single();

  if (providerError || !provider?.is_provider) {
    return NextResponse.json({ error: "مزود الخدمة غير موجود" }, { status: 404 });
  }

  const { data: services, error: servicesError } = await supabaseServer
    .from("services")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (servicesError) {
    return NextResponse.json({ error: servicesError.message }, { status: 500 });
  }

  return NextResponse.json({ provider, services: services || [] });
}
