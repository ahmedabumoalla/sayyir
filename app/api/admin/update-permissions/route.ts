import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { targetUserId, permissions, requesterId } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. التحقق: هل المرسل سوبر أدمن؟
    const { data: requester } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', requesterId)
      .single();

    if (!requester || !requester.is_super_admin) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل الصلاحيات' }, { status: 403 });
    }

    // 2. تحديث الصلاحيات
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ permissions: permissions }) // permissions عبارة عن Object
      .eq('id', targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'تم تحديث الصلاحيات بنجاح' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}