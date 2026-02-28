import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { generateZatcaQR } from '@/lib/zatca';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transaction = body.obj;
    
    if (!transaction) return NextResponse.json({ error: "No transaction data" }, { status: 400 });

    // ✅ التأكد أن الدفع ناجح 100% من بي موب
    if (transaction.success === true) {
        
        // استخراج رقم الحجز
        const merchantOrderId = transaction.order.merchant_order_id;
        const bookingId = merchantOrderId.split('-')[1];

        // 1. توليد رمز تذكرة فريد للعميل
        const uniqueTicketCode = crypto.randomUUID();

        // 2. تحديث حالة الحجز إلى (مدفوع ومؤكد) وجلب بيانات العميل والمزود
        const { data: booking, error } = await supabase
            .from('bookings')
            .update({
                payment_status: 'paid',
                status: 'confirmed',
                ticket_qr_code: uniqueTicketCode,
                is_ticket_used: false
            })
            .eq('id', bookingId)
            // جلب بيانات العميل، وبيانات الخدمة، وبيانات المزود صاحب الخدمة
            .select(`
                *, 
                client:user_id(full_name, email), 
                services:service_id(title, provider:provider_id(full_name, email))
            `)
            .single();

        if (error || !booking) throw new Error("فشل تحديث الحجز في قاعدة البيانات");

        // معالجة البيانات القادمة من قاعدة البيانات لتجنب أخطاء المصفوفات
        const clientInfo = Array.isArray(booking.client) ? booking.client[0] : booking.client;
        const serviceInfo = Array.isArray(booking.services) ? booking.services[0] : booking.services;
        const providerInfo = Array.isArray(serviceInfo?.provider) ? serviceInfo.provider[0] : serviceInfo?.provider;

        // 3. تجهيز باركود هيئة الزكاة
        const zatcaBase64 = generateZatcaQR(
            "منصة سيّر السياحية", 
            "310000000000003", 
            new Date().toISOString(),
            booking.total_price.toString(),
            (booking.total_price * 0.15).toFixed(2) // افتراض 15% ضريبة
        );

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sayyir.sa';

        // 📩 4. إرسال الإيميل الأول: للعميل (يحتوي الفاتورة والباركود)
        await fetch(`${baseUrl}/api/emails/send`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                type: 'booking_ticket_invoice',
                email: clientInfo?.email,
                clientName: clientInfo?.full_name,
                serviceTitle: serviceInfo?.title,
                ticketCode: uniqueTicketCode, // الباركود الذي سيمسحه المزود
                zatcaCode: zatcaBase64,       // باركود الضريبة
                totalPrice: booking.total_price
            })
        }).catch(err => console.error("فشل إرسال إيميل العميل:", err));

        // 📩 5. إرسال الإيميل الثاني: لمزود الخدمة (إشعار بأن العميل دفع)
        if (providerInfo?.email) {
            await fetch(`${baseUrl}/api/emails/send`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    type: 'provider_payment_received',
                    email: providerInfo.email,
                    providerName: providerInfo.full_name,
                    clientName: clientInfo?.full_name,
                    serviceTitle: serviceInfo?.title,
                    quantity: booking.quantity || booking.guests_count,
                    totalPrice: booking.total_price
                })
            }).catch(err => console.error("فشل إرسال إيميل المزود:", err));
        }

        return NextResponse.json({ message: "تم تأكيد الدفع وإرسال الإيميلات بنجاح" });
    }

    return NextResponse.json({ message: "عملية دفع غير ناجحة" });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}