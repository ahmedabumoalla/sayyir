"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Loader2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type WhatsAppGateContextValue = {
  ensureWhatsAppPhone: () => Promise<boolean>;
};

const WhatsAppGateContext = createContext<WhatsAppGateContextValue | null>(null);

const COUNTRY_CODES = [
  ["+966", "السعودية"],
  ["+971", "الإمارات"],
  ["+965", "الكويت"],
  ["+973", "البحرين"],
  ["+968", "عُمان"],
  ["+974", "قطر"],
  ["+20", "مصر"],
] as const;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("يجب تسجيل الدخول أولاً.");
  return { Authorization: `Bearer ${token}` };
}

function splitPhone(phone: string) {
  const normalized = String(phone || "").replace(/\s/g, "");
  const match = COUNTRY_CODES.find(([code]) => normalized.startsWith(code));
  if (!match) return { countryCode: "+966", nationalNumber: "" };
  return {
    countryCode: match[0],
    nationalNumber: normalized.slice(match[0].length).replace(/^0+/, ""),
  };
}

export function WhatsAppPhoneGateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState("+966");
  const [nationalNumber, setNationalNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const openGate = useCallback((currentPhone?: string) => {
    const split = splitPhone(currentPhone || "");
    setCountryCode(split.countryCode);
    setNationalNumber(split.nationalNumber);
    setError("");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const ensureWhatsAppPhone = useCallback(async () => {
    const headers = await authHeaders();
    const response = await fetch("/api/profile/whatsapp", {
      headers,
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok && result.ok) return true;
    if (
      response.status === 428 ||
      result.code === "WHATSAPP_PHONE_REQUIRED" ||
      result.code === "WHATSAPP_PHONE_INVALID"
    ) {
      return openGate(result.currentPhone);
    }

    throw new Error(result.error || result.message || "تعذر التحقق من رقم واتساب.");
  }, [openGate]);

  const closeGate = () => {
    setOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  };

  const savePhone = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = nationalNumber.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 7) {
      setError("أدخل رقم الجوال بشكل صحيح.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/profile/whatsapp", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `${countryCode}${digits}` }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "تعذر حفظ رقم واتساب.");
      }

      setOpen(false);
      resolverRef.current?.(true);
      resolverRef.current = null;
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "تعذر حفظ رقم واتساب."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <WhatsAppGateContext.Provider value={{ ensureWhatsAppPhone }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <form
            onSubmit={savePhone}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171717] p-6 text-white shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-400">
                  <MessageCircle size={25} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">أضف رقم واتساب</h2>
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    سنحفظه مرة واحدة لإرسال تحديثات الطلبات والحجوزات المهمة.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeGate}
                className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </div>

            <label className="mb-2 block text-sm font-bold text-[#C89B3C]">
              رقم واتساب الرسمي
            </label>
            <div className="flex" dir="ltr">
              <select
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="rounded-l-xl border border-r-0 border-white/10 bg-black/35 px-3 py-3 outline-none"
              >
                {COUNTRY_CODES.map(([code, country]) => (
                  <option key={code} value={code} className="bg-[#171717]">
                    {code} {country}
                  </option>
                ))}
              </select>
              <input
                autoFocus
                type="tel"
                inputMode="numeric"
                value={nationalNumber}
                onChange={(event) =>
                  setNationalNumber(event.target.value.replace(/\D/g, ""))
                }
                placeholder="5XXXXXXXX"
                className="min-w-0 flex-1 rounded-r-xl border border-white/10 bg-black/35 px-4 py-3 text-left outline-none focus:border-[#C89B3C]"
              />
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/45">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
              سيتم التحقق من أن الرقم مسجل فعلياً في واتساب وحفظه بصيغة دولية.
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C89B3C] py-3.5 font-bold text-black transition hover:bg-[#d8ad50] disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={19} /> : null}
              {saving ? "جاري التحقق..." : "حفظ الرقم والمتابعة"}
            </button>
          </form>
        </div>
      )}
    </WhatsAppGateContext.Provider>
  );
}

export function useWhatsAppPhone() {
  const context = useContext(WhatsAppGateContext);
  if (!context) {
    throw new Error("useWhatsAppPhone must be used inside WhatsAppPhoneGateProvider");
  }
  return context;
}
