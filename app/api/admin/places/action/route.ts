import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// إعداد عميل Supabase بصلاحيات الأدمن (Service Role)
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

export async function POST(req: Request) {
  try {
    // استقبال البيانات من الصفحة
    const { action, data, id, logDetails } = await req.json();
    
    // 1. التحقق من المستخدم (من خلال التوكن المرسل في الهيدر)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return NextResponse.json({ error: "مفقود توكن الدخول" }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: "جلسة غير صالحة" }, { status: 401 });
    }

    // 2. تنفيذ العملية المطلوبة (حفظ أو حذف)
    if (action === 'save') {
        // حذف الحقول التي قد تسبب مشاكل (مثل id إذا كان جديداً)
        const placeData = { ...data };
        if (!placeData.id) delete placeData.id;

        const { error } = await supabaseAdmin
            .from('places')
            .upsert(placeData)
            .select();

        if (error) throw error;

    } else if (action === 'delete') {
        const { error } = await supabaseAdmin
            .from('places')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // 3. تسجيل العملية في السجل (Admin Logs) ✅
    // هذا هو الجزء الذي يظهر التعديل في الداشبورد
    await supabaseAdmin.from('admin_logs').insert({
        admin_id: user.id,
        action_type: action === 'delete' ? 'delete_landmark' : (data.id ? 'update_landmark' : 'create_landmark'),
        details: logDetails || (action === 'delete' ? 'تم حذف معلم' : 'تم حفظ بيانات معلم'),
        target_id: id || data?.id || null
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}