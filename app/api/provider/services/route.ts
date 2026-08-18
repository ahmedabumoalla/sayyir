import { NextResponse } from "next/server";
import { requireProvider } from "@/lib/requireProvider";
import { supabaseServer } from "@/lib/supabaseServer";
import { notifyAdminServiceRequest } from "@/lib/whatsappNotifications";
import {
  ensureProfileWhatsApp,
  whatsappGuardStatus,
} from "@/lib/whatsappProfile";

const SERVER_MANAGED_FIELDS = new Set([
  "id",
  "provider_id",
  "status",
  "created_at",
  "updated_at",
  "rejection_reason",
  "pending_updates",
  "platform_commission",
  "stop_dates",
  "delete_reason",
]);

export async function POST(req: Request) {
  try {
    const { provider, error, isMaintenanceMode } = await requireProvider(req);
    if (error || !provider) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    if (isMaintenanceMode) {
      return NextResponse.json(
        { error: "استخدم مسار الصيانة للحفظ المباشر" },
        { status: 409 }
      );
    }

    const whatsapp = await ensureProfileWhatsApp(provider);
    if (!whatsapp.ok) {
      return NextResponse.json(whatsapp, { status: whatsappGuardStatus(whatsapp) });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const servicePayload = Object.fromEntries(
      Object.entries(body).filter(([key]) => !SERVER_MANAGED_FIELDS.has(key))
    );

    if (!String(servicePayload.title || "").trim()) {
      return NextResponse.json({ error: "عنوان الخدمة مطلوب" }, { status: 400 });
    }

    const { data: service, error: insertError } = await supabaseServer
      .from("services")
      .insert({
        ...servicePayload,
        provider_id: provider.id,
        status: "pending",
      })
      .select("*")
      .single();

    if (insertError || !service) {
      return NextResponse.json(
        { error: insertError?.message || "تعذر إنشاء طلب الخدمة" },
        { status: 500 }
      );
    }

    const notificationResult = await notifyAdminServiceRequest({
      kind: "new",
      service,
      provider: { ...provider, phone: whatsapp.phone },
      requestId: service.id,
    });

    if (!notificationResult.ok) {
      console.error(
        "NEW SERVICE ADMIN WHATSAPP FAILED:",
        notificationResult.error || "unknown_error"
      );
    }

    return NextResponse.json({
      success: true,
      service,
      message: notificationResult.ok
        ? "تم إرسال الخدمة للمراجعة وإشعار الأدمن على واتساب."
        : "تم حفظ الخدمة للمراجعة، لكن تعذر إرسال إشعار واتساب للأدمن.",
      notificationStatus: {
        whatsapp: notificationResult.ok ? "sent" : "failed",
        error: notificationResult.ok ? null : notificationResult.error,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("CREATE PROVIDER SERVICE ERROR:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
