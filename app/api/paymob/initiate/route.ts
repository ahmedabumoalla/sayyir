import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    console.log('🟢 بدأ طلب الدفع');

    const body = await request.json();
    const { bookingId, couponCode, paymentMethod } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'رقم الحجز مفقود' }, { status: 400 });
    }

    const isApplePay = paymentMethod === 'applepay';

    if (!process.env.PAYMOB_API_KEY || !process.env.PAYMOB_INTEGRATION_ID || !process.env.PAYMOB_IFRAME_ID) {
      throw new Error('مفاتيح Paymob الأساسية مفقودة في السيرفر');
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        services:service_id (*),
        profiles:provider_id (custom_commission, full_name, email, phone),
        users:user_id (full_name, email, phone)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error('الحجز غير موجود');

    const { data: settings } = await supabaseAdmin
      .from('platform_settings')
      .select('*')
      .single();

    const quantity = Number(booking.quantity || 1);
    const unitPrice = Number(booking.services?.price || 0);
    const subtotal = unitPrice * quantity;

    let generalDiscountAmount = 0;
    let couponDiscountAmount = 0;

    if (settings?.is_general_discount_active && Number(settings.general_discount_percent) > 0) {
      generalDiscountAmount = (subtotal * Number(settings.general_discount_percent)) / 100;
    }

    if (couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('discount_percent')
        .eq('code', couponCode)
        .single();

      if (coupon?.discount_percent) {
        couponDiscountAmount = (subtotal * Number(coupon.discount_percent)) / 100;
      }
    }

    const totalDiscount = generalDiscountAmount + couponDiscountAmount;
    const finalAmountToPay = Math.max(0, subtotal - totalDiscount);
    const netAmountBeforeVat = finalAmountToPay / 1.15;
    const vatAmount = finalAmountToPay - netAmountBeforeVat;

    let commissionRate = 0;
    if (booking.services?.platform_commission !== null && booking.services?.platform_commission !== undefined) {
      commissionRate = Number(booking.services.platform_commission);
    } else if (booking.profiles?.custom_commission !== null && booking.profiles?.custom_commission !== undefined) {
      commissionRate = Number(booking.profiles.custom_commission);
    } else {
      if (booking.services?.service_category === 'experience') {
        commissionRate = Number(settings?.commission_tourist || 0);
      } else if (booking.services?.sub_category === 'lodging') {
        commissionRate = Number(settings?.commission_housing || 0);
      } else {
        commissionRate = Number(settings?.commission_food || 0);
      }
    }

    const platformFee = netAmountBeforeVat * (commissionRate / 100);
    const providerEarnings = finalAmountToPay - platformFee;

    await supabaseAdmin
      .from('bookings')
      .update({
        subtotal,
        discount_amount: totalDiscount,
        tax_amount: vatAmount,
        final_price: finalAmountToPay,
        total_price: finalAmountToPay,
        platform_fee: platformFee,
        provider_earnings: providerEarnings,
        coupon_code: couponCode || null
      })
      .eq('id', bookingId);

    if (finalAmountToPay === 0) {
      return NextResponse.json({ skipPayment: true });
    }

    const authReq = await fetch('https://ksa.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
    });

    const authRes = await authReq.json();
    if (!authReq.ok || !authRes.token) throw new Error('فشل المصادقة مع Paymob');
    const token = authRes.token;

    const merchantOrderId = `SAYYIR__${bookingId}`;

    const orderReq = await fetch('https://ksa.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: 'false',
        amount_cents: Math.round(finalAmountToPay * 100),
        currency: 'SAR',
        merchant_order_id: merchantOrderId,
        items: []
      })
    });

    const orderRes = await orderReq.json();
    if (!orderReq.ok || !orderRes.id) throw new Error('فشل إنشاء الطلب في Paymob');

    const orderId = orderRes.id;

    const fullName = String(booking.users?.full_name || 'Customer Sayyir').trim();
    const [firstName = 'Customer', ...restNames] = fullName.split(' ');
    const lastName = restNames.join(' ') || 'Sayyir';
    const email = booking.users?.email || 'info@sayyir.sa';
    const phone = booking.users?.phone || '+966500000000';

    const paymentKeyReq = await fetch('https://ksa.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: Math.round(finalAmountToPay * 100),
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          apartment: 'NA',
          email,
          floor: 'NA',
          first_name: firstName,
          street: 'NA',
          building: 'NA',
          phone_number: phone,
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'NA',
          country: 'SA',
          last_name: lastName,
          state: 'NA'
        },
        currency: 'SAR',
        integration_id: isApplePay ? 23347 : Number(process.env.PAYMOB_INTEGRATION_ID)
      })
    });

    const paymentKeyRes = await paymentKeyReq.json();
    if (!paymentKeyReq.ok || !paymentKeyRes.token) throw new Error('فشل توليد مفتاح الدفع');

    const paymentToken = paymentKeyRes.token;

    let redirectUrl = '';
    if (isApplePay) {
      redirectUrl = `https://ksa.paymob.com/standalone/?ref=${paymentToken}`;
    } else {
      redirectUrl = `https://ksa.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
    }

    return NextResponse.json({ iframeUrl: redirectUrl });
  } catch (error: any) {
    console.error('🔴 CRITICAL API ERROR:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ غير معروف في السيرفر' },
      { status: 500 }
    );
  }
}