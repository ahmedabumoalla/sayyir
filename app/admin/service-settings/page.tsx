"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

interface ServiceType {
  id?: string;
  key: string;
  name: string;
  requires_location: boolean;
  is_active: boolean;
}

export default function ServiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceType[]>([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("service_types")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) setServices(data);
    setLoading(false);
  };

  const handleChange = (
    index: number,
    field: keyof ServiceType,
    value: string | boolean
  ) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("service_types").upsert(services);
    if (!error) alert("✅ تم حفظ إعدادات الخدمات");
    setSaving(false);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#1a1a1a] p-10 text-white">
      <h1 className="text-3xl font-bold mb-8">إعدادات أنواع الخدمات</h1>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="animate-spin text-[#C89B3C]" />
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {services.map((service, index) => (
            <div
              key={service.key}
              className="bg-[#252525] p-6 rounded-2xl border border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none"
                  value={service.name}
                  onChange={(e) =>
                    handleChange(index, "name", e.target.value)
                  }
                  placeholder="اسم الخدمة"
                />

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={service.requires_location}
                    onChange={(e) =>
                      handleChange(
                        index,
                        "requires_location",
                        e.target.checked
                      )
                    }
                  />
                  يتطلب خريطة
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={service.is_active}
                    onChange={(e) =>
                      handleChange(index, "is_active", e.target.checked)
                    }
                  />
                  مفعّل
                </label>
              </div>
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#C89B3C] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#b38a35]"
          >
            {saving ? "جاري الحفظ..." : "💾 حفظ التعديلات"}
          </button>
        </div>
      )}
    </main>
  );
}
