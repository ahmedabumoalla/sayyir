import { checkGreenApiRecipient } from "@/lib/greenApi";
import { normalizeInternationalPhone } from "@/lib/phone";
import { supabaseServer } from "@/lib/supabaseServer";

export const WHATSAPP_PHONE_REQUIRED = "WHATSAPP_PHONE_REQUIRED";
export const WHATSAPP_PHONE_INVALID = "WHATSAPP_PHONE_INVALID";
export const WHATSAPP_CHECK_FAILED = "WHATSAPP_CHECK_FAILED";

export type WhatsAppProfileResult =
  | { ok: true; phone: string }
  | {
      ok: false;
      code:
        | typeof WHATSAPP_PHONE_REQUIRED
        | typeof WHATSAPP_PHONE_INVALID
        | typeof WHATSAPP_CHECK_FAILED;
      message: string;
      currentPhone?: string;
    };

type ProfileWithPhone = {
  id: string;
  phone?: string | null;
};

export async function ensureProfileWhatsApp(
  profile: ProfileWithPhone,
  force = false
): Promise<WhatsAppProfileResult> {
  const rawPhone = String(profile.phone || "").trim();
  if (!rawPhone) {
    return {
      ok: false,
      code: WHATSAPP_PHONE_REQUIRED,
      message: "أضف رقم واتساب لإكمال الإجراء.",
    };
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeInternationalPhone(rawPhone);
  } catch {
    return {
      ok: false,
      code: WHATSAPP_PHONE_INVALID,
      message: "رقم واتساب المحفوظ غير صالح. أدخل الرقم الصحيح.",
      currentPhone: rawPhone,
    };
  }

  const recipient = await checkGreenApiRecipient(normalizedPhone, force);
  if (!recipient.ok) {
    return {
      ok: false,
      code: WHATSAPP_CHECK_FAILED,
      message: "تعذر التحقق من رقم واتساب حالياً. حاول مرة أخرى.",
      currentPhone: normalizedPhone,
    };
  }

  if (!recipient.existsWhatsApp) {
    return {
      ok: false,
      code: WHATSAPP_PHONE_INVALID,
      message: "الرقم غير مرتبط بحساب واتساب. أدخل رقماً مسجلاً في واتساب.",
      currentPhone: normalizedPhone,
    };
  }

  if (normalizedPhone !== rawPhone) {
    const { error } = await supabaseServer
      .from("profiles")
      .update({ phone: normalizedPhone })
      .eq("id", profile.id);

    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate key")) {
        return {
          ok: false,
          code: WHATSAPP_PHONE_INVALID,
          message: "رقم واتساب هذا مرتبط بحساب آخر. استخدم رقمك الرسمي المرتبط بهذا الحساب.",
          currentPhone: normalizedPhone,
        };
      }
      return {
        ok: false,
        code: WHATSAPP_CHECK_FAILED,
        message: "تعذر حفظ رقم واتساب بالصيغة الصحيحة.",
        currentPhone: normalizedPhone,
      };
    }
  }

  return { ok: true, phone: normalizedPhone };
}

export function whatsappGuardStatus(result: WhatsAppProfileResult) {
  if (result.ok) return 200;
  return result.code === WHATSAPP_CHECK_FAILED ? 503 : 428;
}
