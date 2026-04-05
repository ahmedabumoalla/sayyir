import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, authPassword, secret } = await req.json();

    // 1. تثبيت الإجابة السرية
    const ADMIN_SECRET = "Ah_1995_sayyirai"; 
    
    // التحقق من الإجابة السرية
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ ok: false, error: "الإجابة السرية غير صحيحة!" }, { status: 401 });
    }

    // 2. تسجيل الدخول عبر Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword,
    });

    if (error || !data.user) {
      return NextResponse.json({ ok: false, error: "البريد الإلكتروني أو كلمة المرور خطأ" }, { status: 401 });
    }

    // 3. التحقق من الصلاحيات (✅ التعديل الجذري هنا: نقرأ من الداتابيز مباشرة وليس من الميتاداتا)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_admin, is_super_admin')
        .eq('id', data.user.id)
        .single();
    
    if (profileError || !profile) {
        await supabase.auth.signOut();
        return NextResponse.json({ ok: false, error: "حدث خطأ في جلب الصلاحيات" }, { status: 403 });
    }

    // التحقق هل هو سوبر أدمن أو أدمن
    const isAuthorized = profile.is_super_admin === true || profile.is_admin === true || profile.role === 'admin' || profile.role === 'super_admin';

    if (!isAuthorized) {
      // إذا دخل ببيانات صحيحة لكنه ليس أدمن، نطرده
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: "هذا الحساب ليس له صلاحيات دخول كأدمن" }, { status: 403 });
    }

    // 4. 🌟 حماية من الـ Triggers: مزامنة البيانات المخفية (Metadata) لمنع الحساب من الرجوع كعميل فجأة
    await supabase.auth.updateUser({
        data: { 
            role: profile.role === 'client' ? 'super_admin' : profile.role,
            is_admin: profile.is_admin,
            is_super_admin: profile.is_super_admin
        }
    });

    // 5. النجاح: إرجاع التوكن
    return NextResponse.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}