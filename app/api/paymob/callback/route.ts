import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Paymob تقوم بتوجيه العميل لهذا الرابط مع هذه المتغيرات
    const success = searchParams.get('success');
    const merchant_order_id = searchParams.get('merchant_order_id');
    const transaction_id = searchParams.get('id');

    if (!merchant_order_id) {
        return NextResponse.redirect(new URL('/client/dashboard?error=missing_order_id', request.url));
    }

    // استخراج جزء الـ ID الخاص بالحجز (لأننا أرسلناه كـ SAYYIR-123456-7890)
    const shortBookingId = merchant_order_id.split('-')[1];

    // نبحث عن الحجز المطابق في قاعدة البيانات
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*, users:user_id(full_name, email), services(title)')
        .ilike('id', `${shortBookingId}%`)
        .single();

    if (fetchError || !booking) {
        console.error("🔴 لم يتم العثور على الحجز المطابق للطلب:", merchant_order_id);
        return NextResponse.redirect(new URL('/client/dashboard?error=booking_not_found', request.url));
    }

    // إذا كانت العملية فاشلة
    if (success !== 'true') {
        await supabase.from('bookings').update({ payment_status: 'failed' }).eq('id', booking.id);
        return NextResponse.redirect(new URL(`/client/dashboard?payment=failed`, request.url));
    }

    // إذا كانت ناجحة، نولد باركود عشوائي ونحدث الحالة
    const qrCode = `QR-${booking.id.substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { error: updateError } = await supabase.from('bookings').update({
        status: 'confirmed', // تأكيد الحجز
        payment_status: 'paid', // تم الدفع
        ticket_qr_code: qrCode,
        admin_notes: `تم الدفع عبر Paymob برقم عملية: ${transaction_id}`
    }).eq('id', booking.id);

    if (updateError) {
        console.error("🔴 فشل تحديث حالة الحجز:", updateError);
    }

    // 📩 إرسال إيميل التذكرة للعميل
    if (booking.users?.email) {
        const emailPayload = {
            type: 'booking_confirmed', // تأكد أن لديك قالب إيميل بهذا الاسم في ملف إرسال الإيميلات
            email: booking.users.email,
            name: booking.users.full_name,
            serviceTitle: booking.services?.title || 'خدمة سيّر',
            qrCode: qrCode,
            bookingId: booking.id
        };

        // استدعاء ملف الـ API الخاص بإرسال الإيميلات
        await fetch(new URL('/api/emails/send', request.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload)
        }).catch(err => console.error("🔴 فشل إرسال الإيميل:", err));
    }

    // توجيه العميل لصفحة النجاح
    return NextResponse.redirect(new URL(`/client/dashboard?payment=success`, request.url));

  } catch (error: any) {
    console.error("🔴 CRITICAL CALLBACK ERROR:", error);
    return NextResponse.redirect(new URL('/client/dashboard?error=server_error', request.url));
  }
}