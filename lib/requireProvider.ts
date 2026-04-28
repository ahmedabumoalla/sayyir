import { supabaseServer } from "@/lib/supabaseServer";

export async function requireProvider(req: Request) {
  try {
    const providerId = req.headers.get("x-provider-id");

    if (!providerId) {
      return {
        provider: null,
        error: "x-provider-id مفقود",
      };
    }

    const { data: provider, error } = await supabaseServer
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