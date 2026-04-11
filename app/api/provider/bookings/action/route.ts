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
      console.error('Booking fetch error:', bookingError);
      return NextResponse.json(
        { error: 'الحجز غير موجود' },
        { status: 404 }
      );
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', booking.user_id)
      .single();

    if (clientError) {
      console.error('Client fetch error:', clientError);
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, title, name, price')
      .eq('id', booking.service_id)
      .single();

    if (serviceError) {
      console.error('Service fetch error:', serviceError);
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', booking.provider_id)
      .single();

    if (providerError) {
      console.error('Provider fetch error:', providerError);
    }

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
        console.error('Approve update error:', updateError);
        return NextResponse.json(
          { error: updateError?.message || 'فشل قبول الحجز' },
          { status: 500 }
        );
      }

      const paymentPageUrl = `${baseUrl}/checkout?bookingId=${bookingId}`;

      if (client?.email || client?.phone) {
        await fetch(`${baseUrl}/api/emails/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: 'booking_approved_invoice',
            email: client?.email,
            phone: client?.phone,
            data: {
              bookingId: updatedBooking.id,
              clientName: client?.full_name || 'عميل',
              serviceName: service?.title || service?.name || 'خدمة سيّر',
              paymentLink: paymentPageUrl
            }
          })
        }).catch((err) => {
          console.error('Approve email error:', err);
        });
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
      console.error('Reject update error:', rejectError);
      return NextResponse.json(
        { error: rejectError?.message || 'فشل رفض الحجز' },
        { status: 500 }
      );
    }

    if (client?.email || client?.phone) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'booking_rejected',
          email: client?.email,
          phone: client?.phone,
          data: {
            bookingId: rejectedBooking.id,
            clientName: client?.full_name || 'عميل',
            serviceName: service?.title || service?.name || 'خدمة سيّر',
            reason: finalRejectReason
          }
        })
      }).catch((err) => {
        console.error('Reject email error:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تم رفض الحجز وإرسال السبب للعميل',
      booking: rejectedBooking
    });
  } catch (error: any) {
    console.error('Provider Booking Action Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ في معالجة الحجز' },
      { status: 500 }
    );
  }
}