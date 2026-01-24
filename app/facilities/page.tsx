"use client";

import { useEffect, useState } from "react";
import Image from "next/image"; 
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  ArrowRight, Loader2, BedDouble, Utensils, Box, MapPin, Store, Search, X // 👈 تمت إضافة أيقونات البحث
} from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ حالة البحث الجديدة
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProviderFacilities();
  }, []);

  const fetchProviderFacilities = async () => {
    try {
      setLoading(true);

      // ✅ استعلام مباشر من جدول services (شغل المزودين فقط)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .neq('service_category', 'experience') // نستبعد التجارب لأن لها صفحة خاصة
        .eq('status', 'approved') // فقط الموافق عليها
        .order('created_at', { ascending: false });

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

  // ✅ منطق الفلترة بناءً على البحث
  const filteredFacilities = facilities.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.sub_category && item.sub_category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER */}
      <div className="relative h-[40vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <div className="absolute inset-0 bg-[url('/facilities-bg.jpg')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">خدمات ومرافق الشركاء</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto font-light">
            استمتع بأفضل خيارات الإقامة، المأكولات الشعبية، والمنتجات الحرفية المقدمة من شركائنا المحليين.
          </p>
        </div>
        
        <Link href="/" className="absolute top-8 right-8 z-20 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition group">
           <ArrowRight className="text-white group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ======================================================= */}
      {/* ==================== قسم البحث ======================== */}
      {/* ======================================================= */}
      <div className="container mx-auto px-4 -mt-8 relative z-30 mb-8">
        <div className="max-w-md mx-auto relative group">
            <div className="relative flex items-center bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/20 rounded-full px-4 h-12 shadow-2xl transition focus-within:bg-[#1a1a1a] focus-within:border-[#C89B3C]/50">
                <Search className="text-white/50 ml-3 shrink-0" size={20} />
                <input
                    type="text"
                    placeholder="ابحث عن خدمة، مطعم، سكن..."
                    className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/40 h-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white transition">
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
      </div>
      {/* ======================================================= */}

      {/* LIST */}
      <div className="container mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex justify-center h-60 items-center">
            <Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" />
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4">
              {facilities.length === 0 ? (
                  <>
                    <Store size={48} className="mx-auto text-white/20 mb-4"/>
                    <h3 className="text-2xl font-bold text-white/50">لا توجد مرافق متاحة حالياً</h3>
                    <p className="text-white/30 mt-2">انتظروا انضمام شركاء جدد قريباً.</p>
                  </>
              ) : (
                  <>
                    <Search size={48} className="text-white/20" />
                    <p className="text-white/40">لا توجد نتائج تطابق بحثك.</p>
                    <button onClick={() => setSearchQuery("")} className="text-[#C89B3C] text-sm hover:underline">
                        عرض جميع الخدمات
                    </button>
                  </>
              )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredFacilities.map((item) => (<FacilityCard key={item.id} data={item} />))}
          </div>
        )}
      </div>
    </main>
  );
}

function FacilityCard({ data }: { data: any }) {
  // 1. تحديد الصورة (من المنيو أو صورة افتراضية)
  const imageUrl = data.menu_items && data.menu_items.length > 0 && data.menu_items[0].image 
    ? data.menu_items[0].image 
    : "/placeholder-facility.jpg";

  // 2. تحديد النوع (بناءً على sub_category الخاص بالمزود)
  let typeLabel = 'خدمة عامة';
  let TypeIcon = Store;
  let badgeColor = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  
  if (data.sub_category === 'lodging') {
      typeLabel = 'سكن ونزل';
      TypeIcon = BedDouble;
      badgeColor = 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
  } else if (data.sub_category === 'food') {
      typeLabel = 'مأكولات ومشروبات';
      TypeIcon = Utensils;
      badgeColor = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  } else if (data.sub_category === 'craft') {
      typeLabel = 'حرف ومنتجات';
      TypeIcon = Box;
      badgeColor = 'bg-pink-500/20 text-pink-400 border-pink-500/30';
  }

  return (
    <div className="group relative bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/10 hover:border-[#C89B3C]/30 flex flex-col h-full">
      <div className="relative h-64 w-full overflow-hidden shrink-0">
        
        <img 
          src={imageUrl} 
          alt={data.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            e.currentTarget.src = "/logo.png"; 
            e.currentTarget.className = "w-full h-full object-contain p-10 opacity-50 bg-[#1a1a1a]"; 
          }}
        />
        
        {/* شارة التصنيف */}
        <div className={`absolute top-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold border ${badgeColor}`}>
           <TypeIcon size={14} />
           <span>{typeLabel}</span>
        </div>

        {/* السعر */}
        <div className="absolute bottom-4 right-4 bg-[#C89B3C] text-black px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg">
            {data.price} ﷼
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
           <h3 className="text-xl font-bold group-hover:text-[#C89B3C] transition line-clamp-1">{data.title}</h3>
        </div>
        
        {/* نستخدم إحداثيات المزود لتدل على الموقع */}
        <div className="flex items-center gap-1 text-xs text-white/50 mb-3">
            <MapPin size={14} /> موقع الخدمة
        </div>

        <p className="text-white/60 text-sm line-clamp-3 mb-4 flex-1 leading-relaxed">{data.description}</p>
        
        <Link href={`/service/${data.id}`} className="w-full block mt-auto">
            <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-[#C89B3C] hover:text-[#2B1F17] transition-all flex items-center justify-center gap-2">
              عرض التفاصيل والحجز <ArrowRight size={16}/>
            </button>
        </Link>
      </div>
    </div>
  );
}