import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertExperienceSeatsAvailable } from '@/lib/experienceSeats';
import { getInternalNotificationHeaders } from '@/lib/notificationAuth';
import { getAuthenticatedUserId } from '@/lib/requireProvider';
import { ensureProfileWhatsApp, whatsappGuardStatus } from '@/lib/whatsappProfile';
import {
  calculateServiceSubtotal,
  validateDiscountCode,
} from '@/lib/server/discounts';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { bookingId, paymentMethod } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'معرف الحجز مفقود.' }, { status: 400 });
    }

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        users:user_id (id, full_name, email, phone),
        services:service_id (*),
        profiles:provider_id (id, full_name, email, phone)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw new Error('الحجز غير موجود');
    }

    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId || authenticatedUserId !== booking.user_id) {
      return NextResponse.json({ error: 'غير مصرح لك بتأكيد هذا الحجز' }, { status: 401 });
    }

    const clientWhatsApp = await ensureProfileWhatsApp(booking.users);
    if (!clientWhatsApp.ok) {
      return NextResponse.json(
        { error: clientWhatsApp.code, code: clientWhatsApp.code, message: clientWhatsApp.message },
        { status: whatsappGuardStatus(clientWhatsApp) }
      );
    }
    const providerWhatsApp = await ensureProfileWhatsApp(booking.profiles);
    if (!providerWhatsApp.ok) {
      return NextResponse.json(
        { error: 'تعذر تأكيد الحجز لأن رقم واتساب المزود غير متاح. تواصل مع الدعم.' },
        { status: providerWhatsApp.code === 'WHATSAPP_CHECK_FAILED' ? 503 : 409 }
      );
    }

    if (booking.status !== 'approved_unpaid') {
      return NextResponse.json(
        { error: 'هذا الحجز غير متاح للدفع حاليًا.' },
        { status: 400 }
      );
    }

    if (booking.expires_at && new Date(booking.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'انتهت مهلة الدفع لهذا الحجز.' },
        { status: 400 }
      );
    }

    const subtotal = calculateServiceSubtotal(
      booking.services,
      booking.quantity ?? 1,
      booking.details?.child_count || 0
    );
    const discount = await validateDiscountCode({
      supabase: supabaseAdmin,
      code: booking.coupon_code,
      service: booking.services,
      bookingDate: booking.booking_date || booking.check_in,
      subtotal,
    });

    if (!discount.valid) {
      return NextResponse.json(
        { error: discount.error || 'كود الخصم غير صالح' },
        { status: 400 }
      );
    }

    if (discount.finalAmount !== 0) {
      return NextResponse.json(
        { error: 'لا يمكن تأكيد هذا الحجز كحجز مجاني.' },
        { status: 400 }
      );
    }

    await assertExperienceSeatsAvailable(
      supabaseAdmin,
      booking.service_id,
      Number(booking.quantity || 1)
    );

    const qrCodeString = `QR-${bookingId.substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: paymentMethod || 'مجاني',
        subtotal,
        discount_amount: discount.discountAmount,
        discount_applied: discount.applied,
        coupon_code: discount.code,
        final_price: 0,
        total_price: 0,
        tax_amount: 0,
        platform_fee: 0,
        provider_earnings: 0,
        ticket_qr_code: qrCodeString,
        is_ticket_used: false
      })
      .eq('id', bookingId);

    if (error) throw error;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

    const notificationRequests: Promise<{ recipient: string; ok: boolean; result: any }>[] = [];

    if (booking.users?.email || clientWhatsApp.phone) {
      notificationRequests.push(fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: getInternalNotificationHeaders(),
        body: JSON.stringify({
          templateId: 'booking_payment_confirmed',
          email: booking.users.email,
          phone: clientWhatsApp.phone,
          data: {
            bookingId: booking.id,
            clientName: booking.users.full_name,
            serviceName: booking.services?.title || 'خدمة سيّر',
            ticketCode: qrCodeString,
            ticketCodeShort: qrCodeString,
            totalPrice: '0 ريال',
            checkIn: booking.check_in || booking.booking_date || '',
            checkOut: booking.check_out || '',
            date: booking.booking_date || booking.check_in || '',
            time: booking.booking_time || '',
            guests: booking.quantity || 1
          }
        })
      }).then(async (response) => ({ recipient: 'client', ok: response.ok, result: await response.json().catch(() => ({})) })));
    }

    if (booking.profiles?.email || providerWhatsApp.phone) {
      notificationRequests.push(fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: getInternalNotificationHeaders(),
        body: JSON.stringify({
          templateId: 'provider_payment_received',
          email: booking.profiles.email,
          phone: providerWhatsApp.phone,
          data: {
            bookingId: booking.id,
            providerName: booking.profiles.full_name,
            clientName: booking.users?.full_name || '',
            clientPhone: clientWhatsApp.phone,
            serviceName: booking.services?.title || 'خدمة سيّر',
            guests: booking.quantity || 1,
            totalPrice: '0 ريال',
            checkIn: booking.check_in || booking.booking_date || '',
            checkOut: booking.check_out || '',
            date: booking.booking_date || booking.check_in || '',
            time: booking.booking_time || ''
          }
        })
      }).then(async (response) => ({ recipient: 'provider', ok: response.ok, result: await response.json().catch(() => ({})) })));
    }

    const notifications = await Promise.allSettled(notificationRequests);
    const notificationsSucceeded =
      notifications.length === 2 &&
      notifications.every((item) => item.status === 'fulfilled' && item.value.ok && item.value.result?.success === true);

    return NextResponse.json({
      success: true,
      notificationStatus: notificationsSucceeded ? 'sent' : 'failed',
      message: notificationsSucceeded
        ? 'تم تأكيد الحجز المجاني وإرسال التذكرة والإشعارات بنجاح.'
        : 'تم تأكيد الحجز المجاني، لكن تعذر إرسال إشعار واحد أو أكثر. تم تسجيل الفشل للمتابعة.',
    });
  } catch (error: any) {
    console.error('Free Checkout Error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
