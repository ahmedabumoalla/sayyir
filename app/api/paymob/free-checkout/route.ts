import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// استخدام مفاتيح الأدمن (Service Role) لتخطي RLS وتحديث الحجز
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { bookingId, paymentMethod } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "معرف الحجز مفقود." }, { status: 400 });
    }

    // توليد باركود التذكرة
    const qrCodeString = `QR-${bookingId.substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // تحديث حالة الحجز إلى "مؤكد" و"مدفوع"
    const { error } = await supabaseAdmin.from('bookings').update({
        status: "confirmed", 
        payment_status: "paid",
        payment_method: paymentMethod || "مجاني",
        ticket_qr_code: qrCodeString,
        is_ticket_used: false
    }).eq('id', bookingId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "تم تأكيد الحجز بنجاح." });

  } catch (error: any) {
    console.error('Free Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}