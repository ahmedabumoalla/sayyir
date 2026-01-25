"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  MapPin, ArrowRight, Loader2, Mountain, Landmark, 
  Search, Trees, X // 👈 ✅ تم إضافة X هنا لحل المشكلة
} from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function LandmarksPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // ✅ حالة البحث
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    const { data } = await supabase
      .from('places')
      .select('*')
      .eq('is_active', true)
      .neq('type', 'experience') 
      .order('created_at', { ascending: false });

    if (data) setPlaces(data);
    setLoading(false);
  };

  const isVideo = (url: string): boolean => {
    if (!url) return false;
    return !!(url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('video') || url.includes('mp4'));
  };

  // ✅ منطق الفلترة (شامل النوع الطبيعي والبحث)
  const filteredPlaces = places.filter(place => {
    // 1. فلتر النوع
    const matchesType = filter === 'all' || place.type === filter;
    
    // 2. فلتر البحث
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === "" || 
        place.name.toLowerCase().includes(query) ||
        (place.city && place.city.toLowerCase().includes(query)) ||
        (place.description && place.description.toLowerCase().includes(query));

    return matchesType && matchesSearch;
  });

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER SECTION */}
      <div className="relative h-[45vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <Image 
          src="/logo.png" 
          alt="Sayyir Logo" 
          fill 
          className="object-contain p-24 opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">كنوز عسير</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto font-medium">
            اكتشف سحر الطبيعة وعبق التاريخ في أهم الوجهات السياحية والتراثية.
          </p>
        </div>
        
        <Link href="/" className="absolute top-8 right-8 z-20 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition group">
           <ArrowRight className="text-white group-hover:-translate-x-1 transition" />
        </Link>
      </div>

      {/* ==================== قسم البحث ======================== */}
      <div className="container mx-auto px-4 -mt-8 relative z-30 mb-6">
        <div className="max-w-md mx-auto relative group">
            <div className="relative flex items-center bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/20 rounded-full px-4 h-12 shadow-2xl transition focus-within:bg-[#1a1a1a] focus-within:border-[#C89B3C]/50">
                <Search className="text-white/50 ml-3 shrink-0" size={20} />
                <input
                    type="text"
                    placeholder="ابحث عن اسم المعلم، المدينة..."
                    className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/40 h-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white transition">
                        <X size={16} /> {/* الآن ستعمل بدون مشاكل */}
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="container mx-auto px-4 relative z-20 mb-12">
        <div className="flex justify-center gap-3 bg-white/5 backdrop-blur-xl p-2 rounded-full w-fit mx-auto border border-white/10 shadow-xl overflow-x-auto custom-scrollbar">
          <button onClick={() => setFilter('all')} className={`px-6 py-2 rounded-full transition text-sm font-bold whitespace-nowrap ${filter === 'all' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}>الكل</button>
          <button onClick={() => setFilter('tourist')} className={`px-6 py-2 rounded-full transition flex items-center gap-2 text-sm font-bold whitespace-nowrap ${filter === 'tourist' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Mountain size={16} /> سياحي</button>
          <button onClick={() => setFilter('natural')} className={`px-6 py-2 rounded-full transition flex items-center gap-2 text-sm font-bold whitespace-nowrap ${filter === 'natural' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Trees size={16} /> طبيعي</button>
          <button onClick={() => setFilter('heritage')} className={`px-6 py-2 rounded-full transition flex items-center gap-2 text-sm font-bold whitespace-nowrap ${filter === 'heritage' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Landmark size={16} /> تراث</button>
        </div>
      </div>

      {/* GRID */}
      <div className="container mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex justify-center h-40 items-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4">
              <Search size={48} className="text-white/20" />
              <p className="text-white/40">لا توجد نتائج تطابق بحثك.</p>
              {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-[#C89B3C] text-sm hover:underline">
                      مسح البحث وعرض الكل
                  </button>
              )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredPlaces.map((place) => (
                // ✅ تم التعديل: التوجيه لصفحة التفاصيل بدلاً من فتح نافذة
                <Link key={place.id} href={`/place/${place.id}`} className="block transition-transform hover:-translate-y-2">
                    <LandmarkCard data={place} isVideo={isVideo} />
                </Link>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}

function LandmarkCard({ data, isVideo }: { data: any, isVideo: (url: string) => boolean }) {
  const isHeritage = data.type === 'heritage';
  const isNatural = data.type === 'natural';
  const mainMedia = data.media_urls && data.media_urls[0] ? data.media_urls[0] : null;
  const isMainMediaVideo = mainMedia ? isVideo(mainMedia) : false;
  
  return (
    <div className="group h-full relative bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-[#C89B3C]/20 hover:border-[#C89B3C]/40">
        <div className="relative h-72 w-full overflow-hidden bg-black">
          {mainMedia ? (
              isMainMediaVideo ? (
                  <video 
                    src={mainMedia} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" 
                    muted 
                    loop 
                    autoPlay 
                    playsInline 
                  />
              ) : (
                  <Image src={mainMedia} alt={data.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110"/>
              )
          ) : (
              <Image src="/placeholder.jpg" alt={data.name} fill className="object-cover"/>
          )}
          
          {/* شارة التصنيف */}
          <div className="absolute top-4 left-4 backdrop-blur-md bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
            {isHeritage ? <Landmark size={14} className="text-amber-400"/> : 
             isNatural ? <Trees size={14} className="text-teal-400"/> : 
             <Mountain size={14} className="text-emerald-400"/>}
            <span className="text-xs font-bold text-white">
                {isHeritage ? 'تراثي' : isNatural ? 'طبيعي' : 'سياحي'}
            </span>
          </div>

          <div className={`absolute bottom-4 right-4 backdrop-blur text-white text-[10px] px-2 py-1 rounded-lg font-bold shadow-lg ${data.price > 0 ? 'bg-[#C89B3C]/90 text-black' : 'bg-emerald-500/90'}`}>
              {data.price > 0 ? `${data.price} ريال` : 'دخول مجاني'}
          </div>
        </div>
        <div className="p-6 relative -mt-10">
          <div className="bg-[#252525] backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition">{data.name}</h3>
              <div className="flex items-center gap-1 text-white/50 text-xs mb-3"><MapPin size={14} /><span>{data.city || "عسير، السعودية"}</span></div>
          </div>
        </div>
    </div>
  );
}