import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/twilio'; // ✅

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        type, email, name, serviceTitle, reason, providerName, 
        amount, expiryTime, clientEmail, clientName, bookingId, clientPhone,
        password // ✅ تم إضافة استخراج كلمة المرور هنا
    } = body;

    // إعدادات الإيميل
    let recipientEmail = email || clientEmail;
    let subject = '';
    let html = '';
    
    // إعدادات الرسائل النصية
    let smsTo = clientPhone || ''; 
    let smsBody = '';

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa';

    switch (type) {
        // ==========================================
        // 1. إشعارات الحجوزات (العملاء والمزودين)
        // ==========================================
        case 'booking_approved_invoice':
            subject = `✅ تمت الموافقة على حجزك #${bookingId?.slice(0,6)}`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${clientName}</h2><p>وافق المزود على حجزك لخدمة: <strong>${serviceTitle}</strong></p><p>المبلغ المطلوب: <strong>${amount} ريال</strong></p><a href="${baseUrl}/checkout?booking_id=${bookingId}" style="background-color: #C89B3C; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; font-weight: bold;">اضغط للدفع الآن وإتمام الحجز</a></div>`;
            
            smsBody = `مرحباً ${clientName}،\nتمت الموافقة على حجزك (${serviceTitle})! 🎉\nيرجى الدفع لإتمام الحجز عبر الرابط:\n${baseUrl}/checkout?booking_id=${bookingId}`;
            break;

        case 'booking_rejected_notification':
            subject = `❌ تحديث بخصوص حجزك`;
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>عذراً ${clientName}</h2><p>تم رفض حجزك لخدمة: <strong>${serviceTitle}</strong></p><p>السبب: ${reason}</p></div>`;
            
            smsBody = `مرحباً ${clientName}،\nعذراً، تم رفض طلب حجزك لخدمة ${serviceTitle}.\nالسبب: ${reason}`;
            break;

        case 'new_booking_for_provider':
            subject = '🔔 طلب حجز جديد بانتظار موافقتك';
            html = `<div dir="rtl" style="font-family: sans-serif; color: #333;"><h2>مرحباً ${providerName}</h2><p>لديك حجز جديد لخدمة: <strong>${serviceTitle}</strong></p><p>العميل: ${name}</p><p>يرجى الدخول للوحة التحكم للقبول أو الرفض.</p></div>`;
            
            smsBody = `تنبيه للمزود:\nلديك طلب حجز جديد لخدمة (${serviceTitle}).\nالرجاء مراجعة لوحة التحكم للقبول أو الرفض.`;
            break;

        // ==========================================
        // 2. إشعارات مراجعة الخدمات (للشركاء والمزودين)
        // ==========================================
        case 'service_approved':
            subject = `🎉 تمت الموافقة على خدمتك في منصة سيّر!`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>مرحباً ${name}،</h2>
                    <p>يسعدنا إخبارك بأنه تمت مراجعة والموافقة على إدراج خدمتك: <strong>"${serviceTitle}"</strong>.</p>
                    <p>الخدمة الآن متاحة ومباشرة للعملاء على منصة سيّر.</p>
                    <p>نتمنى لك التوفيق ومزيداً من الحجوزات!</p>
                    <br>
                    <p style="color: #888; font-size: 12px;">فريق منصة سيّر</p>
                </div>
            `;
            break;

        case 'service_rejected':
            subject = `⚠️ تحديث هام بخصوص خدمتك في منصة سيّر`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>مرحباً ${name}،</h2>
                    <p>هناك تحديث بخصوص خدمتك: <strong>"${serviceTitle}"</strong>.</p>
                    <div style="background-color: #ffeaea; padding: 15px; border-right: 4px solid #ff4d4f; border-radius: 5px; margin: 15px 0;">
                        <p style="margin:0; font-weight: bold; color: #d9363e;">ملاحظات الإدارة:</p>
                        <p style="margin-top: 5px; white-space: pre-wrap;">${reason}</p>
                    </div>
                    <p>يرجى الدخول إلى لوحة التحكم الخاصة بك لمراجعة التفاصيل أو إجراء التعديلات المطلوبة.</p>
                    <br>
                    <p style="color: #888; font-size: 12px;">فريق منصة سيّر</p>
                </div>
            `;
            break;

        // ==========================================
        // 3. إشعارات للإدارة (عند إضافة خدمة جديدة)
        // ==========================================
        case 'new_service_notification':
            recipientEmail = 'info@sayyir.sa'; // ضع إيميل الإدارة الحقيقي هنا
            subject = `🔔 خدمة جديدة بانتظار المراجعة`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>تنبيه للإدارة،</h2>
                    <p>قام المزود <strong>${providerName}</strong> بإضافة خدمة جديدة تحتاج لمراجعتك.</p>
                    <p>اسم الخدمة: <strong>${serviceTitle}</strong></p>
                    <a href="${baseUrl}/admin/services" style="background-color: #111; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">انتقل لصفحة المراجعة</a>
                </div>
            `;
            break;
            
        // ==========================================
        // 4. إشعار الموافقة على طلب الانضمام (للمزود الجديد) ✅
        // ==========================================
        case 'provider_approved':
            subject = `🎉 تمت الموافقة على طلبك وتفعيل حسابك في منصة سيّر`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>مرحباً ${name}،</h2>
                    <p>يسعدنا إخبارك بأنه تمت الموافقة على طلب الانضمام كشريك في منصة سيّر!</p>
                    <p>تم إنشاء حسابك بنجاح، ويمكنك الآن الدخول إلى لوحة تحكم المزود الخاصة بك.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
                        <p style="margin: 0 0 10px 0;"><strong>بيانات الدخول:</strong></p>
                        <p style="margin: 0;">البريد الإلكتروني: <strong style="color: #C89B3C;">${email}</strong></p>
                        <p style="margin: 5px 0 0 0;">كلمة المرور المؤقتة: <strong style="color: #C89B3C;">${password}</strong></p>
                    </div>

                    <p style="color: red; font-size: 13px;">* الرجاء تغيير كلمة المرور فور دخولك لحسابك من صفحة الإعدادات.</p>

                    <a href="${baseUrl}/login" style="background-color: #111; color: #C89B3C; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; font-weight: bold;">تسجيل الدخول الآن</a>
                    
                    <br><br>
                    <p style="color: #888; font-size: 12px;">فريق منصة سيّر</p>
                </div>
            `;
            
            // إضافة رسالة جوال في حال كان الرقم متوفر
            smsBody = `مرحباً ${name}،\nتمت الموافقة على انضمامك لمنصة سيّر!\nبيانات الدخول أرسلت لبريدك الإلكتروني.`;
            break;

        default:
            console.log("نوع الإيميل غير معروف:", type);
            return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    // 1. تنفيذ إرسال الإيميل (Resend)
    if (recipientEmail) {
        await resend.emails.send({
            from: 'منصة سَيّر <info@emails.sayyir.sa>',
            to: recipientEmail,
            subject: subject,
            html: html,
        });
    }

    // 2. تنفيذ إرسال SMS (Twilio) ✅
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