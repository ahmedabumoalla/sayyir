"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Check, X, MapPin, Eye, Clock, ArrowRight, Home, Utensils, Mountain } from "lucide-react";
import Link from "next/link";

export default function AdminReviewPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingServices();
  }, []);

  const fetchPendingServices = async () => {
    setLoading(true);
    // جلب الخدمات مع بيانات المزود من جدول profiles
    const { data, error } = await supabase
      .from("services")
      .select(`
        *,
        profiles:provider_id (full_name, avatar_url)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error) setServices(data);
    setLoading(false);
  };

  const handleAction = async (id, newStatus) => {
    const { error } = await supabase
      .from("services")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("حدث خطأ في تحديث الحالة");
    } else {
      alert(newStatus === "approved" ? "✅ تم تفعيل الخدمة بنجاح" : "❌ تم رفض الطلب");
      fetchPendingServices();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#1a1a1a] text-[#C89B3C]">جاري تحميل الطلبات...</div>;

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-6 lg:p-10 text-white text-right" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
            <ArrowRight size={20} />
          </Link>
          <h1 className="text-3xl font-bold">طلبات مراجعة الخدمات</h1>
        </div>
        <span className="bg-[#C89B3C]/10 text-[#C89B3C] px-4 py-2 rounded-xl border border-[#C89B3C]/20 text-sm">
          {services.length} طلبات معلقة
        </span>
      </div>

      {services.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center">
          <p className="text-white/40 italic">لا توجد خدمات جديدة بانتظار المراجعة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden hover:border-[#C89B3C]/30 transition shadow-xl">
              <div className="p-6 flex flex-col lg:flex-row gap-8">
                
                {/* 1. صورة الخدمة أو الأيقونة */}
                <div className="w-full lg:w-48 h-48 bg-black/40 rounded-xl flex items-center justify-center border border-white/5">
                  {service.service_type === 'accommodation' && <Home size={48} className="text-blue-400 opacity-50" />}
                  {service.service_type === 'food' && <Utensils size={48} className="text-orange-400 opacity-50" />}
                  {service.service_type === 'experience' && <Mountain size={48} className="text-emerald-400 opacity-50" />}
                </div>

                {/* 2. تفاصيل الخدمة */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{service.title}</h2>
                      <div className="flex items-center gap-2 text-white/50 text-sm">
                        <MapPin size={14} className="text-[#C89B3C]" />
                        <span>موقع الخدمة (على الخريطة)</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-[#C89B3C]">{service.price} <span className="text-xs font-normal">ريال</span></p>
                    </div>
                  </div>

                  <p className="text-white/60 text-sm mb-6 leading-relaxed">{service.description}</p>

                  {/* عرض الـ JSON التفصيلي (الغرف، المنيو، إلخ) */}
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-bold text-[#C89B3C] mb-3 uppercase tracking-wider">التفاصيل التقنية للخدمة</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(service.details || {}).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-white/30 block mb-1">{key}</span>
                          <span className="text-white/90">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. إجراءات الأدمن */}
                <div className="lg:w-64 flex flex-col gap-3 justify-center border-r border-white/5 pr-6">
                  <div className="mb-4 text-center">
                     <p className="text-[10px] text-white/30 mb-1">المزود:</p>
                     <p className="text-sm font-bold text-white/80">{service.profiles?.full_name}</p>
                  </div>
                  
                  <button 
                    onClick={() => handleAction(service.id, 'approved')}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> قبول ونشر الخدمة
                  </button>

                  <button 
                    onClick={() => handleAction(service.id, 'rejected')}
                    className="w-full py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl font-bold border border-red-600/20 transition flex items-center justify-center gap-2"
                  >
                    <X size={18} /> رفض الطلب
                  </button>

                  <Link 
                    href={`https://www.google.com/maps?q=${service.location_lat},${service.location_lng}`} 
                    target="_blank"
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-center text-sm transition"
                  >
                    معاينة الموقع الجغرافي
                  </Link>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}