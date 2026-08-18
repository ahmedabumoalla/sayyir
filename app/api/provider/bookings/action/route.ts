import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireProvider } from '@/lib/requireProvider';
import { getInternalNotificationHeaders } from '@/lib/notificationAuth';
import {
  ensureProfileWhatsApp,
  whatsappGuardStatus,
} from '@/lib/whatsappProfile';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const { provider, error: providerAuthError } = await requireProvider(request);

    if (providerAuthError || !provider) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const providerWhatsApp = await ensureProfileWhatsApp(provider);
    if (!providerWhatsApp.ok) {
      return NextResponse.json(providerWhatsApp, {
        status: whatsappGuardStatus(providerWhatsApp),
      });
    }

    const body = await request.json();
    const { bookingId, action, rejectReason } = body;

    console.log('PROVIDER BOOKING ACTION INPUT:', {
      bookingId,
      action,
      rejectReason,
      providerId: provider.id,
    });

    if (!bookingId || !action) {
      return NextResponse.json(
        { error: 'bookingId و action مطلوبة' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action يجب أن تكون approve أو reject' },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('BOOKING FETCH ERROR:', bookingError);
      return NextResponse.json(
        { error: 'الحجز غير موجود' },
        { status: 404 }
      );
    }

    if (booking.provider_id !== provider.id) {
      return NextResponse.json(
        { error: 'لا تملك صلاحية اتخاذ إجراء على هذا الحجز' },
        { status: 403 }
      );
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'لا يمكن اتخاذ إجراء على حجز ليس في انتظار موافقة المزود' },
        { status: 400 }
      );
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', booking.user_id)
      .single();

    if (clientError) {
      console.error('CLIENT FETCH ERROR:', clientError);
    }

    if (!client) {
      return NextResponse.json({ error: 'بيانات العميل غير موجودة' }, { status: 404 });
    }

    const clientWhatsApp = await ensureProfileWhatsApp(client);
    if (!clientWhatsApp.ok) {
      return NextResponse.json(
        {
          error: 'لا يمكن اتخاذ القرار لأن العميل لا يملك رقم واتساب صالحاً محفوظاً.',
          code: 'CLIENT_WHATSAPP_UNAVAILABLE',
        },
        { status: clientWhatsApp.code === 'WHATSAPP_CHECK_FAILED' ? 503 : 409 }
      );
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, title, name, price')
      .eq('id', booking.service_id)
      .single();

    if (serviceError) {
      console.error('SERVICE FETCH ERROR:', serviceError);
    }

    const { data: providerProfile, error: providerError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', booking.provider_id)
      .single();

    if (providerError) {
      console.error('PROVIDER FETCH ERROR:', providerError);
    }

    const currentOrigin = new URL(request.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || currentOrigin;

    if (action === 'approve') {
      const now = new Date();
      const executionDate = booking.execution_date ? new Date(booking.execution_date) : null;
      const expiresAt = new Date();

      if (executionDate) {
        const diffInHours = (executionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffInHours <= 3 && diffInHours > 0) {
          expiresAt.setHours(expiresAt.getHours() + 1);
        } else {
          expiresAt.setHours(expiresAt.getHours() + 24);
        }
      } else {
        expiresAt.setHours(expiresAt.getHours() + 24);
      }

      const { data: updatedBooking, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'approved_unpaid',
          expires_at: expiresAt.toISOString(),
          rejection_reason: null,
        })
        .eq('id', bookingId)
        .select('*')
        .single();

      if (updateError || !updatedBooking) {
        console.error('APPROVE UPDATE ERROR:', updateError);
        return NextResponse.json(
          { error: updateError?.message || 'فشل قبول الحجز' },
          { status: 500 }
        );
      }

      const paymentUrl = `${baseUrl}/checkout/${updatedBooking.id}`;

      let notificationSucceeded = false;
      let notificationResult: unknown = null;
      if (client?.email || clientWhatsApp.phone) {
        const approvePayload = {
          templateId: 'booking_approved_invoice',
          email: client?.email,
          phone: clientWhatsApp.phone,
          data: {
            bookingId: updatedBooking.id.split('-')[0].toUpperCase(),
            clientName: client?.full_name || 'عميل',
            serviceName: service?.title || service?.name || 'خدمة سيّر',
            providerName: providerProfile?.full_name || 'مزود الخدمة',
            checkIn: updatedBooking.check_in || updatedBooking.booking_date || '',
            checkOut: updatedBooking.check_out || '',
            date: updatedBooking.booking_date || updatedBooking.check_in || '',
            time: updatedBooking.booking_time || '',
            guests: updatedBooking.quantity || 1,
            quantity: updatedBooking.quantity || 1,
            totalPrice: `${Number(updatedBooking.total_price || 0)} ريال`,
            expiresAt: updatedBooking.expires_at,
            paymentLink: paymentUrl,
          },
        };

        try {
          const emailResponse = await fetch(`${baseUrl}/api/emails/send`, {
            method: 'POST',
            headers: getInternalNotificationHeaders(),
            body: JSON.stringify(approvePayload),
          });

          const emailResult = await emailResponse.json();
          notificationResult = emailResult;
          notificationSucceeded =
            emailResponse.ok && emailResult?.success === true;

          console.log('APPROVE EMAIL RESULT:', emailResult);

          if (!emailResponse.ok) {
            console.error('APPROVE EMAIL FAILED:', emailResult);
          }
        } catch (err) {
          console.error('APPROVE EMAIL FETCH ERROR:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: notificationSucceeded
          ? 'تمت الموافقة على الحجز وإرسال رابط الدفع للعميل على واتساب.'
          : 'تمت الموافقة على الحجز، لكن تعذر إرسال رابط الدفع على واتساب.',
        booking: updatedBooking,
        notificationStatus: {
          whatsapp: notificationSucceeded ? 'sent' : 'failed',
          result: notificationResult,
        },
      });
    }

    const finalRejectReason = rejectReason || 'اعتذر المزود عن قبول الحجز';

    const { data: rejectedBooking, error: rejectError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'rejected',
        rejection_reason: finalRejectReason,
      })
      .eq('id', bookingId)
      .select('*')
      .single();

    if (rejectError || !rejectedBooking) {
      console.error('REJECT UPDATE ERROR:', rejectError);
      return NextResponse.json(
        { error: rejectError?.message || 'فشل رفض الحجز' },
        { status: 500 }
      );
    }

    let notificationSucceeded = false;
    let notificationResult: unknown = null;
    if (client?.email || clientWhatsApp.phone) {
      const rejectPayload = {
        templateId: 'booking_rejected',
        email: client?.email,
        phone: clientWhatsApp.phone,
        data: {
          bookingId: rejectedBooking.id.split('-')[0].toUpperCase(),
          clientName: client?.full_name || 'عميل',
          serviceName: service?.title || service?.name || 'خدمة سيّر',
          providerName: providerProfile?.full_name || 'مزود الخدمة',
          reason: finalRejectReason,
          checkIn: rejectedBooking.check_in || rejectedBooking.booking_date || '',
          checkOut: rejectedBooking.check_out || '',
          date: rejectedBooking.booking_date || rejectedBooking.check_in || '',
          time: rejectedBooking.booking_time || '',
          guests: rejectedBooking.quantity || 1,
          quantity: rejectedBooking.quantity || 1,
          totalPrice: `${Number(rejectedBooking.total_price || 0)} ريال`,
        },
      };

      try {
        const rejectEmailResponse = await fetch(`${baseUrl}/api/emails/send`, {
          method: 'POST',
          headers: getInternalNotificationHeaders(),
          body: JSON.stringify(rejectPayload),
        });

        const rejectEmailResult = await rejectEmailResponse.json();
        notificationResult = rejectEmailResult;
        notificationSucceeded =
          rejectEmailResponse.ok && rejectEmailResult?.success === true;

        console.log('REJECT EMAIL RESULT:', rejectEmailResult);

        if (!rejectEmailResponse.ok) {
          console.error('REJECT EMAIL FAILED:', rejectEmailResult);
        }
      } catch (err) {
        console.error('REJECT EMAIL FETCH ERROR:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: notificationSucceeded
        ? 'تم رفض الحجز وإرسال السبب للعميل على واتساب.'
        : 'تم رفض الحجز، لكن تعذر إرسال السبب على واتساب.',
      booking: rejectedBooking,
      notificationStatus: {
        whatsapp: notificationSucceeded ? 'sent' : 'failed',
        result: notificationResult,
      },
    });
  } catch (error: any) {
    console.error('PROVIDER BOOKING ACTION ROUTE ERROR:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ في معالجة الحجز' },
      { status: 500 }
    );
  }
}
