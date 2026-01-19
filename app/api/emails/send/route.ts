import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/twilio'; // ✅

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        type, email, name, serviceTitle, reason, providerName, 
        amount, expiryTime, clientEmail, clientName, bookingId, clientPhone 
    } = body;

    // إعدادات الإيميل
    let recipientEmail = email || clientEmail;
    let subject = '';
    let html = '';
    
    // إعدادات الرسائل النصية
    let smsTo = clientPhone || ''; // نحتاج رقم جوال العميل إذا كان متوفراً في الـ Body
    let smsBody = '';

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa';

    switch (type) {
        // 1. فاتورة الموافقة (للعميل)
        case 'booking_approved_invoice':
            subject = `✅ تمت الموافقة على حجزك #${bookingId?.slice(0,6)}`;
            html = `<div dir="rtl"><h2>مرحباً ${clientName}</h2><p>وافق المزود على حجزك لخدمة: ${serviceTitle}</p><p>المبلغ: ${amount} ريال</p><a href="${baseUrl}/checkout?booking_id=${bookingId}">اضغط للدفع الآن</a></div>`;
            
            smsBody = `مرحباً ${clientName}،\nتمت الموافقة على حجزك (${serviceTitle})! 🎉\nيرجى الدفع لإتمام الحجز عبر الرابط:\n${baseUrl}/checkout?booking_id=${bookingId}`;
            break;

        // 2. إشعار رفض الحجز (للعميل)
        case 'booking_rejected_notification':
            subject = `❌ تحديث بخصوص حجزك`;
            html = `<div dir="rtl"><h2>عذراً ${clientName}</h2><p>تم رفض حجزك لخدمة: ${serviceTitle}</p><p>السبب: ${reason}</p></div>`;
            
            smsBody = `مرحباً ${clientName}،\nعذراً، تم رفض طلب حجزك لخدمة ${serviceTitle}.\nالسبب: ${reason}`;
            break;

        // 3. طلب حجز جديد (للمزود)
        case 'new_booking_for_provider':
            subject = '🔔 طلب حجز جديد بانتظار موافقتك';
            html = `<div dir="rtl"><h2>مرحباً ${providerName}</h2><p>لديك حجز جديد لخدمة: ${serviceTitle}</p><p>العميل: ${name}</p></div>`;
            
            // هنا المفروض smsTo تكون رقم المزود (تحتاج تمريرها من الفرونت إند)
            smsBody = `تنبيه للمزود:\nلديك طلب حجز جديد لخدمة (${serviceTitle}).\nالرجاء مراجعة لوحة التحكم للقبول أو الرفض.`;
            break;
            
        // ... باقي الحالات ...
    }

    // 1. تنفيذ إرسال الإيميل (Resend)
    if (recipientEmail) {
        await resend.emails.send({
            from: 'فريق سَيّر <info@emails.sayyir.sa>',
            to: recipientEmail,
            subject: subject,
            html: html,
        });
    }

    // 2. تنفيذ إرسال SMS (Twilio) ✅
    // نرسل فقط إذا وجدنا رقم جوال ونص رسالة
    if (smsTo && smsBody) {
        await sendSMS({
            to: smsTo,
            body: smsBody
        });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Notification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}