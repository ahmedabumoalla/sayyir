import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/twilio'; // ✅ إضافة SMS

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { fullName, email, phone, requesterId } = await req.json();

    // التحقق من صلاحية السوبر أدمن
    const { data: requester } = await supabaseAdmin.from('profiles').select('is_super_admin').eq('id', requesterId).single();
    if (!requester?.is_super_admin) {
        return NextResponse.json({ error: "غير مصرح لك بإضافة مسؤولين" }, { status: 403 });
    }

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa';
    let emailSubject = '';
    let emailHTML = '';
    let message = '';
    let tempPassword = '';

    if (existingAuthUser) {
        // حالة الترقية لمستخدم موجود
        const userId = existingAuthUser.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { ...existingAuthUser.user_metadata, full_name: fullName, is_admin: true }
        });

        await supabaseAdmin.from('profiles').upsert({
            id: userId, email: email, full_name: fullName, phone: phone,
            is_admin: true, role: 'admin',
            is_super_admin: existingAuthUser.user_metadata?.is_super_admin || false 
        });

        emailSubject = '✨ تحديث صلاحيات حسابك - منصة سيّر';
        emailHTML = `<div dir="rtl"><h2>مرحباً ${fullName}</h2><p>تم ترقيتك لمسؤول (Admin). ادخل بنفس كلمة مرورك الحالية.</p><a href="${siteUrl}/admin/login">دخول الأدمن</a></div>`;
        message = "المستخدم موجود مسبقاً، تمت ترقيته بنجاح.";

    } else {
       // حالة إنشاء حساب جديد
       const randomNum = Math.floor(1000 + Math.random() * 9000);
       tempPassword = `Admin@${randomNum}`;

       const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email, password: tempPassword, email_confirm: true,
            user_metadata: { full_name: fullName, is_admin: true, role: 'admin', phone: phone }
       });

       if (createError) throw createError;
       if (newUser.user) {
            await supabaseAdmin.from('profiles').upsert({
                id: newUser.user.id, email: email, full_name: fullName, phone: phone,
                is_admin: true, role: 'admin'
            });
       }

       emailSubject = 'دعوة للانضمام لفريق إدارة منصة سيّر';
       emailHTML = `
            <div dir="rtl" style="font-family: Arial; padding: 20px;">
                <h2 style="color: #C89B3C;">مرحباً ${fullName}</h2>
                <p>تم تعيينك كمسؤول في منصة سيّر.</p>
                <div style="background: #f9f9f9; padding: 15px;">
                    <p><strong>البريد:</strong> ${email}</p>
                    <p><strong>كلمة المرور:</strong> ${tempPassword}</p>
                </div>
                <a href="${siteUrl}/admin/login">تسجيل الدخول</a>
            </div>
       `;
       message = "تم إنشاء حساب المسؤول وإرسال الدعوة.";
    }

    // 1. إرسال الإيميل (Resend)
    await resend.emails.send({
        from: 'فريق سَيّر <info@emails.sayyir.sa>',
        to: email,
        subject: emailSubject,
        html: emailHTML
    });

    // 2. إرسال SMS (Twilio) ✅
    if (phone) {
        await sendSMS({
            to: phone,
            body: `مرحباً ${fullName}،\nتم تعيينك كمسؤول في منصة سَيّر.\nراجع بريدك الإلكتروني للحصول على بيانات الدخول.\nشكراً لك.`
        });
    }

    return NextResponse.json({ success: true, message: message });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}