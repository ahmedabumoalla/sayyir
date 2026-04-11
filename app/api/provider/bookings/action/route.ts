import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, action, rejectReason } = body;

    console.log('PROVIDER BOOKING ACTION INPUT:', { bookingId, action, rejectReason });

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

    console.log('BOOKING FOUND:', booking);

    const { data: client, error: clientError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', booking.user_id)
      .single();

    if (clientError) {
      console.error('CLIENT FETCH ERROR:', clientError);
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, title, name, price')
      .eq('id', booking.service_id)
      .single();

    if (serviceError) {
      console.error('SERVICE FETCH ERROR:', serviceError);
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', booking.provider_id)
      .single();

    if (providerError) {
      console.error('PROVIDER FETCH ERROR:', providerError);
    }

    console.log('CLIENT DATA FOR EMAIL:', client);
    console.log('PROVIDER DATA FOR EMAIL:', provider);
    console.log('SERVICE DATA FOR EMAIL:', service);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    if (action === 'approve') {
      const now = new Date();
      const executionDate = booking.execution_date ? new Date(booking.execution_date) : null;
      let expiresAt = new Date();

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
          rejection_reason: null
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

      const paymentPageUrl = `${baseUrl}/checkout/${bookingId}`;

      if (client?.email || client?.phone) {
        const approvePayload = {
          templateId: 'booking_approved_invoice',
          email: client?.email,
          phone: client?.phone,
          data: {
            bookingId: updatedBooking.id,
            clientName: client?.full_name || 'عميل',
            serviceName: service?.title || service?.name || 'خدمة سيّر',
            paymentLink: paymentPageUrl
          }
        };

        console.log('APPROVE EMAIL REQUEST PAYLOAD:', approvePayload);

        try {
          const emailResponse = await fetch(`${baseUrl}/api/emails/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(approvePayload)
          });

          const emailResult = await emailResponse.json();

          console.log('APPROVE EMAIL RESULT:', emailResult);

          if (!emailResponse.ok) {
            console.error('APPROVE EMAIL FAILED:', emailResult);
          }
        } catch (err) {
          console.error('APPROVE EMAIL FETCH ERROR:', err);
        }
      } else {
        console.error('APPROVE EMAIL SKIPPED: client has no email or phone', client);
      }

      return NextResponse.json({
        success: true,
        message: 'تمت الموافقة على الحجز وإرسال رابط الدفع للعميل',
        booking: updatedBooking
      });
    }

    const finalRejectReason = rejectReason || 'اعتذر المزود عن قبول الحجز';

    const { data: rejectedBooking, error: rejectError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'rejected',
        rejection_reason: finalRejectReason
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

    if (client?.email || client?.phone) {
      const rejectPayload = {
        templateId: 'booking_rejected',
        email: client?.email,
        phone: client?.phone,
        data: {
          bookingId: rejectedBooking.id,
          clientName: client?.full_name || 'عميل',
          serviceName: service?.title || service?.name || 'خدمة سيّر',
          reason: finalRejectReason
        }
      };

      console.log('REJECT EMAIL REQUEST PAYLOAD:', rejectPayload);

      try {
        const rejectEmailResponse = await fetch(`${baseUrl}/api/emails/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rejectPayload)
        });

        const rejectEmailResult = await rejectEmailResponse.json();

        console.log('REJECT EMAIL RESULT:', rejectEmailResult);

        if (!rejectEmailResponse.ok) {
          console.error('REJECT EMAIL FAILED:', rejectEmailResult);
        }
      } catch (err) {
        console.error('REJECT EMAIL FETCH ERROR:', err);
      }
    } else {
      console.error('REJECT EMAIL SKIPPED: client has no email or phone', client);
    }

    return NextResponse.json({
      success: true,
      message: 'تم رفض الحجز وإرسال السبب للعميل',
      booking: rejectedBooking
    });
  } catch (error: any) {
    console.error('PROVIDER BOOKING ACTION ROUTE ERROR:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ في معالجة الحجز' },
      { status: 500 }
    );
  }
}