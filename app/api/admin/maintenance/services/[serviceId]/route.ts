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

const textOrJsonFields = [
  "title",
  "description",
  "service_category",
  "sub_category",
  "service_type",
  "commercial_license",
  "image_url",
  "work_schedule",
  "platform_commission",
] as const;

const numericFields = ["price", "location_lat", "location_lng", "max_capacity"] as const;

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeDetails(
  currentDetails: Record<string, any>,
  updates: Record<string, any>
): Record<string, any> {
  const merged = { ...currentDetails };

  for (const [key, value] of Object.entries(updates)) {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeDetails(merged[key], value);
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

function toNumberOrNull(value: unknown) {
  if (value === "" || value === null) return { value: null };

  if (typeof value === "number") {
    return Number.isFinite(value) ? { value } : { error: "not_finite" };
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? { value: parsed } : { error: "not_numeric" };
  }

  return { error: "invalid_type" };
}

export async function PATCH(req: Request, context: { params: any }) {
  const body = await req.json().catch(() => ({}));
  const maintenanceSession = await getValidAdminMaintenanceSession(req);

  if (!maintenanceSession) {
    return NextResponse.json({ error: "invalid_maintenance_session" }, { status: 401 });
  }

  const { serviceId } = await context.params;
  const providerId = maintenanceSession.providerId;
  const incoming = isPlainObject(body.updates) ? body.updates : null;

  if (!incoming) {
    return NextResponse.json({ error: "updates_required" }, { status: 400 });
  }

  const { data: existingService, error: serviceError } = await supabaseServer
    .from("services")
    .select("id, provider_id, details, status")
    .eq("id", serviceId)
    .single();

  if (serviceError || !existingService) {
    return NextResponse.json({ error: "service_not_found" }, { status: 404 });
  }

  if (String(existingService.provider_id) !== providerId) {
    return NextResponse.json({ error: "service_provider_mismatch" }, { status: 403 });
  }

  const updatePayload: Record<string, any> = {};

  for (const field of textOrJsonFields) {
    if (
      Object.prototype.hasOwnProperty.call(incoming, field) &&
      incoming[field] !== undefined
    ) {
      updatePayload[field] = incoming[field];
    }
  }

  for (const field of numericFields) {
    if (
      Object.prototype.hasOwnProperty.call(incoming, field) &&
      incoming[field] !== undefined
    ) {
      const numericValue = toNumberOrNull(incoming[field]);

      if ("error" in numericValue) {
        return NextResponse.json(
          {
            error: "maintenance_update_invalid_number",
            field,
            sentValue: incoming[field],
          },
          { status: 400 }
        );
      }

      updatePayload[field] = numericValue.value;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(incoming, "status") &&
    incoming.status !== undefined
  ) {
    if (!allowedStatus.has(String(incoming.status))) {
      return NextResponse.json({ error: "invalid_service_status" }, { status: 400 });
    }

    updatePayload.status = incoming.status;
  }

  if (isPlainObject(incoming.details)) {
    const currentDetails = isPlainObject(existingService.details)
      ? existingService.details
      : {};
    updatePayload.details = mergeDetails(currentDetails, incoming.details);
  }

  delete updatePayload.id;
  delete updatePayload.provider_id;
  delete updatePayload.created_at;
  delete updatePayload.updated_at;
  delete updatePayload.serviceId;
  delete updatePayload.providerId;
  delete updatePayload.isMaintenanceMode;
  delete updatePayload.maintenanceAdminId;
  delete updatePayload.pending_updates;

  for (const key of Object.keys(updatePayload)) {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "no_valid_update_fields" }, { status: 400 });
  }

  const { data: updatedService, error: updateError } = await supabaseServer.rpc(
    "maintenance_update_service",
    {
      p_service_id: serviceId,
      p_provider_id: providerId,
      p_updates: updatePayload,
    }
  );

  if (updateError) {
    const supabaseError = updateError as any;

    return NextResponse.json(
      {
        error: "maintenance_update_failed",
        supabaseCode: supabaseError.code || null,
        supabaseMessage: supabaseError.message || null,
        supabaseDetails: supabaseError.details || null,
        sentKeys: Object.keys(updatePayload),
      },
      { status: 400 }
    );
  }

  await writeAdminLog(
    maintenanceSession.adminId,
    "maintenance_provider_direct_update",
    `Maintenance update for service ${serviceId} provider ${providerId}`
  );

  return NextResponse.json({ service: updatedService });
}
