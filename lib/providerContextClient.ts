import { supabase } from "@/lib/supabaseClient";

export async function getProviderClientContext() {
  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data.session;
  const contextResponse = await fetch("/api/provider/context", {
    cache: "no-store",
    credentials: "same-origin",
  }).catch(() => null);
  const context = contextResponse
    ? await contextResponse.json().catch(() => null)
    : null;

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
