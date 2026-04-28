import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { requireProvider } from "../../../../lib/requireProvider";

export async function POST(req: Request) {
  try {
    const { provider, error } = await requireProvider(req);
    if (error || !provider) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const { service_id, requested_changes, reason } = body;

    if (!service_id || !requested_changes) {
      return NextResponse.json(
        { error: "service_id و requested_changes مطلوبة" },
        { status: 400 }
      );
    }

    const { data: service, error: serviceError } = await supabaseServer
      .from("services")
      .select("id, provider_id")
      .eq("id", service_id)
      .eq("provider_id", provider.id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "الخدمة غير موجودة أو لا تملك صلاحية عليها" },
        { status: 403 }
      );
    }

    const { data, error: insertError } = await supabaseServer
      .from("service_change_requests")
      .insert({
        service_id,
        provider_id: provider.id,
        requested_changes,
        reason: reason || null,
        status: "pending",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { provider, error } = await requireProvider(req);
    if (error || !provider) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data, error: fetchError } = await supabaseServer
      .from("service_change_requests")
      .select("*")
      .eq("provider_id", provider.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}