import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkAdminPermission } from '@/lib/adminGuard'; 
import { sendSMS } from '@/lib/twilio'; // ✅ استدعاء دالة الرسائل

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { requestId, requesterId } = await req.json();

    const permissionCheck = await checkAdminPermission(requesterId, 'requests_approve');
    if (!permissionCheck.success) return NextResponse.json({ error: permissionCheck.message }, { status: 403 });

    const { data: requestData } = await supabaseAdmin.from('provider_requests').select('*').eq('id', requestId).single();
    if (!requestData) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    // معالجة المستخدم (إنشاء أو تحديث)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === requestData.email);
    let userId = existingUser?.id;
    let tempPassword = null;

    if (!existingUser) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        tempPassword = `Sayyir@${randomNum}`; 
        const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
            email: requestData.email, password: tempPassword, email_confirm: true,
            user_metadata: { full_name: requestData.name, is_provider: true }
        });
        userId = newUser.user!.id;
        await supabaseAdmin.from('profiles').upsert({ id: userId, email: requestData.email, full_name: requestData.name, is_provider: true });
    } else {
        await supabaseAdmin.auth.admin.updateUserById(userId!, { user_metadata: { ...existingUser.user_metadata, is_provider: true } });
        await supabaseAdmin.from('profiles').update({ is_provider: true }).eq('id', userId);
    }

    // تحديث الحالة
    await supabaseAdmin.from('provider_requests').update({ status: 'approved' }).eq('id', requestId);

    // 1. إرسال الإيميل
    const loginLink = `https://sayyir.sa/login`;
    await resend.emails.send({
      from: 'فريق سَيّر <info@emails.sayyir.sa>',
      to: requestData.email,
      subject: '🎉 تمت الموافقة على طلبك - منصة سيّر',
      html: `<div dir="rtl"><h2>مرحباً ${requestData.name}</h2><p>تم قبول طلبك! بيانات الدخول في حال كنت جديداً:</p><p>المرور: ${tempPassword || 'كلمة مرورك الحالية'}</p><a href="${loginLink}">دخول</a></div>`
    });

    // 2. إرسال رسالة للجوال (SMS) ✅
    // ملاحظة: في النسخة المجانية، ستصل الرسالة فقط إذا كان رقم المزود هو نفسه رقمك الموثق
    if (requestData.phone) {
        await sendSMS({
            to: requestData.phone,
            body: `مرحباً ${requestData.name}،\nألف مبروك! 🎉\nتمت الموافقة على انضمامك لمنصة سَيّر.\nراجع إيميلك للتفاصيل.`
        });
    }

    return NextResponse.json({ success: true, message: "تمت الموافقة وإرسال الإشعارات" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}