import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { ticketCode, providerId } = body;

    if (!ticketCode || !providerId) {
      return NextResponse.json(
        { success: false, message: "بيانات ناقصة" },
        { status: 400 }
      );
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          title,
          provider_id
        )
      `)
      .eq("ticket_qr_code", ticketCode)
      .single();

    if (error || !booking) {
      return NextResponse.json({
        success: false,
        message: "التذكرة غير موجودة"
      });
    }

    // التحقق من ملكية المزود
    if (booking.provider_id !== providerId) {
      return NextResponse.json({
        success: false,
        message: "هذه التذكرة لا تتبع لخدماتك"
      });
    }

    // لازم تكون مدفوعة
    if (booking.payment_status !== "paid") {
      return NextResponse.json({
        success: false,
        message: "الحجز غير مدفوع"
      });
    }

    // لازم تكون مؤكدة
    if (booking.status !== "confirmed") {
      return NextResponse.json({
        success: false,
        message: "الحجز غير مؤكد"
      });
    }

    // مستخدمة مسبقاً
    if (booking.is_ticket_used) {
      return NextResponse.json({
        success: false,
        message: "تم استخدام هذه التذكرة مسبقاً"
      });
    }

    // اعتماد التذكرة
    await supabase
      .from("bookings")
      .update({
        is_ticket_used: true,
        ticket_used_at: new Date().toISOString()
      })
      .eq("id", booking.id);

    return NextResponse.json({
      success: true,
      message: "تم اعتماد التذكرة بنجاح",
      service: booking.services?.title,
      booking
    });

  } catch (e) {
    return NextResponse.json({
      success: false,
      message: "خطأ داخلي"
    });
  }
}