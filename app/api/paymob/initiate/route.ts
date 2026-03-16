import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    console.log("🟢 1. بدأ طلب الدفع (النسخة السعودية KSA)");

    const body = await request.json();
    const { bookingId, couponCode, paymentMethod } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "رقم الحجز مفقود" }, { status: 400 });
    }

    const isApplePay = paymentMethod === 'applepay';

    // التحقق من وجود مفاتيح البطاقات الأساسية
    if (!process.env.PAYMOB_API_KEY || !process.env.PAYMOB_INTEGRATION_ID || !process.env.PAYMOB_IFRAME_ID) {
        throw new Error("مفاتيح Paymob مفقودة في السيرفر (API_KEY, INTEGRATION_ID, IFRAME_ID)");
    }

    // التحقق من وجود مفتاح أبل باي إذا اختار العميل أبل باي
    if (isApplePay && !process.env.PAYMOB_APPLEPAY_INTEGRATION_ID) {
        throw new Error("مفتاح (PAYMOB_APPLEPAY_INTEGRATION_ID) مفقود في ملف .env.local");
    }

    // 1. جلب البيانات
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services (*),
        profiles:provider_id (custom_commission, full_name, email, phone),
        users:user_id (full_name, email, phone)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error("الحجز غير موجود");

    const { data: settings } = await supabase.from('platform_settings').select('*').single();

    // 2. الحسابات المالية
    const quantity = booking.quantity || 1;
    const unitPrice = Number(booking.services.price || 0);
    const subtotal = unitPrice * quantity; 

    let generalDiscountAmount = 0;
    let couponDiscountAmount = 0;

    if (settings?.is_general_discount_active && settings?.general_discount_percent > 0) {
        generalDiscountAmount = (subtotal * settings.general_discount_percent) / 100;
    }

    if (couponCode) {
        const { data: coupon } = await supabase.from('coupons').select('discount_percent').eq('code', couponCode).single();
        if (coupon) couponDiscountAmount = (subtotal * coupon.discount_percent) / 100;
    }

    const totalDiscount = generalDiscountAmount + couponDiscountAmount;
    const finalAmountToPay = Math.max(0, subtotal - totalDiscount);
    const netAmountBeforeVat = finalAmountToPay / 1.15;
    const vatAmount = finalAmountToPay - netAmountBeforeVat;

    let commissionRate = 0;
    if (booking.services.platform_commission !== null && booking.services.platform_commission !== undefined) {
        commissionRate = Number(booking.services.platform_commission);
    } else if (booking.profiles?.custom_commission !== null && booking.profiles?.custom_commission !== undefined) {
        commissionRate = Number(booking.profiles.custom_commission);
    } else {
        if (booking.services.service_category === 'experience') commissionRate = Number(settings?.commission_tourist || 0);
        else if (booking.services.sub_category === 'lodging') commissionRate = Number(settings?.commission_housing || 0);
        else commissionRate = Number(settings?.commission_food || 0);
    }

    const platformFee = netAmountBeforeVat * (commissionRate / 100);
    const providerEarnings = finalAmountToPay - platformFee;

    // 3. تحديث الحجز في الداتابيز
    await supabase.from('bookings').update({
        subtotal: subtotal,
        discount_amount: totalDiscount,
        tax_amount: vatAmount,
        final_price: finalAmountToPay,
        total_price: finalAmountToPay,
        platform_fee: platformFee,
        provider_earnings: providerEarnings,
        coupon_code: couponCode || null
    }).eq('id', bookingId);

    if (finalAmountToPay === 0) {
        return NextResponse.json({ skipPayment: true });
    }

    // ==========================================
    // 💳 Paymob KSA Integration (خوادم السعودية)
    // ==========================================
    console.log("🟢 2. الاتصال بـ Paymob KSA - Auth...");
    
    // Step 1: Auth 
    const authReq = await fetch("https://ksa.paymob.com/api/auth/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
    });
    const authRes = await authReq.json();
    if (!authReq.ok || !authRes.token) {
        console.error("🔴 خطأ في الـ Auth:", authRes);
        throw new Error("فشل المصادقة مع Paymob. تأكد من الـ API_KEY.");
    }
    const token = authRes.token;

    console.log("🟢 3. تسجيل الطلب (Order)...");
    
    // Step 2: Order 
    const orderReq = await fetch("https://ksa.paymob.com/api/ecommerce/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            auth_token: token,
            delivery_needed: "false",
            amount_cents: Math.round(finalAmountToPay * 100), 
            currency: "SAR",
            merchant_order_id: `SAYYIR-${bookingId.slice(0,6)}-${Date.now().toString().slice(-6)}`, 
            items: []
        })
    });
    const orderRes = await orderReq.json();
    if (!orderReq.ok || !orderRes.id) {
        console.error("🔴 خطأ في الـ Order:", orderRes);
        throw new Error("فشل إنشاء الطلب في Paymob.");
    }
    const orderId = orderRes.id;

    console.log("🟢 4. طلب مفتاح الدفع (Payment Key)...");
    
    const firstName = booking.users?.full_name?.split(' ')[0] || "Customer";
    const lastName = booking.users?.full_name?.split(' ')[1] || "Sayyir";
    const email = booking.users?.email || "info@sayyir.sa";
    const phone = booking.users?.phone || "+966500000000";

    // Step 3: Payment Key 
    const paymentKeyReq = await fetch("https://ksa.paymob.com/api/acceptance/payment_keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            auth_token: token,
            amount_cents: Math.round(finalAmountToPay * 100),
            expiration: 3600,
            order_id: orderId,
            billing_data: {
                apartment: "NA", 
                email: email, 
                floor: "NA", 
                first_name: firstName,
                street: "NA", 
                building: "NA", 
                phone_number: phone,
                shipping_method: "NA", 
                postal_code: "NA", 
                city: "NA",
                country: "SA", 
                last_name: lastName,
                state: "NA"
            },
            currency: "SAR",
            // تحديد الـ ID بناءً على اختيار العميل من الواجهة
            integration_id: isApplePay
                ? Number(process.env.PAYMOB_APPLEPAY_INTEGRATION_ID)
                : Number(process.env.PAYMOB_INTEGRATION_ID)
        })
    });
    
    const paymentKeyRes = await paymentKeyReq.json();
    
    if (!paymentKeyReq.ok || !paymentKeyRes.token) {
        console.error("🔴 خطأ في الـ Payment Key التفصيلي:", paymentKeyRes);
        throw new Error("فشل توليد مفتاح الدفع. تأكد من صحة أرقام Integration ID.");
    }
    
    const paymentToken = paymentKeyRes.token;

    console.log("🟢 5. تم تجهيز رابط الدفع بنجاح!");
    
    // 4. بناء الرابط النهائي لـ Iframe
    // لـ Apple Pay في Paymob، لا نستخدم Iframe للبطاقات العادية، بل نوجهه لـ Iframe خاص بأبل باي إذا كان متاحاً أو رابط دفع مباشر
    const iframeId = isApplePay
        ? (process.env.PAYMOB_APPLEPAY_IFRAME_ID || process.env.PAYMOB_IFRAME_ID)
        : process.env.PAYMOB_IFRAME_ID;
        
    const iframeUrl = `https://ksa.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;

    return NextResponse.json({ iframeUrl });

  } catch (error: any) {
    console.error("🔴 CRITICAL API ERROR:", error);
    return NextResponse.json({ error: error.message || "حدث خطأ غير معروف في السيرفر" }, { status: 500 });
  }
}