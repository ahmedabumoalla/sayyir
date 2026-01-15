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

    if (existingAuthUser) {
        // حالة الترقية
        const userId = existingAuthUser.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { ...existingAuthUser.user_metadata, full_name: fullName, is_admin: true }
        });

        await supabaseAdmin.from('profiles').upsert({
            id: userId,
            email: email,
            full_name: fullName,
            phone: phone,
            is_admin: true,
            role: 'admin',
            is_super_admin: existingAuthUser.user_metadata?.is_super_admin || false 
        });

        emailSubject = '✨ تحديث صلاحيات حسابك - منصة سيّر';
        emailHTML = `
            <div dir="rtl" style="font-family: Arial; padding: 20px;">
                <h2 style="color: #C89B3C;">مرحباً ${fullName}</h2>
                <p>تم تعيينك / ترقيتك لتصبح <strong>مسؤولاً (Admin)</strong> في منصة سيّر.</p>
                <p>بما أن لديك حساباً سابقاً، يمكنك الدخول بنفس كلمة المرور الخاصة بك.</p>
                <a href="${siteUrl}/admin/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">دخول الأدمن</a>
            </div>
        `;
        message = "المستخدم موجود مسبقاً، تمت ترقيته بنجاح.";

    } else {
       // حالة الإنشاء الجديد
       const randomNum = Math.floor(1000 + Math.random() * 9000);
       const tempPassword = `Admin@${randomNum}`;

       const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, is_admin: true, role: 'admin', phone: phone }
       });

       if (createError) throw createError;

       if (newUser.user) {
            await supabaseAdmin.from('profiles').upsert({
                id: newUser.user.id,
                email: email,
                full_name: fullName,
                phone: phone,
                is_admin: true,
                role: 'admin'
            });
       }

       emailSubject = 'دعوة للانضمام لفريق إدارة منصة سيّر';
       emailHTML = `
            <div dir="rtl" style="font-family: Arial; padding: 20px;">
                <h2 style="color: #C89B3C;">مرحباً ${fullName}</h2>
                <p>تم إنشاء حسابك وتعيينك كمسؤول في منصة سيّر.</p>
                <div style="background: #f9f9f9; padding: 15px; margin: 10px 0;">
                    <p><strong>البريد:</strong> ${email}</p>
                    <p><strong>كلمة المرور المؤقتة:</strong> ${tempPassword}</p>
                </div>
                <a href="${siteUrl}/admin/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">تسجيل الدخول</a>
            </div>
       `;
       message = "تم إنشاء حساب المسؤول الجديد وإرسال الدعوة.";
    }

    // إرسال الإيميل عبر Resend ✅
    try {
        await resend.emails.send({
            from: 'فريق سَيّر <info@emails.sayyir.sa>',
            to: email,
            subject: emailSubject,
            html: emailHTML
        });
    } catch (mailError) {
        console.error("Mail Error:", mailError);
    }

    return NextResponse.json({ success: true, message: message });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}