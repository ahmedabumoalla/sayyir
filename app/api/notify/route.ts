import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import { Resend } from 'resend';

// تهيئة الاتصال بقاعدة البيانات
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// تهيئة الإيميل (تأكد أنك أضفت RESEND_API_KEY في ملف .env)
const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// 📝 قوالب الإشعارات الموحدة (Email & WhatsApp)
// ==========================================
const TEMPLATES: Record<string, { subject: string, body: string }> = {
  
  // 1. طلب انضمام جديد (للإدارة)
  'new_provider_request': {
    subject: '🚀 طلب انضمام شريك جديد: {{providerName}}',
    body: 'مرحباً فريق الإدارة،\nيوجد طلب انضمام جديد بانتظار مراجعتكم:\n🏢 اسم الجهة: {{providerName}}\n📧 الإيميل: {{email}}\n📱 الجوال: {{phone}}\n\nيرجى مراجعة الطلب عبر لوحة التحكم.'
  },

  // 2. قبول المزود
  'provider_approved': {
    subject: '🎉 أهلاً بك كشريك نجاح في منصة سيّر!',
    body: 'مرحباً {{providerName}}،\nيسعدنا إخبارك بأنه تم قبول طلب انضمامك لمنصة "سيّر".\n\nبيانات الدخول:\nالبريد: {{email}}\nكلمة المرور المؤقتة: {{password}}\n\nيمكنك الآن الدخول والبدء برفع خدماتك!'
  },

  // 3. رفض المزود
  'provider_rejected': {
    subject: 'تحديث بخصوص طلب انضمامك لمنصة سيّر',
    body: 'مرحباً {{providerName}}،\nنشكر لك اهتمامك. نعتذر عن عدم تمكننا من قبول طلبك حالياً للأسباب التالية:\n{{reason}}\n\nنسعد باستقبال طلبك مجدداً بعد تعديل الملاحظات.'
  },

  // 4. قبول خدمة جديدة
  'service_approved': {
    subject: '✅ تمت الموافقة على خدمتك: {{serviceName}}',
    body: 'مرحباً {{providerName}}،\nأخبار رائعة! تمت مراجعة خدمتك ({{serviceName}}) ونشرها بنجاح. هي الآن متاحة للحجز من قبل الزوار.'
  },

  // 5. رفض/تعديل خدمة
  'service_rejected': {
    subject: '⚠️ مطلوب تعديلات على خدمتك: {{serviceName}}',
    body: 'مرحباً {{providerName}}،\nيرجى إجراء التعديلات التالية على خدمتك ({{serviceName}}) لتتمكن من نشرها:\n{{reason}}'
  },

  // 6. طلب حجز جديد (للمزود)
  'new_booking_provider': {
    subject: '📅 طلب حجز جديد بانتظار تأكيدك! (#{{bookingId}})',
    body: 'مرحباً {{providerName}}،\nلديك طلب حجز جديد لخدمتك ({{serviceName}}).\nالعميل: {{clientName}}\nالتاريخ: {{date}}\nالوقت: {{time}}\nالعدد: {{guests}} أشخاص\n\nيرجى تأكيد الحجز خلال 24 ساعة من لوحة التحكم.'
  },

  // 7. قبول الحجز من المزود (طلب الدفع من العميل)
  'booking_accepted_pay_now': {
    subject: '🎉 تم تأكيد توفر حجزك! أكمل الدفع الآن',
    body: 'مرحباً {{clientName}}،\nالمزود أكد توفر حجزك لـ ({{serviceName}}) بتاريخ ({{date}}).\n\nلضمان تأكيد الحجز، يرجى إكمال الدفع بقيمة {{price}} ريال عبر الرابط:\n{{paymentLink}}'
  },

  // 8. تأكيد الدفع النهائي للعميل (التذكرة)
  'booking_paid_client': {
    subject: '✅ تم تأكيد حجزك بنجاح! تذكرتك لـ {{serviceName}}',
    body: 'مرحباً {{clientName}}،\nتم استلام دفعتك وتأكيد حجزك نهائياً! رقم الحجز: #{{bookingId}}\nالتاريخ والوقت: {{date}} - {{time}}\n\nرابط تذكرتك والباركود: {{ticketLink}}\nنتمنى لك رحلة سعيدة!'
  },

  // 9. تأكيد الدفع للمزود (العميل دفع)
  'booking_paid_provider': {
    subject: '💵 تم الدفع! العميل بانتظارك (حجز #{{bookingId}})',
    body: 'مرحباً {{providerName}}،\nالعميل ({{clientName}}) دفع قيمة الحجز بنجاح. الحجز مؤكد ونهائي.\nالتاريخ: {{date}}\nالعدد: {{guests}}\nأرباحك الصافية: {{providerProfit}} ريال.\nاستعد لاستقبال العميل!'
  }
};

// دالة لتبديل المتغيرات في النص
const fillTemplate = (text: string, data: any) => {
  let result = text;
  for (const key in data) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), data[key] || '');
  }
  return result;
};

export async function POST(req: Request) {
  try {
    const { type, email, phone, templateId, data } = await req.json();

    if (!templateId || !TEMPLATES[templateId]) {
      return NextResponse.json({ error: "قالب الإشعار غير موجود" }, { status: 400 });
    }

    const template = TEMPLATES[templateId];
    const messageBody = fillTemplate(template.body, data);
    const messageSubject = fillTemplate(template.subject, data);

    const results: any = {};

    // ==========================================
    // 1. إرسال الإيميل (إذا كان متوفراً)
    // ==========================================
    if (email && process.env.RESEND_API_KEY) {
      try {
        const emailRes = await resend.emails.send({
          from: 'Sayyir Notifications <no-reply@sayyir.com>', // عدله لدومينك الموثق لاحقاً
          to: email,
          subject: messageSubject,
          text: messageBody,
        });
        results.email = emailRes;
      } catch (e: any) {
        console.error("Email Error:", e);
        results.emailError = e.message;
      }
    }

    // ==========================================
    // 2. إرسال الواتساب/SMS (إذا كان متوفراً)
    // ==========================================
    if (phone) {
      // جلب مفاتيح Twilio من الإعدادات
      const { data: settings } = await supabase.from('platform_settings').select('twilio_account_sid, twilio_auth_token, twilio_phone_number').eq('id', 1).single();
      
      if (settings?.twilio_account_sid) {
        try {
          const client = twilio(settings.twilio_account_sid, settings.twilio_auth_token);
          
          // تأكد من صيغة الرقم الدولي، إضافة whatsapp: للواتس
          const formattedTo = `whatsapp:${phone.startsWith('+') ? phone : '+' + phone}`;
          const formattedFrom = `whatsapp:${settings.twilio_phone_number}`;

          const waRes = await client.messages.create({
            body: `*${messageSubject}*\n\n${messageBody}`, // تنسيق رسالة الواتس
            from: formattedFrom,
            to: formattedTo,
          });
          results.whatsapp = waRes.sid;
        } catch (e: any) {
          console.error("WhatsApp Error:", e);
          results.whatsappError = e.message;
        }
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}