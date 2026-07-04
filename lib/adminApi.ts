import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabaseServer";

export type AdminApiResult =
  | {
      ok: true;
      adminId: string;
      profile: {
        id: string;
        full_name: string | null;
        email: string | null;
        is_admin: boolean | null;
        is_super_admin: boolean | null;
      };
    }
  | { ok: false; status: number; error: string };

export async function requireAdminFromCookies(): Promise<AdminApiResult> {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser();

  if (userError || !user?.id) {
    return { ok: false, status: 401, error: "غير مصرح" };
  }

  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("id, full_name, email, is_admin, is_super_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || (!profile.is_admin && !profile.is_super_admin)) {
    return { ok: false, status: 403, error: "غير مصرح لك" };
  }

  return { ok: true, adminId: user.id, profile };
}

export async function writeAdminLog(
  adminId: string,
  actionType: string,
  details: string
) {
  const { error } = await supabaseServer.from("admin_logs").insert({
    admin_id: adminId,
    action_type: actionType,
    details,
  });

  if (error) {
    console.warn("Admin log skipped:", error.message);
  }
}
