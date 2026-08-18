import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdminPermission } from "@/lib/adminGuard";
import { notifyProviderServiceDecision } from "@/lib/whatsappNotifications";
import { getAuthenticatedUserId } from "@/lib/requireProvider";
import { ensureProfileWhatsApp } from "@/lib/whatsappProfile";

export async function POST(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const { action, admin_id, rejection_reason } = body;

    if (!admin_id) {
      return NextResponse.json({ error: "admin_id مطلوب" }, { status: 400 });
    }

    const permissionCheck = await checkAdminPermission(
      admin_id,
      "services_approve"
    );

    if (!permissionCheck.success) {
      return NextResponse.json(
        { error: permissionCheck.message },
        { status: 403 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "قرار غير صالح" }, { status: 400 });
    }

    const { data: changeRequest, error: requestError } = await supabaseServer
      .from("service_change_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !changeRequest) {
      return NextResponse.json(
        { error: "طلب التعديل غير موجود" },
        { status: 404 }
      );
    }

    if (changeRequest.status !== "pending") {
      return NextResponse.json(
        { error: "تم اتخاذ قرار على هذا الطلب مسبقًا" },
        { status: 400 }
      );
    }

    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId || authenticatedUserId !== admin_id) {
      return NextResponse.json({ error: "جلسة الأدمن غير صالحة" }, { status: 401 });
    }

    const [{ data: service }, { data: provider }] = await Promise.all([
      supabaseServer.from("services").select("*").eq("id", changeRequest.service_id).single(),
      supabaseServer
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", changeRequest.provider_id)
        .single(),
    ]);

    if (action === "reject") {
      const { error: serviceError } = await supabaseServer
        .from("services")
        .update({
          status: "approved",
          pending_updates: null,
        })
        .eq("id", changeRequest.service_id)
        .eq("provider_id", changeRequest.provider_id);

      if (serviceError) {
        return NextResponse.json({ error: serviceError.message }, { status: 500 });
      }

      const { error } = await supabaseServer
        .from("service_change_requests")
        .update({
          status: "rejected",
          rejection_reason: rejection_reason || "تم رفض طلب التعديل",
          reviewed_by: admin_id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const providerWhatsApp = provider
        ? await ensureProfileWhatsApp(provider)
        : { ok: false as const, code: "whatsapp_phone_required" as const, message: "لا يوجد ملف للمزود" };
      const notificationResult = providerWhatsApp.ok && service
        ? await notifyProviderServiceDecision({
          phone: providerWhatsApp.phone,
          providerName: provider?.full_name,
          service,
          action: "reject_update",
          reason: rejection_reason || "تم رفض طلب التعديل",
          requestedChanges: changeRequest.requested_changes,
        })
        : { ok: false, error: providerWhatsApp.ok ? "الخدمة غير موجودة" : providerWhatsApp.message };

      return NextResponse.json({
        success: true,
        message: notificationResult.ok
          ? "تم رفض طلب التعديل وإشعار المزود عبر واتساب"
          : `تم رفض طلب التعديل، لكن تعذر إشعار المزود: ${notificationResult.error || "خطأ غير معروف"}`,
        notificationStatus: notificationResult.ok ? "sent" : "failed",
      });
    }

    const { error: serviceError } = await supabaseServer
      .from("services")
      .update({
        ...changeRequest.requested_changes,
        status: "approved",
        pending_updates: null,
      })
      .eq("id", changeRequest.service_id)
      .eq("provider_id", changeRequest.provider_id);

    if (serviceError) {
      return NextResponse.json({ error: serviceError.message }, { status: 500 });
    }

    const { error: approveError } = await supabaseServer
      .from("service_change_requests")
      .update({
        status: "approved",
        reviewed_by: admin_id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (approveError) {
      return NextResponse.json(
        { error: approveError.message },
        { status: 500 }
      );
    }

    const providerWhatsApp = provider
      ? await ensureProfileWhatsApp(provider)
      : { ok: false as const, code: "whatsapp_phone_required" as const, message: "لا يوجد ملف للمزود" };
    const notificationResult = providerWhatsApp.ok && service
      ? await notifyProviderServiceDecision({
        phone: providerWhatsApp.phone,
        providerName: provider?.full_name,
        service,
        action: "approve_update",
        requestedChanges: changeRequest.requested_changes,
      })
      : { ok: false, error: providerWhatsApp.ok ? "الخدمة غير موجودة" : providerWhatsApp.message };

    return NextResponse.json({
      success: true,
      message: notificationResult.ok
        ? "تم قبول طلب التعديل وتطبيقه وإشعار المزود عبر واتساب"
        : `تم قبول طلب التعديل وتطبيقه، لكن تعذر إشعار المزود: ${notificationResult.error || "خطأ غير معروف"}`,
      notificationStatus: notificationResult.ok ? "sent" : "failed",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
