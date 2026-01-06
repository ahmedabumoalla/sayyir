import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// إعداد Supabase Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// إعداد خدمة الإيميل (إعدادات SMTP دقيقة)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // استخدام SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: Request) {
  try {
    const { fullName, email, phone, requesterId } = await req.json();

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({ error: "إعدادات البريد الإلكتروني مفقودة في السيرفر" }, { status: 500 });
    }

    // 1. التحقق من صلاحيات السوبر أدمن
    const { data: requester } = await supabaseAdmin.from('profiles').select('is_super_admin').eq('id', requesterId).single();
    if (!requester?.is_super_admin) return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });

    // 2. البحث عن المستخدم (نبحث في جدول profiles لأنه أدق)
    const { data: existingProfile } = await supabaseAdmin.from('profiles').select('*').eq('email', email).single();
    
    // متغيرات للإيميل
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    let emailSubject = '';
    let emailHTML = '';
    let successMessage = '';
    let tempPassword = '';

    if (existingProfile) {
        // ==========================================
        // الحالة أ: المستخدم موجود (ترقية)
        // ==========================================
        console.log("Creating admin: User exists, upgrading...");

        // تحديث الصلاحيات
        await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
            user_metadata: { ...existingProfile.user_metadata, is_admin: true }
        });
        await supabaseAdmin.from('profiles').update({ is_admin: true, role: 'admin' }).eq('id', existingProfile.id);

        emailSubject = '✨ تمت ترقية حسابك إلى مسؤول - منصة سيّر';
        emailHTML = `
            <div dir="rtl" style="font-family: Arial; color: #333; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #C89B3C;">مرحباً ${existingProfile.full_name}</h2>
                <p>تمت ترقية حسابك لتصبح <strong>مسؤولاً (Admin)</strong> في منصة سيّر.</p>
                <p>يمكنك الدخول للوحة التحكم باستخدام كلمة المرور الحالية الخاصة بك.</p>
                <br/>
                <a href="${siteUrl}/admin/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">الدخول كأدمن</a>
            </div>
        `;
        successMessage = "تمت ترقية المستخدم الموجود وإرسال التنبيه";

    } else {
        // ==========================================
        // الحالة ب: مستخدم جديد (إنشاء)
        // ==========================================
        console.log("Creating admin: New user...");

        const randomNum = Math.floor(1000 + Math.random() * 9000);
        tempPassword = `Admin@${randomNum}`; // كلمة مرور قوية

        // إنشاء المستخدم
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, is_admin: true }
        });

        if (createError) throw createError;
        if (newUser.user) {
            // تفعيل قسري + إنشاء بروفايل
            await supabaseAdmin.auth.admin.updateUserById(newUser.user.id, { email_confirm: true });
            await supabaseAdmin.from('profiles').upsert({
                id: newUser.user.id,
                email, full_name: fullName, phone, is_admin: true, role: 'admin'
            });
        }

        emailSubject = 'دعوة للانضمام لفريق إدارة منصة سيّر';
        emailHTML = `
            <div dir="rtl" style="font-family: Arial; color: #333; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #C89B3C;">مرحباً ${fullName}</h2>
                <p>تم تعيينك كمسؤول في منصة سيّر.</p>
                <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
                    <p><strong>البريد:</strong> ${email}</p>
                    <p><strong>كلمة المرور المؤقتة:</strong> <code style="background: #eee; padding: 2px 5px;">${tempPassword}</code></p>
                </div>
                <a href="${siteUrl}/admin/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">تسجيل الدخول</a>
            </div>
        `;
        successMessage = "تم إنشاء حساب المسؤول الجديد بنجاح";
    }

    // 3. إرسال الإيميل (مع كشف الأخطاء)
    try {
        const info = await transporter.sendMail({
            from: `"إدارة منصة سيّر" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: emailSubject,
            html: emailHTML
        });
        console.log("Email sent info:", info.messageId);
    } catch (emailError: any) {
        console.error("Failed to send email:", emailError);
        // نرجع خطأ للواجهة حتى ينتبه الأدمن
        return NextResponse.json({ 
            success: true, // العملية تمت (الإنشاء/الترقية)
            message: `${successMessage}، ولكن فشل إرسال الإيميل! (الخطأ: ${emailError.message})`,
            warning: true 
        });
    }

    return NextResponse.json({ success: true, message: `${successMessage} وتم إرسال الإيميل.` });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}