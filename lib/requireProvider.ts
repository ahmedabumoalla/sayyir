import { createClient } from "@supabase/supabase-js";

export const ADMIN_MAINTENANCE_SESSION_COOKIE =
  "sayyir_admin_maintenance_session";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function getRequestCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
}

function isAdminProfile(profile: any) {
  const role = String(profile?.role || "").trim().toLowerCase();

  return (
    profile?.is_super_admin === true ||
    profile?.is_admin === true ||
    role === "admin" ||
    role === "super_admin"
  );
}

export async function getValidAdminMaintenanceSession(req: Request) {
  const sessionId = getRequestCookie(req, ADMIN_MAINTENANCE_SESSION_COOKIE);

  if (!sessionId) return null;

  const { data: sessionRow, error: sessionError } = await supabaseAdmin
    .from("admin_provider_maintenance_sessions")
    .select("id, admin_id, provider_id, expires_at, revoked_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !sessionRow) return null;

  const session = sessionRow as any;

  if (session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from("profiles")
    .select("id, is_admin, is_super_admin, role, is_deleted, is_blocked, is_banned")
    .eq("id", session.admin_id)
    .maybeSingle();

  if (adminError || !adminProfile || !isAdminProfile(adminProfile)) {
    return null;
  }

  const admin = adminProfile as any;

  if (admin.is_deleted === true || admin.is_blocked === true || admin.is_banned === true) {
    return null;
  }

  return {
    sessionId: String(session.id),
    providerId: String(session.provider_id),
    adminId: String(session.admin_id),
  };
}

export async function requireProvider(req: Request) {
  try {
    let providerId = req.headers.get("x-provider-id");
    let authErrorMessage = "مفقود توكن الدخول";

    if (!providerId) {
      const authHeader = req.headers.get("Authorization");

      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");

        const {
          data: { user },
          error: authError,
        } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
          authErrorMessage = "جلسة غير صالحة";
        } else {
          providerId = user.id;
        }
      }
    }

    if (providerId) {
      const { data: provider, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", providerId)
        .eq("is_provider", true)
        .eq("is_deleted", false)
        .eq("is_banned", false)
        .eq("is_blocked", false)
        .maybeSingle();

      if (!error && provider) {
        return {
          provider,
          error: null,
          isMaintenanceMode: false,
          maintenanceAdminId: null,
        };
      }

      authErrorMessage = "المزود غير موجود أو غير مفعل";
    }

    const maintenanceSession = await getValidAdminMaintenanceSession(req);

    if (maintenanceSession) {
      const { data: maintenanceProvider, error: maintenanceProviderError } =
        await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", maintenanceSession.providerId)
          .eq("is_provider", true)
          .eq("is_deleted", false)
          .eq("is_banned", false)
          .eq("is_blocked", false)
          .maybeSingle();

      if (!maintenanceProviderError && maintenanceProvider) {
        return {
          provider: maintenanceProvider,
          error: null,
          isMaintenanceMode: true,
          maintenanceAdminId: maintenanceSession.adminId,
        };
      }
    }

    return {
      provider: null,
      error: authErrorMessage,
      isMaintenanceMode: false,
      maintenanceAdminId: null,
    };
  } catch (err: any) {
    return {
      provider: null,
      error: err.message,
      isMaintenanceMode: false,
      maintenanceAdminId: null,
    };
  }
}
