import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// إعداد Supabase Admin
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
    const { fullName, email, phone, requesterId } = await req.json();

    // 1. التحقق من صلاحية السوبر أدمن
    const { data: requester } = await supabaseAdmin.from('profiles').select('is_super_admin').eq('id', requesterId).single();
    if (!requester?.is_super_admin) {
        return NextResponse.json({ error: "غير مصرح لك بإضافة مسؤولين" }, { status: 403 });
    }

    // 🛑 التعديل الجوهري هنا:
    // بدلاً من البحث في profiles، نبحث في Auth Users مباشرة
    // هذا يغطي حالة أن المستخدم موجود كحساب ولكن محذوف كبروفايل
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    // نبحث عن المستخدم بالإيميل (بغض النظر عن حالة الأحرف)
    const existingAuthUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    let emailSubject = '';
    let emailHTML = '';
    let message = '';

    if (existingAuthUser) {
        // ==========================================
        // الحالة الأولى: المستخدم يملك حساباً في المنصة (سواء عميل، مزود، أو أدمن سابق محذوف البروفايل)
        // ==========================================
        
        const userId = existingAuthUser.id;

        // 1. تحديث بيانات المصادقة (Metadata)
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { 
                ...existingAuthUser.user_metadata, 
                full_name: fullName, // تحديث الاسم لو تغير
                is_admin: true 
            }
        });

        // 2. تحديث أو إنشاء البروفايل (Upsert)
        // Upsert مهمة هنا: لو البروفايل موجود يحدثه، لو محذوف يرجع ينشئه بنفس الـ ID
        const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
            id: userId,
            email: email,
            full_name: fullName,
            phone: phone,
            is_admin: true,
            role: 'admin',
            // نحافظ على السوبر أدمن لو كان هو، غير كذا false
            is_super_admin: existingAuthUser.user_metadata?.is_super_admin || false 
        });

        if (upsertError) throw upsertError;

        emailSubject = '✨ تحديث صلاحيات حسابك - منصة سيّر';
        emailHTML = `
            <div dir="rtl" style="font-family: Arial; padding: 20px;">
                <h2 style="color: #C89B3C;">مرحباً ${fullName}</h2>
                <p>تم تعيينك / ترقيتك لتصبح <strong>مسؤولاً (Admin)</strong> في منصة سيّر.</p>
                <p>بما أن لديك حساباً سابقاً، يمكنك الدخول بنفس كلمة المرور الخاصة بك.</p>
                <a href="${siteUrl}/admin/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">دخول الأدمن</a>
            </div>
        `;
        message = "المستخدم موجود مسبقاً، تمت ترقيته واستعادة صلاحياته بنجاح.";

    } else {
        // ==========================================
        // الحالة الثانية: مستخدم جديد كلياً
        // ==========================================

        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const tempPassword = `Admin@${randomNum}`;

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, is_admin: true }
        });

        if (createError) throw createError;

        if (newUser.user) {
            // إنشاء البروفايل
            await supabaseAdmin.from('profiles').insert({
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

    // إرسال الإيميل
    try {
        await transporter.sendMail({
            from: `"فريق إدارة سيّر" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: emailSubject,
            html: emailHTML
        });
    } catch (mailError) {
        console.error("Mail Error:", mailError);
        return NextResponse.json({ success: true, message: message + " (فشل إرسال الإيميل)" });
    }

    return NextResponse.json({ success: true, message: message });

  } catch (error: any) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}