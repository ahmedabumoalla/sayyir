"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, Trash2, Heart, ArrowLeft, Star, Loader2 } from "lucide-react";

// تعريف نوع البيانات (دمجنا بيانات المفضلة مع بيانات المكان)
interface FavoriteItem {
  id: string; // آيدي المفضلة (عشان الحذف)
  location: {
    id: string;
    name: string;
    type: string;
    image_url: string;
    price_range: string;
    rating: number; // لو اضفنا تقييم مستقبلاً
  };
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب البيانات عند فتح الصفحة
  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // نجلب المفضلة ونربطها بجدول الاماكن (locations)
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          location:locations (
            id,
            name,
            type,
            image_url,
            price_range
          )
        `)
        .eq("user_id", session.user.id);

      if (error) throw error;
      setFavorites(data as any);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  // دالة الحذف
  const removeFavorite = async (id: string) => {
    // تحديث الواجهة فوراً (Optimistic Update)
    setFavorites(favorites.filter(item => item.id !== id));

    // الحذف من قاعدة البيانات
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", id);

    if (error) {
      alert("حدث خطأ أثناء الحذف");
      fetchFavorites(); // استرجاع البيانات في حال الفشل
    }
  };

  // دالة مساعدة لترجمة النوع
  const getTypeLabel = (type: string) => {
    const types: any = {
      heritage: "معلم تراثي",
      housing_traditional: "نُزل ريفي",
      housing_hotel: "فندق",
      food_traditional: "مطعم شعبي",
      event: "فعالية",
    };
    return types[type] || "مكان";
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
             <Heart className="text-[#C89B3C] fill-[#C89B3C]" />
             قائمة مفضلاتي
           </h2>
           <p className="text-white/60 text-sm">الأماكن التي نالت إعجابك وتخطط لزيارتها.</p>
        </div>
        <div className="bg-[#C89B3C]/10 text-[#C89B3C] px-4 py-2 rounded-full font-bold border border-[#C89B3C]/20">
          {favorites.length} أماكن
        </div>
      </div>

      {/* المحتوى */}
      {favorites.length === 0 ? (
        // --- حالة القائمة فارغة ---
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
          <Heart size={64} className="text-white/10 mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">قائمتك فارغة حالياً</h3>
          <p className="text-white/50 mb-8 text-center max-w-md">
            لم تقم بإضافة أي أماكن للمفضلة بعد. استكشف الخريطة واحفظ الأماكن التي تعجبك!
          </p>
          <Link href="/map">
            <button className="flex items-center gap-2 bg-[#C89B3C] text-[#2B1F17] px-6 py-3 rounded-xl font-bold hover:bg-[#b38a35] transition">
              <span>تصفح الخريطة</span>
              <ArrowLeft size={18} />
            </button>
          </Link>
        </div>
      ) : (
        // --- شبكة الكروت ---
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((item) => (
            <div 
              key={item.id} 
              className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-[#C89B3C]/40 transition-all duration-300 hover:-translate-y-1"
            >
              {/* الصورة */}
              <div className="relative h-48 w-full">
                {/* صورة افتراضية أو صورة المكان */}
                <Image 
                  src={item.location.image_url || "/logo.png"} 
                  alt={item.location.name} 
                  fill 
                  className="object-cover group-hover:scale-105 transition duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2B1F17] to-transparent opacity-80" />
                
                {/* زر الحذف العائم */}
                <button 
                  onClick={() => removeFavorite(item.id)}
                  className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:bg-red-500 hover:text-white transition border border-white/10"
                  title="إزالة من المفضلة"
                >
                  <Trash2 size={16} />
                </button>
                
                {/* بادج النوع */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-[#C89B3C] text-[#2B1F17] text-xs font-bold rounded-md shadow-lg">
                  {getTypeLabel(item.location.type)}
                </div>
              </div>

              {/* المعلومات */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-white mb-1 truncate">{item.location.name}</h3>
                <div className="flex items-center gap-1 text-white/60 text-sm mb-4">
                   <MapPin size={14} className="text-[#C89B3C]" />
                   <span>عسير، المملكة العربية السعودية</span>
                </div>

                <div className="flex items-center justify-between mt-auto">
                   <div className="text-[#C89B3C] font-medium text-sm">
                      {item.location.price_range || "الأسعار حسب الطلب"}
                   </div>
                   
                   {/* رابط التفاصيل */}
                   <Link href={`/place/${item.location.id}`}>
                     <button className="text-sm text-white/80 hover:text-white underline decoration-[#C89B3C] decoration-2 underline-offset-4">
                       التفاصيل
                     </button>
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