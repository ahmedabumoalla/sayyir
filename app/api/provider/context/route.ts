import { NextResponse } from "next/server";
import {
  ADMIN_MAINTENANCE_SESSION_COOKIE,
  requireProvider,
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
  const providerContext = await requireProvider(req);

  if (!providerContext.isMaintenanceMode || !providerContext.provider) {
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
    providerId: providerContext.provider.id,
    adminId: providerContext.maintenanceAdminId,
    providerProfile: {
      id: providerContext.provider.id,
      full_name: providerContext.provider.full_name,
      email: providerContext.provider.email,
      phone: providerContext.provider.phone,
      role: providerContext.provider.role,
      is_provider: providerContext.provider.is_provider,
    },
  });
}
