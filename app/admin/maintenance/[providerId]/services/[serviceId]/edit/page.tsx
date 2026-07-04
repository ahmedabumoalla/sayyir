"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Loader2, Save, ShieldAlert } from "lucide-react";

const statuses = [
  "approved",
  "update_requested",
  "stopped",
  "deleted",
  "rejected",
  "pending",
  "stop_requested",
  "delete_requested",
];

function toText(value: any) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function parseJson(value: string, fallback: any) {
  if (!value.trim()) return fallback || {};
  return JSON.parse(value);
}

export default function MaintenanceServiceEditPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params.providerId as string;
  const serviceId = params.serviceId as string;
  const [service, setService] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [detailsText, setDetailsText] = useState("{}");
  const [scheduleText, setScheduleText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadService = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/admin/maintenance/provider/${providerId}`);
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.error || "تعذر تحميل الخدمة");
        }

        const found = (result.services || []).find((item: any) => item.id === serviceId);
        if (!found) {
          throw new Error("الخدمة غير موجودة لهذا المزود");
        }

        setService(found);
        setForm({
          title: found.title || "",
          description: found.description || "",
          price: found.price ?? "",
          service_category: found.service_category || "",
          sub_category: found.sub_category || "",
          commercial_license: toText(found.commercial_license),
          image_url: found.image_url || "",
          location_lat: found.location_lat ?? "",
          location_lng: found.location_lng ?? "",
          max_capacity: found.max_capacity ?? "",
          platform_commission: found.platform_commission ?? "",
          status: found.status || "",
        });
        setDetailsText(JSON.stringify(found.details || {}, null, 2));
        setScheduleText(JSON.stringify(found.work_schedule || null, null, 2));
      } catch (err: any) {
        setError(err.message || "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
      }
    };

    if (providerId && serviceId) loadService();
  }, [providerId, serviceId]);

  const updateField = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const updates: Record<string, any> = {
        title: form.title,
        description: form.description,
        price: form.price,
        service_category: form.service_category,
        sub_category: form.sub_category,
        commercial_license: form.commercial_license,
        image_url: form.image_url,
        location_lat: form.location_lat === "" ? null : Number(form.location_lat),
        location_lng: form.location_lng === "" ? null : Number(form.location_lng),
        max_capacity: form.max_capacity === "" ? null : Number(form.max_capacity),
        platform_commission: form.platform_commission === "" ? null : Number(form.platform_commission),
        details: parseJson(detailsText, service?.details),
      };

      if (scheduleText.trim()) {
        updates.work_schedule = parseJson(scheduleText, service?.work_schedule);
      }

      if (form.status !== service?.status) {
        updates.status = form.status;
      }

      const response = await fetch(`/api/admin/maintenance/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, updates }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "تعذر حفظ التعديلات");
      }

      router.push(`/admin/maintenance/${providerId}`);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 flex justify-center">
        <Loader2 className="animate-spin text-[#C89B3C]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      <Link
        href={`/admin/maintenance/${providerId}`}
        className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm"
      >
        <ArrowRight size={16} />
        رجوع لخدمات المزود
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">تعديل الخدمة في وضع الصيانة</h1>
        <p className="text-white/50 text-sm mt-1">
          الحفظ هنا يحدّث جدول services مباشرة ولا ينشئ طلب تعديل.
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl p-4 text-sm flex gap-3">
        <ShieldAlert size={18} className="shrink-0 mt-0.5" />
        لا يتم تغيير الحالة إلا إذا غيّرتها من حقل الحالة صراحة.
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="space-y-2">
            <span className="text-sm text-white/60">عنوان الخدمة</span>
            <input value={form.title || ""} onChange={(e) => updateField("title", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">السعر</span>
            <input type="number" value={form.price ?? ""} onChange={(e) => updateField("price", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">التصنيف الرئيسي</span>
            <input value={form.service_category || ""} onChange={(e) => updateField("service_category", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">التصنيف الفرعي</span>
            <input value={form.sub_category || ""} onChange={(e) => updateField("sub_category", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">الحالة</span>
            <select value={form.status || ""} onChange={(e) => updateField("status", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]">
              {statuses.map((status) => (
                <option key={status} value={status} className="bg-[#1e1e1e]">
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">الطاقة الاستيعابية</span>
            <input type="number" value={form.max_capacity ?? ""} onChange={(e) => updateField("max_capacity", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">خط العرض</span>
            <input type="number" value={form.location_lat ?? ""} onChange={(e) => updateField("location_lat", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-white/60">خط الطول</span>
            <input type="number" value={form.location_lng ?? ""} onChange={(e) => updateField("location_lng", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-white/60">رابط الغلاف</span>
            <input value={form.image_url || ""} onChange={(e) => updateField("image_url", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-white/60">الترخيص التجاري</span>
            <input value={form.commercial_license || ""} onChange={(e) => updateField("commercial_license", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" />
          </label>
        </div>

        <label className="space-y-2 block">
          <span className="text-sm text-white/60">الوصف</span>
          <textarea rows={5} value={form.description || ""} onChange={(e) => updateField("description", e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C] resize-y" />
        </label>

        <label className="space-y-2 block">
          <span className="text-sm text-white/60">details JSON</span>
          <textarea rows={12} value={detailsText} onChange={(e) => setDetailsText(e.target.value)} dir="ltr" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C] font-mono text-sm resize-y" />
        </label>

        <label className="space-y-2 block">
          <span className="text-sm text-white/60">work_schedule JSON</span>
          <textarea rows={8} value={scheduleText} onChange={(e) => setScheduleText(e.target.value)} dir="ltr" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C] font-mono text-sm resize-y" />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#C89B3C] hover:bg-[#b88d35] text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            حفظ التعديلات فورًا
          </button>
        </div>
      </form>
    </div>
  );
}
