import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAdminPermission } from '@/lib/adminGuard'; // استيراد الحارس

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { targetUserId, requesterId, block } = await req.json();

    // ✅ التحقق الأمني الجديد: هل يملك صلاحية إدارة المستخدمين؟
    const permissionCheck = await checkAdminPermission(requesterId, 'users_manage');
    if (!permissionCheck.success) {
        return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
    }

    // ... باقي كود الحظر كما هو ...
    await supabaseAdmin.from('profiles').update({ is_blocked: block }).eq('id', targetUserId);
    
    // ...

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}