"use client";

import { useEffect, useState } from "react";
import Image from "next/image"; // نستخدمه للهيدر فقط
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { ArrowRight, Loader2, BedDouble, Hotel, MapPin, Utensils } from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // لإضافة فلترة إذا احتجت مستقبلاً

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      // ✅ 1. الجلب من جدول places (وليس services)
      // ✅ 2. النوع accommodation (حسب كود الأدمن)
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('type', 'accommodation') 
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        setFacilities(data);
      }
    } catch (err) {
      console.error("خطأ في جلب المرافق:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER */}
      <div className="relative h-[40vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <Image 
          src="/logo.png" 
          alt="Sayyir Logo" 
          fill 
          sizes="100vw"
          className="object-contain p-20 opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">المرافق والخدمات</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            أفضل خيارات الإقامة والمطاعم الفاخرة لتكمل رحلتك في عسير.
          </p>
        </div>
        
        <Link href="/" className="absolute top-8 right-8 z-20 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition">
           <ArrowRight className="text-white" />
        </Link>
      </div>

      {/* LIST */}
      <div className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center h-60 items-center">
            <Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" />
          </div>
        ) : facilities.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
              <p className="text-white/30 mb-2">لا توجد مرافق متاحة حالياً</p>
              <p className="text-xs text-white/20">تأكد من إضافة 'مرفق' وتفعيله من لوحة التحكم</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facilities.map((item) => (<FacilityCard key={item.id} data={item} />))}
          </div>
        )}
      </div>
    </main>
  );
}

function FacilityCard({ data }: { data: any }) {
  // ✅ استخدام media_urls بدلاً من images
  // إذا لم توجد صورة، نستخدم صورة افتراضية
  // ملاحظة: تأكد من وجود صورة اسمها placeholder.jpg في مجلد public لتختفي رسالة 404
  const imageUrl = data.media_urls && data.media_urls.length > 0 
    ? data.media_urls[0] 
    : "/placeholder.jpg";

  return (
    <div className="group relative bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/10 hover:border-[#C89B3C]/30 flex flex-col h-full">
      <div className="relative h-64 w-full overflow-hidden shrink-0">
        
        {/* ✅ الحل السحري: استخدام img بدلاً من Image لتفادي مشاكل الدومين */}
        <img 
          src={imageUrl} 
          alt={data.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            // كود احتياطي: إذا فشلت الصورة، استبدلها برابط شعار الموقع أو أي صورة مضمونة
            e.currentTarget.src = "/logo.png"; 
            e.currentTarget.className = "w-full h-full object-contain p-10 opacity-50"; // تنسيق للصورة البديلة
          }}
        />
        
        <div className="absolute top-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
           <BedDouble size={14} />
           <span>سكن</span>
        </div>

        {/* عرض النوع الفرعي (فندق، شاليه...) */}
        {data.subtype && (
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs text-white flex items-center gap-1 border border-white/10">
                <Hotel size={12} /> {data.subtype}
            </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
           <h3 className="text-xl font-bold group-hover:text-[#C89B3C] transition">{data.name}</h3>
           <span className="text-[#C89B3C] font-bold text-lg">
             {data.price ? `${data.price} ﷼` : 'مجاني'}
           </span>
        </div>
        
        {/* المدينة */}
        {data.city && (
            <div className="flex items-center gap-1 text-xs text-white/50 mb-3">
                <MapPin size={14} /> {data.city}
            </div>
        )}

        <p className="text-white/60 text-sm line-clamp-2 mb-4 flex-1">{data.description}</p>
        
        <Link href={`/place/${data.id}`} className="w-full block mt-auto">
            <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-[#C89B3C] hover:text-[#2B1F17] transition-all">
              عرض التفاصيل والحجز
            </button>
        </Link>
      </div>
    </div>
  );
}