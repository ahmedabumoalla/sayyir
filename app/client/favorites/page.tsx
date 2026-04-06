"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, Trash2, Heart, ArrowLeft, Loader2, Sparkles, Briefcase, PlayCircle } from "lucide-react";
import { Tajawal } from "next/font/google";
import { toast, Toaster } from "sonner";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
          setLoading(false);
          return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          created_at,
          place:places (id, name, media_urls, city, description),
          service:services (id, title, image_url, price, sub_category)
        `)
        .eq("user_id", session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const validFavorites = (data || []).filter(item => item.place || item.service);
      setFavorites(validFavorites);

    } catch (error: any) {
      console.error("Error fetching favorites:", error.message || error);
      toast.error("حدث خطأ أثناء تحميل المفضلة");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if(!confirm("هل أنت متأكد من إزالة هذا العنصر من المفضلة؟")) return;

    const originalFavorites = [...favorites];
    setFavorites(prev => prev.filter(item => item.id !== id));

    const { error } = await supabase.from("favorites").delete().eq("id", id);
    
    if (error) {
      toast.error("حدث خطأ أثناء الحذف");
      setFavorites(originalFavorites);
    } else {
      toast.success("تمت الإزالة من المفضلة بنجاح");
    }
  };

  const isVideo = (url: string | null) => {
      if (!url) return false;
      const lower = url.toLowerCase();
      return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.ogg') || lower.includes('.mov') || lower.includes('video');
  };

  if (loading) return (
    <div className={`h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-[#C89B3C] ${tajawal.className}`}>
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p className="font-bold tracking-widest text-sm opacity-50 animate-pulse">جاري تحميل المفضلة...</p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white pb-20 ${tajawal.className}`} dir="rtl">
      <Toaster position="top-center" richColors />
      
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#C89B3C]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 md:px-8 lg:px-12 pt-10 md:pt-16 relative z-10">
        
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6 border-b border-white/10 pb-8">
          <div>
              <div className="flex items-center gap-2 text-[#C89B3C] font-bold text-xs uppercase tracking-[0.2em] mb-2">
                  <div className="h-[1px] w-8 bg-[#C89B3C]" />
                  مجموعاتك الخاصة
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white flex items-center gap-3">
                <Heart className="text-red-500 fill-red-500 animate-pulse" size={36} /> 
                <span>قائمة مفضلاتي</span>
              </h2>
              <p className="text-white/50 mt-4 max-w-lg leading-relaxed">احتفظ بالأماكن والتجارب التي تخطط لزيارتها قريباً.</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-xl">
            <Sparkles className="text-[#C89B3C]" size={20} />
            <span className="text-xl font-mono text-[#C89B3C]">{favorites.length}</span> 
            <span className="text-sm text-white/60">عناصر محفوظة</span>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-[#121212] rounded-[3rem] border border-white/5 border-dashed relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="p-8 bg-black/40 rounded-full mb-6 text-white/10 border border-white/5 relative z-10">
               <Heart size={64} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 relative z-10">قائمتك فارغة حالياً</h3>
            <p className="text-white/40 mb-10 text-center max-w-md leading-relaxed relative z-10">
              لم تقم بإضافة أي أماكن أو خدمات للمفضلة بعد. استكشف المنصة واحفظ الكنوز التي تعجبك لتصل إليها لاحقاً!
            </p>
            <Link href="/" className="relative z-10">
              <button className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-black hover:bg-[#C89B3C] hover:text-white transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(200,155,60,0.3)]">
                <span>استكشاف الوجهات</span> <ArrowLeft size={20} />
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {favorites.map((item) => {
              const isPlace = !!item.place;
              const data = item.place || item.service;
              
              const title = isPlace ? data.name : data.title;
              const image = isPlace ? (data.media_urls?.[0] || "/placeholder.jpg") : (data.image_url || "/placeholder.jpg");
              const mediaIsVideo = isVideo(image);

              let locationName = "عسير";
              if (isPlace) locationName = data.city || "عسير";

              const targetRoute = isPlace ? `/place/${data.id}` : `/service/${data.id}`;

              return (
                <Link key={item.id} href={targetRoute} className="group relative bg-[#121212] border border-white/5 rounded-[2rem] overflow-hidden hover:border-[#C89B3C]/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col h-full">
                  
                  <div className="relative h-64 w-full overflow-hidden bg-black shrink-0">
                    {mediaIsVideo ? (
                        <video src={`${image}#t=0.001`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-110" autoPlay muted loop playsInline />
                    ) : (
                        <Image src={image} alt={title} fill className="object-cover opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-110" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-90" />
                    
                    <button 
                      onClick={(e) => removeFavorite(item.id, e)} 
                      className="absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-md rounded-full text-white/50 hover:bg-red-500 hover:text-white transition-all duration-300 border border-white/10 opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 z-20" 
                      title="إزالة من المفضلة"
                    >
                      <Trash2 size={18} />
                    </button>
                    
                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold rounded-xl shadow-lg flex items-center gap-1.5 z-10">
                      {isPlace ? <MapPin size={12} className="text-[#C89B3C]"/> : <Briefcase size={12} className="text-[#C89B3C]"/>}
                      {isPlace ? 'معلم سياحي' : 'تجربة / خدمة'}
                    </div>

                    {mediaIsVideo && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <PlayCircle size={32} className="text-white/50 group-hover:text-white transition-colors"/>
                       </div>
                    )}
                  </div>

                  <div className="p-6 md:p-8 flex flex-col flex-1 relative z-20 -mt-6 bg-[#121212]">
                    <h3 className="text-xl md:text-2xl font-black text-white mb-3 group-hover:text-[#C89B3C] transition-colors line-clamp-1">{title}</h3>
                    
                    <div className="flex items-center gap-2 text-white/50 text-xs md:text-sm mb-4">
                        <MapPin size={16} className="text-[#C89B3C]" />
                        <span>{locationName}</span>
                    </div>

                    <p className="text-white/40 text-xs leading-relaxed line-clamp-2 mb-6 flex-1">
                      {data.description}
                    </p>

                    <div className="flex items-end justify-between mt-auto pt-5 border-t border-white/5">
                        {!isPlace ? (
                            <div>
                              <span className="text-[10px] text-white/30 block mb-0.5">السعر</span>
                              <span className="text-[#C89B3C] font-bold font-mono text-lg">{data.price > 0 ? `${data.price} ﷼` : 'مجاني'}</span>
                            </div>
                        ) : (
                            <div>
                              <span className="text-[10px] text-white/30 block mb-0.5">معلم مفتوح</span>
                              <span className="text-emerald-400 font-bold text-sm">دخول مجاني</span>
                            </div>
                        )}
                        <span className="text-sm text-white/30 flex items-center gap-2 group-hover:text-white transition-colors font-bold">
                          التفاصيل <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/>
                        </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}