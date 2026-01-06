"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, Trash2, Heart, ArrowLeft, Loader2, Sparkles, Briefcase } from "lucide-react";
import { Tajawal } from "next/font/google";

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
      if (!session) return;

      // جلب المفضلة وربطها بالجدولين (landmarks و services)
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          created_at,
          landmark:landmarks (id, name, image_urls, city, type, description),
          service:services (id, title, image_url, location, price)
        `)
        .eq("user_id", session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // تصفية البيانات للتأكد من وجود العنصر المرتبط (في حال تم حذفه من المصدر)
      const validFavorites = (data || []).filter(item => item.landmark || item.service);
      setFavorites(validFavorites);

    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: string) => {
    if(!confirm("هل أنت متأكد من إزالة هذا العنصر من المفضلة؟")) return;

    // تحديث الواجهة فوراً (Optimistic UI)
    const originalFavorites = [...favorites];
    setFavorites(prev => prev.filter(item => item.id !== id));

    const { error } = await supabase.from("favorites").delete().eq("id", id);
    
    if (error) {
      alert("حدث خطأ أثناء الحذف");
      setFavorites(originalFavorites); // تراجع في حال الخطأ
    }
  };

  if (loading) return (
    <div className={`h-[80vh] flex flex-col items-center justify-center bg-[#1a1a1a] text-[#C89B3C] ${tajawal.className}`}>
        <Loader2 className="animate-spin w-10 h-10 mb-4" />
        <p className="animate-pulse">جاري تحميل كنوزك المحفوظة...</p>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#1a1a1a] text-white p-6 lg:p-10 ${tajawal.className}`} dir="rtl">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Heart className="text-[#C89B3C] fill-[#C89B3C]" size={32} /> 
              <span>قائمة مفضلاتي</span>
            </h2>
            <p className="text-white/60">احتفظ بالأماكن والتجارب التي تخطط لزيارتها قريباً.</p>
        </div>
        <div className="bg-[#C89B3C]/10 text-[#C89B3C] px-5 py-2 rounded-xl font-bold border border-[#C89B3C]/20 flex items-center gap-2">
          <Sparkles size={18} />
          {favorites.length} عناصر محفوظة
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[#252525] rounded-[2rem] border border-white/5 border-dashed">
          <div className="p-6 bg-white/5 rounded-full mb-6 text-white/20">
             <Heart size={48} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">قائمتك فارغة حالياً</h3>
          <p className="text-white/50 mb-8 text-center max-w-md leading-relaxed">
            لم تقم بإضافة أي أماكن للمفضلة بعد. تصفح الخريطة واحفظ الكنوز التي تعجبك لتصل إليها لاحقاً!
          </p>
          <Link href="/map">
            <button className="flex items-center gap-2 bg-[#C89B3C] text-[#2B1F17] px-8 py-4 rounded-xl font-bold hover:bg-[#b38a35] transition shadow-lg shadow-[#C89B3C]/20">
              <span>تصفح الخريطة</span> <ArrowLeft size={20} />
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((item) => {
            // تحديد نوع العنصر (معلم أو خدمة)
            const isLandmark = !!item.landmark;
            const data = item.landmark || item.service;
            
            // معالجة البيانات للعرض
            const title = isLandmark ? data.name : data.title;
            const image = isLandmark 
                ? (data.image_urls?.[0] || "/placeholder.jpg") 
                : (data.image_url || "/placeholder.jpg");
            
            // معالجة الموقع
            let locationName = "عسير";
            if (isLandmark) locationName = data.city || "عسير";
            else if (data.location) {
                try { locationName = JSON.parse(data.location).address || "عسير"; } catch {}
            }

            return (
              <div key={item.id} className="group relative bg-[#252525] border border-white/5 rounded-[1.5rem] overflow-hidden hover:border-[#C89B3C]/50 transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
                
                {/* Image Section */}
                <div className="relative h-56 w-full overflow-hidden">
                  <Image src={image} alt={title} fill className="object-cover group-hover:scale-110 transition duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent opacity-90" />
                  
                  {/* Delete Button */}
                  <button 
                    onClick={() => removeFavorite(item.id)} 
                    className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:bg-red-500 hover:text-white transition border border-white/10 opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 duration-300" 
                    title="إزالة من المفضلة"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  {/* Type Badge */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-[#C89B3C] text-[#2B1F17] text-xs font-bold rounded-lg shadow-lg flex items-center gap-1">
                    {isLandmark ? <MapPin size={12}/> : <Briefcase size={12}/>}
                    {isLandmark ? 'معلم سياحي' : 'تجربة / خدمة'}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 truncate leading-tight">{title}</h3>
                  
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
                      <MapPin size={16} className="text-[#C89B3C]" />
                      <span>{locationName}</span>
                  </div>

                  {!isLandmark && (
                      <div className="mb-4 text-[#C89B3C] font-bold dir-ltr text-sm">
                          {data.price} SAR
                      </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                      <span className="text-xs text-white/30">
                        {new Date(item.created_at).toLocaleDateString('ar-SA')}
                      </span>
                      <Link href={isLandmark ? `/map?loc=${data.id}` : `/services/${data.id}`}>
                        <button className="text-sm text-white font-bold hover:text-[#C89B3C] flex items-center gap-2 transition group-hover:gap-3">
                          عرض التفاصيل <ArrowLeft size={16}/>
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