import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireProvider } from "@/lib/requireProvider";

export async function GET(req: Request) {
  try {
    const { provider, error } = await requireProvider(req);

    if (error || !provider) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "active";

    let query = supabaseServer
      .from("bookings")
      .select("*")
      .eq("provider_id", provider.id)
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("status", "pending");
    }

    if (filter === "active") {
      query = query.in("status", ["confirmed", "approved_unpaid"]);
    }

    if (filter === "history") {
      query = query.in("status", ["rejected", "cancelled", "expired", "completed"]);
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    const bookingRows = bookings || [];

    const clientIds = Array.from(
      new Set(
        bookingRows
          .map((booking) => booking.user_id)
          .filter(Boolean)
      )
    );

    const serviceIds = Array.from(
      new Set(
        bookingRows
          .map((booking) => booking.service_id)
          .filter(Boolean)
      )
    );

    const { data: clients, error: clientsError } = clientIds.length
      ? await supabaseServer
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url")
          .in("id", clientIds)
      : { data: [], error: null };

    if (clientsError) {
      return NextResponse.json({ error: clientsError.message }, { status: 500 });
    }

    const { data: services, error: servicesError } = serviceIds.length
      ? await supabaseServer
          .from("services")
          .select("*")
          .in("id", serviceIds)
      : { data: [], error: null };

    if (servicesError) {
      return NextResponse.json({ error: servicesError.message }, { status: 500 });
    }

    const clientsMap = new Map((clients || []).map((client) => [client.id, client]));
    const servicesMap = new Map((services || []).map((service) => [service.id, service]));

    const formattedBookings = bookingRows.map((booking) => ({
      ...booking,
      profiles: clientsMap.get(booking.user_id) || null,
      services: servicesMap.get(booking.service_id) || null,
    }));

    return NextResponse.json({
      success: true,
      bookings: formattedBookings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "حدث خطأ في جلب الحجوزات" },
      { status: 500 }
    );
  }
}