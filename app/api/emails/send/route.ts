import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

// 1. تهيئة أدوات الإرسال وقاعدة البيانات
const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==========================================
// 2. قوالب الإيميلات (Templates) الموحدة للمنصة
// ==========================================
const TEMPLATES: Record<string, { subject: string, html: string }> = {
  
  // ----- إشعارات الحجوزات -----
  'new_booking_provider': {
    subject: '🔔 طلب حجز جديد بانتظار تأكيدك! (#{{bookingId}})',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #C89B3C;">مرحباً {{providerName}}،</h2>
        <p>لديك طلب حجز جديد لخدمتك: <strong>{{serviceName}}</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin: 15px 0;">
          <p><strong>👤 العميل:</strong> {{clientName}}</p>
          <p><strong>📅 التاريخ:</strong> {{date}}</p>
          <p><strong>⏰ الوقت:</strong> {{time}}</p>
          <p><strong>👥 العدد/الكمية:</strong> {{guests}}</p>
        </div>
        <p>يرجى الدخول إلى لوحة التحكم الخاصة بك لقبول أو رفض الحجز.</p>
        <p style="font-size: 12px; color: #777;">منصة سيّر - نظام الحجوزات</p>
      </div>
    `
  },

  'booking_approved_invoice': {
    subject: '✅ تمت الموافقة على حجزك - أكمل الدفع (#{{bookingId}})',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #C89B3C;">مرحباً {{clientName}}،</h2>
        <p>وافق المزود على حجزك لخدمة: <strong>{{serviceName}}</strong></p>
        <p>لضمان تأكيد الحجز وإصدار التذكرة، يرجى إتمام الدفع.</p>
        <a href="{{paymentLink}}" style="background-color: #C89B3C; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 15px;">اضغط هنا للدفع وإتمام الحجز</a>
      </div>
    `
  },

  'booking_payment_confirmed': {
    subject: '🎫 تم تأكيد حجزك! تذكرتك لخدمة {{serviceName}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; max-width: 500px; margin: auto;">
        <h2 style="color: #10B981;">تم تأكيد الحجز والدفع بنجاح!</h2>
        <p>مرحباً {{clientName}}، نتمنى لك وقتاً ممتعاً في <strong>{{serviceName}}</strong>.</p>
        <div style="text-align: center; background: #f9f9f9; padding: 20px; border-radius: 10px; margin-top: 20px; border: 1px dashed #ccc;">
          <p style="margin-bottom: 10px; font-weight: bold;">تذكرة الدخول الخاصة بك:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={{ticketCode}}" alt="QR Code" />
          <p style="font-family: monospace; font-size: 18px; letter-spacing: 2px; margin-top: 10px;">{{ticketCodeShort}}</p>
        </div>
      </div>
    `
  },

  'booking_rejected': {
    subject: '❌ تحديث بخصوص طلب حجزك لخدمة {{serviceName}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333;">
        <h2>نعتذر منك {{clientName}}،</h2>
        <p>تم رفض طلب حجزك لخدمة: <strong>{{serviceName}}</strong></p>
        <p>السبب المذكور: <span style="background-color: #fee2e2; padding: 2px 5px; border-radius: 4px;">{{reason}}</span></p>
        <p>نتمنى رؤيتك في حجوزات أخرى قريباً.</p>
      </div>
    `
  },

  // ----- إشعارات المزودين والخدمات (لوحة الإدارة) -----
  'new_provider_request': {
    subject: '🚀 طلب انضمام شريك جديد: {{providerName}}',
    html: '<div dir="rtl"><h2>تنبيه للإدارة</h2><p>يوجد طلب انضمام جديد بانتظار المراجعة من: <strong>{{providerName}}</strong></p></div>'
  },

  'provider_approved': {
    subject: '🎉 أهلاً بك كشريك نجاح في منصة سيّر!',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #C89B3C;">مرحباً {{providerName}}،</h2>
        <p>يسعدنا إخبارك بأنه تم قبول طلب انضمامك كمزود خدمة في منصة سيّر.</p>
        <p>بيانات الدخول المؤقتة:</p>
        <ul>
          <li>الإيميل: <strong>{{email}}</strong></li>
          <li>كلمة المرور: <strong>{{password}}</strong></li>
        </ul>
        <p>يرجى تسجيل الدخول وتغيير كلمة المرور فوراً.</p>
      </div>
    `
  },

  'service_approved': {
    subject: '✅ تمت الموافقة على خدمتك: {{serviceName}}',
    html: '<div dir="rtl" style="font-family: Arial, sans-serif;"><h2>مرحباً {{providerName}}،</h2><p>أخبار رائعة! تمت مراجعة خدمتك (<strong>{{serviceName}}</strong>) ونشرها بنجاح في المنصة.</p></div>'
  },

  'service_rejected': {
    subject: '⚠️ مطلوب تعديلات على خدمتك: {{serviceName}}',
    html: '<div dir="rtl" style="font-family: Arial, sans-serif;"><h2>مرحباً {{providerName}}،</h2><p>يرجى إجراء التعديلات التالية على خدمتك ({{serviceName}}) لتتمكن من نشرها:</p><p style="color: red;">{{reason}}</p></div>'
  }
};

// 3. دالة مساعدة لتبديل المتغيرات في القالب
const fillTemplate = (text: string, data: any) => {
  let result = text;
  for (const key in data) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), data[key] || '');
  }
  return result;
};

// ==========================================
// 4. الدالة الرئيسية لاستقبال الطلب وإرسال الإيميل
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templateId, type, email, phone, data } = body;

    // دعم التوافق مع الأكواد القديمة (إذا كان الطلب يرسل type بدلاً من templateId)
    const activeTemplateId = templateId || type;

    if (!activeTemplateId || !TEMPLATES[activeTemplateId]) {
      return NextResponse.json({ error: `قالب الإشعار (${activeTemplateId}) غير موجود` }, { status: 400 });
    }

    const template = TEMPLATES[activeTemplateId];
    
    // تجهيز النص بعد تعبئة البيانات
    const messageBody = fillTemplate(template.html, data || body);
    const messageSubject = fillTemplate(template.subject, data || body);

    const results: any = {};

    // ------------------------------------------------
    // إرسال الإيميل عبر Resend
    // ------------------------------------------------
    if (email && process.env.RESEND_API_KEY) {
      try {
        const emailRes = await resend.emails.send({
          // 🚨 تنبيه: يجب أن يكون هذا الإيميل موثق في حسابك في Resend
          from: 'منصة سَيّر <info@emails.sayyir.sa>', 
          to: email,
          subject: messageSubject,
          html: messageBody,
        });
        results.email = emailRes;
        console.log(`✅ Email sent to ${email} for template: ${activeTemplateId}`);
      } catch (e: any) {
        console.error("❌ Resend Email Error:", e);
        results.emailError = e.message;
      }
    }

    // ------------------------------------------------
    // إرسال رسالة واتساب عبر Twilio (اختياري)
    // ------------------------------------------------
    if (phone) {
      try {
        const { data: settings } = await supabaseAdmin.from('platform_settings').select('twilio_account_sid, twilio_auth_token, twilio_phone_number').eq('id', 1).single();
        
        if (settings?.twilio_account_sid && settings?.twilio_auth_token) {
          const client = twilio(settings.twilio_account_sid, settings.twilio_auth_token);
          const formattedTo = `whatsapp:${phone.startsWith('+') ? phone : '+' + phone}`;
          const formattedFrom = `whatsapp:${settings.twilio_phone_number}`;

          // تحويل الـ HTML إلى نص عادي للواتساب بشكل مبسط
          const plainTextBody = messageBody.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n').trim();

          const waRes = await client.messages.create({
            body: `*${messageSubject}*\n\n${plainTextBody}`,
            from: formattedFrom,
            to: formattedTo,
          });
          results.whatsapp = waRes.sid;
          console.log(`✅ WhatsApp sent to ${formattedTo}`);
        }
      } catch (e: any) {
        console.error("❌ Twilio WhatsApp Error:", e);
        results.whatsappError = e.message;
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("❌ Notification API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}