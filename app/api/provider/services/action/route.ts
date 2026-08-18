import { NextResponse } from "next/server";
import { requireProvider } from "@/lib/requireProvider";
import { supabaseServer } from "@/lib/supabaseServer";
import { notifyAdminServiceRequest } from "@/lib/whatsappNotifications";
import {
  ensureProfileWhatsApp,
  whatsappGuardStatus,
} from "@/lib/whatsappProfile";

export async function POST(req: Request) {
  try {
    const { provider, error, isMaintenanceMode } = await requireProvider(req);
    if (error || !provider) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    if (isMaintenanceMode) {
      return NextResponse.json(
        { error: "وضع الصيانة مخصص للقراءة والتعديل المباشر فقط" },
        { status: 403 }
      );
    }

    const whatsapp = await ensureProfileWhatsApp(provider);
    if (!whatsapp.ok) {
      return NextResponse.json(whatsapp, { status: whatsappGuardStatus(whatsapp) });
    }

    const body = await req.json();
    const serviceId = String(body.serviceId || "").trim();
    const action = String(body.action || "").trim();
    const reason = String(body.reason || "").trim();

    if (!serviceId || !["stop", "delete"].includes(action) || !reason) {
      return NextResponse.json(
        { error: "معرف الخدمة ونوع الطلب والسبب مطلوبة" },
        { status: 400 }
      );
    }

    const { data: service, error: serviceError } = await supabaseServer
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .eq("provider_id", provider.id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "الخدمة غير موجودة أو لا تملك صلاحية عليها" },
        { status: 404 }
      );
    }

    if (service.status !== "approved") {
      return NextResponse.json(
        { error: "يمكن إرسال طلب الإيقاف للخدمات المفعلة فقط" },
        { status: 409 }
      );
    }

    const stopDates =
      action === "stop" && (body.startDate || body.endDate)
        ? { start: body.startDate || null, end: body.endDate || null }
        : null;

    const updates =
      action === "stop"
        ? {
            status: "stop_requested",
            stop_dates: stopDates,
            details: { ...(service.details || {}), stop_reason: reason },
          }
        : {
            status: "delete_requested",
            delete_reason: reason,
          };

    const { error: updateError } = await supabaseServer
      .from("services")
      .update(updates)
      .eq("id", serviceId)
      .eq("provider_id", provider.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const notificationResult = await notifyAdminServiceRequest({
      kind: action as "stop" | "delete",
      service,
      provider: { ...provider, phone: whatsapp.phone },
      reason,
      stopDates,
    });

    return NextResponse.json({
      success: true,
      message: notificationResult.ok
        ? "تم إرسال الطلب وإشعار الأدمن على واتساب."
        : "تم حفظ الطلب، لكن تعذر إرسال إشعار واتساب للأدمن.",
      notificationStatus: {
        whatsapp: notificationResult.ok ? "sent" : "failed",
        error: notificationResult.ok ? null : notificationResult.error,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("PROVIDER SERVICE ACTION ERROR:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
