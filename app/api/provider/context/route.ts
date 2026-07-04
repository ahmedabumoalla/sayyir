import { NextResponse } from "next/server";
import { getValidAdminMaintenanceSession } from "@/lib/requireProvider";

export async function GET(req: Request) {
  const maintenanceSession = await getValidAdminMaintenanceSession(req);

  if (!maintenanceSession) {
    return NextResponse.json({
      isMaintenanceMode: false,
    });
  }

  return NextResponse.json({
    isMaintenanceMode: true,
    providerId: maintenanceSession.providerId,
    adminId: maintenanceSession.adminId,
  });
}
