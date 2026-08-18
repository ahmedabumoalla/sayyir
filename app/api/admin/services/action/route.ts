import { NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/adminGuard";
import { getAuthenticatedUserId } from "@/lib/requireProvider";
import { supabaseServer } from "@/lib/supabaseServer";
import { notifyProviderServiceDecision } from "@/lib/whatsappNotifications";
import { ensureProfileWhatsApp } from "@/lib/whatsappProfile";

const ALLOWED_ACTIONS = [
  "approve",
  "reject",
  "approve_update",
  "reject_update",
  "approve_stop",
  "reject_stop",
  "approve_delete",
  "reject_delete",
  "admin_stop",
  "admin_reactivate",
] as const;

type ServiceAction = (typeof ALLOWED_ACTIONS)[number];

function actionLogLabel(action: ServiceAction) {
  const labels: Record<ServiceAction, string> = {
    approve: "الموافقة على إضافة الخدمة",
    reject: "رفض إضافة الخدمة",
    approve_update: "الموافقة على تعديل الخدمة",
    reject_update: "رفض تعديل الخدمة",
    approve_stop: "الموافقة على طلب إيقاف الخدمة",
    reject_stop: "رفض طلب إيقاف الخدمة",
    approve_delete: "الموافقة على الإيقاف النهائي للخدمة",
    reject_delete: "رفض الإيقاف النهائي للخدمة",
    admin_stop: "إيقاف الخدمة من الإدارة",
    admin_reactivate: "إعادة تفعيل الخدمة من الإدارة",
  };
  return labels[action];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const serviceId = String(body.serviceId || "").trim();
    const action = String(body.action || "").trim() as ServiceAction;
    const reason = String(body.reason || "").trim();
    const adminId = String(body.adminId || "").trim();

    if (!serviceId || !adminId || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "بيانات الإجراء غير مكتملة" }, { status: 400 });
    }

    const authenticatedUserId = await getAuthenticatedUserId(request);
    if (!authenticatedUserId || authenticatedUserId !== adminId) {
      return NextResponse.json({ error: "جلسة الأدمن غير صالحة" }, { status: 401 });
    }

    const permissionCheck = await checkAdminPermission(adminId, "services_approve");
    if (!permissionCheck.success) {
      return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
    }

    const { data: service, error: serviceError } = await supabaseServer
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
    }

    const rejectionActions = ["reject", "reject_update", "reject_stop", "reject_delete"];
    if (rejectionActions.includes(action) && !reason) {
      return NextResponse.json({ error: "سبب الرفض مطلوب" }, { status: 400 });
    }
    if (action === "admin_stop" && !reason) {
      return NextResponse.json({ error: "سبب الإيقاف مطلوب" }, { status: 400 });
    }

    let updates: Record<string, unknown>;
    switch (action) {
      case "approve":
        updates = {
          status: "approved",
          rejection_reason: null,
          platform_commission:
            body.updates?.platform_commission === undefined
              ? service.platform_commission ?? null
              : body.updates.platform_commission,
        };
        break;
      case "reject":
        updates = { status: "rejected", rejection_reason: reason };
        break;
      case "approve_update":
        updates = {
          ...(service.pending_updates || {}),
          status: "approved",
          pending_updates: null,
          rejection_reason: null,
        };
        break;
      case "reject_update":
        updates = { status: "approved", pending_updates: null, rejection_reason: reason };
        break;
      case "approve_stop":
        updates = { status: "stopped" };
        break;
      case "reject_stop":
        updates = { status: "approved", stop_dates: null, rejection_reason: reason };
        break;
      case "approve_delete":
        updates = { status: "deleted" };
        break;
      case "reject_delete":
        updates = { status: "approved", delete_reason: null, rejection_reason: reason };
        break;
      case "admin_stop":
        updates = {
          status: "stopped",
          stop_dates: {
            type: body.stopType === "permanent" ? "permanent" : "temporary",
            reason,
            until: body.stopType === "permanent" ? null : body.stopUntil || null,
            stopped_at: new Date().toISOString(),
          },
        };
        break;
      case "admin_reactivate":
        updates = { status: "approved", stop_dates: null, rejection_reason: null };
        break;
    }

    const { data: updatedService, error: updateError } = await supabaseServer
      .from("services")
      .update(updates)
      .eq("id", serviceId)
      .select("*")
      .single();

    if (updateError || !updatedService) {
      throw new Error(updateError?.message || "تعذر تحديث الخدمة");
    }

    await supabaseServer.from("admin_logs").insert({
      admin_id: adminId,
      action_type: `service_${action}`,
      details: `${actionLogLabel(action)}: ${service.title || service.id}${reason ? ` | السبب: ${reason}` : ""}`,
    });

    const { data: provider } = await supabaseServer
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", service.provider_id)
      .maybeSingle();

    const providerWhatsApp = provider
      ? await ensureProfileWhatsApp(provider)
      : { ok: false as const, code: "whatsapp_phone_required" as const, message: "لا يوجد ملف للمزود" };
    const notificationResult = providerWhatsApp.ok
      ? await notifyProviderServiceDecision({
        phone: providerWhatsApp.phone,
        providerName: provider?.full_name,
        service: updatedService,
        action,
        reason,
        requestedChanges:
          action === "approve_update" || action === "reject_update"
            ? service.pending_updates
            : undefined,
      })
      : { ok: false, error: providerWhatsApp.message };

    const notified = notificationResult.ok === true;

    return NextResponse.json({
      success: true,
      message: notified
        ? "تم تنفيذ الإجراء وإشعار المزود عبر واتساب بنجاح"
        : `تم تنفيذ الإجراء، لكن تعذر إشعار المزود عبر واتساب: ${notificationResult.error || "خطأ غير معروف"}`,
      notificationStatus: notified ? "sent" : "failed",
      notificationError: notified ? undefined : notificationResult.error,
      service: updatedService,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("ADMIN SERVICE ACTION ERROR:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
