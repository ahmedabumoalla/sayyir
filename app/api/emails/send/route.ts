import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/twilio';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // ✅ جعلنا الاستقبال مرناً ليتوافق مع كود العميل والمزود
    const { 
        type, email, clientEmail, name, clientName, serviceTitle, reason, providerName, 
        amount, expiryTime, bookingId, clientPhone,
        password, ticketCode, zatcaCode, totalPrice, quantity 
    } = body;

    // توحيد اسم المستلم (إما email أو clientEmail)
    const finalRecipientEmail = email || clientEmail;
    // توحيد اسم العميل (إما name أو clientName)
    const finalClientName = clientName || name || "عميلنا العزيز";

    let subject = '';
    let html = '';
    let smsTo = clientPhone || ''; 
    let smsBody = '';

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa';

    switch (type) {
        // ==========================================
        // 1. إشعارات الحجوزات (موافقة ورفض)
        // ==========================================
        case 'booking_approved_invoice':
            subject = `✅ تمت الموافقة على حجزك #${bookingId?.slice(0,6) || ''}`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333;">
                    <h2>مرحباً ${finalClientName}</h2>
                    <p>وافق المزود على حجزك لخدمة: <strong>${serviceTitle}</strong></p>
                    <p>المبلغ المطلوب: <strong>${amount} ريال</strong></p>
                    <a href="${baseUrl}/checkout?booking_id=${bookingId}" style="background-color: #C89B3C; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; font-weight: bold;">اضغط للدفع الآن وإتمام الحجز</a>
                </div>
            `;
            smsBody = `مرحباً ${finalClientName}،\nتمت الموافقة على حجزك (${serviceTitle})! 🎉\nيرجى الدفع لإتمام الحجز عبر الرابط:\n${baseUrl}/checkout?booking_id=${bookingId}`;
            break;

        case 'booking_rejected_notification':
            subject = `❌ تحديث بخصوص حجزك`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333;">
                    <h2>عذراً ${finalClientName}</h2>
                    <p>تم رفض حجزك لخدمة: <strong>${serviceTitle}</strong></p>
                    <p>السبب: ${reason}</p>
                </div>
            `;
            smsBody = `مرحباً ${finalClientName}،\nعذراً، تم رفض طلب حجزك لخدمة ${serviceTitle}.\nالسبب: ${reason}`;
            break;

        case 'new_booking_for_provider':
            subject = '🔔 طلب حجز جديد بانتظار موافقتك';
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333;">
                    <h2>مرحباً ${providerName}</h2>
                    <p>لديك حجز جديد لخدمة: <strong>${serviceTitle}</strong></p>
                    <p>العميل: ${finalClientName}</p>
                    <p>يرجى الدخول للوحة التحكم للقبول أو الرفض.</p>
                </div>
            `;
            smsBody = `تنبيه للمزود:\nلديك طلب حجز جديد لخدمة (${serviceTitle}).\nالرجاء مراجعة لوحة التحكم للقبول أو الرفض.`;
            break;

        // ==========================================
        // 🌟 2. إشعارات ما بعد الدفع (تذاكر) 🌟
        // ==========================================
        case 'booking_ticket_invoice':
            subject = `🎫 تذكرة الدخول والفاتورة الضريبية - حجز مؤكد`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333; max-w-lg; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #C89B3C;">مرحباً ${finalClientName}،</h2>
                    <p>تم تأكيد دفعك بنجاح لخدمة: <strong>${serviceTitle}</strong></p>
                    <p>المبلغ المدفوع: <strong>${totalPrice} ريال</strong></p>
                    
                    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; font-weight: bold;">تذكرة الدخول الخاصة بك (للمزود):</p>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketCode}" alt="Ticket QR Code" style="border-radius: 8px;" />
                        <p style="margin: 10px 0 0 0; font-family: monospace; font-size: 18px; letter-spacing: 2px;">${ticketCode?.split('-')[0].toUpperCase()}</p>
                    </div>

                    <div style="text-align: center; margin-top: 20px;">
                        <p style="font-size: 12px; color: #666;">الفاتورة الضريبية (هيئة الزكاة والدخل):</p>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${zatcaCode}" alt="ZATCA QR Code" />
                    </div>
                    
                    <p style="color: red; font-size: 12px; text-align: center; margin-top: 20px;">* يرجى إبراز الباركود الأول لمزود الخدمة عند وصولك. التذكرة صالحة للاستخدام مرة واحدة.</p>
                </div>
            `;
            smsBody = `تم تأكيد دفعك بنجاح لخدمة (${serviceTitle})! ✅\nتم إرسال تذكرة الدخول والفاتورة إلى بريدك الإلكتروني. نتمنى لك رحلة ممتعة.`;
            break;

        case 'provider_payment_received':
            subject = `💰 تم تأكيد دفع عميل لحجز جديد`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333;">
                    <h2>مرحباً ${providerName}،</h2>
                    <p>نود إعلامك بأن العميل <strong>${finalClientName}</strong> قام بالدفع وتأكيد الحجز بنجاح.</p>
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 15px 0;">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            <li style="margin-bottom: 8px;">الخدمة: <strong>${serviceTitle}</strong></li>
                            <li style="margin-bottom: 8px;">العدد/الكمية: <strong>${quantity}</strong></li>
                            <li>قيمة الحجز: <strong style="color: #16a34a;">${totalPrice} ريال</strong></li>
                        </ul>
                    </div>
                    <p>يرجى مسح باركود تذكرة العميل عند وصوله لتسجيل حضوره وإتمام الخدمة.</p>
                </div>
            `;
            smsBody = `تنبيه للمزود: قام العميل ${finalClientName} بالدفع وتأكيد حجزه لخدمة (${serviceTitle}). يرجى الاستعداد لاستقباله ومسح تذكرته عند الوصول.`;
            break;

        // ==========================================
        // 3. إشعارات مراجعة الخدمات (للشركاء والمزودين)
        // ==========================================
        case 'service_approved':
            subject = `🎉 تمت الموافقة على خدمتك في منصة سيّر!`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>مرحباً ${finalClientName}،</h2>
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
                    <h2>مرحباً ${finalClientName}،</h2>
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
        // 4. إشعارات للإدارة 
        // ==========================================
        case 'new_service_notification':
            // هنا نثبت الإيميل للإدارة
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
        // 5. إشعار تفعيل حساب المزود
        // ==========================================
        case 'provider_approved':
            subject = `🎉 تمت الموافقة على طلبك وتفعيل حسابك في منصة سيّر`;
            html = `
                <div dir="rtl" style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>مرحباً ${finalClientName}،</h2>
                    <p>يسعدنا إخبارك بأنه تمت الموافقة على طلب الانضمام كشريك في منصة سيّر!</p>
                    <p>تم إنشاء حسابك بنجاح، ويمكنك الآن الدخول إلى لوحة تحكم المزود الخاصة بك.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
                        <p style="margin: 0 0 10px 0;"><strong>بيانات الدخول:</strong></p>
                        <p style="margin: 0;">البريد الإلكتروني: <strong style="color: #C89B3C;">${finalRecipientEmail}</strong></p>
                        <p style="margin: 5px 0 0 0;">كلمة المرور المؤقتة: <strong style="color: #C89B3C;">${password}</strong></p>
                    </div>

                    <p style="color: red; font-size: 13px;">* الرجاء تغيير كلمة المرور فور دخولك لحسابك من صفحة الإعدادات.</p>

                    <a href="${baseUrl}/login" style="background-color: #111; color: #C89B3C; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; font-weight: bold;">تسجيل الدخول الآن</a>
                    
                    <br><br>
                    <p style="color: #888; font-size: 12px;">فريق منصة سيّر</p>
                </div>
            `;
            
            smsBody = `مرحباً ${finalClientName}،\nتمت الموافقة على انضمامك لمنصة سيّر!\nبيانات الدخول أرسلت لبريدك الإلكتروني.`;
            break;

        default:
            console.log("نوع الإيميل غير معروف:", type);
            return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    // التنفيذ النهائي للإرسال
    if (finalRecipientEmail || type === 'new_service_notification') {
        const emailToUse = type === 'new_service_notification' ? 'info@sayyir.sa' : finalRecipientEmail;
        
        if (emailToUse) {
            await resend.emails.send({
                from: 'منصة سَيّر <info@emails.sayyir.sa>',
                to: emailToUse,
                subject: subject,
                html: html,
            });
        }
    }

    if (smsTo && smsBody) {
        await sendSMS({
            to: smsTo,
            body: smsBody
        }).catch(err => console.error("Twilio SMS failed:", err));
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Notification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}