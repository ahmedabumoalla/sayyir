import { NextResponse } from "next/server";
import { requireAdminByRequesterId } from "@/lib/adminApi";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  req: Request,
  context: { params: any }
) {
  const requesterId = new URL(req.url).searchParams.get("requesterId") || "";
  const admin = await requireAdminByRequesterId(requesterId);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { providerId } = await context.params;

  const { data: provider, error: providerError } = await supabaseServer
    .from("profiles")
    .select("id, full_name, email, phone, city, is_provider, created_at")
    .eq("id", providerId)
    .maybeSingle();

  const { data: services, error: servicesError } = await supabaseServer
    .from("services")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (servicesError) {
    return NextResponse.json({ error: servicesError.message }, { status: 500 });
  }

  const providerServices = services || [];

  if ((providerError || !provider) && providerServices.length === 0) {
    return NextResponse.json(
      { error: "provider_not_found_or_not_linked" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    provider:
      provider || {
        id: providerId,
        full_name: "مزود خدمة",
        email: null,
        phone: null,
        city: null,
        is_provider: true,
        created_at: null,
      },
    services: providerServices,
  });
}
