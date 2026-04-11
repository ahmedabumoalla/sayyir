import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    console.log("🟢 PAYMOB INITIATE START");

    const body = await request.json();
    const { bookingId, couponCode, paymentMethod } = body;

    console.log("📦 INITIATE BODY:", body);

    if (!bookingId) {
      return NextResponse.json({ error: "رقم الحجز مفقود" }, { status: 400 });
    }

    const isApplePay = paymentMethod === "applepay";

    if (
      !process.env.PAYMOB_API_KEY ||
      !process.env.PAYMOB_INTEGRATION_ID ||
      !process.env.PAYMOB_IFRAME_ID
    ) {
      console.error("❌ Missing Paymob env vars", {
        hasApiKey: !!process.env.PAYMOB_API_KEY,
        hasIntegrationId: !!process.env.PAYMOB_INTEGRATION_ID,
        hasIframeId: !!process.env.PAYMOB_IFRAME_ID
      });

      return NextResponse.json(
        { error: "مفاتيح Paymob الأساسية مفقودة في السيرفر" },
        { status: 500 }
      );
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`
        *,
        services (*),
        provider_profile:provider_id (custom_commission, full_name, email, phone),
        client_profile:user_id (full_name, email, phone)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("❌ Booking fetch error:", bookingError);
      return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
    }

    console.log("✅ BOOKING FOUND:", booking);

    if (booking.status !== "approved_unpaid") {
      return NextResponse.json(
        { error: "هذا الحجز غير متاح للدفع حالياً" },
        { status: 400 }
      );
    }

    if (booking.expires_at && new Date(booking.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "انتهت مهلة الدفع لهذا الحجز" },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("platform_settings")
      .select("*")
      .single();

    if (settingsError) {
      console.error("⚠️ PLATFORM SETTINGS ERROR:", settingsError);
    }

    const quantity = booking.quantity || 1;
    const unitPrice = Number(booking.services?.price || 0);
    const subtotal = unitPrice * quantity;

    let generalDiscountAmount = 0;
    let couponDiscountAmount = 0;

    if (settings?.is_general_discount_active && Number(settings.general_discount_percent) > 0) {
      generalDiscountAmount = (subtotal * Number(settings.general_discount_percent)) / 100;
    }

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from("coupons")
        .select("discount_percent, code")
        .eq("code", couponCode)
        .single();

      if (couponError) {
        console.error("⚠️ COUPON ERROR:", couponError);
      }

      if (coupon) {
        couponDiscountAmount = (subtotal * Number(coupon.discount_percent)) / 100;
      }
    }

    const totalDiscount = generalDiscountAmount + couponDiscountAmount;
    const finalAmountToPay = Math.max(0, subtotal - totalDiscount);
    const netAmountBeforeVat = finalAmountToPay / 1.15;
    const vatAmount = finalAmountToPay - netAmountBeforeVat;

    let commissionRate = 0;

    if (
      booking.services?.platform_commission !== null &&
      booking.services?.platform_commission !== undefined
    ) {
      commissionRate = Number(booking.services.platform_commission);
    } else if (
      booking.provider_profile?.custom_commission !== null &&
      booking.provider_profile?.custom_commission !== undefined
    ) {
      commissionRate = Number(booking.provider_profile.custom_commission);
    } else {
      if (booking.services?.service_category === "experience") {
        commissionRate = Number(settings?.commission_tourist || 0);
      } else if (booking.services?.sub_category === "lodging") {
        commissionRate = Number(settings?.commission_housing || 0);
      } else {
        commissionRate = Number(settings?.commission_food || 0);
      }
    }

    const platformFee = netAmountBeforeVat * (commissionRate / 100);
    const providerEarnings = finalAmountToPay - platformFee;

    const { error: updateBookingError } = await supabaseAdmin
      .from("bookings")
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
      .eq("id", bookingId);

    if (updateBookingError) {
      console.error("❌ Booking financial update error:", updateBookingError);
      return NextResponse.json(
        { error: "فشل تحديث بيانات الحجز المالية" },
        { status: 500 }
      );
    }

    if (finalAmountToPay === 0) {
      console.log("✅ FINAL AMOUNT IS ZERO - SKIP PAYMENT");
      return NextResponse.json({ skipPayment: true });
    }

    console.log("💳 PAYMOB FINANCIALS:", {
      subtotal,
      totalDiscount,
      finalAmountToPay,
      vatAmount,
      platformFee,
      providerEarnings
    });

    // ==========================================
    // 1) AUTH TOKEN
    // ==========================================
    const authReq = await fetch("https://ksa.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.PAYMOB_API_KEY
      })
    });

    const authRes = await authReq.json();
    console.log("🔐 PAYMOB AUTH RESPONSE:", authRes);

    if (!authReq.ok || !authRes.token) {
      return NextResponse.json(
        {
          error: authRes?.detail || authRes?.message || "فشل المصادقة مع Paymob",
          paymobAuthResponse: authRes
        },
        { status: 500 }
      );
    }

    const token = authRes.token;

    // ==========================================
    // 2) CREATE ORDER
    // ==========================================
    const merchantOrderId = `SAYYIR-${bookingId}`;

    const orderPayload = {
      auth_token: token,
      delivery_needed: false,
      amount_cents: Math.round(finalAmountToPay * 100),
      currency: "SAR",
      merchant_order_id: merchantOrderId,
      items: []
    };

    console.log("🧾 PAYMOB ORDER PAYLOAD:", orderPayload);

    const orderReq = await fetch("https://ksa.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });

    const orderRes = await orderReq.json();
    console.log("🧾 PAYMOB ORDER RESPONSE:", orderRes);

    if (!orderReq.ok || !orderRes.id) {
      return NextResponse.json(
        {
          error: orderRes?.detail || orderRes?.message || "فشل إنشاء الطلب في Paymob",
          paymobOrderResponse: orderRes
        },
        { status: 500 }
      );
    }

    const orderId = orderRes.id;

    // ==========================================
    // 3) PAYMENT KEY
    // ==========================================
    const fullName = booking.client_profile?.full_name || "Customer Sayyir";
    const firstName = fullName.split(" ")[0] || "Customer";
    const lastName = fullName.split(" ").slice(1).join(" ") || "Sayyir";
    const email = booking.client_profile?.email || "info@sayyir.sa";

    let phone = booking.client_profile?.phone || "+966500000000";
    phone = String(phone).trim();

    if (!phone.startsWith("+")) {
      phone = `+${phone}`;
    }

    const paymentKeyPayload = {
      auth_token: token,
      amount_cents: Math.round(finalAmountToPay * 100),
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        apartment: "NA",
        email,
        floor: "NA",
        first_name: firstName,
        street: "NA",
        building: "NA",
        phone_number: phone,
        shipping_method: "NA",
        postal_code: "NA",
        city: "Abha",
        country: "SA",
        last_name: lastName,
        state: "Asir"
      },
      currency: "SAR",
      integration_id: isApplePay
        ? Number(process.env.PAYMOB_APPLEPAY_INTEGRATION_ID || process.env.PAYMOB_INTEGRATION_ID)
        : Number(process.env.PAYMOB_INTEGRATION_ID)
    };

    console.log("🔑 PAYMOB PAYMENT KEY PAYLOAD:", paymentKeyPayload);

    const paymentKeyReq = await fetch("https://ksa.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentKeyPayload)
    });

    const paymentKeyRes = await paymentKeyReq.json();
    console.log("🔑 PAYMOB PAYMENT KEY RESPONSE:", paymentKeyRes);

    if (!paymentKeyReq.ok || !paymentKeyRes.token) {
      return NextResponse.json(
        {
          error: paymentKeyRes?.detail || paymentKeyRes?.message || "فشل توليد مفتاح الدفع",
          paymobPaymentKeyResponse: paymentKeyRes
        },
        { status: 500 }
      );
    }

    const paymentToken = paymentKeyRes.token;

    let redirectUrl = "";

    if (isApplePay) {
      redirectUrl = `https://ksa.paymob.com/standalone/?ref=${paymentToken}`;
    } else {
      const cardIframeId = process.env.PAYMOB_IFRAME_ID!;
      redirectUrl = `https://ksa.paymob.com/api/acceptance/iframes/${cardIframeId}?payment_token=${paymentToken}`;
    }

    console.log("✅ PAYMOB REDIRECT URL:", redirectUrl);

    return NextResponse.json({ iframeUrl: redirectUrl });
  } catch (error: any) {
    console.error("🔴 CRITICAL PAYMOB INITIATE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير معروف في السيرفر" },
      { status: 500 }
    );
  }
}