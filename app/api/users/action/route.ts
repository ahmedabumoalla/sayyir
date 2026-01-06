import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export async function POST(req: Request) {
  try {
    const { userId, action, userName } = await req.json(); // action: 'block' | 'unblock'
    
    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '')!);
    if (!user) return NextResponse.json({ error: "Auth missing" }, { status: 401 });

    // تحديث الحالة (مثلاً عمود is_active أو status)
    const updates = action === 'block' ? { is_active: false } : { is_active: true };
    
    const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;

    // تسجيل السجل ✅
    const details = action === 'block' ? `تم حظر المستخدم: ${userName}` : `تم إعادة تفعيل المستخدم: ${userName}`;
    
    await supabaseAdmin.from('admin_logs').insert({
        admin_id: user.id,
        action_type: action === 'block' ? 'block_user' : 'activate_user',
        details: details,
        target_id: userId
    });

    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}