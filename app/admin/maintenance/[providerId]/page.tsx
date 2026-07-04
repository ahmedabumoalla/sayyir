"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, Edit, Loader2, Mail, Phone, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const statuses: Record<string, string> = {
  approved: "معتمدة",
  update_requested: "طلب تعديل",
  stopped: "موقوفة",
  deleted: "محذوفة",
  rejected: "مرفوضة",
  pending: "قيد المراجعة",
  stop_requested: "طلب إيقاف",
  delete_requested: "طلب حذف",
};

export default function ProviderMaintenancePage() {
  const params = useParams();
  const providerId = params.providerId as string;
  const [provider, setProvider] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const requesterId = await getSessionUserId();
        const searchParams = new URLSearchParams({ requesterId });
        const response = await fetch(
          `/api/admin/maintenance/provider/${providerId}?${searchParams.toString()}`
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.error || "تعذر تحميل بيانات المزود");
        }

        setProvider(result.provider);
        setServices(result.services || []);
      } catch (err: any) {
        setError(err.message || "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
      }
    };

    if (providerId) loadData();
  }, [providerId]);

  if (loading) {
    return (
      <div className="p-20 flex justify-center">
        <Loader2 className="animate-spin text-[#C89B3C]" size={40} />
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4">{error}</div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Link
        href="/admin/maintenance"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm"
      >
        <ArrowRight size={16} />
        رجوع إلى وضع الصيانة
      </Link>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="text-[#C89B3C]" />
          {provider?.full_name || "مزود خدمة"}
        </h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/60">
          <span className="flex items-center gap-2"><Mail size={15} />{provider?.email || "-"}</span>
          <span className="flex items-center gap-2"><Phone size={15} />{provider?.phone || "-"}</span>
          <span className="flex items-center gap-2"><Briefcase size={15} />{services.length} خدمة</span>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-white">خدمات المزود</h2>
          <span className="text-xs text-white/40">جميع الحالات معروضة</span>
        </div>

        {services.length === 0 ? (
          <div className="p-12 text-center text-white/40">لا توجد خدمات لهذا المزود.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {services.map((service) => (
              <div key={service.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-white">{service.title || "خدمة بدون عنوان"}</h3>
                    <span className="text-[11px] px-2 py-1 rounded bg-black/30 border border-white/10 text-[#C89B3C]">
                      {statuses[service.status] || service.status || "غير محددة"}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 mt-1 line-clamp-2">{service.description || "-"}</p>
                  <div className="text-xs text-white/35 mt-2">
                    {service.service_category || "-"} / {service.sub_category || "-"}
                  </div>
                </div>

                <Link
                  href={`/admin/maintenance/${providerId}/services/${service.id}/edit`}
                  className="shrink-0 bg-[#C89B3C]/10 hover:bg-[#C89B3C] text-[#C89B3C] hover:text-black border border-[#C89B3C]/30 rounded-xl px-4 py-2 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <Edit size={16} />
                  تعديل في وضع الصيانة
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
