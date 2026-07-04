"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminMaintenancePage() {
  const router = useRouter();
  const [maintenanceCode, setMaintenanceCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getSessionUserId = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      throw new Error("جلسة العمل مفقودة");
    }

    return session.user.id;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const requesterId = await getSessionUserId();
      const response = await fetch("/api/admin/maintenance/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceCode, requesterId }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result?.error === "provider_not_found_or_not_linked") {
          throw new Error("مزود الخدمة غير موجود أو غير مربوط بحساب وخدمات صالحة");
        }

        throw new Error(result?.error || "تعذر الدخول إلى وضع الصيانة");
      }

      router.push(result.redirectTo || "/provider/dashboard");
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="text-[#C89B3C]" />
          وضع الصيانة
        </h1>
        <p className="text-white/60 mt-2">
          أدخل رقم صيانة مزود الخدمة للدخول إلى لوحة صيانة خدماته.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-bold text-white/70 mb-2">
            رقم الصيانة
          </label>
          <div className="relative">
            <KeyRound className="absolute right-3 top-3.5 text-white/40" size={20} />
            <input
              value={maintenanceCode}
              onChange={(event) => setMaintenanceCode(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={8}
              placeholder="######"
              className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-white font-mono tracking-widest outline-none focus:border-[#C89B3C]"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || maintenanceCode.length < 6}
          className="w-full bg-[#C89B3C] hover:bg-[#b88d35] text-black font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
          دخول وضع الصيانة
        </button>
      </form>
    </div>
  );
}
