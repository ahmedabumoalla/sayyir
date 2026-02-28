import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount, firstName, lastName, email, phone } = await request.json();

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