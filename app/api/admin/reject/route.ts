import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json();

    // 1. جلب البيانات للإيميل
    const { data: request } = await supabase.from('provider_requests').select('email, name').eq('id', requestId).single();

    // 2. تحديث الحالة
    const { error } = await supabase
      .from('provider_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;

    // 3. إرسال إيميل الاعتذار
    if (process.env.RESEND_API_KEY && request) {
        await resend.emails.send({
            from: 'Sayyir Team <support@resend.dev>',
            to: request.email,
            subject: 'تحديث بخصوص طلب الانضمام - منصة سيّر',
            html: `
            <div dir="rtl" style="font-family: sans-serif; color: #333;">
                <h3>مرحباً ${request.name}،</h3>
                <p>شكراً لاهتمامك بالانضمام لمنصة سيّر.</p>
                <p>نأسف لإبلاغك بأن طلبك لم يتم قبوله في الوقت الحالي لعدم استيفاء بعض معايير القبول.</p>
                <p>يمكنك تحسين ملفك والتقديم مرة أخرى مستقبلاً.</p>
                <br/>
                <p>تحياتنا،<br/>فريق عمل سيّر</p>
            </div>
            `
        });
    }

    return NextResponse.json({ message: "🚫 تم رفض الطلب وإرسال بريد الاعتذار." });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}