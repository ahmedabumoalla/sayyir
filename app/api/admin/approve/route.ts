import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// إعداد Supabase بصلاحيات الأدمن الكاملة (لتجاوز الحماية وإنشاء مستخدم)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json();

    // 1. جلب بيانات الطلب
    const { data: request, error: fetchError } = await supabase
      .from('provider_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) throw new Error("الطلب غير موجود");

    // 2. التحقق مما إذا كان المستخدم موجوداً مسبقاً
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers.users.find(u => u.email === request.email);

    if (userExists) throw new Error("يوجد مستخدم مسجل بهذا البريد الإلكتروني بالفعل");

    // 3. إنشاء كلمة مرور مؤقتة
    const tempPassword = Math.random().toString(36).slice(-8) + "Sa!2";

    // 4. إنشاء المستخدم في Auth
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: request.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: request.name,
        phone: request.phone,
        role: 'provider' // مهم جداً
      }
    });

    if (createError) throw new Error("فشل إنشاء الحساب: " + createError.message);

    // 5. تحديث جدول Profiles (جعل المستخدم مزود خدمة)
    // ملاحظة: عادة يتم إنشاء البروفايل تلقائياً عبر التريقر، لذا نقوم بالتحديث
    await supabase.from('profiles').update({
        is_provider: true,
        full_name: request.name,
        phone: request.phone
    }).eq('id', userData.user.id);

    // 6. تحديث حالة الطلب إلى Approved
    await supabase.from('provider_requests').update({ status: 'approved' }).eq('id', requestId);

    // 7. إرسال إيميل الترحيب
    if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
            from: 'Sayyir Team <onboarding@resend.dev>', // استبدله بنطاقك لاحقاً
            to: request.email,
            subject: 'مبروك! تمت الموافقة على طلب انضمامك لمنصة سيّر 🎉',
            html: `
            <div dir="rtl" style="font-family: sans-serif; color: #333;">
                <h2>مرحباً شريكنا الغالي ${request.name} 👋</h2>
                <p>يسعدنا إخبارك بأنه تمت الموافقة على طلبك للانضمام كمزود خدمة في منصة سيّر.</p>
                <div style="background: #f4f4f4; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>بيانات الدخول الخاصة بك:</strong></p>
                    <p style="margin: 5px 0;">البريد: ${request.email}</p>
                    <p style="margin: 5px 0;">كلمة المرور المؤقتة: <strong style="color: #C89B3C; font-size: 18px;">${tempPassword}</strong></p>
                </div>
                <p>يرجى تسجيل الدخول وتغيير كلمة المرور فوراً.</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login" style="background: #C89B3C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">تسجيل الدخول للوحة التحكم</a>
            </div>
            `
        });
    }

    return NextResponse.json({ message: "✅ تم قبول الطلب وإنشاء الحساب بنجاح!" });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}