import { NextResponse } from "next/server";
import {
  ADMIN_MAINTENANCE_SESSION_COOKIE,
  getValidAdminMaintenanceSession,
} from "@/lib/requireProvider";

function hasMaintenanceCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${ADMIN_MAINTENANCE_SESSION_COOKIE}=`));
}

function clearMaintenanceCookie(response: NextResponse) {
  response.cookies.set(ADMIN_MAINTENANCE_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(req: Request) {
  const maintenanceSession = await getValidAdminMaintenanceSession(req);

  if (!maintenanceSession) {
    const response = NextResponse.json({
      isMaintenanceMode: false,
    });

    if (hasMaintenanceCookie(req)) {
      clearMaintenanceCookie(response);
    }

    return response;
  }

  return NextResponse.json({
    isMaintenanceMode: true,
    providerId: maintenanceSession.providerId,
    adminId: maintenanceSession.adminId,
  });
}
