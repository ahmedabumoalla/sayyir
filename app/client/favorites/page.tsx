"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, Trash2, Heart, ArrowLeft, Loader2, Star } from "lucide-react";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // جلب المفضلة وربطها بجدول الأماكن (places)
      // ملاحظة: تأكد أن العمود في favorites هو location_id ويرتبط بـ places.id
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          place:places (
            id,
            name,
            type,
            media_urls,
            city,
            category
          )
        `)
        .eq("user_id", session.user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: string) => {
    // تحديث الواجهة فوراً (Optimistic UI)
    setFavorites(prev => prev.filter(item => item.id !== id));

    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (error) {
      alert("حدث خطأ أثناء الحذف");
      fetchFavorites(); // تراجع في حال الخطأ
    }
  };

  if (loading) return <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
             <Heart className="text-[#C89B3C] fill-[#C89B3C]" /> قائمة مفضلاتي
           </h2>
           <p className="text-white/60 text-sm">الأماكن التي نالت إعجابك وتخطط لزيارتها.</p>
        </div>
        <div className="bg-[#C89B3C]/10 text-[#C89B3C] px-4 py-2 rounded-full font-bold border border-[#C89B3C]/20">
          {favorites.length} أماكن
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
          <Heart size={64} className="text-white/10 mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">قائمتك فارغة حالياً</h3>
          <p className="text-white/50 mb-8 text-center max-w-md">لم تقم بإضافة أي أماكن للمفضلة بعد. استكشف الخريطة واحفظ الأماكن التي تعجبك!</p>
          <Link href="/map">
            <button className="flex items-center gap-2 bg-[#C89B3C] text-[#2B1F17] px-6 py-3 rounded-xl font-bold hover:bg-[#b38a35] transition">
              <span>تصفح الخريطة</span> <ArrowLeft size={18} />
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((item) => {
            const place = item.place;
            // التحقق من وجود صورة، وإلا استخدام صورة افتراضية
            const image = place?.media_urls?.[0] || "/logo.png";
            
            return (
              <div key={item.id} className="group relative bg-[#252525] border border-white/10 rounded-2xl overflow-hidden hover:border-[#C89B3C]/40 transition-all duration-300 hover:-translate-y-1">
                <div className="relative h-48 w-full">
                  <Image src={image} alt={place?.name || "مكان"} fill className="object-cover group-hover:scale-105 transition duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent opacity-80" />
                  
                  <button onClick={() => removeFavorite(item.id)} className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:bg-red-500 hover:text-white transition border border-white/10" title="إزالة">
                    <Trash2 size={16} />
                  </button>
                  
                  <div className="absolute top-3 left-3 px-2 py-1 bg-[#C89B3C] text-[#2B1F17] text-xs font-bold rounded-md shadow-lg">
                    {place?.type === 'tourist' ? 'سياحة' : 'تراث'}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-white mb-1 truncate">{place?.name}</h3>
                  <div className="flex items-center gap-1 text-white/60 text-sm mb-4">
                     <MapPin size={14} className="text-[#C89B3C]" />
                     <span>{place?.city || "عسير"}</span>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                     <span className="text-xs text-white/40">{place?.category}</span>
                     <Link href={`/place/${place?.id}`}>
                       <button className="text-sm text-white hover:text-[#C89B3C] flex items-center gap-1 transition">
                         التفاصيل <ArrowLeft size={14}/>
                       </button>
                     </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}