import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// إعداد Supabase Admin (صلاحيات كاملة)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// إعداد خدمة الإيميل
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

    if (!email || !requesterId) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // 1. التأكد أن مقدم الطلب هو Super Admin فعلاً (أمان)
    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', requesterId)
      .single();

    if (!requesterProfile?.is_super_admin) {
      return NextResponse.json({ error: "غير مصرح لك بإضافة مسؤولين" }, { status: 403 });
    }

    // 2. البحث عن المستخدم في النظام
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    let emailSubject = '';
    let emailHTML = '';

    if (existingUser) {
        // ==========================================
        // الحالة الأولى: المستخدم موجود (ترقية)
        // ==========================================
        
        // تحديث Metadata ليصبح أدمن
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: { ...existingUser.user_metadata, is_admin: true }
        });

        // تحديث جدول Profiles
        await supabaseAdmin.from('profiles').update({
            is_admin: true,
            role: 'admin' // أو أي مسمى وظيفي
        }).eq('id', existingUser.id);

        // تجهيز إيميل الترقية
        emailSubject = '✨ تمت ترقية حسابك إلى مسؤول - منصة سيّر';
        emailHTML = `
            <div dir="rtl" style="font-family: Arial; color: #333; padding: 20px;">
                <h2 style="color: #C89B3C;">مرحباً ${fullName || existingUser.user_metadata.full_name}</h2>
                <p>يسعدنا إخبارك بأنه تمت ترقية حسابك لتصبح <strong>مسؤولاً (Admin)</strong> في منصة سيّر.</p>
                <p>يمكنك الآن الدخول إلى لوحة التحكم بصلاحياتك الجديدة باستخدام نفس كلمة المرور الحالية.</p>
                <br/>
                <a href="${siteUrl}/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    الدخول للوحة التحكم
                </a>
            </div>
        `;

    } else {
        // ==========================================
        // الحالة الثانية: مستخدم جديد (إنشاء + كلمة مرور مؤقتة)
        // ==========================================

        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const tempPassword = `Admin@${randomNum}`; // كلمة مرور قوية: Admin@1234

        // إنشاء المستخدم
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true, // تفعيل الإيميل
            phone: phone,
            user_metadata: { 
                full_name: fullName, 
                is_admin: true, // نعطيه صلاحية الأدمن فوراً
                email_verified: true
            }
        });

        if (createError) throw createError;

        if (newUser.user) {
            // التفعيل القسري (نفس خدعة المزود لضمان الدخول)
            await supabaseAdmin.auth.admin.updateUserById(newUser.user.id, { email_confirm: true });
            
            // إنشاء/تحديث البروفايل يدوياً لضمان البيانات
            await supabaseAdmin.from('profiles').upsert({
                id: newUser.user.id,
                email: email,
                full_name: fullName,
                phone: phone,
                is_admin: true,
                role: 'admin'
            });
        }

        // تجهيز إيميل الترحيب وكلمة المرور
        emailSubject = 'دعوة للانضمام لفريق إدارة منصة سيّر';
        emailHTML = `
            <div dir="rtl" style="font-family: Arial; color: #333; padding: 20px;">
                <h2 style="color: #C89B3C;">مرحباً ${fullName}</h2>
                <p>تمت دعوتك للانضمام لفريق إدارة منصة سيّر.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd;">
                    <p style="margin: 5px 0;"><strong>البريد الإلكتروني:</strong> ${email}</p>
                    <p style="margin: 5px 0;"><strong>كلمة المرور المؤقتة:</strong> <span style="background: white; padding: 2px 8px; border: 1px solid #ccc; font-family: monospace;">${tempPassword}</span></p>
                </div>
                <p style="font-size: 12px; color: #666;">يرجى تغيير كلمة المرور بعد تسجيل الدخول الأول.</p>
                <br/>
                <a href="${siteUrl}/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    تسجيل الدخول
                </a>
            </div>
        `;
    }

    // 3. إرسال الإيميل (سواء كان قديماً أو جديداً)
    try {
        await transporter.sendMail({
            from: `"فريق إدارة سيّر" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: emailSubject,
            html: emailHTML
        });
    } catch (emailError) {
        console.error("فشل إرسال الإيميل:", emailError);
        // لا نوقف العملية، الحساب تم إنشاؤه/ترقيته
    }

    return NextResponse.json({ success: true, message: existingUser ? "تم ترقية المستخدم بنجاح" : "تم إنشاء حساب المسؤول بنجاح" });

  } catch (error: any) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}