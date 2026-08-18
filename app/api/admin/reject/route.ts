import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkAdminPermission } from '@/lib/adminGuard';
import { notifyProviderApplicationDecision } from '@/lib/whatsappNotifications';
import { checkGreenApiRecipient, type GreenApiResult } from '@/lib/greenApi';
import { getAuthenticatedUserId } from '@/lib/requireProvider';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { requestId, reason, requesterId } = await req.json();

    if (!requestId || !requesterId || !String(reason || '').trim()) {
      return NextResponse.json(
        { error: 'requestId و requesterId وسبب الرفض مطلوبة' },
        { status: 400 }
      );
    }

    const permissionCheck = await checkAdminPermission(requesterId, 'requests_approve');
    if (!permissionCheck.success) {
      return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
    }

    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId || authenticatedUserId !== requesterId) {
      return NextResponse.json({ error: 'جلسة الأدمن غير صالحة' }, { status: 401 });
    }

    const { data: requestData } = await supabaseAdmin.from('provider_requests').select('*').eq('id', requestId).single();
    if (!requestData) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    const { error: updateError } = await supabaseAdmin
      .from('provider_requests')
      .update({
        status: 'rejected',
        rejection_reason: String(reason).trim(),
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    const emailPromise = resend.emails.send({
        from: 'فريق سَيّر <info@emails.sayyir.sa>',
        to: requestData.email,
        subject: 'تحديث بخصوص طلب انضمامك',
        html: `<div dir="rtl"><h3>عزيزي ${requestData.name}</h3><p>نعتذر عن قبول طلبك حالياً.</p><p>السبب: ${reason}</p></div>`
      });

    const whatsappPromise: Promise<GreenApiResult> = (async () => {
      if (!requestData.phone) {
        return { ok: false, error: 'provider_phone_missing' };
      }

      const recipient = await checkGreenApiRecipient(requestData.phone);
      if (!recipient.ok) {
        return { ok: false, error: recipient.error || 'recipient_check_failed' };
      }
      if (!recipient.existsWhatsApp) {
        return { ok: false, error: 'recipient_not_on_whatsapp' };
      }

      return notifyProviderApplicationDecision({
        phone: requestData.phone,
        approved: false,
        name: requestData.name,
        requestId,
        reason: String(reason).trim(),
      });
    })();

    const [emailResult, whatsappResult] = await Promise.allSettled([
      emailPromise,
      whatsappPromise,
    ]);

    const emailSent =
      emailResult.status === 'fulfilled' &&
      !(emailResult.value as { error?: unknown }).error;
    const whatsappValue =
      whatsappResult.status === 'fulfilled' ? whatsappResult.value : null;
    const whatsappSent = whatsappValue?.ok === true;
    const whatsappError =
      whatsappResult.status === 'rejected'
        ? String(whatsappResult.reason)
        : whatsappValue?.error;

    if (!emailSent) {
      console.error(
        'Provider rejection email failed:',
        emailResult.status === 'rejected'
          ? emailResult.reason
          : (emailResult.value as { error?: unknown }).error
      );
    }
    if (!whatsappSent) {
      console.error('Provider rejection WhatsApp failed:', whatsappError);
    }

    let message = 'تم رفض الطلب وإرسال إشعار واتساب والبريد الإلكتروني.';
    if (!whatsappSent) {
      message =
        whatsappError === 'recipient_not_on_whatsapp'
          ? 'تم رفض الطلب، لكن الرقم المسجل غير مرتبط بحساب واتساب؛ لم تُرسل رسالة واتساب.'
          : 'تم رفض الطلب، لكن تعذر إرسال رسالة واتساب. راجع إعدادات Green API وسجل الخادم.';
    }
    if (!emailSent) {
      message += ' كما تعذر إرسال البريد الإلكتروني.';
    }

    return NextResponse.json({
      success: true,
      message,
      notificationStatus: {
        whatsapp: whatsappSent ? 'sent' : 'failed',
        email: emailSent ? 'sent' : 'failed',
        whatsappError: whatsappSent ? null : whatsappError,
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
