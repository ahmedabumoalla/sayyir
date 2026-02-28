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
    const body = await req.json();
    const { name, email, phone, service_type, dynamic_data } = body;

    // التحقق من وجود طلب سابق
    const { data: existingRequest } = await supabaseAdmin
      .from('provider_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({ error: "يوجد طلب معلق مسجل بهذا البريد." }, { status: 400 });
    }

    // إدخال الطلب
    const { error: insertError } = await supabaseAdmin
      .from('provider_requests')
      .insert([{ name, email, phone, service_type, dynamic_data, status: 'pending' }]);

    if (insertError) throw insertError;

    // 📩 إشعار للأدمن (أنت)
    // ضع رقم جوالك وإيميلك هنا لتستقبل التنبيهات
    const adminEmail = process.env.ADMIN_EMAIL || 'info@sayyir.sa'; 
    const adminPhone = process.env.ADMIN_PHONE || '+966508424401'; // استبدله برقمك

    // 1. إرسال إيميل للأدمن
    await resend.emails.send({
        from: 'نظام سَيّر <info@emails.sayyir.sa>',
        to: adminEmail,
        subject: '🔔 طلب انضمام مزود جديد!',
        html: `<div dir="rtl"><h3>طلب جديد: ${name}</h3><p>الخدمة: ${service_type}</p><p>راجع لوحة التحكم.</p></div>`
    });

    // 2. إرسال SMS للأدمن ✅
    await sendSMS({
        to: adminPhone,
        body: `🔔 تنبيه سَيّر:\nوصل طلب انضمام جديد من: ${name}\nالخدمة: ${service_type}`
    });

    return NextResponse.json({ success: true, message: "تم استقبال طلبك بنجاح." });

  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}