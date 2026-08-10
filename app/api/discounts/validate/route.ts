import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  calculateServiceSubtotal,
  validateDiscountCode,
} from "@/lib/server/discounts";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";

    let serviceId = typeof body.serviceId === "string" ? body.serviceId : "";
    let quantity = 1;
    let childCount = 0;
    let bookingDate = body.bookingDate;

    if (typeof body.bookingId === "string" && body.bookingId) {
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("bookings")
        .select("service_id, quantity, booking_date, check_in, details")
        .eq("id", body.bookingId)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
      }

      serviceId = booking.service_id;
      quantity = Number(booking.quantity ?? 1);
      childCount = Number(booking.details?.child_count || 0);
      bookingDate = booking.booking_date || booking.check_in || bookingDate;
    } else {
      quantity = Number(body.quantity || 1);
      childCount = Number(body.childCount || 0);
    }

    if (!serviceId) {
      return NextResponse.json({ error: "serviceId مطلوب" }, { status: 400 });
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id, provider_id, price, service_category, sub_category, max_capacity, details")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
    }

    // body.subtotal is intentionally ignored. The preview is calculated from DB data.
    const subtotal = calculateServiceSubtotal(service, quantity, childCount);
    const result = await validateDiscountCode({
      supabase: supabaseAdmin,
      code,
      service,
      bookingDate,
      subtotal,
    });

    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      ...result,
      subtotal,
    });
  } catch (error) {
    console.error("DISCOUNT VALIDATION ERROR:", error);
    return NextResponse.json(
      { error: "تعذر التحقق من كود الخصم" },
      { status: 500 }
    );
  }
}
