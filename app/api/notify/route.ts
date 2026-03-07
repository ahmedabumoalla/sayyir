import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// ربط مباشر مع قاعدة البيانات (تجاوز الصلاحيات لجلب المفاتيح)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // يفضل استخدام مفتاح السيرفر هنا
);

export async function POST(req: Request) {
  try {
    // استلام البيانات من الواجهة
    const { phone, message, type } = await req.json();

    if (!phone || !message || !type) {
      return NextResponse.json({ error: "البيانات غير مكتملة" }, { status: 400 });
    }

    // 1. جلب مفاتيح Twilio من إعدادات المنصة
    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_phone_number')
      .eq('id', 1)
      .single();

    if (error || !settings?.twilio_account_sid) {
      return NextResponse.json({ error: "إعدادات Twilio غير متوفرة في النظام" }, { status: 500 });
    }

    // 2. تهيئة عميل Twilio
    const client = twilio(settings.twilio_account_sid, settings.twilio_auth_token);

    // 3. ضبط صيغة الأرقام (واتساب يحتاج بادئة whatsapp:)
    // تأكد أن الرقم بصيغة دولية مثلاً: +966500000000
    const formattedTo = type === 'whatsapp' ? `whatsapp:${phone}` : phone;
    const formattedFrom = type === 'whatsapp' ? `whatsapp:${settings.twilio_phone_number}` : settings.twilio_phone_number;

    // 4. إرسال الرسالة
    const response = await client.messages.create({
      body: message,
      from: formattedFrom,
      to: formattedTo,
    });

    return NextResponse.json({ success: true, messageId: response.sid });

  } catch (error: any) {
    console.error("Twilio Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}