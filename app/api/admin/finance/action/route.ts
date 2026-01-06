import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { actionType } = body;

    // 1. التحقق من التوكن
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: "مفقود توكن الدخول" }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) return NextResponse.json({ error: "جلسة غير صالحة" }, { status: 401 });

    // 2. التحقق من الصلاحيات
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin, is_super_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
        return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });
    }

    let logType = '';
    let logDetails = '';
    let targetId = null;

    // --- أ: معالجة طلبات السحب ---
    if (actionType === 'update_payout') {
        const { requestId, status, amount, providerName } = body;
        
        const { error } = await supabaseAdmin
            .from('payout_requests')
            .update({ status: status, updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (error) throw error;

        logType = status === 'paid' ? 'approve_payout' : 'reject_payout';
        logDetails = `تمت ${status === 'paid' ? 'الموافقة على' : 'رفض'} طلب سحب رصيد بقيمة ${amount} ﷼ للشريك: ${providerName}`;
        targetId = requestId;
    } 
    
    // --- ب: حفظ إعدادات العمولات (تحديث الأعمدة مباشرة) ---
    else if (actionType === 'save_settings') {
        const { settings } = body; // نستقبل كائن الإعدادات مباشرة
        
        // تحديث الصف رقم 1
        const { error } = await supabaseAdmin
            .from('platform_settings')
            .update({
                commission_tourist: settings.commission_tourist,
                commission_housing: settings.commission_housing,
                commission_food: settings.commission_food,
                updated_at: new Date().toISOString()
            })
            .eq('id', 1);

        if (error) throw error;

        logType = 'update_settings';
        logDetails = 'تم تحديث نسب العمولات المالية للمنصة';
    }

    // 4. تسجيل العملية
    if (logType) {
        await supabaseAdmin.from('admin_logs').insert({
            admin_id: user.id,
            action_type: logType,
            details: logDetails,
            target_id: targetId
        });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}