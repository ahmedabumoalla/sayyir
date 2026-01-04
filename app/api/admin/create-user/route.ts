import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { fullName, email, phone, requesterId } = await req.json();

    // إعداد Supabase بصلاحيات كاملة
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. التحقق من صلاحية المرسل (يجب أن يكون is_super_admin)
    const { data: requester } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', requesterId)
      .single();

    if (!requester || !requester.is_super_admin) {
      return NextResponse.json({ error: 'عذراً، هذه الخاصية للسوبر أدمن فقط.' }, { status: 403 });
    }

    // 2. توليد كلمة مرور عشوائية
    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1@";

    // 3. إنشاء المستخدم في Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      return NextResponse.json({ error: 'فشل إنشاء الحساب: ' + createError.message }, { status: 400 });
    }

    // 4. حفظ بياناته في البروفايل (مع التحقق الصارم من الخطأ)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: newUser.user.id,
      full_name: fullName,
      phone: phone,
      email: email,
      role: 'admin',
      is_admin: true,
      is_super_admin: false,
      is_provider: false
    });

    if (profileError) {
      console.error("Profile Error:", profileError);
      // حذف المستخدم من Auth إذا فشل إنشاء البروفايل عشان ما يصير عندنا حساب "معلق"
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: 'فشل حفظ بيانات البروفايل: ' + profileError.message }, { status: 400 });
    }

    // 5. إرسال إيميل الدعوة (فقط إذا نجح كل شيء سابقاً)
    await resend.emails.send({
      from: 'Sayyir Admin <onboarding@resend.dev>', // عدلها لدومينك لاحقاً
      to: [email],
      subject: 'تم تعيينك كمسؤول في منصة سيّر 🛡️',
      html: `
        <div dir="rtl" style="font-family: sans-serif; color: #333;">
          <h2>مرحباً ${fullName}،</h2>
          <p>قام المسؤول العام بإضافتك كمسؤول (Admin) في منصة سيّر.</p>
          <p>بيانات الدخول الخاصة بك:</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>البريد الإلكتروني:</strong> ${email}</p>
            <p><strong>كلمة المرور المؤقتة:</strong> ${tempPassword}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">تسجيل الدخول</a>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'تم إنشاء الحساب وإرسال الدعوة بنجاح' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}