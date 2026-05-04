import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const success = searchParams.get('success');
    const merchantOrderId = searchParams.get('merchant_order_id');
    const transactionId = searchParams.get('id');

    if (!merchantOrderId) {
      return NextResponse.redirect(new URL('/client/dashboard?error=missing_order_id', request.url));
    }

    // 👇 التعديل هنا لضمان استخراج الـ ID الصحيح بدون التوقيت الزمني 👇
    let rawBookingId = merchantOrderId.startsWith('SAYYIR__')
      ? merchantOrderId.replace('SAYYIR__', '')
      : merchantOrderId;

    if (rawBookingId.startsWith('SAYYIR-')) {
      rawBookingId = rawBookingId.replace('SAYYIR-', '');
    }

    const bookingId = rawBookingId.split('_')[0];
    // 👆 نهاية التعديل 👆

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('🔴 لم يتم العثور على الحجز المطابق للطلب:', merchantOrderId);
      return NextResponse.redirect(new URL('/client/dashboard?error=booking_not_found', request.url));
    }

    if (success !== 'true') {
      await supabaseAdmin
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', booking.id);

      return NextResponse.redirect(new URL('/client/dashboard?payment=failed', request.url));
    }

    await supabaseAdmin
  .from('bookings')
  .update({
    payment_status: 'paid',
    status: 'confirmed',
    admin_notes: `تمت إعادة العميل من Paymob بنجاح. رقم العملية: ${transactionId || ''}`
  })
  .eq('id', booking.id);

    return NextResponse.redirect(new URL('/client/dashboard?payment=success', request.url));
  } catch (error: any) {
    console.error('🔴 CRITICAL CALLBACK ERROR:', error);
    return NextResponse.redirect(new URL('/client/dashboard?error=server_error', request.url));
  }
}