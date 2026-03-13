import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
        type, email, clientEmail, name, clientName, serviceTitle, reason, providerName, 
        amount, expiryTime, bookingId, clientPhone, providerPhone,
        password, ticketCode, zatcaCode, totalPrice, quantity 
    } = body;

    const finalRecipientEmail = email || clientEmail;
    const finalClientName = clientName || name || "عميلنا العزيز";
    const finalProviderName = providerName || name || "شريكنا العزيز";

    let subject = '';
    let html = '';
    let smsTo = clientPhone || providerPhone || ''; 
    let smsBody = '';

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa';

    switch (type) {
        case 'booking_approved_invoice':
            subject = `✅ تمت الموافقة على حجزك #${bookingId?.slice(0,6) || ''}`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${finalClientName}</h2><p>وافق المزود على حجزك لخدمة: <strong>${serviceTitle}</strong></p><p>المبلغ المطلوب: <strong>${amount} ريال</strong></p><a href="${baseUrl}/checkout?booking_id=${bookingId}" style="background-color: #C89B3C; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; font-weight: bold;">اضغط للدفع الآن وإتمام الحجز</a></div>`;
            smsBody = `مرحباً ${finalClientName}،\nتمت الموافقة على حجزك (${serviceTitle})! 🎉\nيرجى الدفع لإتمام الحجز عبر الرابط:\n${baseUrl}/checkout?booking_id=${bookingId}`;
            break;

        case 'booking_rejected_notification':
            subject = `❌ تحديث بخصوص حجزك`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>عذراً ${finalClientName}</h2><p>تم رفض حجزك لخدمة: <strong>${serviceTitle}</strong></p><p>السبب: ${reason}</p></div>`;
            smsBody = `مرحباً ${finalClientName}،\nعذراً، تم رفض طلب حجزك لخدمة ${serviceTitle}.\nالسبب: ${reason}`;
            break;

        case 'new_booking_for_provider':
            subject = '🔔 طلب حجز جديد بانتظار موافقتك';
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${finalProviderName}</h2><p>لديك حجز جديد لخدمة: <strong>${serviceTitle}</strong></p><p>العميل: ${finalClientName}</p><p>يرجى الدخول للوحة التحكم للقبول أو الرفض.</p></div>`;
            smsBody = `تنبيه للمزود:\nلديك طلب حجز جديد لخدمة (${serviceTitle}).\nالرجاء مراجعة لوحة التحكم للقبول أو الرفض.`;
            break;

        case 'booking_ticket_invoice':
            subject = `🎫 تذكرة الدخول والفاتورة الضريبية - حجز مؤكد`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333; max-w-lg; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;"><h2 style="color: #C89B3C;">مرحباً ${finalClientName}،</h2><p>تم تأكيد دفعك بنجاح لخدمة: <strong>${serviceTitle}</strong></p><p>المبلغ المدفوع: <strong>${totalPrice} ريال</strong></p><div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;"><p style="margin: 0 0 10px 0; font-weight: bold;">تذكرة الدخول الخاصة بك (للمزود):</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketCode}" alt="Ticket QR Code" style="border-radius: 8px;" /><p style="margin: 10px 0 0 0; font-family: monospace; font-size: 18px; letter-spacing: 2px;">${ticketCode?.split('-')[0].toUpperCase()}</p></div><div style="text-align: center; margin-top: 20px;"><p style="font-size: 12px; color: #666;">الفاتورة الضريبية:</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${zatcaCode}" alt="ZATCA QR Code" /></div></div>`;
            smsBody = `تم تأكيد دفعك بنجاح لخدمة (${serviceTitle})! ✅\nتم إرسال تذكرة الدخول والفاتورة إلى بريدك الإلكتروني. نتمنى لك رحلة ممتعة.`;
            break;

        case 'provider_payment_received':
            subject = `💰 تم تأكيد دفع عميل لحجز جديد`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${finalProviderName}،</h2><p>نود إعلامك بأن العميل <strong>${finalClientName}</strong> قام بالدفع وتأكيد الحجز بنجاح.</p><p>الخدمة: <strong>${serviceTitle}</strong></p><p>يرجى الاستعداد لاستقبال العميل.</p></div>`;
            smsBody = `تنبيه للمزود: قام العميل ${finalClientName} بالدفع وتأكيد حجزه لخدمة (${serviceTitle}). الحجز مؤكد.`;
            break;

        case 'service_approved':
            subject = `🎉 تمت الموافقة على خدمتك في منصة سيّر!`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${finalClientName}،</h2><p>تمت الموافقة على إدراج خدمتك: <strong>"${serviceTitle}"</strong>.</p></div>`;
            smsBody = `أخبار رائعة من سيّر! 🎉\nتمت الموافقة على خدمتك (${serviceTitle}) وهي الآن متاحة للحجز.`;
            break;

        case 'service_rejected':
            subject = `⚠️ تحديث هام بخصوص خدمتك في منصة سيّر`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${finalClientName}،</h2><p>يوجد ملاحظات على خدمتك: <strong>"${serviceTitle}"</strong>.</p><p>السبب: ${reason}</p></div>`;
            smsBody = `مرحباً ${finalClientName}،\nيوجد ملاحظات على خدمتك (${serviceTitle}). يرجى الدخول لتعديلها.`;
            break;

        case 'new_service_notification':
            subject = `🔔 خدمة جديدة بانتظار المراجعة`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>تنبيه للإدارة،</h2><p>قام المزود <strong>${finalProviderName}</strong> بإضافة خدمة جديدة.</p><p>الخدمة: <strong>${serviceTitle}</strong></p></div>`;
            break;

        case 'new_provider_request':
            subject = `🚀 طلب انضمام شريك جديد: ${finalProviderName}`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً فريق الإدارة،</h2><p>طلب انضمام جديد:</p><p>الاسم: ${finalProviderName}</p><p>الجوال: <span dir="ltr">${smsTo}</span></p></div>`;
            break;
            
        case 'provider_approved':
            subject = `🎉 تمت الموافقة على طلبك وتفعيل حسابك في منصة سيّر`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${finalClientName}،</h2><p>تمت الموافقة على طلب الانضمام!</p><p>الإيميل: <strong style="color: #C89B3C;">${finalRecipientEmail}</strong></p><p>كلمة المرور المؤقتة: <strong style="color: #C89B3C;">${password}</strong></p><a href="${baseUrl}/login">تسجيل الدخول</a></div>`;
smsBody = `مرحباً ${finalClientName}،\nتمت الموافقة على انضمامك لمنصة سيّر! 🎉\nبيانات الدخول أرسلت لبريدك الإلكتروني.`;            break;

        case 'provider_rejected':
            subject = `تحديث بخصوص طلب انضمامك لمنصة سيّر`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${finalClientName}،</h2><p>نعتذر عن عدم تمكننا من قبول طلبك حالياً.</p><p>السبب: ${reason}</p></div>`;
            smsBody = `مرحباً ${finalClientName}،\nنعتذر لعدم تمكننا من قبول طلبك حالياً.\nالسبب: ${reason}`;
            break;

        default:
            return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    // 1. إرسال الإيميل (التعديل هنا) 👇
    if (finalRecipientEmail || type === 'new_service_notification' || type === 'new_provider_request') {
        const emailToUse = (type === 'new_service_notification' || type === 'new_provider_request') ? 'info@sayyir.sa' : finalRecipientEmail;
        
        if (emailToUse && process.env.RESEND_API_KEY) {
            try {
                await resend.emails.send({
                    from: 'منصة سَيّر <info@emails.sayyir.sa>', // ✅ تم إرجاع الدومين الموثق
                    to: emailToUse,
                    subject: subject,
                    html: html,
                });
                console.log("Email sent successfully");
            } catch (err: any) {
                console.error("Resend Email Error:", err);
            }
        }
    }

    // 2. إرسال الواتساب
    if (smsTo && smsBody) {
        try {
            const { data: settings } = await supabase.from('platform_settings').select('twilio_account_sid, twilio_auth_token, twilio_phone_number').eq('id', 1).single();
            
            if (settings?.twilio_account_sid && settings?.twilio_auth_token && settings?.twilio_phone_number) {
                const client = twilio(settings.twilio_account_sid, settings.twilio_auth_token);
                
                const formattedTo = `whatsapp:${smsTo.startsWith('+') ? smsTo : '+' + smsTo}`;
                const formattedFrom = `whatsapp:${settings.twilio_phone_number}`;

                await client.messages.create({
                    body: smsBody,
                    from: formattedFrom,
                    to: formattedTo,
                });
                console.log("WhatsApp message sent");
            }
        } catch (err: any) {
            console.error("Twilio WhatsApp Error:", err);
        }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Notification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}