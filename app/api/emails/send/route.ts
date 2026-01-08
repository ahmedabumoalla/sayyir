import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, email, name, serviceTitle, reason, providerName, paymentLink } = body;

    // 🔍 طباعة للتحقق (ستظهر في تيرمينال VS Code)
    console.log("📨 جاري محاولة إرسال إيميل...");
    console.log("🔹 النوع (Type):", type);
    console.log("🔹 المستلم (Email):", email);

    // 1. التحقق من إعدادات الجيميل
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error("❌ خطأ: بيانات Gmail غير موجودة في .env");
      return NextResponse.json({ error: "Gmail config missing" }, { status: 500 });
    }

    // 2. التحقق من وجود المستلم
    let recipient = email;
    
    // حالة خاصة: إشعارات الأدمن تذهب لإيميل الإدارة
    if (type === 'new_service_notification') {
        recipient = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
    }

    if (!recipient) {
        console.error("❌ خطأ: لا يوجد بريد إلكتروني للمستلم!");
        return NextResponse.json({ error: "Recipient email is missing" }, { status: 400 });
    }

    // 3. إعداد الناقل
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, 
      },
    });

    // 4. تحديد المحتوى والموضوع
    let subject = '';
    let html = '';

    switch (type) {
        // --- للمزود: حجز جديد ---
        case 'new_booking_for_provider':
            subject = '🔔 طلب حجز جديد بانتظار موافقتك';
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333;">
                    <h2>مرحباً ${providerName}</h2>
                    <p>لديك طلب حجز جديد لخدمة: <strong>${serviceTitle}</strong></p>
                    <p><strong>العميل:</strong> ${name}</p>
                    <p><strong>إيميل العميل:</strong> ${reason}</p>
                    <hr/>
                    <p>يرجى مراجعة لوحة التحكم لقبول الطلب.</p>
                </div>`;
            break;

        // --- للعميل: تمت الموافقة والدفع ---
        case 'booking_approved_pay_now':
            subject = '✅ تمت الموافقة! يرجى الدفع';
            html = `
                <div dir="rtl" style="font-family: sans-serif;">
                    <h2>مرحباً ${name}</h2>
                    <p>وافق المزود على حجزك لخدمة: <strong>${serviceTitle}</strong></p>
                    <p><a href="${paymentLink}">اضغط هنا للدفع وتأكيد الحجز</a></p>
                </div>`;
            break;

        // --- للعميل: تم الرفض ---
        case 'booking_rejected':
            subject = '❌ تم رفض طلب الحجز';
            html = `<div dir="rtl"><h2>مرحباً ${name}</h2><p>نعتذر، تم رفض طلبك لخدمة ${serviceTitle}.</p><p>السبب: ${reason}</p></div>`;
            break;

        // --- للمزود: الموافقة على الخدمة ---
        case 'service_approved':
            subject = '✅ تمت الموافقة على خدمتك';
            html = `<div dir="rtl"><h2>مبروك ${name}</h2><p>تم نشر خدمتك: ${serviceTitle}</p></div>`;
            break;

        // --- للمزود: رفض الخدمة ---
        case 'service_rejected':
            subject = '⚠️ تم رفض الخدمة';
            html = `<div dir="rtl"><h2>مرحباً ${name}</h2><p>تم رفض خدمتك ${serviceTitle}.</p><p>السبب: ${reason}</p></div>`;
            break;

        // --- للأدمن: خدمة جديدة ---
        case 'new_service_notification':
            subject = '🔔 خدمة جديدة للمراجعة';
            html = `<div dir="rtl"><h2>خدمة جديدة: ${serviceTitle}</h2><p>بواسطة: ${providerName}</p></div>`;
            break;

        default:
            console.error("❌ خطأ: نوع الرسالة غير معروف:", type);
            return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }

    // 5. الإرسال الفعلي
    const info = await transporter.sendMail({
      from: `"منصة سَير" <${process.env.GMAIL_USER}>`,
      to: recipient,
      subject: subject,
      html: html,
    });

    console.log("✅ تم الإرسال بنجاح:", info.messageId);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 فشل الإرسال (API Error):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}