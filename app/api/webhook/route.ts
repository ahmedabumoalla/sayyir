import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient'; // استدعاء قاعدة البيانات

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const hmacQuery = url.searchParams.get('hmac');
    const body = await request.json();
    const obj = body.obj; // بيانات العملية

    // --- 1. التحقق من الأمان (HMAC) ---
    // يجب ترتيب هذه الحقول أبجدياً ودمجها للتحقق من أن الطلب جاي من Paymob فعلاً
    const hmacString = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured,
      obj.has_parent_transaction,
      obj.id,
      obj.integration_id,
      obj.is_3d_secure,
      obj.is_auth,
      obj.is_capture,
      obj.is_refunded,
      obj.is_standalone_payment,
      obj.is_voided,
      obj.order.id,
      obj.owner,
      obj.pending,
      obj.source_data.pan,
      obj.source_data.sub_type,
      obj.source_data.type,
      obj.success
    ].join('');

    const calculatedHmac = crypto
      .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET!)
      .update(hmacString)
      .digest('hex');

    if (calculatedHmac !== hmacQuery) {
      console.error("HMAC NOT VALID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- 2. التحقق من حالة الدفع وتحديث قاعدة البيانات ---
    if (obj.success === true) {
       // الدفع ناجح
       console.log("Payment Successful for order:", obj.order.id);
       
       // هنا تضع كود Supabase لتحديث حالة الحجز إلى "مدفوع"
       // await supabase.from('bookings').update({ status: 'paid' }).eq('paymob_order_id', obj.order.id);
    } else {
       // الدفع فشل
       console.log("Payment Failed for order:", obj.order.id);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
  }
}