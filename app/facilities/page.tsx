"use client";

import { useEffect, useState } from "react";
import Image from "next/image"; 
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  ArrowRight, Loader2, BedDouble, Utensils, Box, MapPin, Store, Search, X, Heart 
} from "lucide-react";
import { toast } from "sonner";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProviderFacilities();
  }, []);

  const fetchProviderFacilities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .neq('service_category', 'experience')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // ✅ فلترة لإخفاء أي منشأة أو خدمة انتهى تاريخها
        const today = new Date().toISOString().split('T')[0];
        const validFacilities = data.filter((item: any) => {
            const endDate = item.details?.event_info?.dates?.endDate || item.details?.experience_info?.dates?.slice(-1)[0];
            if (endDate) {
                return endDate >= today; // عرض فقط اللي تاريخ انتهائها أكبر من أو يساوي اليوم
            }
            return true; // إذا لم يكن لها تاريخ انتهاء، تُعرض دائمًا
        });
        setFacilities(validFacilities);
      }
    } catch (err) {
      console.error("خطأ في جلب المرافق:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFacilities = facilities.filter(item => 
    (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.sub_category && item.sub_category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`} dir="rtl">
      
      <div className="relative h-[40vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <div className="absolute inset-0 bg-[url('/facilities-bg.jpg')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">خدمات ومرافق الشركاء</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto font-light">
            استمتع بأفضل خيارات الإقامة، المأكولات الشعبية، والمنتجات الحرفية المقدمة من شركائنا المحليين.
          </p>
        </div>
        
        <Link href="/" className="absolute top-8 right-8 z-20 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition group border border-white/10">
           <ArrowRight className="text-white group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-30 mb-8">
        <div className="max-w-md mx-auto relative group">
            <div className="relative flex items-center bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/20 rounded-full px-4 h-12 shadow-2xl transition focus-within:bg-[#1a1a1a] focus-within:border-[#C89B3C]/50">
                <Search className="text-white/50 ml-3 shrink-0" size={20} />
                <input type="text" placeholder="ابحث عن خدمة، مطعم، سكن..." className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/40 h-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && (<button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white transition"><X size={16} /></button>)}
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex justify-center h-60 items-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
        ) : filteredFacilities.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4">
              {facilities.length === 0 ? (
                  <><Store size={48} className="mx-auto text-white/20 mb-4"/><h3 className="text-2xl font-bold text-white/50">لا توجد مرافق متاحة حالياً</h3></>
              ) : (
                  <><Search size={48} className="text-white/20" /><p className="text-white/40">لا توجد نتائج تطابق بحثك.</p></>
              )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredFacilities.map((item) => (
                <Link key={item.id} href={`/service/${item.id}`} className="block transition-transform hover:-translate-y-2">
                    <FacilityCard data={item} />
                </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function FacilityCard({ data }: { data: any }) {
  let imageUrl = "/placeholder-facility.jpg";
  if (data.details?.images && data.details.images.length > 0) imageUrl = data.details.images[0];
  else if (data.image_url) imageUrl = data.image_url;
  else if (data.menu_items && data.menu_items.length > 0 && data.menu_items[0].image) imageUrl = data.menu_items[0].image;

  let typeLabel = 'خدمة عامة'; let TypeIcon = Store; let badgeColor = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  if (data.sub_category === 'lodging') { typeLabel = 'سكن ونزل'; TypeIcon = BedDouble; badgeColor = 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'; }
  else if (data.sub_category === 'food') { typeLabel = 'مأكولات ومشروبات'; TypeIcon = Utensils; badgeColor = 'bg-orange-500/20 text-orange-400 border-orange-500/30'; }
  else if (data.sub_category === 'craft') { typeLabel = 'حرف ومنتجات'; TypeIcon = Box; badgeColor = 'bg-pink-500/20 text-pink-400 border-pink-500/30'; }

  let locationName = "عسير";
  if (data.location) {
      try { locationName = JSON.parse(data.location).address || "عسير"; } catch {}
  }

  return (
    <div className="group h-full relative bg-[#1a1a1a] rounded-3xl md:rounded-[2rem] overflow-hidden border border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-[#C89B3C]/10 hover:border-[#C89B3C]/40 flex flex-col">
      <div className="relative h-56 sm:h-64 md:h-72 w-full overflow-hidden shrink-0">
        
        <FavoriteButton itemId={data.id} itemType="service" />

        <img src={imageUrl} alt={data.title} className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110" onError={(e) => { e.currentTarget.src = "/logo.png"; e.currentTarget.className = "w-full h-full object-contain p-10 opacity-50 bg-[#1a1a1a]"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        <div className={`absolute top-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1 text-[10px] md:text-xs font-bold border z-10 ${badgeColor}`}>
           <TypeIcon size={14} /><span>{typeLabel}</span>
        </div>

        <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 backdrop-blur text-white text-[9px] md:text-[10px] px-2 py-1 rounded-md md:rounded-lg font-bold shadow-lg z-10 bg-[#C89B3C]/90 text-black">
            {data.price > 0 ? `${data.price} ﷼ ${data.sub_category === 'lodging' ? '/ ليلة' : ''}` : 'مجاني'}
        </div>
      </div>

      <div className="p-4 md:p-6 flex flex-col flex-1 relative -mt-8 md:-mt-10 z-20">
        <div className="bg-[#252525] backdrop-blur-xl border border-white/5 p-4 md:p-5 rounded-xl md:rounded-2xl shadow-xl flex-1 flex flex-col">
            <h3 className="text-lg md:text-xl font-bold text-white mb-1.5 md:mb-2 group-hover:text-[#C89B3C] transition line-clamp-1">{data.title}</h3>
            
            <div className="flex items-center gap-1.5 text-white/50 text-[10px] md:text-xs mb-3">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#C89B3C]" />
              <span className="line-clamp-1">{locationName}</span>
            </div>

            <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-4 flex-1">
              {data.description}
            </p>

            <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
               <span className="text-xs text-[#C89B3C] font-bold flex items-center gap-1 hover:text-white transition">استكشف واحجز <ArrowRight size={12} className="rotate-180"/></span>
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