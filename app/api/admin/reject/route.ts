import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { requestId, reason } = await req.json();

    if (!reason) return NextResponse.json({ error: "سبب الرفض مطلوب" }, { status: 400 });

    const { data: requestData } = await supabaseAdmin
      .from('provider_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!requestData) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    await supabaseAdmin.from('provider_requests').update({ status: 'rejected' }).eq('id', requestId);

    // إرسال عبر Resend ✅
    await resend.emails.send({
        from: 'فريق سَيّر <info@emails.sayyir.sa>',
        to: requestData.email,
        subject: 'تحديث بخصوص طلب انضمامك لمنصة سيّر',
        html: `
          <div dir="rtl" style="font-family: Arial; color: #333;">
            <h3>عزيزي/عزيزتي ${requestData.name}،</h3>
            <p>نشكرك على اهتمامك بالانضمام إلينا في منصة سيّر.</p>
            <p>نأسف لإبلاغك بأنه تعذر قبول طلبك في الوقت الحالي للأسباب التالية:</p>
            <div style="background: #fff5f5; padding: 15px; border-right: 4px solid #ef4444; margin: 20px 0; color: #555;">
                ${reason}
            </div>
            <p>نقدر تفهمك، ويسعدنا أن تحاول التقديم مرة أخرى بعد استيفاء الملاحظات.</p>
            <br/>
            <p>مع أطيب التحيات،<br/>فريق منصة سيّر</p>
          </div>
        `
    });

    return NextResponse.json({ success: true, message: "تم رفض الطلب وإرسال البريد بنجاح" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}