import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/requireProvider";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizeInternationalPhone } from "@/lib/phone";
import {
  ensureProfileWhatsApp,
  whatsappGuardStatus,
} from "@/lib/whatsappProfile";

async function getProfile(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return { userId: null, profile: null };

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("id, phone, role, is_provider")
    .eq("id", userId)
    .maybeSingle();

  return { userId, profile };
}

export async function GET(request: Request) {
  const { userId, profile } = await getProfile(request);
  if (!userId) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  const result = await ensureProfileWhatsApp(profile, false);
  if (!result.ok) {
    return NextResponse.json(result, { status: whatsappGuardStatus(result) });
  }

  return NextResponse.json({ ok: true, phone: result.phone });
}

export async function POST(request: Request) {
  const { userId, profile } = await getProfile(request);
  if (!userId) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  let phone: string;
  try {
    phone = normalizeInternationalPhone(String(body.phone || ""));
  } catch {
    return NextResponse.json(
      { code: "WHATSAPP_PHONE_INVALID", error: "أدخل رقم جوال صحيحاً مع رمز الدولة." },
      { status: 400 }
    );
  }

  const verification = await ensureProfileWhatsApp(
    { id: profile.id, phone },
    true
  );
  if (!verification.ok) {
    return NextResponse.json(
      { code: verification.code, error: verification.message },
      { status: whatsappGuardStatus(verification) }
    );
  }

  const { error: updateError } = await supabaseServer
    .from("profiles")
    .update({ phone: verification.phone })
    .eq("id", userId);
  if (updateError) {
    const duplicate = String(updateError.message || "").toLowerCase().includes("duplicate key");
    return NextResponse.json(
      {
        code: duplicate ? "WHATSAPP_PHONE_IN_USE" : "WHATSAPP_SAVE_FAILED",
        error: duplicate
          ? "رقم واتساب هذا مرتبط بحساب آخر. استخدم رقمك الرسمي المرتبط بهذا الحساب."
          : "تعذر حفظ رقم واتساب حالياً.",
      },
      { status: duplicate ? 409 : 500 }
    );
  }

  await Promise.allSettled([
    supabaseServer.auth.admin.updateUserById(userId, {
      user_metadata: { phone: verification.phone },
    }),
    supabaseServer
      .from("provider_requests")
      .update({ phone: verification.phone })
      .eq("user_id", userId),
  ]);

  return NextResponse.json({ ok: true, phone: verification.phone });
}
