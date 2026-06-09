import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { assertExperienceSeatsAvailable } from "@/lib/experienceSeats";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transaction = body?.obj;

    if (!transaction) {
      return NextResponse.json(
        { error: "No transaction data" },
        { status: 400 }
      );
    }

    // منع التكرار إذا العملية غير ناجحة
    if (transaction.success !== true) {
      return NextResponse.json({
        success: false,
        message: "عملية دفع غير ناجحة",
      });
    }

    const merchantOrderId = transaction?.order?.merchant_order_id;

    if (!merchantOrderId) {
      return NextResponse.json(
        { error: "merchant_order_id is missing" },
        { status: 400 }
      );
    }

    // استخراج ID الحجز الحقيقي
    let rawBookingId = merchantOrderId;

    if (rawBookingId.startsWith("SAYYIR__")) {
      rawBookingId = rawBookingId.replace("SAYYIR__", "");
    }

    if (rawBookingId.startsWith("SAYYIR-")) {
      rawBookingId = rawBookingId.replace("SAYYIR-", "");
    }

    const bookingId = rawBookingId.split("_")[0];

    // جلب الحجز
    const { data: currentBooking, error: fetchError } =
      await supabaseAdmin
        .from("bookings")
        .select(`
          *,
          users:user_id (
            full_name,
            email,
            phone
          ),
          services:service_id (
            title,
            provider_id
          ),
          profiles:provider_id (
            full_name,
            email,
            phone
          )
        `)
        .eq("id", bookingId)
        .single();

    if (fetchError || !currentBooking) {
      console.error(fetchError);

      return NextResponse.json(
        { error: "الحجز غير موجود" },
        { status: 404 }
      );
    }

    // لو الحجز مدفوع مسبقاً لا تعيد التحديث
    if (
      currentBooking.payment_status === "paid" &&
      currentBooking.status === "confirmed"
    ) {
      return NextResponse.json({
        success: true,
        message: "الحجز مدفوع مسبقاً",
      });
    }

    await assertExperienceSeatsAvailable(
      supabaseAdmin,
      currentBooking.service_id,
      Number(currentBooking.quantity || 1)
    );

    // إنشاء QR ثابت
    const ticketCode =
      currentBooking.ticket_qr_code ||
      crypto.randomUUID();

    // تحديث الحجز
    const { data: updatedBooking, error: updateError } =
      await supabaseAdmin
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",

          ticket_qr_code: ticketCode,

          is_ticket_used: false,
          ticket_used_at: null,

          admin_notes: `تم الدفع عبر Paymob | Transaction ID: ${
            transaction?.id || ""
          }`,
        })
        .eq("id", bookingId)
        .select(`
          *,
          users:user_id (
            full_name,
            email,
            phone
          ),
          services:service_id (
            title,
            provider_id
          ),
          profiles:provider_id (
            full_name,
            email,
            phone
          )
        `)
        .single();

    if (updateError || !updatedBooking) {
      console.error(updateError);

      return NextResponse.json(
        { error: "فشل تحديث الحجز" },
        { status: 500 }
      );
    }

    const clientInfo = updatedBooking.users;
    const serviceInfo = updatedBooking.services;
    const providerInfo = updatedBooking.profiles;

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(request.url).origin;

    // رابط التذكرة
    const ticketUrl = `${baseUrl}/client/trips/${updatedBooking.id}`;

    // إشعار العميل
    if (clientInfo?.email) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: "booking_payment_confirmed",
          email: clientInfo.email,
          phone: clientInfo.phone,

          data: {
            bookingId: updatedBooking.id,

            clientName: clientInfo.full_name,

            serviceName:
              serviceInfo?.title || "خدمة سيّر",

            ticketCode,

            ticketUrl,

            ticketCodeShort: String(ticketCode).slice(0, 16),

            totalPrice: `${
              updatedBooking.final_price ||
              updatedBooking.total_price ||
              0
            } ريال`,
          },
        }),
      }).catch((err) => {
        console.error("فشل إرسال إيميل العميل:", err);
      });
    }

    // إشعار المزود
    if (providerInfo?.email) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: "provider_payment_received",
          email: providerInfo.email,
          phone: providerInfo.phone,

          data: {
            bookingId: updatedBooking.id,

            providerName:
              providerInfo.full_name,

            clientName:
              clientInfo?.full_name || "",

            serviceName:
              serviceInfo?.title || "خدمة سيّر",

            guests:
              updatedBooking.quantity ||
              updatedBooking.number_of_guests ||
              1,

            totalPrice: `${
              updatedBooking.final_price ||
              updatedBooking.total_price ||
              0
            } ريال`,
          },
        }),
      }).catch((err) => {
        console.error("فشل إرسال إيميل المزود:", err);
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم تأكيد الدفع بنجاح",
      bookingId: updatedBooking.id,
      ticketCode,
    });

  } catch (error: any) {
    console.error("Webhook Error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Server Error",
      },
      { status: 500 }
    );
  }
}