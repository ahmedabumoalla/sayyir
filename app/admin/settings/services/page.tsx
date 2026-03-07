"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowRight, Settings as SettingsIcon, Save, Ticket } from "lucide-react"; 
import { useRouter } from "next/navigation";

interface ServiceType {
  id?: string;
  key: string;
  name: string;
  requires_location: boolean;
  is_active: boolean;
}

// الأنواع الأساسية المطلوبة دائماً
const defaultServiceTypes: ServiceType[] = [
    { key: "tourist", name: "معلم سياحي", requires_location: true, is_active: true },
    { key: "natural", name: "معلم طبيعي", requires_location: true, is_active: true },
    { key: "heritage", name: "موقع تراثي", requires_location: true, is_active: true },
    { key: "experience", name: "تجربة سياحية", requires_location: true, is_active: true },
    { key: "events", name: "الفعاليات", requires_location: false, is_active: true }, // ✅ إضافة الفعاليات
];

export default function ServiceSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceType[]>([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase.from("service_types").select("*").order("created_at", { ascending: true });
        
        if (error && error.code === '42P01') {
            // الجدول غير موجود، نستخدم الافتراضيات
            setServices(defaultServiceTypes);
        } else if (data && data.length > 0) {
            // دمج البيانات الموجودة مع الفعاليات في حال لم تكن مسجلة مسبقاً
            let mergedData = [...data];
            const hasEvents = data.find(d => d.key === 'events');
            if(!hasEvents) {
                mergedData.push({ key: "events", name: "الفعاليات", requires_location: false, is_active: true });
            }
            setServices(mergedData);
        } else {
            setServices(defaultServiceTypes);
        }
    } catch(err) {
        console.error(err);
        setServices(defaultServiceTypes);
    } finally {
        setLoading(false);
    }
  };

  const handleChange = (index: number, field: keyof ServiceType, value: string | boolean) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  // ✅ كود الحفظ المحدث (آمن وأكثر استقراراً)
  const handleSave = async () => {
    setSaving(true);
    try {
        // حذف الكل ثم إعادة الإدخال لضمان التحديث بدون أخطاء ID
        await supabase.from("service_types").delete().neq('key', 'delete_all');
        const { error } = await supabase.from("service_types").insert(services.map(s => ({
            key: s.key,
            name: s.name,
            requires_location: s.requires_location,
            is_active: s.is_active
        })));
        
        if (error) throw error;
        alert("✅ تم حفظ إعدادات الخدمات بنجاح");
    } catch (error: any) {
        console.error("Save error:", error);
        alert("حدث خطأ أثناء الحفظ. تأكد من أن جدول `service_types` موجود في قاعدة البيانات.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl pb-10">
      
      <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/admin/settings")} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition"><ArrowRight size={20} /></button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><SettingsIcon className="text-[#C89B3C]"/> إعدادات أنواع الخدمات والفعاليات</h1>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => (
            <div key={service.key} className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-white/20 transition">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="flex items-center gap-2">
                        {service.key === 'events' ? <Ticket className="text-red-400" size={18}/> : <SettingsIcon className="text-gray-400" size={18}/>}
                        <input
                            className="w-full bg-black/40 p-3 rounded-xl border border-white/10 outline-none text-white focus:border-[#C89B3C]"
                            value={service.name}
                            onChange={(e) => handleChange(index, "name", e.target.value)}
                            placeholder="اسم الخدمة (يظهر للعميل)"
                        />
                    </div>

                    <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={service.requires_location}
                            onChange={(e) => handleChange(index, "requires_location", e.target.checked)}
                            className="accent-[#C89B3C] w-5 h-5"
                        />
                        يتطلب خريطة (موقع)
                    </label>

                    <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={service.is_active}
                            onChange={(e) => handleChange(index, "is_active", e.target.checked)}
                            className="accent-[#C89B3C] w-5 h-5"
                        />
                        مُفعل ومتاح للزوار
                    </label>
                </div>
            </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
          <button onClick={handleSave} disabled={saving} className="bg-[#C89B3C] text-black px-8 py-3 rounded-xl font-bold hover:bg-[#b38a35] transition flex items-center gap-2 shadow-lg">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={18}/>}
              حفظ التعديلات
          </button>
      </div>

    </div>
  );
}