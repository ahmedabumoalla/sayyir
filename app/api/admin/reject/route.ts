import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/twilio'; // ✅

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { requestId, reason } = await req.json();

    const { data: requestData } = await supabaseAdmin.from('provider_requests').select('*').eq('id', requestId).single();
    if (!requestData) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    await supabaseAdmin.from('provider_requests').update({ status: 'rejected' }).eq('id', requestId);

    // 1. إرسال الإيميل
    await resend.emails.send({
        from: 'فريق سَيّر <info@emails.sayyir.sa>',
        to: requestData.email,
        subject: 'تحديث بخصوص طلب انضمامك',
        html: `<div dir="rtl"><h3>عزيزي ${requestData.name}</h3><p>نعتذر عن قبول طلبك حالياً.</p><p>السبب: ${reason}</p></div>`
    });

    // 2. إرسال رسالة للجوال (SMS) ✅
    if (requestData.phone) {
        await sendSMS({
            to: requestData.phone,
            body: `مرحباً ${requestData.name}،\nنعتذر، تم رفض طلب انضمامك لمنصة سَيّر.\nالسبب: ${reason}\nراجع الإيميل للتفاصيل.`
        });
    }

    return NextResponse.json({ success: true, message: "تم الرفض وإرسال الإشعارات" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}