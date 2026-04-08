"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  MapPin, ArrowRight, Loader2, Mountain, Landmark, 
  Search, Trees, X, Heart
} from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast, Toaster } from "sonner";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function LandmarksPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
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

  const filteredPlaces = places.filter(place => {
    const matchesType = filter === 'all' || place.type === filter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === "" || 
        place.name.toLowerCase().includes(query) ||
        (place.city && place.city.toLowerCase().includes(query)) ||
        (place.description && place.description.toLowerCase().includes(query));

    return matchesType && matchesSearch;
  });

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      <Toaster position="top-center" richColors />
      
      <div className="relative h-[40vh] md:h-[45vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <Image src="/logo.png" alt="Sayyir Logo" fill className="object-contain p-16 md:p-24 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2 md:mb-4 drop-shadow-lg">كنوز عسير</h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium">
            اكتشف سحر الطبيعة وعبق التاريخ في أهم الوجهات السياحية والتراثية.
          </p>
        </div>
        
        <Link href="/" className="absolute top-6 right-6 md:top-8 md:right-8 z-20 p-2 md:p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition group">
           <ArrowRight className="text-white group-hover:-translate-x-1 transition w-5 h-5 md:w-6 md:h-6" />
        </Link>
      </div>

      <div className="container mx-auto px-4 -mt-6 md:-mt-8 relative z-30 mb-6 md:mb-8">
        <div className="max-w-md mx-auto relative group">
            <div className="relative flex items-center bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/20 rounded-full px-3 md:px-4 h-10 md:h-12 shadow-2xl transition focus-within:bg-[#1a1a1a] focus-within:border-[#C89B3C]/50">
                <Search className="text-white/50 ml-2 md:ml-3 shrink-0 w-4 h-4 md:w-5 md:h-5" />
                <input
                    type="text"
                    placeholder="ابحث عن اسم المعلم، المدينة..."
                    className="bg-transparent border-none outline-none text-white w-full text-xs md:text-sm placeholder-white/40 h-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white transition p-1">
                        <X className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-20 mb-8 md:mb-12">
        <div className="flex justify-start md:justify-center gap-2 md:gap-3 bg-white/5 backdrop-blur-xl p-1.5 md:p-2 rounded-full w-full max-w-full md:w-fit mx-auto border border-white/10 shadow-xl overflow-x-auto custom-scrollbar snap-x">
          <button onClick={() => setFilter('all')} className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full transition text-xs md:text-sm font-bold whitespace-nowrap snap-center shrink-0 ${filter === 'all' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}>الكل</button>
          <button onClick={() => setFilter('tourist')} className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full transition flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold whitespace-nowrap snap-center shrink-0 ${filter === 'tourist' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Mountain className="w-3.5 h-3.5 md:w-4 md:h-4" /> سياحي</button>
          <button onClick={() => setFilter('natural')} className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full transition flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold whitespace-nowrap snap-center shrink-0 ${filter === 'natural' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Trees className="w-3.5 h-3.5 md:w-4 md:h-4" /> طبيعي</button>
          <button onClick={() => setFilter('heritage')} className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full transition flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold whitespace-nowrap snap-center shrink-0 ${filter === 'heritage' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Landmark className="w-3.5 h-3.5 md:w-4 md:h-4" /> تراث</button>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16 md:pb-20">
        {loading ? (
          <div className="flex justify-center h-32 md:h-40 items-center"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8 md:w-10 md:h-10" /></div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-16 md:py-20 bg-white/5 rounded-2xl md:rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-3 md:gap-4 px-4">
              <Search className="text-white/20 w-10 h-10 md:w-12 md:h-12" />
              <p className="text-white/40 text-sm md:text-base">لا توجد نتائج تطابق بحثك.</p>
              {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-[#C89B3C] text-xs md:text-sm hover:underline mt-2">
                      مسح البحث وعرض الكل
                  </button>
              )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredPlaces.map((place) => (
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
  
  // ✅ التنظيف الجذري للروابط: يفكك أي صيغة ويمسح علامات التنصيص والأقواس المخفية
  let mediaArray: string[] = [];
  if (data.media_urls) {
      if (Array.isArray(data.media_urls)) {
          mediaArray = data.media_urls;
      } else if (typeof data.media_urls === 'string') {
          try { 
              mediaArray = JSON.parse(data.media_urls); 
          } catch { 
              const cleanStr = data.media_urls.replace(/^\{|\}$/g, '');
              if (cleanStr) {
                  mediaArray = cleanStr.split(',').map((s: string) => s.replace(/^"|"$/g, '').trim());
              }
          }
      }
  }

  // أخذ أول رابط وتنظيفه بشكل نهائي 
  let mainMedia = mediaArray.length > 0 && mediaArray[0] ? String(mediaArray[0]).replace(/^["']|["']$/g, '').trim() : null;
  if (mainMedia === "[" || mainMedia === "]" || mainMedia === "") {
      mainMedia = null;
  }

  const isMainMediaVideo = mainMedia ? isVideo(mainMedia) : false;
  const hasPrice = data.price !== null && data.price !== undefined && data.price !== "";
  const priceValue = Number(data.price);
  
  // ✅ صورة احتياطية خارجية مضمونة تشتغل دائماً بدل الصورة المحلية اللي سببت كسر الأيقونة
  const fallbackImg = "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?q=80&w=800";

  return (
    <div className="group h-full relative bg-[#1a1a1a] rounded-3xl md:rounded-[2rem] overflow-hidden border border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-[#C89B3C]/20 hover:border-[#C89B3C]/40 flex flex-col">
        <div className="relative h-56 sm:h-64 md:h-72 w-full overflow-hidden bg-black flex items-center justify-center shrink-0">
          
          <FavoriteButton itemId={data.id} itemType="place" />

          {mainMedia ? (
              isMainMediaVideo ? (
                  <video 
                    src={`${mainMedia}#t=0.001`} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" 
                    muted 
                    loop 
                    autoPlay 
                    playsInline 
                  />
              ) : (
                  <img 
                    src={mainMedia} 
                    alt={data.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { 
                        // إذا الرابط من الداتابيس خربان، استبدله فوراً بالصورة المضمونة
                        if (e.currentTarget.src !== fallbackImg) {
                            e.currentTarget.src = fallbackImg; 
                        }
                    }}
                  />
              )
          ) : (
              <img src={fallbackImg} alt={data.name} className="w-full h-full object-cover" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute top-4 left-4 backdrop-blur-md bg-black/30 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-white/10 flex items-center gap-1.5 z-10">
            {isHeritage ? <Landmark className="text-amber-400 w-3.5 h-3.5"/> : 
             isNatural ? <Trees className="text-teal-400 w-3.5 h-3.5"/> : 
             <Mountain className="text-emerald-400 w-3.5 h-3.5"/>}
            <span className="text-[10px] md:text-xs font-bold text-white">
                {isHeritage ? 'تراثي' : isNatural ? 'طبيعي' : 'سياحي'}
            </span>
          </div>

          {hasPrice && (
              <div className={`absolute bottom-4 right-4 backdrop-blur text-white text-[10px] md:text-xs px-3 py-1.5 rounded-lg font-bold shadow-lg z-10 ${priceValue > 0 ? 'bg-black/60 border border-[#C89B3C]/50 text-[#C89B3C]' : 'bg-emerald-500/90 border border-emerald-400 text-white'}`}>
                  {priceValue > 0 ? `${priceValue} ريال` : 'دخول مجاني'}
              </div>
          )}
        </div>
        
        <div className="p-4 md:p-6 flex flex-col flex-1 relative -mt-8 z-20">
          <div className="bg-[#252525] backdrop-blur-xl border border-white/5 p-4 md:p-5 rounded-xl md:rounded-2xl shadow-xl flex-1 flex flex-col">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition line-clamp-1">{data.name}</h3>
              
              <div className="flex items-center gap-1.5 text-white/50 text-[10px] md:text-xs mb-3">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#C89B3C]" />
                <span className="line-clamp-1">{data.city || "عسير، السعودية"}</span>
              </div>

              <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-4 flex-1">
                {data.description}
              </p>

              <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
                 <span className="text-xs text-[#C89B3C] font-bold flex items-center gap-1 hover:text-white transition">استكشف المعلم <ArrowRight size={12} className="rotate-180"/></span>
              </div>
          </div>
        </div>
    </div>
  );
}

function FavoriteButton({ itemId, itemType }: { itemId: string, itemType: 'service' | 'place' }) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFav = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      
      const column = itemType === 'place' ? 'place_id' : 'service_id';
      
      const { data } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', session.user.id)
          .eq(column, itemId)
          .single();
          
      if (data) setIsFav(true);
      setLoading(false);
    };
    checkFav();
  }, [itemId, itemType]);

  const toggleFav = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error("يجب تسجيل الدخول لإضافة المفضلة");

    const column = itemType === 'place' ? 'place_id' : 'service_id';
    
    if (isFav) {
       setIsFav(false);
       await supabase.from('favorites').delete().eq('user_id', session.user.id).eq(column, itemId);
       toast.success("تمت الإزالة من المفضلة");
    } else {
       setIsFav(true);
       await supabase.from('favorites').insert({ user_id: session.user.id, [column]: itemId });
       toast.success("تمت الإضافة للمفضلة");
    }
  };

  if (loading) return <div className="absolute top-4 right-4 p-2 bg-black/40 rounded-full z-20"><Loader2 size={16} className="animate-spin text-white/50" /></div>;

  return (
    <button onClick={toggleFav} className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md rounded-full transition border border-white/10 z-20 hover:scale-110">
      <Heart size={18} className={isFav ? "fill-red-500 text-red-500 animate-in zoom-in" : "text-white"} />
    </button>
  );
}