"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  ArrowRight, Loader2, Compass, Clock, Activity, MapPin, PlayCircle, Search, X, Heart
} from "lucide-react";
import { toast } from "sonner";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAllExperiences();
  }, []);

  const fetchAllExperiences = async () => {
    try {
      setLoading(true);
      const providerQuery = supabase.from('services').select('*').eq('service_category', 'experience').eq('status', 'approved');
      const adminQuery = supabase.from('places').select('*').eq('type', 'experience').eq('is_active', true);
      const [providerRes, adminRes] = await Promise.all([providerQuery, adminQuery]);

      const today = new Date().toISOString().split('T')[0];

      // ✅ فلترة لإخفاء التجارب المنتهية
      const providerItems = (providerRes.data || [])
        .filter((item: any) => {
            const expDates = item.details?.experience_info?.dates;
            if (expDates && Array.isArray(expDates) && expDates.length > 0) {
                // نتحقق إذا كان أحدث تاريخ في المصفوفة ما زال قائماً أو في المستقبل
                const latestDate = expDates.sort()[expDates.length - 1];
                return latestDate >= today;
            }
            return true; // إذا لم يحدد تواريخ، يتم عرضها دائمًا
        })
        .map((item: any) => ({
            id: item.id, title: item.title, description: item.description, price: item.price,
            image: item.image_url ? item.image_url : (item.menu_items && item.menu_items.length > 0 ? item.menu_items[0].image : "/placeholder-experience.jpg"),
            activity_type: item.activity_type || 'تجربة مميزة', duration: item.duration, difficulty_level: item.difficulty_level, meeting_point: item.meeting_point, source: 'service'
        }));

      const adminItems = (adminRes.data || []).map((item: any) => ({
        id: item.id, title: item.name, description: item.description, price: item.price || 0,
        image: item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : "/placeholder-experience.jpg",
        activity_type: item.category || 'تجربة سياحية', duration: item.duration, difficulty_level: item.difficulty, meeting_point: item.city || 'عسير', source: 'place'
      }));

      setExperiences([...providerItems, ...adminItems]);
    } catch (err) { console.error("خطأ في جلب البيانات:", err); } finally { setLoading(false); }
  };

  const filteredExperiences = experiences.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.activity_type && item.activity_type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`} dir="rtl">
      
      <div className="relative h-[40vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradientto-b from-black/20 via-black/60 to-[#0a0a0a]" />
        
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

      <div className="container mx-auto px-4 -mt-8 relative z-30 mb-8">
        <div className="max-w-md mx-auto relative group">
            <div className="relative flex items-center bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/20 rounded-full px-4 h-12 shadow-2xl transition focus-within:bg-[#1a1a1a] focus-within:border-[#C89B3C]/50">
                <Search className="text-white/50 ml-3 shrink-0" size={20} />
                <input type="text" placeholder="ابحث عن هايكنج، تخييم، جلسات..." className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/40 h-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && (<button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white transition"><X size={16} /></button>)}
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center h-60 items-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
        ) : filteredExperiences.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4">
            {experiences.length === 0 ? (
                <><Compass size={48} className="mx-auto text-white/20 mb-4"/><h3 className="text-2xl font-bold text-white/50">لا توجد تجارب متاحة حالياً</h3></>
            ) : (
                <><Search size={48} className="text-white/20" /><p className="text-white/40">لا توجد نتائج تطابق بحثك.</p></>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredExperiences.map((exp) => (
                <Link key={`${exp.source}-${exp.id}`} href={exp.source === 'place' ? `/place/${exp.id}` : `/service/${exp.id}`} className="block transition-transform hover:-translate-y-2">
                    <ExperienceCard data={exp} />
                </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const isVideo = (url: string | null) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.ogg') || lowerUrl.includes('video'); 
};

function ExperienceCard({ data }: { data: any }) {
  const mediaIsVideo = isVideo(data.image);
  const priceValue = Number(data.price) || 0;

  return (
    <div className="group h-full relative bg-[#1a1a1a] rounded-3xl md:rounded-[2rem] overflow-hidden border border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-[#C89B3C]/10 hover:border-[#C89B3C]/30 flex flex-col">
      <div className="relative h-56 sm:h-64 md:h-72 w-full overflow-hidden bg-black shrink-0">
        
        <FavoriteButton itemId={data.id} itemType={data.source === 'place' ? 'place' : 'service'} />

        {mediaIsVideo ? (
            <video src={data.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" autoPlay muted loop playsInline />
        ) : (
            <img src={data.image} alt={data.title} className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110" onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }} />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold text-white flex items-center gap-1.5 border border-white/10 z-10 shadow-lg">
            {mediaIsVideo ? <PlayCircle size={14} className="text-[#C89B3C]"/> : <Compass size={14} className="text-[#C89B3C]"/>} 
            {data.activity_type}
        </div>

        <div className={`absolute bottom-3 right-3 md:bottom-4 md:right-4 backdrop-blur text-white text-[9px] md:text-[10px] px-2 py-1 rounded-md md:rounded-lg font-bold shadow-lg z-10 ${priceValue > 0 ? 'bg-[#C89B3C]/90 text-black' : 'bg-emerald-500/90'}`}>
            {priceValue > 0 ? <>{priceValue} ﷼ <span className="text-[10px] opacity-70 font-normal">/ للشخص</span></> : 'مجاني'}
        </div>
      </div>
      
      <div className="p-4 md:p-6 flex flex-col flex-1 relative -mt-8 md:-mt-10 z-20">
        <div className="bg-[#252525] backdrop-blur-xl border border-white/5 p-4 md:p-5 rounded-xl md:rounded-2xl shadow-xl flex-1 flex flex-col">
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition line-clamp-1">{data.title}</h3>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
                {data.duration && (<div className="flex items-center gap-1 text-white/50 text-[10px] md:text-xs bg-white/5 px-2 py-1 rounded-lg border border-white/5"><Clock size={12} className="text-[#C89B3C]"/> {data.duration}</div>)}
                {data.difficulty_level && (<div className="flex items-center gap-1 text-white/50 text-[10px] md:text-xs bg-white/5 px-2 py-1 rounded-lg border border-white/5"><Activity size={12} className="text-[#C89B3C]"/> {data.difficulty_level === 'easy' ? 'سهل' : data.difficulty_level === 'medium' ? 'متوسط' : data.difficulty_level === 'hard' ? 'صعب' : data.difficulty_level}</div>)}
                {data.meeting_point && (<div className="flex items-center gap-1 text-white/50 text-[10px] md:text-xs bg-white/5 px-2 py-1 rounded-lg border border-white/5 max-w-[120px] line-clamp-1"><MapPin size={12} className="text-[#C89B3C] shrink-0"/> {data.meeting_point}</div>)}
            </div>

            <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-4 flex-1">
              {data.description}
            </p>

            <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
               <span className="text-xs text-[#C89B3C] font-bold flex items-center gap-1 hover:text-white transition">استكشف التجربة <ArrowRight size={12} className="rotate-180"/></span>
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
      const { data } = await supabase.from('favorites').select('id').eq('user_id', session.user.id).eq(column, itemId).single();
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