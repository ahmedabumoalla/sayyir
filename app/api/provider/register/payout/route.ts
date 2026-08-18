import { NextResponse } from "next/server";
import { requireProvider } from "@/lib/requireProvider";
import { supabaseServer } from "@/lib/supabaseServer";
import { ensureProfileWhatsApp, whatsappGuardStatus } from "@/lib/whatsappProfile";
import { notifyAdminPayoutRequest } from "@/lib/whatsappNotifications";

export async function POST(req: Request) {
  try {
    const providerContext = await requireProvider(req);
    if (!providerContext.provider) {
      return NextResponse.json({ error: providerContext.error || "غير مصرح" }, { status: 401 });
    }
    if (providerContext.isMaintenanceMode) {
      return NextResponse.json({ error: "وضع الصيانة للقراءة فقط" }, { status: 403 });
    }

    const whatsapp = await ensureProfileWhatsApp(providerContext.provider);
    if (!whatsapp.ok) {
      return NextResponse.json(
        { error: whatsapp.code, code: whatsapp.code, message: whatsapp.message },
        { status: whatsappGuardStatus(whatsapp) }
      );
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const iban = String(body.iban || "").replace(/\s+/g, "").toUpperCase();
    const bankName = String(body.bankName || "").trim();

    if (!Number.isFinite(amount) || amount <= 0 || !bankName || !/^SA\d{22}$/.test(iban)) {
      return NextResponse.json(
        { error: "أدخل مبلغاً صحيحاً واسم البنك وآيبان سعودياً صحيحاً (SA متبوعاً بـ22 رقماً)" },
        { status: 400 }
      );
    }

    const { data: currentBalance, error: balanceError } = await supabaseServer
      .rpc("get_provider_balance", { p_provider_id: providerContext.provider.id });
    if (balanceError) throw balanceError;
    if (amount > Number(currentBalance || 0)) {
      return NextResponse.json({ error: "المبلغ المطلوب أكبر من الرصيد المتاح" }, { status: 400 });
    }

    const { data: payout, error: insertError } = await supabaseServer
      .from("payout_requests")
      .insert({
        provider_id: providerContext.provider.id,
        amount,
        iban,
        bank_name: bankName,
        status: "pending",
      })
      .select("*")
      .single();
    if (insertError || !payout) throw insertError || new Error("تعذر إنشاء طلب السحب");

    const notification = await notifyAdminPayoutRequest({
      payout,
      provider: { ...providerContext.provider, phone: whatsapp.phone },
    });

    return NextResponse.json({
      success: true,
      payout,
      notificationStatus: notification.ok ? "sent" : "failed",
      message: notification.ok
        ? "تم إرسال طلب السحب وإشعار الإدارة عبر واتساب"
        : `تم تسجيل طلب السحب، لكن تعذر إشعار الإدارة عبر واتساب: ${notification.error || "خطأ غير معروف"}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
