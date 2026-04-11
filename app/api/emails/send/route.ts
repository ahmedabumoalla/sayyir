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
        type, clientEmail, providerEmail, clientName, providerName, 
        serviceTitle, reason, amount, bookingId, clientPhone, 
        providerPhone, password, ticketCode, zatcaCode, totalPrice 
    } = body;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa';
    const finalClientName = clientName || "عميلنا العزيز";
    const finalProviderName = providerName || "شريكنا العزيز";

    // دالة مساعدة لإرسال الإيميل
    const sendEmail = async (to: string, subject: string, html: string) => {
        if (!to || !process.env.RESEND_API_KEY) return;
        try {
            await resend.emails.send({
                from: 'منصة سَيّر <info@emails.sayyir.sa>',
                to, subject, html,
            });
        } catch (err) { console.error("Resend Error:", err); }
    };

    // دالة مساعدة لإرسال الواتساب
    const sendWhatsApp = async (phone: string, message: string) => {
        if (!phone || !message) return;
        try {
            const { data: settings } = await supabase.from('platform_settings').select('twilio_account_sid, twilio_auth_token, twilio_phone_number').eq('id', 1).single();
            if (settings?.twilio_account_sid && settings?.twilio_auth_token) {
                const client = twilio(settings.twilio_account_sid, settings.twilio_auth_token);
                const formattedTo = `whatsapp:${phone.startsWith('+') ? phone : '+' + phone}`;
                await client.messages.create({
                    body: message,
                    from: `whatsapp:${settings.twilio_phone_number}`,
                    to: formattedTo,
                });
            }
        } catch (err) { console.error("Twilio Error:", err); }
    };

    switch (type) {
        // 1. طلب حجز جديد (يصل للطرفين)
        case 'new_booking_request':
            // للعميل
            await sendEmail(clientEmail, `🔔 تم استلام طلب حجزك: ${serviceTitle}`, `<div dir="rtl"><h2>مرحباً ${finalClientName}</h2><p>تم إرسال طلب حجزك لـ <strong>${serviceTitle}</strong> بنجاح.</p><p>نحن الآن بانتظار موافقة المزود، وسنخطرك فور التحديث.</p></div>`);
            await sendWhatsApp(clientPhone, `مرحباً ${finalClientName}، تم استلام طلب حجزك لـ (${serviceTitle}). نحن بانتظار تأكيد المزود.`);
            
            // للمزود
            await sendEmail(providerEmail, `🔔 طلب حجز جديد بانتظار موافقتك`, `<div dir="rtl"><h2>مرحباً ${finalProviderName}</h2><p>لديك طلب حجز جديد لخدمة: <strong>${serviceTitle}</strong> من العميل ${finalClientName}.</p><p>يرجى الدخول للوحة التحكم للقبول أو الرفض.</p></div>`);
            await sendWhatsApp(providerPhone, `تنبيه للمزود: لديك طلب حجز جديد لخدمة (${serviceTitle}). يرجى مراجعة لوحة التحكم.`);
            break;

        // 2. الموافقة على الحجز وإرسال رابط الدفع (يصل للطرفين)
        case 'booking_approved_invoice':
            // للعميل (رابط الدفع)
            await sendEmail(clientEmail, `✅ تمت الموافقة على حجزك #${bookingId?.slice(0,6)}`, `<div dir="rtl"><h2>مرحباً ${finalClientName}</h2><p>وافق المزود على حجزك لخدمة: <strong>${serviceTitle}</strong></p><p>المبلغ المطلوب: <strong>${amount} ريال</strong></p><a href="${baseUrl}/checkout?booking_id=${bookingId}" style="background-color: #C89B3C; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">اضغط للدفع الآن وإتمام الحجز</a></div>`);
            await sendWhatsApp(clientPhone, `أخبار سارة ${finalClientName}! تمت الموافقة على حجزك (${serviceTitle}). يرجى إتمام الدفع عبر الرابط: ${baseUrl}/checkout?booking_id=${bookingId}`);
            
            // للمزود (تأكيد الموافقة)
            await sendEmail(providerEmail, `✅ لقد وافقت على الحجز #${bookingId?.slice(0,6)}`, `<div dir="rtl"><h2>مرحباً ${finalProviderName}</h2><p>لقد قمت بالموافقة على حجز العميل ${finalClientName}.</p><p>تم إرسال رابط الدفع للعميل، وسنخطرك فور إتمام العملية.</p></div>`);
            break;

        // 3. تأكيد الدفع - التذكرة والفاتورة (يصل للطرفين)
        case 'booking_payment_confirmed':
            // للعميل (التذكرة)
            await sendEmail(clientEmail, `🎫 تذكرة حجزك المؤكد: ${serviceTitle}`, `<div dir="rtl" style="font-family: sans-serif; max-w-lg; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;"><h2>تم تأكيد الحجز!</h2><p>شكراً ${finalClientName}، تم تأكيد دفعك لخدمة: <strong>${serviceTitle}</strong></p><div style="text-align: center; background: #f9f9f9; padding: 15px; border-radius: 10px;"><p>تذكرة الدخول:</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketCode}" /><p>${ticketCode}</p></div></div>`);
            await sendWhatsApp(clientPhone, `تم تأكيد حجزك لـ (${serviceTitle}) بنجاح! ✅ التذكرة وصلت بريدك الإلكتروني. رحلة سعيدة!`);

            // للمزود (إشعار استلام المال)
            await sendEmail(providerEmail, `💰 تم دفع مبلغ الحجز لخدمة: ${serviceTitle}`, `<div dir="rtl"><h2>مرحباً ${finalProviderName}</h2><p>العميل <strong>${finalClientName}</strong> أكمل عملية الدفع بنجاح.</p><p>المبلغ الصافي سيضاف لمحفظتك. يرجى الاستعداد لتقديم الخدمة.</p></div>`);
            await sendWhatsApp(providerPhone, `تنبيه: العميل ${finalClientName} أكمل الدفع لخدمة (${serviceTitle}). الحجز الآن مؤكد 100%.`);
            break;

        // 4. رفض الحجز (يصل للطرفين)
        case 'booking_rejected':
            // للعميل
            await sendEmail(clientEmail, `❌ تحديث بخصوص طلب حجزك`, `<div dir="rtl"><h2>نعتذر منك ${finalClientName}</h2><p>تم رفض طلب حجزك لخدمة: <strong>${serviceTitle}</strong></p><p>السبب: ${reason}</p></div>`);
            await sendWhatsApp(clientPhone, `نعتذر منك ${finalClientName}، تم رفض طلب حجزك لـ (${serviceTitle}). السبب: ${reason}`);

            // للمزود
            await sendEmail(providerEmail, `❌ تم تنفيذ طلب الرفض`, `<div dir="rtl"><h2>مرحباً ${finalProviderName}</h2><p>تم إرسال إشعار الرفض للعميل ${finalClientName} بخصوص خدمة ${serviceTitle}.</p></div>`);
            break;

        // 5. إلغاء الحجز (يصل للطرفين)
        case 'booking_cancelled':
            const cancelMsg = `تم إلغاء الحجز الخاص بـ (${serviceTitle}) بنجاح.`;
            await sendEmail(clientEmail, `🚫 تم إلغاء حجزك`, `<div dir="rtl"><h2>مرحباً ${finalClientName}</h2><p>${cancelMsg}</p></div>`);
            await sendEmail(providerEmail, `🚫 إشعار إلغاء حجز`, `<div dir="rtl"><h2>تنبيه للمزود</h2><p>نود إعلامك بأنه تم إلغاء الحجز الخاص بالخدمة: <strong>${serviceTitle}</strong>.</p></div>`);
            await sendWhatsApp(clientPhone, cancelMsg);
            await sendWhatsApp(providerPhone, `تنبيه: تم إلغاء حجز لخدمة (${serviceTitle}).`);
            break;

        // --- إشعارات الإدارة والخدمات ---
        case 'service_approved':
            await sendEmail(providerEmail, `🎉 تمت الموافقة على خدمتك!`, `<div dir="rtl"><h2>مرحباً ${finalProviderName}</h2><p>تمت الموافقة على إدراج خدمتك: <strong>"${serviceTitle}"</strong> وهي متاحة الآن للعملاء.</p></div>`);
            break;

        case 'new_service_notification':
            await sendEmail('info@sayyir.sa', `🔔 خدمة جديدة بانتظار المراجعة`, `<div dir="rtl"><h2>تنبيه للإدارة</h2><p>المزود ${finalProviderName} أضاف خدمة: ${serviceTitle}</p></div>`);
            break;

        case 'provider_approved':
            await sendEmail(clientEmail, `🎉 مرحباً بك كشريك في سيّر`, `<div dir="rtl"><h2>مرحباً ${finalClientName}</h2><p>تم تفعيل حسابك! كلمة المرور: <strong>${password}</strong></p></div>`);
            break;

        default:
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}