import { NextResponse } from "next/server";
import { writeAdminLog } from "@/lib/adminApi";
import { getValidAdminMaintenanceSession } from "@/lib/requireProvider";
import { supabaseServer } from "@/lib/supabaseServer";

const allowedStatus = new Set([
  "approved",
  "pending",
  "stopped",
  "deleted",
  "rejected",
]);

const requiredTextFields = [
  "title",
  "description",
  "service_category",
  "sub_category",
  "service_type",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseNumber(
  value: unknown,
  options: { nullable: boolean }
): { value: number | null } | { error: string } {
  if (value === null || value === "") {
    return options.nullable ? { value: null } : { error: "required" };
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed)
    ? { value: parsed }
    : { error: "invalid_number" };
}

export async function POST(req: Request) {
  const maintenanceSession = await getValidAdminMaintenanceSession(req);

  if (!maintenanceSession) {
    return NextResponse.json(
      { error: "invalid_maintenance_session" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "invalid_request_body" }, { status: 400 });
  }

  const forbiddenOwnershipFields = [
    "provider_id",
    "providerId",
    "user_id",
    "userId",
    "admin_id",
    "adminId",
  ];

  if (forbiddenOwnershipFields.some((field) => field in body)) {
    return NextResponse.json(
      { error: "service_owner_must_come_from_maintenance_session" },
      { status: 400 }
    );
  }

  const insertPayload: Record<string, unknown> = {
    provider_id: maintenanceSession.providerId,
    status: "approved",
  };

  for (const field of requiredTextFields) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      return NextResponse.json(
        { error: "maintenance_create_invalid_field", field },
        { status: 400 }
      );
    }

    insertPayload[field] = body[field].trim();
  }

  const price = parseNumber(body.price, { nullable: false });
  if ("error" in price) {
    return NextResponse.json(
      { error: "maintenance_create_invalid_number", field: "price" },
      { status: 400 }
    );
  }
  insertPayload.price = price.value;

  for (const field of ["location_lat", "location_lng", "max_capacity"] as const) {
    if (!(field in body)) continue;

    const numericValue = parseNumber(body[field], { nullable: true });
    if ("error" in numericValue) {
      return NextResponse.json(
        { error: "maintenance_create_invalid_number", field },
        { status: 400 }
      );
    }

    insertPayload[field] = numericValue.value;
  }

  if (body.commercial_license !== undefined) {
    const validLicense =
      body.commercial_license === null ||
      typeof body.commercial_license === "string" ||
      (Array.isArray(body.commercial_license) &&
        body.commercial_license.every((item) => typeof item === "string"));

    if (!validLicense) {
      return NextResponse.json(
        { error: "maintenance_create_invalid_field", field: "commercial_license" },
        { status: 400 }
      );
    }

    insertPayload.commercial_license = body.commercial_license;
  }

  if (body.image_url !== undefined) {
    if (body.image_url !== null && typeof body.image_url !== "string") {
      return NextResponse.json(
        { error: "maintenance_create_invalid_field", field: "image_url" },
        { status: 400 }
      );
    }

    insertPayload.image_url = body.image_url;
  }

  if (body.work_schedule !== undefined) {
    if (
      body.work_schedule !== null &&
      !Array.isArray(body.work_schedule) &&
      !isPlainObject(body.work_schedule)
    ) {
      return NextResponse.json(
        { error: "maintenance_create_invalid_field", field: "work_schedule" },
        { status: 400 }
      );
    }

    insertPayload.work_schedule = body.work_schedule;
  }

  if (body.details !== undefined) {
    if (!isPlainObject(body.details)) {
      return NextResponse.json(
        { error: "maintenance_create_invalid_field", field: "details" },
        { status: 400 }
      );
    }

    insertPayload.details = body.details;
  }

  if (body.status !== undefined) {
    const status = String(body.status);
    if (!allowedStatus.has(status)) {
      return NextResponse.json(
        { error: "invalid_service_status" },
        { status: 400 }
      );
    }

    insertPayload.status = status;
  }

  const { data: service, error } = await supabaseServer
    .from("services")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    const supabaseError = error as any;

    return NextResponse.json(
      {
        error: "maintenance_create_failed",
        supabaseCode: supabaseError.code || null,
        supabaseMessage: supabaseError.message || null,
        supabaseDetails: supabaseError.details || null,
        sentKeys: Object.keys(insertPayload),
      },
      { status: 400 }
    );
  }

  await writeAdminLog(
    maintenanceSession.adminId,
    "maintenance_provider_direct_create",
    `Maintenance create for service ${service.id} provider ${maintenanceSession.providerId}`
  );

  return NextResponse.json({ service }, { status: 201 });
}
