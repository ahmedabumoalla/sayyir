"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowRight, User, Home } from "lucide-react"; // إضافة الأيقونات الناقصة
import Image from "next/image";
import Link from "next/link";

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
  
  // حالات القائمة (لأيقونة البروفايل)
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

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

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  return (
    <main dir="rtl" className="min-h-screen bg-[#1a1a1a] text-white relative">
      
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <Link href="/admin/settings" className="p-2 bg-white/5 rounded-lg text-[#C89B3C]">
          <ArrowRight size={24} />
        </Link>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
           <Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" />
        </Link>

        <div className="relative">
          <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10">
            <User size={20} />
          </button>
          {isProfileMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <Link href="/admin/profile" className="block px-4 py-3 hover:bg-white/5 text-sm transition">الحساب الشخصي</Link>
              <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition">تسجيل الخروج</button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 lg:p-10 pt-24 md:pt-10">
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
                    className="bg-black/30 p-3 rounded-xl border border-white/10 outline-none text-white"
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
      </div>
    </main>
  );
}