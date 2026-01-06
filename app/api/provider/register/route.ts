import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, service_type, dynamic_data } = body;

    // 1. التحقق: هل يوجد طلب *معلق* لهذا الإيميل؟
    const { data: existingRequest } = await supabaseAdmin
      .from('provider_requests')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "يوجد طلب معلق مسجل بهذا البريد الإلكتروني مسبقاً. يرجى انتظار المراجعة." }, 
        { status: 400 }
      );
    }

    // 2. إدخال الطلب الجديد
    const { error: insertError } = await supabaseAdmin
      .from('provider_requests')
      .insert([{
        name, email, phone, service_type, dynamic_data, status: 'pending'
      }]);

    if (insertError) throw insertError;

    // 3. إرسال تنبيه للأدمن (لك أنت)
    try {
        await transporter.sendMail({
            from: `"منصة سيّر" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER, // يرسل لنفس الإيميل المسجل في البيئة
            subject: '🔔 طلب انضمام مزود جديد!',
            html: `
                <div dir="rtl">
                    <h3>وصل طلب جديد من: ${name}</h3>
                    <p>البريد: ${email}</p>
                    <p>نوع الخدمة: ${service_type}</p>
                    <p>يرجى مراجعة لوحة التحكم لاتخاذ الإجراء.</p>
                </div>
            `
        });
    } catch (e) {
        console.error("فشل إرسال تنبيه الأدمن:", e);
        // لا نوقف العملية، المهم الطلب انحفظ
    }

    return NextResponse.json({ success: true, message: "تم استقبال طلبك بنجاح وسنقوم بمراجعته قريباً." });

  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}