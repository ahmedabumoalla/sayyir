import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Template = {
  subject: string;
  html: string;
};

const TEMPLATES: Record<string, Template> = {
  // ==========================================
  // إشعارات الحجوزات
  // ==========================================
  new_booking_provider: {
    subject: '🔔 طلب حجز جديد بانتظار تأكيدك! (#{{bookingId}})',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.8;">
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

  booking_pending_client: {
    subject: '⏳ تم استلام طلب حجزك وهو بانتظار رد المزود (#{{bookingId}})',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.8;">
        <h2 style="color: #C89B3C;">مرحباً {{clientName}}،</h2>
        <p>تم استلام طلب حجزك لخدمة: <strong>{{serviceName}}</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin: 15px 0;">
          <p><strong>📅 التاريخ:</strong> {{date}}</p>
          <p><strong>⏰ الوقت:</strong> {{time}}</p>
          <p><strong>👥 العدد/الكمية:</strong> {{guests}}</p>
        </div>
        <p>طلبك الآن قيد المراجعة من قبل المزود، وسيصلك تحديث فور اتخاذ القرار.</p>
        <p style="font-size: 12px; color: #777;">منصة سيّر - نظام الحجوزات</p>
      </div>
    `
  },

  booking_approved_invoice: {
    subject: '✅ تمت الموافقة على حجزك - أكمل الدفع (#{{bookingId}})',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.8;">
        <h2 style="color: #C89B3C;">مرحباً {{clientName}}،</h2>
        <p>وافق المزود على حجزك لخدمة: <strong>{{serviceName}}</strong></p>
        <p>لضمان تأكيد الحجز وإصدار التذكرة، يرجى إتمام الدفع عبر الرابط التالي:</p>
        <a href="{{paymentLink}}" style="background-color: #C89B3C; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 15px;">اضغط هنا للدفع وإتمام الحجز</a>
      </div>
    `
  },

  booking_rejected: {
    subject: '❌ تحديث بخصوص طلب حجزك لخدمة {{serviceName}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.8;">
        <h2>نعتذر منك {{clientName}}،</h2>
        <p>تم رفض طلب حجزك لخدمة: <strong>{{serviceName}}</strong></p>
        <p>السبب المذكور: <span style="background-color: #fee2e2; padding: 2px 5px; border-radius: 4px;">{{reason}}</span></p>
        <p>نتمنى رؤيتك في حجوزات أخرى قريباً.</p>
      </div>
    `
  },

  booking_payment_confirmed: {
    subject: '🎫 تم تأكيد حجزك! تذكرتك لخدمة {{serviceName}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; max-width: 560px; margin: auto; line-height: 1.8;">
        <h2 style="color: #10B981;">تم تأكيد الحجز والدفع بنجاح!</h2>
        <p>مرحباً {{clientName}}، نتمنى لك وقتاً ممتعاً في <strong>{{serviceName}}</strong>.</p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-top: 20px; border: 1px dashed #ccc; text-align: center;">
          <p style="margin-bottom: 10px; font-weight: bold;">تذكرة الدخول الخاصة بك:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={{ticketCode}}" alt="QR Code" />
          <p style="font-family: monospace; font-size: 18px; letter-spacing: 2px; margin-top: 10px;">{{ticketCodeShort}}</p>
        </div>
        <div style="margin-top: 18px; background: #fff8e8; padding: 12px 14px; border-radius: 8px; border: 1px solid #f1dfb0;">
          <p style="margin: 0;"><strong>رقم الحجز:</strong> {{bookingId}}</p>
          <p style="margin: 6px 0 0;"><strong>إجمالي الدفع:</strong> {{totalPrice}}</p>
        </div>
      </div>
    `
  },

  provider_payment_received: {
    subject: '💵 تم الدفع وتأكيد الحجز (#{{bookingId}})',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.8;">
        <h2 style="color: #C89B3C;">مرحباً {{providerName}}،</h2>
        <p>تم دفع الحجز وتأكيده بنجاح لخدمتك: <strong>{{serviceName}}</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin: 15px 0;">
          <p><strong>👤 العميل:</strong> {{clientName}}</p>
          <p><strong>👥 العدد/الكمية:</strong> {{guests}}</p>
          <p><strong>💰 المبلغ:</strong> {{totalPrice}}</p>
        </div>
        <p>الحجز الآن مؤكد ويمكنك الاستعداد لاستقبال العميل.</p>
      </div>
    `
  },

  // ==========================================
  // إشعارات المزودين والخدمات
  // ==========================================
  new_provider_request: {
    subject: '🚀 طلب انضمام شريك جديد: {{providerName}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>تنبيه للإدارة</h2>
        <p>يوجد طلب انضمام جديد بانتظار المراجعة من: <strong>{{providerName}}</strong></p>
      </div>
    `
  },

  provider_approved: {
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

  service_approved: {
    subject: '✅ تمت الموافقة على خدمتك: {{serviceName}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>مرحباً {{providerName}}،</h2>
        <p>أخبار رائعة! تمت مراجعة خدمتك (<strong>{{serviceName}}</strong>) ونشرها بنجاح في المنصة.</p>
      </div>
    `
  },

  service_rejected: {
    subject: '⚠️ مطلوب تعديلات على خدمتك: {{serviceName}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>مرحباً {{providerName}}،</h2>
        <p>يرجى إجراء التعديلات التالية على خدمتك ({{serviceName}}) لتتمكن من نشرها:</p>
        <p style="color: red;">{{reason}}</p>
      </div>
    `
  }
};

// aliases للتوافق مع الأكواد القديمة
const TEMPLATE_ALIASES: Record<string, string> = {
  booking_confirmed: 'booking_payment_confirmed',
  booking_ticket_invoice: 'booking_payment_confirmed',
  provider_payment_received_old: 'provider_payment_received',
  booking_accepted_pay_now: 'booking_approved_invoice',
  booking_paid_client: 'booking_payment_confirmed',
  booking_paid_provider: 'provider_payment_received'
};

const fillTemplate = (text: string, data: Record<string, any>) => {
  let result = text;
  for (const key in data) {
    const value = data[key] === null || data[key] === undefined ? '' : String(data[key]);
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
};

const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templateId, type, email, phone } = body;

    const incomingTemplateId = templateId || type;
    const activeTemplateId = TEMPLATE_ALIASES[incomingTemplateId] || incomingTemplateId;

    if (!activeTemplateId || !TEMPLATES[activeTemplateId]) {
      return NextResponse.json(
        { error: `قالب الإشعار (${incomingTemplateId}) غير موجود` },
        { status: 400 }
      );
    }

    const mergedData = {
      ...(body || {}),
      ...((body && body.data) || {})
    };

    if (!mergedData.serviceName && mergedData.serviceTitle) {
      mergedData.serviceName = mergedData.serviceTitle;
    }

    if (!mergedData.ticketCodeShort && mergedData.ticketCode) {
      mergedData.ticketCodeShort = String(mergedData.ticketCode).slice(0, 16);
    }

    if (!mergedData.totalPrice && mergedData.price) {
      mergedData.totalPrice = `${mergedData.price} ريال`;
    }

    const template = TEMPLATES[activeTemplateId];
    const messageBody = fillTemplate(template.html, mergedData);
    const messageSubject = fillTemplate(template.subject, mergedData);

    const results: Record<string, any> = {
      template: activeTemplateId
    };

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'لا يوجد email أو phone للإرسال', results },
        { status: 400 }
      );
    }

    if (email && process.env.RESEND_API_KEY) {
      try {
        const emailRes = await resend.emails.send({
          from: 'منصة سَيّر <info@emails.sayyir.sa>',
          to: Array.isArray(email) ? email : [email],
          subject: messageSubject,
          html: messageBody
        });
        results.email = emailRes;
      } catch (e: any) {
        console.error('❌ Resend Email Error:', e);
        results.emailError = e?.message || 'Email send failed';
      }
    }

    if (phone) {
      try {
        const { data: settings, error } = await supabaseAdmin
          .from('platform_settings')
          .select('twilio_account_sid, twilio_auth_token, twilio_phone_number')
          .eq('id', 1)
          .single();

        if (error) throw error;

        if (settings?.twilio_account_sid && settings?.twilio_auth_token && settings?.twilio_phone_number) {
          const client = twilio(settings.twilio_account_sid, settings.twilio_auth_token);
          const normalizedPhone = String(phone).trim();
          const formattedTo = `whatsapp:${normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`}`;
          const formattedFrom = `whatsapp:${settings.twilio_phone_number}`;

          const plainTextBody = stripHtml(messageBody);

          const waRes = await client.messages.create({
            body: `*${messageSubject}*\n\n${plainTextBody}`,
            from: formattedFrom,
            to: formattedTo
          });

          results.whatsapp = waRes.sid;
        }
      } catch (e: any) {
        console.error('❌ Twilio WhatsApp Error:', e);
        results.whatsappError = e?.message || 'WhatsApp send failed';
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('❌ Notification API Error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}