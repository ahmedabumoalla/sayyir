import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAdminPermission } from '@/lib/adminGuard'; // استدعاء الحارس

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, requesterId } = body;

    // 🛑 الحماية: قبل ما نسوي أي شي، نفحص الصلاحية
    if (action === 'delete') {
        // نتحقق هل الأدمن يمتلك صلاحية 'users_delete'
        const permissionCheck = await checkAdminPermission(requesterId, 'users_delete');
        
        if (!permissionCheck.success) {
            // إذا ما عنده صلاحية، نرجّع خطأ ونوقف العملية
            return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
        }

        // إذا وصلنا هنا، يعني الصلاحية موجودة ✅ .. نبدأ الحذف
        
        // 1. حذف من المصادقة (Auth)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteAuthError) throw deleteAuthError;

        // 2. حذف من البروفايل (Database) لضمان النظافة
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        return NextResponse.json({ success: true, message: "تم حذف المستخدم بنجاح" });
    }

    // هنا ممكن تضيف شروط ثانية لو عندك actions غير الحذف (مثل الحظر)
    // if (action === 'block') { ... }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}