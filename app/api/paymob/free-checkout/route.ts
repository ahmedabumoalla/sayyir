import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        users:user_id (full_name, email, phone),
        services:service_id (title, provider_id),
        profiles:provider_id (full_name, email, phone)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw new Error('الحجز غير موجود');
    }

    const qrCodeString = `QR-${bookingId.substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: paymentMethod || 'مجاني',
        ticket_qr_code: qrCodeString,
        is_ticket_used: false
      })
      .eq('id', bookingId);

    if (error) throw error;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

    if (booking.users?.email) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'booking_payment_confirmed',
          email: booking.users.email,
          phone: booking.users.phone,
          data: {
            bookingId: booking.id,
            clientName: booking.users.full_name,
            serviceName: booking.services?.title || 'خدمة سيّر',
            ticketCode: qrCodeString,
            ticketCodeShort: qrCodeString,
            totalPrice: '0 ريال'
          }
        })
      }).catch((err) => console.error('فشل إرسال إيميل العميل في free-checkout:', err));
    }

    if (booking.profiles?.email) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'provider_payment_received',
          email: booking.profiles.email,
          phone: booking.profiles.phone,
          data: {
            bookingId: booking.id,
            providerName: booking.profiles.full_name,
            clientName: booking.users?.full_name || '',
            serviceName: booking.services?.title || 'خدمة سيّر',
            guests: booking.quantity || 1,
            totalPrice: '0 ريال'
          }
        })
      }).catch((err) => console.error('فشل إرسال إيميل المزود في free-checkout:', err));
    }

    return NextResponse.json({ success: true, message: 'تم تأكيد الحجز المجاني وإرسال الإشعارات بنجاح.' });
  } catch (error: any) {
    console.error('Free Checkout Error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}