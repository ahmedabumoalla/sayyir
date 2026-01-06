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
    const { action, data, id, logDetails } = await req.json();
    let user = null;

    // التحقق من التوكن
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        user = userData.user;
    }

    if (!user) return NextResponse.json({ error: "جلسة العمل مفقودة" }, { status: 401 });

    // التحقق من الصلاحية
    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin, is_super_admin').eq('id', user.id).single();
    if (!profile?.is_admin && !profile?.is_super_admin) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    // تنفيذ العملية
    if (action === 'delete') {
        const { error } = await supabaseAdmin.from('places').delete().eq('id', id);
        if (error) throw error;
    } else if (action === 'save') {
        const { error } = await supabaseAdmin.from('places').upsert(data);
        if (error) throw error;
    }

    // تسجيل العملية في السجل
    await supabaseAdmin.from('admin_logs').insert({
        admin_id: user.id,
        action_type: action === 'delete' ? 'delete_landmark' : (data.id ? 'update_landmark' : 'create_landmark'),
        details: logDetails,
        target_id: id || data?.id || null
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}