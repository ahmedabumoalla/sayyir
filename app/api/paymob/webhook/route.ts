import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transaction = body?.obj;

    if (!transaction) {
      return NextResponse.json({ error: 'No transaction data' }, { status: 400 });
    }

    if (transaction.success !== true) {
      return NextResponse.json({ message: 'عملية دفع غير ناجحة' });
    }

    const merchantOrderId = transaction?.order?.merchant_order_id;
    if (!merchantOrderId) {
      return NextResponse.json({ error: 'merchant_order_id is missing' }, { status: 400 });
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

    const { data: currentBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        users:user_id (full_name, email, phone),
        services:service_id (title, provider_id),
        profiles:provider_id (full_name, email, phone)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !currentBooking) {
      throw new Error('فشل العثور على الحجز في قاعدة البيانات');
    }

    const existingTicketCode = currentBooking.ticket_qr_code;
    const ticketCode = existingTicketCode || crypto.randomUUID();

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        ticket_qr_code: ticketCode,
        is_ticket_used: false,
        admin_notes: `تم الدفع عبر Paymob برقم عملية: ${transaction?.id || ''}`
      })
      .eq('id', bookingId)
      .select(`
        *,
        users:user_id (full_name, email, phone),
        services:service_id (title, provider_id),
        profiles:provider_id (full_name, email, phone)
      `)
      .single();

    if (updateError || !updatedBooking) {
      throw new Error('فشل تحديث الحجز في قاعدة البيانات');
    }

    const clientInfo = updatedBooking.users;
    const serviceInfo = updatedBooking.services;
    const providerInfo = updatedBooking.profiles;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    if (clientInfo?.email) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'booking_payment_confirmed',
          email: clientInfo.email,
          phone: clientInfo.phone,
          data: {
            bookingId: updatedBooking.id,
            clientName: clientInfo.full_name,
            serviceName: serviceInfo?.title || 'خدمة سيّر',
            ticketCode,
            ticketCodeShort: String(ticketCode).slice(0, 16),
            totalPrice: `${updatedBooking.total_price || updatedBooking.final_price || 0} ريال`
          }
        })
      }).catch((err) => console.error('فشل إرسال إيميل العميل:', err));
    }

    if (providerInfo?.email) {
      await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'provider_payment_received',
          email: providerInfo.email,
          phone: providerInfo.phone,
          data: {
            bookingId: updatedBooking.id,
            providerName: providerInfo.full_name,
            clientName: clientInfo?.full_name || '',
            serviceName: serviceInfo?.title || 'خدمة سيّر',
            guests: updatedBooking.quantity || 1,
            totalPrice: `${updatedBooking.total_price || updatedBooking.final_price || 0} ريال`
          }
        })
      }).catch((err) => console.error('فشل إرسال إيميل المزود:', err));
    }

    return NextResponse.json({ message: 'تم تأكيد الدفع وإرسال الإشعارات بنجاح' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}