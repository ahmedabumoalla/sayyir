import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculateServiceSubtotal,
  validateDiscountCode,
} from '@/lib/server/discounts';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { bookingId, firstName, lastName, email, phone } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId مطلوب' }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, services:service_id (*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking?.services) {
      return NextResponse.json({ error: 'الحجز غير موجود' }, { status: 404 });
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

    const amount = discount.finalAmount;

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'استخدم مسار الدفع المجاني لهذا الحجز.' },
        { status: 400 }
      );
    }

    const { error: pricingUpdateError } = await supabaseAdmin
      .from('bookings')
      .update({
        subtotal,
        discount_amount: discount.discountAmount,
        discount_applied: discount.applied,
        coupon_code: discount.code,
        final_price: amount,
        total_price: amount,
      })
      .eq('id', bookingId);

    if (pricingUpdateError) {
      console.error('BOOKING PRICING UPDATE ERROR:', pricingUpdateError);
      return NextResponse.json(
        { error: 'فشل تحديث المبلغ المحسوب للحجز.' },
        { status: 500 }
      );
    }

    // 1. Authentication - الحصول على توكن المصادقة
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
    });
    const authData = await authRes.json();
    const authToken = authData.token;

    // 2. Order Registration - تسجيل الطلب
    const amountInCents = Math.round(amount * 100); // Paymob يتعامل بالهللات/القروش
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: "false",
        amount_cents: amountInCents,
        currency: "SAR", // أو EGP حسب دولتك
        items: [],
      }),
    });
    const orderData = await orderRes.json();
    const orderId = orderData.id;

    // 3. Payment Key Generation - إنشاء مفتاح الدفع
    const paymentKeyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountInCents,
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          first_name: firstName || "NA",
          last_name: lastName || "NA",
          email: email || "test@sayyir.sa",
          phone_number: phone || "NA",
          apartment: "NA",
          floor: "NA",
          street: "NA",
          building: "NA",
          shipping_method: "NA",
          postal_code: "NA",
          city: "NA",
          country: "SA",
          state: "NA",
        },
        currency: "SAR",
        integration_id: process.env.PAYMOB_INTEGRATION_ID,
      }),
    });
    const paymentKeyData = await paymentKeyRes.json();
    const paymentToken = paymentKeyData.token;

    // 4. إنشاء رابط صفحة الدفع (Iframe)
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

    return NextResponse.json({ url: iframeUrl });

  } catch (error: any) {
    console.error("Paymob Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
