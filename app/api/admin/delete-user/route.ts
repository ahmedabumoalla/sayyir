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
    const { targetUserId, requesterId } = await req.json();

    // 🛑 1. استدعاء الحارس: هل يمتلك هذا الشخص صلاحية 'users_delete'؟
    // إذا كان سوبر أدمن سيمر، إذا كان أدمن معه الصلاحية سيمر، غير ذلك سيتم طرده
    const permissionCheck = await checkAdminPermission(requesterId, 'users_delete');
    
    if (!permissionCheck.success) {
        return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
    }

    // 2. التحقق أننا لا نحذف سوبر أدمن (أمان إضافي)
    const { data: targetUser } = await supabaseAdmin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', targetUserId)
        .single();
    
    if (targetUser?.is_super_admin) {
        return NextResponse.json({ error: "لا يمكن حذف السوبر أدمن" }, { status: 400 });
    }

    // 3. التنفيذ: الحذف
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    
    // تنظيف جدول البروفايل يدوياً لضمان النظافة
    await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "تم الحذف بنجاح" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}