import { supabase } from "@/lib/supabaseClient";

export async function getProviderClientContext() {
  const [contextResponse, sessionResult] = await Promise.all([
    fetch("/api/provider/context", { cache: "no-store" }).catch(() => null),
    supabase.auth.getSession(),
  ]);

  const context = contextResponse
    ? await contextResponse.json().catch(() => null)
    : null;
  const session = sessionResult.data.session;

  if (context?.isMaintenanceMode && context.providerId) {
    return {
      providerId: String(context.providerId),
      isMaintenanceMode: true,
      maintenanceAdminId: context.adminId ? String(context.adminId) : null,
      session,
      accessToken: session?.access_token || null,
    };
  }

  return {
    providerId: session?.user?.id || null,
    isMaintenanceMode: false,
    maintenanceAdminId: null,
    session,
    accessToken: session?.access_token || null,
  };
}
