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
    const body = await req.json();
    const { name, email, phone, service_type, dynamic_data } = body;

    // 1. التحقق
    const { data: existingRequest } = await supabaseAdmin
      .from('provider_requests')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({ error: "يوجد طلب معلق لهذا البريد." }, { status: 400 });
    }

    // 2. إدخال الطلب
    const { error: insertError } = await supabaseAdmin
      .from('provider_requests')
      .insert([{ name, email, phone, service_type, dynamic_data, status: 'pending' }]);

    if (insertError) throw insertError;

    // 3. إرسال تنبيه للأدمن عبر Resend ✅
    // يتم إرساله إلى بريدك الشخصي لتنبيهك
    const adminEmail = process.env.ADMIN_EMAIL || 'ahmedabumoalla@gmail.com';

    await resend.emails.send({
        from: 'نظام سَيّر <info@emails.sayyir.sa>',
        to: adminEmail,
        subject: '🔔 طلب انضمام مزود جديد!',
        html: `
            <div dir="rtl">
                <h3>وصل طلب جديد من: ${name}</h3>
                <p>البريد: ${email}</p>
                <p>نوع الخدمة: ${service_type}</p>
                <p>يرجى مراجعة لوحة التحكم.</p>
            </div>
        `
    });

    return NextResponse.json({ success: true, message: "تم استقبال طلبك بنجاح." });

  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}