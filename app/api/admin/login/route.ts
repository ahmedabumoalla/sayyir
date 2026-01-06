import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, authPassword, secret } = await req.json();

    // 1. تثبيت الإجابة السرية (كما طلبت)
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

    // 3. التحقق من الصلاحيات (هل هو أدمن؟)
    const metadata = data.user.user_metadata || {};
    
    // نسمح بالدخول إذا كان سوبر أدمن أو أدمن عادي
    const isAuthorized = metadata.is_super_admin === true || metadata.is_admin === true;

    if (!isAuthorized) {
      // إذا دخل ببيانات صحيحة لكنه ليس أدمن، نطرده
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, error: "هذا الحساب ليس له صلاحيات دخول كأدمن" }, { status: 403 });
    }

    // 4. النجاح: إرجاع التوكن
    return NextResponse.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}