import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { ensureProfileWhatsApp } from '@/lib/whatsappProfile';
import { notifyProviderPayoutDecision } from '@/lib/whatsappNotifications';

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
    let notificationResult: { ok: boolean; error?: string } | null = null;

    // --- أ: معالجة طلبات السحب ---
    if (actionType === 'update_payout') {
        const { requestId, status, amount, providerName, reason, receiptUrl } = body;

        if (!['paid', 'approved', 'rejected'].includes(String(status))) {
          return NextResponse.json({ error: "حالة طلب السحب غير صالحة" }, { status: 400 });
        }

        const { data: payout, error: payoutError } = await supabaseAdmin
          .from('payout_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        if (payoutError || !payout) {
          return NextResponse.json({ error: "طلب السحب غير موجود" }, { status: 404 });
        }
        
        const { error } = await supabaseAdmin
            .from('payout_requests')
            .update({
              status,
              updated_at: new Date().toISOString(),
              ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
            })
            .eq('id', requestId);

        if (error) throw error;

        const { data: provider } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', payout.provider_id)
          .maybeSingle();
        const whatsapp = provider
          ? await ensureProfileWhatsApp(provider)
          : { ok: false as const, message: "ملف المزود غير موجود" };
        notificationResult = whatsapp.ok
          ? await notifyProviderPayoutDecision({
              phone: whatsapp.phone,
              providerName: provider?.full_name || providerName,
              payout,
              approved: status === 'paid' || status === 'approved',
              reason: String(reason || '').trim() || undefined,
            })
          : { ok: false, error: whatsapp.message };

        const payoutApproved = status === 'paid' || status === 'approved';
        logType = payoutApproved ? 'approve_payout' : 'reject_payout';
        logDetails = `تمت ${payoutApproved ? 'الموافقة على' : 'رفض'} طلب سحب رصيد بقيمة ${amount} ﷼ للشريك: ${providerName}`;
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

    return NextResponse.json({
      success: true,
      notificationStatus: notificationResult
        ? (notificationResult.ok ? 'sent' : 'failed')
        : 'not_requested',
      message: notificationResult
        ? (notificationResult.ok
            ? 'تم تحديث طلب السحب وإشعار المزود عبر واتساب'
            : `تم تحديث طلب السحب، لكن تعذر إشعار المزود: ${notificationResult.error || 'خطأ غير معروف'}`)
        : 'تم حفظ الإعدادات بنجاح',
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
