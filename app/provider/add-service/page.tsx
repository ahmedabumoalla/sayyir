"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import LocationPicker from "@/components/map/LocationPicker";

interface ServiceType {
  key: string;
  name: string;
  requires_location: boolean;
}

export default function AddServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceType, setServiceType] = useState<string>("");
  const [config, setConfig] = useState<ServiceType | null>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>({
    lat: 21.543333,
    lng: 39.172778,
  });

  useEffect(() => {
    loadServiceTypes();
  }, []);

  useEffect(() => {
    if (serviceType) loadConfig();
  }, [serviceType]);

  const loadServiceTypes = async () => {
    const { data } = await supabase
      .from("service_types")
      .select("key, name, requires_location")
      .eq("is_active", true);

    if (data && data.length > 0) {
      setServiceTypes(data);
      setServiceType(data[0].key);
    }
  };

  const loadConfig = async () => {
    const { data } = await supabase
      .from("service_types")
      .select("key, name, requires_location")
      .eq("key", serviceType)
      .single();

    setConfig(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert("يجب تسجيل الدخول");
      setLoading(false);
      return;
    }

    const payload = {
      provider_id: session.user.id,
      title,
      price: Number(price),
      service_type: serviceType,
      location_lat: config?.requires_location ? location.lat : null,
      location_lng: config?.requires_location ? location.lng : null,
      status: "pending",
    };

    const { error } = await supabase.from("services").insert([payload]);

    if (!error) {
      alert("✅ تم رفع الخدمة بنجاح");
      router.push("/provider/dashboard");
    } else {
      alert("❌ خطأ: " + error.message);
    }

    setLoading(false);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#121212] p-10 text-white">
      <h1 className="text-3xl font-bold mb-8">إضافة خدمة جديدة</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <select
          className="w-full p-3 rounded-xl bg-[#252525] border border-white/10"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
        >
          {serviceTypes.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          required
          placeholder="عنوان الخدمة"
          className="w-full p-3 rounded-xl bg-[#252525] border border-white/10"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          required
          type="number"
          placeholder="السعر"
          className="w-full p-3 rounded-xl bg-[#252525] border border-white/10"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        {config?.requires_location && (
          <LocationPicker
            lat={location.lat}
            lng={location.lng}
            onLocationChange={(lat: number, lng: number) =>
              setLocation({ lat, lng })
            }
          />
        )}

        <button
          disabled={loading}
          className="w-full bg-[#C89B3C] text-black py-4 rounded-xl font-bold hover:bg-[#b38a35]"
        >
          {loading ? "جاري الإرسال..." : "🚀 رفع الخدمة"}
        </button>
      </form>
    </main>
  );
}
