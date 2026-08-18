import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { assertExperienceSeatsAvailable } from "@/lib/experienceSeats";
import { getInternalNotificationHeaders } from "@/lib/notificationAuth";
import { ensureProfileWhatsApp } from "@/lib/whatsappProfile";

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
            id,
            full_name,
            email,
            phone
          ),
          services:service_id (
            title,
            provider_id
          ),
          profiles:provider_id (
            id,
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
            id,
            full_name,
            email,
            phone
          ),
          services:service_id (
            title,
            provider_id
          ),
          profiles:provider_id (
            id,
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
    const [clientWhatsApp, providerWhatsApp] = await Promise.all([
      ensureProfileWhatsApp(clientInfo),
      ensureProfileWhatsApp(providerInfo),
    ]);

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(request.url).origin;

    // رابط التذكرة
    const ticketUrl = `${baseUrl}/client/trips/${updatedBooking.id}`;

    const notificationRequests: Promise<{ recipient: string; ok: boolean; result: any }>[] = [];

    // إشعار العميل
    if (clientInfo?.email || clientWhatsApp.ok) {
      notificationRequests.push(fetch(`${baseUrl}/api/emails/send`, {
        method: "POST",
        headers: {
          ...getInternalNotificationHeaders(),
        },
        body: JSON.stringify({
          templateId: "booking_payment_confirmed",
          email: clientInfo.email,
          phone: clientWhatsApp.ok ? clientWhatsApp.phone : null,

          data: {
            bookingId: updatedBooking.id,

            clientName: clientInfo.full_name,

            serviceName:
              serviceInfo?.title || "خدمة سيّر",

            ticketCode,

            ticketUrl,

            ticketCodeShort: String(ticketCode).slice(0, 16),

            checkIn: updatedBooking.check_in || updatedBooking.booking_date || "",
            checkOut: updatedBooking.check_out || "",
            date: updatedBooking.booking_date || updatedBooking.check_in || "",
            time: updatedBooking.booking_time || "",
            guests: updatedBooking.quantity || 1,

            totalPrice: `${
              updatedBooking.final_price ||
              updatedBooking.total_price ||
              0
            } ريال`,
          },
        }),
      }).then(async (response) => ({ recipient: "client", ok: response.ok, result: await response.json().catch(() => ({})) })));
    }

    // إشعار المزود
    if (providerInfo?.email || providerWhatsApp.ok) {
      notificationRequests.push(fetch(`${baseUrl}/api/emails/send`, {
        method: "POST",
        headers: {
          ...getInternalNotificationHeaders(),
        },
        body: JSON.stringify({
          templateId: "provider_payment_received",
          email: providerInfo.email,
          phone: providerWhatsApp.ok ? providerWhatsApp.phone : null,

          data: {
            bookingId: updatedBooking.id,

            providerName:
              providerInfo.full_name,

            clientName:
              clientInfo?.full_name || "",

            clientPhone: clientWhatsApp.ok ? clientWhatsApp.phone : "",

            serviceName:
              serviceInfo?.title || "خدمة سيّر",

            guests:
              updatedBooking.quantity ||
              updatedBooking.number_of_guests ||
              1,

            checkIn: updatedBooking.check_in || updatedBooking.booking_date || "",
            checkOut: updatedBooking.check_out || "",
            date: updatedBooking.booking_date || updatedBooking.check_in || "",
            time: updatedBooking.booking_time || "",

            totalPrice: `${
              updatedBooking.final_price ||
              updatedBooking.total_price ||
              0
            } ريال`,
          },
        }),
      }).then(async (response) => ({ recipient: "provider", ok: response.ok, result: await response.json().catch(() => ({})) })));
    }

    const notificationResults = await Promise.allSettled(notificationRequests);
    const whatsappNotificationsSucceeded =
      clientWhatsApp.ok &&
      providerWhatsApp.ok &&
      notificationResults.length === 2 &&
      notificationResults.every(
        (item) =>
          item.status === "fulfilled" &&
          item.value.ok &&
          Boolean(item.value.result?.results?.whatsapp)
      );

    return NextResponse.json({
      success: true,
      notificationStatus: whatsappNotificationsSucceeded ? "sent" : "failed",
      message: whatsappNotificationsSucceeded
        ? "تم تأكيد الدفع وإرسال التذكرة والإشعارات بنجاح"
        : "تم تأكيد الدفع، لكن تعذر إرسال إشعار واتساب واحد أو أكثر وتم تسجيل الفشل للمتابعة",
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
