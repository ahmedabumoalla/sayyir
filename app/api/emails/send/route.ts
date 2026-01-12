import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        type, 
        email, 
        name, 
        serviceTitle, 
        reason, 
        providerName, 
        amount, 
        expiryTime, 
        clientEmail, 
        clientName, 
        bookingId 
    } = body;

    console.log("📨 جاري إرسال إيميل...", { type, email: email || clientEmail });

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error("❌ خطأ: بيانات Gmail غير موجودة في .env");
      return NextResponse.json({ error: "Gmail config missing" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, 
      },
    });

    let recipient = email || clientEmail;
    let subject = '';
    let html = '';

    // إشعارات الإدارة
    if (type === 'new_service_notification') {
       recipient = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
    }

    // الرابط الأساسي للموقع
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    switch (type) {
        
        // ✅ 1. فاتورة الموافقة (للعميل) - هنا التعديل المهم للرابط
        case 'booking_approved_invoice':
            subject = `✅ تمت الموافقة على حجزك #${bookingId?.slice(0,6)}`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #10b981;">مرحباً ${clientName || 'عميلنا العزيز'}</h2>
                    <p>يسعدنا إخبارك بأن المزود قد وافق على طلب حجزك لخدمة: <strong>${serviceTitle}</strong>.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>رقم الحجز:</strong> #${bookingId?.slice(0,6)}</p>
                        <p style="margin: 5px 0;"><strong>المبلغ المستحق:</strong> <span style="color: #C89B3C; font-weight: bold; font-size: 18px;">${amount} ريال</span></p>
                        <p style="margin: 5px 0; color: #ef4444;"><strong>تنتهي صلاحية الدفع في:</strong> ${expiryTime}</p>
                    </div>

                    <p>لإتمام الحجز وتأكيده، يرجى الدفع عبر الرابط أدناه قبل انتهاء المهلة:</p>
                    
                    <a href="${baseUrl}/checkout?booking_id=${bookingId}" style="background-color: #C89B3C; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 10px;">دفع الفاتورة الآن</a>
                    
                    <p style="font-size: 12px; color: #777; margin-top: 30px;">* في حال عدم الدفع خلال المهلة، سيتم إلغاء الحجز تلقائياً.</p>
                </div>`;
            break;

        // ✅ 2. إشعار رفض الحجز (للعميل)
        case 'booking_rejected_notification':
            subject = `❌ تحديث بخصوص حجزك لخدمة ${serviceTitle}`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; padding: 20px;">
                    <h2>عذراً، تم رفض طلب الحجز</h2>
                    <p>نأسف لإبلاغك بأن المزود لم يتمكن من قبول طلبك لخدمة <strong>${serviceTitle}</strong>.</p>
                    <div style="background: #fee2e2; color: #b91c1c; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <strong>سبب الرفض:</strong> ${reason}
                    </div>
                    <p>يمكنك تصفح خدمات أخرى أو تجربة وقت مختلف.</p>
                    <a href="${baseUrl}" style="color: #C89B3C;">العودة للمنصة</a>
                </div>`;
            break;

        // --- باقي الأنواع ---
        case 'new_booking_for_provider':
            subject = '🔔 طلب حجز جديد بانتظار موافقتك';
            html = `<div dir="rtl"><h2>مرحباً ${providerName}</h2><p>لديك طلب حجز جديد لخدمة: <strong>${serviceTitle}</strong></p><p><strong>العميل:</strong> ${name}</p><hr/><p>يرجى مراجعة لوحة التحكم.</p></div>`;
            break;

        case 'service_approved':
            subject = '✅ تمت الموافقة على خدمتك';
            html = `<div dir="rtl"><h2>مبروك ${name}</h2><p>تم نشر خدمتك: ${serviceTitle}</p></div>`;
            break;

        case 'service_rejected':
            subject = '⚠️ تم رفض الخدمة';
            html = `<div dir="rtl"><h2>مرحباً ${name}</h2><p>تم رفض خدمتك ${serviceTitle}.</p><p>السبب: ${reason}</p></div>`;
            break;

        case 'new_service_notification':
            subject = '🔔 خدمة جديدة للمراجعة';
            html = `<div dir="rtl"><h2>خدمة جديدة: ${serviceTitle}</h2><p>بواسطة: ${providerName}</p></div>`;
            break;

        default:
            console.error("❌ خطأ: نوع الرسالة غير معروف:", type);
            return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }

    if (!recipient) {
        console.error("❌ خطأ: لا يوجد مستلم للإيميل!");
        return NextResponse.json({ error: "Recipient missing" }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"منصة سَير" <${process.env.GMAIL_USER}>`,
      to: recipient,
      subject: subject,
      html: html,
    });

    console.log("✅ تم الإرسال بنجاح إلى:", recipient);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 فشل الإرسال:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}