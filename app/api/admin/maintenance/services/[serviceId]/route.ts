import { NextResponse } from "next/server";
import { writeAdminLog } from "@/lib/adminApi";
import { getValidAdminMaintenanceSession } from "@/lib/requireProvider";
import { supabaseServer } from "@/lib/supabaseServer";

const allowedStatus = new Set([
  "approved",
  "update_requested",
  "stopped",
  "deleted",
  "rejected",
  "pending",
  "stop_requested",
  "delete_requested",
]);

const directFields = [
  "title",
  "description",
  "service_category",
  "sub_category",
  "service_type",
  "commercial_license",
  "image_url",
  "work_schedule",
  "location_lat",
  "location_lng",
  "max_capacity",
  "platform_commission",
] as const;

export async function PATCH(
  req: Request,
  context: { params: any }
) {
  const body = await req.json().catch(() => ({}));
  const maintenanceSession = await getValidAdminMaintenanceSession(req);
  if (!maintenanceSession) {
    return NextResponse.json({ error: "جلسة الصيانة غير صالحة" }, { status: 401 });
  }

  const { serviceId } = await context.params;
  const providerId = String(body.providerId || "").trim();
  const updates = body.updates && typeof body.updates === "object" ? body.updates : null;

  if (!providerId || !updates) {
    return NextResponse.json({ error: "providerId و updates مطلوبة" }, { status: 400 });
  }

  if (maintenanceSession.providerId !== providerId) {
    return NextResponse.json({ error: "جلسة الصيانة لا تطابق هذا المزود" }, { status: 403 });
  }

  const { data: service, error: serviceError } = await supabaseServer
    .from("services")
    .select("id, provider_id, details, status")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
  }

  if (service.provider_id !== providerId) {
    return NextResponse.json({ error: "لا يمكن تعديل خدمة تابعة لمزود آخر" }, { status: 403 });
  }

  const payload: Record<string, any> = {};

  for (const field of directFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      payload[field] = updates[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, "price")) {
    payload.price = updates.price === "" || updates.price === null ? null : Number(updates.price);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    if (!allowedStatus.has(String(updates.status))) {
      return NextResponse.json({ error: "حالة الخدمة غير صالحة" }, { status: 400 });
    }
    payload.status = updates.status;
  }

  if (updates.details && typeof updates.details === "object" && !Array.isArray(updates.details)) {
    const currentDetails =
      service.details && typeof service.details === "object" && !Array.isArray(service.details)
        ? service.details
        : {};

    payload.details = {
      ...currentDetails,
      ...updates.details,
    };
  }

  delete payload.provider_id;
  delete payload.pending_updates;
  delete payload.updated_at;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول قابلة للتحديث" }, { status: 400 });
  }

  const { data: updatedService, error: updateError } = await supabaseServer
    .from("services")
    .update(payload)
    .eq("id", serviceId)
    .eq("provider_id", providerId)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAdminLog(
    maintenanceSession.adminId,
    "maintenance_provider_direct_update",
    `Maintenance update for service ${serviceId} provider ${providerId}`
  );

  return NextResponse.json({ service: updatedService });
}
