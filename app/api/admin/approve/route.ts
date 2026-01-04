import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// ✅ Supabase Admin (سيرفر فقط)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ لا تنشئ Resend إلا إذا المفتاح موجود
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json();

    // 1. جلب بيانات الطلب
    const { data: request, error: fetchError } = await supabase
      .from('provider_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    // 2. التحقق من وجود المستخدم
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers.users.find(
      (u) => u.email === request.email
    );

    if (userExists) {
      return NextResponse.json(
        { error: 'يوجد مستخدم مسجل بهذا البريد مسبقاً' },
        { status: 400 }
      );
    }

    // 3. كلمة مرور مؤقتة
    const tempPassword =
      Math.random().toString(36).slice(-8) + 'Sa!2';

    // 4. إنشاء المستخدم
    const { data: userData, error: createError } =
      await supabase.auth.admin.createUser({
        email: request.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: request.name,
          phone: request.phone,
          role: 'provider',
        },
      });

    if (createError || !userData.user) {
      return NextResponse.json(
        { error: createError?.message || 'فشل إنشاء المستخدم' },
        { status: 500 }
      );
    }

    // 5. تحديث profile
    await supabase
      .from('profiles')
      .update({
        is_provider: true,
        full_name: request.name,
        phone: request.phone,
      })
      .eq('id', userData.user.id);

    // 6. تحديث حالة الطلب
    await supabase
      .from('provider_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    // 7. إرسال الإيميل (اختياري – لا يكسر البناء)
    if (resend) {
      await resend.emails.send({
        from: 'Sayyir Team <onboarding@resend.dev>',
        to: request.email,
        subject: 'مبروك! تمت الموافقة على طلب انضمامك 🎉',
        html: `
          <div dir="rtl" style="font-family:sans-serif">
            <h2>مرحباً ${request.name}</h2>
            <p>تمت الموافقة على طلبك كمزود خدمة.</p>
            <p><strong>البريد:</strong> ${request.email}</p>
            <p><strong>كلمة المرور:</strong> ${tempPassword}</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login">تسجيل الدخول</a>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: 'خطأ في تنفيذ الطلب' },
      { status: 500 }
    );
  }
}
