"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  ArrowRight, Loader2, Compass, Clock, Activity, MapPin, PlayCircle, Search, X // 👈 تمت إضافة أيقونات البحث
} from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ حالة البحث الجديدة
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAllExperiences();
  }, []);

  const fetchAllExperiences = async () => {
    try {
      setLoading(true);

      // 1. جلب تجارب المزودين
      const providerQuery = supabase
        .from('services')
        .select('*')
        .eq('service_category', 'experience')
        .eq('status', 'approved');

      // 2. جلب تجارب الأدمن
      const adminQuery = supabase
        .from('places')
        .select('*')
        .eq('type', 'experience')
        .eq('is_active', true);

      const [providerRes, adminRes] = await Promise.all([providerQuery, adminQuery]);

      if (providerRes.error) console.error("Error fetching provider experiences:", providerRes.error);
      if (adminRes.error) console.error("Error fetching admin experiences:", adminRes.error);

      // 3. توحيد البيانات
      const providerItems = (providerRes.data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        image: item.image_url 
                ? item.image_url 
                : (item.menu_items && item.menu_items.length > 0 ? item.menu_items[0].image : "/placeholder-experience.jpg"),
        activity_type: item.activity_type || 'تجربة مميزة',
        duration: item.duration,
        difficulty_level: item.difficulty_level,
        meeting_point: item.meeting_point,
        source: 'service' // ✅ مصدر: خدمة
      }));

      const adminItems = (adminRes.data || []).map((item: any) => ({
        id: item.id,
        title: item.name,
        description: item.description,
        price: item.price || 0,
        image: item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : "/placeholder-experience.jpg",
        activity_type: item.category || 'تجربة سياحية',
        duration: item.duration,
        difficulty_level: item.difficulty,
        meeting_point: item.city || 'عسير',
        source: 'place' // ✅ مصدر: مكان (أدمن)
      }));

      setExperiences([...providerItems, ...adminItems]);

    } catch (err) {
      console.error("خطأ في جلب البيانات:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ منطق الفلترة المعتمد على البحث
  const filteredExperiences = experiences.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.activity_type && item.activity_type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER */}
      <div className="relative h-[40vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">التجارب السياحية</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto font-light">
            اكتشف مغامرات لا تُنسى مع أهل المنطقة، من الهايكنج في أعالي الجبال إلى جلسات السمر التراثية.
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
                    placeholder="ابحث عن هايكنج، تخييم، جلسات..."
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
      <div className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center h-60 items-center">
            <Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" />
          </div>
        ) : filteredExperiences.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4">
            {experiences.length === 0 ? (
                <>
                    <Compass size={48} className="mx-auto text-white/20 mb-4"/>
                    <h3 className="text-2xl font-bold text-white/50">لا توجد تجارب متاحة حالياً</h3>
                    <p className="text-white/30 mt-2">ترقبوا تجارب جديدة ومميزة قريباً!</p>
                </>
            ) : (
                <>
                    <Search size={48} className="text-white/20" />
                    <p className="text-white/40">لا توجد نتائج تطابق بحثك.</p>
                    <button onClick={() => setSearchQuery("")} className="text-[#C89B3C] text-sm hover:underline">
                        عرض جميع التجارب
                    </button>
                </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredExperiences.map((exp) => (
              <ExperienceCard key={`${exp.source}-${exp.id}`} data={exp} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// دالة التحقق من الفيديو
const isVideo = (url: string | null) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || 
           lowerUrl.includes('.webm') || 
           lowerUrl.includes('.ogg') || 
           lowerUrl.includes('video'); 
};

function ExperienceCard({ data }: { data: any }) {
  // ✅ التعديل الجوهري هنا: تحديد الرابط بناءً على المصدر
  const linkHref = data.source === 'place' 
      ? `/place/${data.id}`   // إذا كان من الأدمن يروح لصفحة المكان
      : `/service/${data.id}`; // إذا كان من مزود يروح لصفحة الخدمة

  const buttonText = data.source === 'service' ? 'احجز تجربتك' : 'استكشف التجربة';
  const mediaIsVideo = isVideo(data.image);

  return (
    <div className="group relative bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/10 hover:border-[#C89B3C]/30 flex flex-col h-full">
      <div className="relative h-64 w-full overflow-hidden shrink-0 bg-black">
        
        {mediaIsVideo ? (
            <video 
                src={data.image} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                autoPlay 
                muted 
                loop 
                playsInline 
            />
        ) : (
            <img 
              src={data.image} 
              alt={data.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                e.currentTarget.src = "/logo.png"; 
                e.currentTarget.className = "w-full h-full object-contain p-10 opacity-50 bg-[#1a1a1a]"; 
              }}
            />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {data.price > 0 && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-[#C89B3C]/50 px-4 py-2 rounded-xl z-10">
            <span className="text-[#C89B3C] font-bold text-lg">
                {data.price} ﷼ <span className="text-xs text-white/60 font-normal">/ للشخص</span>
            </span>
            </div>
        )}
        
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1 border border-white/10 z-10">
            {mediaIsVideo ? <PlayCircle size={12} className="text-[#C89B3C]"/> : <Compass size={12} />} 
            {data.activity_type}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-2xl font-bold group-hover:text-[#C89B3C] transition line-clamp-1">{data.title}</h3>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-white/50 bg-white/5 p-3 rounded-xl border border-white/5">
            {data.duration && (
                <div className="flex items-center gap-1"><Clock size={14} className="text-[#C89B3C]"/> {data.duration}</div>
            )}
            {data.difficulty_level && (
                <div className="flex items-center gap-1">
                    <Activity size={14} className="text-[#C89B3C]"/> 
                    {data.difficulty_level === 'easy' ? 'سهل' : data.difficulty_level === 'medium' ? 'متوسط' : data.difficulty_level === 'hard' ? 'صعب' : data.difficulty_level}
                </div>
            )}
            {data.meeting_point && (
                <div className="flex items-center gap-1 line-clamp-1"><MapPin size={14} className="text-[#C89B3C]"/> {data.meeting_point}</div>
            )}
        </div>

        <p className="text-white/60 text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">
            {data.description}
        </p>
        
        <Link href={linkHref} className="w-full block mt-auto">
            <button className="w-full py-3 rounded-xl bg-[#C89B3C] text-black font-bold hover:bg-[#b38a35] transition-all flex items-center justify-center gap-2">
               {buttonText} <ArrowRight size={18}/>
            </button>
        </Link>
      </div>
    </div>
  );
}