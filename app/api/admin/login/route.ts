import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, authPassword, secret } = body;

    // طباعة للتحقق من وصول البيانات (ستظهر في سجلات فيرسال)
    console.log("Attempting login for:", email);

    // التحقق من وجود مفاتيح الربط
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase Environment Variables!");
      return NextResponse.json(
        { error: "خطأ في إعدادات السيرفر (المفاتيح مفقودة)" },
        { status: 500 }
      );
    }

    // إعداد العميل مع إلغاء حفظ الجلسة (مهم جداً للـ API)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false, // يمنع تداخل الكوكيز في السيرفر
        },
      }
    );

    // 1. محاولة تسجيل الدخول
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: authPassword,
    });

    if (authError || !authData.user) {
      console.error("Auth Failed:", authError?.message);
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // 2. التحقق من الإجابة السرية وصلاحية الأدمن عبر الدالة الآمنة
    const { data: isSecretValid, error: rpcError } = await supabaseAdmin.rpc(
      'verify_admin_secret', 
      { 
        user_id: authData.user.id, 
        secret_input: secret 
      }
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      return NextResponse.json({ error: "حدث خطأ أثناء التحقق من الصلاحيات" }, { status: 500 });
    }

    if (!isSecretValid) {
      return NextResponse.json(
        { error: "الإجابة السرية غير صحيحة أو الحساب ليس له صلاحيات أدمن" },
        { status: 401 }
      );
    }

    // 3. نجاح
    return NextResponse.json({
      ok: true,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });

  } catch (error: any) {
    console.error("Server Crash:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع في السيرفر" },
      { status: 500 }
    );
  }
}