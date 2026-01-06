import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function checkAdminPermission(requesterId: string, requiredPermission: string) {
  if (!requesterId) return { success: false, message: "مستخدم غير معروف" };

  // 1. جلب بيانات الأدمن الذي طلب التنفيذ
  const { data: adminUser, error } = await supabaseAdmin
    .from('profiles')
    .select('is_super_admin, is_admin, permissions')
    .eq('id', requesterId)
    .single();

  if (error || !adminUser) return { success: false, message: "بيانات الأدمن غير موجودة" };

  // 2. السوبر أدمن مسموح له بكل شيء (البطاقة الذهبية)
  if (adminUser.is_super_admin) return { success: true };

  // 3. التحقق هل هو أدمن عادي؟
  if (!adminUser.is_admin) return { success: false, message: "ليس لديك صلاحية أدمن" };

  // 4. التحقق من الصلاحية المحددة في عمود JSON
  // نتأكد أن الصلاحية موجودة وقيمتها true
  const hasPermission = adminUser.permissions && adminUser.permissions[requiredPermission] === true;

  if (!hasPermission) {
    return { success: false, message: "⛔ عذراً، ليس لديك صلاحية للقيام بهذا الإجراء." };
  }

  return { success: true };
}