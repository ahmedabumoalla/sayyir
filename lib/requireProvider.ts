import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function requireProvider(req: Request) {
  try {
    let providerId = req.headers.get("x-provider-id");

    if (!providerId) {
      const authHeader = req.headers.get("Authorization");

      if (!authHeader) {
        return {
          provider: null,
          error: "مفقود توكن الدخول",
        };
      }

      const token = authHeader.replace("Bearer ", "");

      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return {
          provider: null,
          error: "جلسة غير صالحة",
        };
      }

      providerId = user.id;
    }

    const { data: provider, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", providerId)
      .eq("is_provider", true)
      .eq("is_deleted", false)
      .eq("is_banned", false)
      .eq("is_blocked", false)
      .single();

    if (error || !provider) {
      return {
        provider: null,
        error: "المزود غير موجود أو غير مفعل",
      };
    }

    return {
      provider,
      error: null,
    };
  } catch (err: any) {
    return {
      provider: null,
      error: err.message,
    };
  }
}