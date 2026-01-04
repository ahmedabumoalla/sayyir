import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, authPassword, secret } = body;

    // 1. التحقق من المدخلات
    if (!email || !authPassword || !secret) {
      return NextResponse.json(
        { error: "البيانات ناقصة" },
        { status: 400 }
      );
    }

    // 2. تهيئة Supabase (باستخدام Service Role لتخطي أي قيود)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. محاولة تسجيل الدخول (للتحقق من صحة الإيميل وكلمة المرور)
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: authPassword,
    });

    if (authError || !authData.user) {
      console.error("Auth Error:", authError);
      return NextResponse.json(
        { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // 4. التحقق من الإجابة السرية وصلاحية الأدمن عبر الدالة الآمنة
    // نمرر ID المستخدم والإجابة السرية التي كتبها
    const { data: isSecretValid, error: rpcError } = await supabaseAdmin.rpc(
      'verify_admin_secret', 
      { 
        user_id: authData.user.id, 
        secret_input: secret 
      }
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      return NextResponse.json({ error: "خطأ في التحقق من الصلاحيات" }, { status: 500 });
    }

    if (!isSecretValid) {
      return NextResponse.json(
        { error: "الإجابة السرية غير صحيحة أو الحساب ليس له صلاحيات أدمن" },
        { status: 401 }
      );
    }

    // 5. نجاح الدخول - إرجاع التوكن
    return NextResponse.json({
      ok: true,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع في السيرفر" },
      { status: 500 }
    );
  }
}