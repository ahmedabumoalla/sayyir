import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    // ✅ نستقبل logDetails من الفرونت إند
    const { fields, logDetails } = await req.json();
    
    let user = null;

    // 1. التحقق من التوكن (الهيدر أو الكوكيز)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && data.user) user = data.user;
    }

    if (!user) {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const authCookie = allCookies.find(c => c.name.endsWith('-auth-token'));
        if (authCookie) {
            try {
                const tokenData = JSON.parse(authCookie.value);
                const accessToken = tokenData[0] || tokenData.access_token;
                const { data } = await supabaseAdmin.auth.getUser(accessToken);
                user = data?.user;
            } catch {
                const { data } = await supabaseAdmin.auth.getUser(authCookie.value);
                user = data?.user;
            }
        }
    }

    if (!user) {
        return NextResponse.json({ error: "جلسة العمل مفقودة" }, { status: 401 });
    }

    // 2. التحقق من الصلاحية
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin, is_super_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
        return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });
    }

    // 3. الحفظ
    const { error: saveError } = await supabaseAdmin.from('registration_fields').upsert(fields);
    if (saveError) throw saveError;

    // 4. تسجيل العملية (باستخدام التفاصيل المرسلة أو النص الافتراضي)
    await supabaseAdmin.from('admin_logs').insert({
        admin_id: user.id,
        action_type: 'update_settings',
        details: logDetails || 'تم تحديث حقل في نموذج التسجيل', // ✅ هنا التغيير
        target_id: null
    });

    return NextResponse.json({ success: true, message: "تم الحفظ بنجاح" });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}