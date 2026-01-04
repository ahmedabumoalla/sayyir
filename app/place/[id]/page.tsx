"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  MapPin, ArrowRight, Camera, X, Loader2, Sparkles, Navigation, Share2 
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

interface Place {
  id: string;
  name: string;
  type: string;
  description: string;
  media_urls: string[];
  lat: number;
  lng: number;
}

export default function PlaceDetails() {
  const params = useParams();
  const router = useRouter(); // 👈 ضروري عشان زر الرجوع يشتغل
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  
  // حالة المرشد الذكي
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [guideResponse, setGuideResponse] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPlaceDetails();
  }, []);

  const fetchPlaceDetails = async () => {
    // التأكد من أن الـ ID موجود
    if (!params?.id) return;

    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', params.id)
      .single();

    if (data) setPlace(data);
    setLoading(false);
  };

  // --- دالة ضغط الصورة (لتسريع الرفع من الجوال) ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement("img");
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024; // تقليص العرض إلى 1024 بكسل كحد أقصى
          const scaleSize = MAX_WIDTH / img.width;
          
          const newWidth = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
          const newHeight = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

          canvas.width = newWidth;
          canvas.height = newHeight;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, newWidth, newHeight);

          // ضغط الجودة إلى 70% (JPEG)
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressedDataUrl);
        };
      };
    });
  };

  // التعامل مع رفع الصورة للمرشد الذكي
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !place) return;

    setAnalyzing(true);
    setGuideResponse("");
    
    try {
      // 1. ضغط الصورة قبل الإرسال
      const compressedBase64 = await compressImage(file);

      // 2. إرسال الصورة للـ API
      const res = await fetch('/api/analyze-landmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: compressedBase64,
          placeName: place.name,
          placeDescription: place.description
        })
      });

      if (!res.ok) throw new Error("فشل الاتصال بالخادم");

      const data = await res.json();
      
      if (data.result) {
        setGuideResponse(data.result);
      } else {
        setGuideResponse("ما قدرت أتعرف على الصورة زين، ممكن تجرب صورة أوضح؟ 📸");
      }

    } catch (error) {
      console.error(error);
      setGuideResponse("صار خطأ فني بسيط في الاتصال، تأكد من النت وحاول مرة ثانية.");
    } finally {
      setAnalyzing(false);
    }
  };

  // شاشة التحميل
  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center text-[#C89B3C]">
      <Loader2 className="animate-spin w-10 h-10" />
    </div>
  );

  if (!place) return null;

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white pb-24 ${tajawal.className}`}>
      
      {/* ================= Hero Section (صورة/فيديو) ================= */}
      <div className="relative h-[50vh] w-full">
        {place.media_urls?.[0]?.includes("mp4") ? (
          <video src={place.media_urls[0]} className="w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <Image src={place.media_urls?.[0] || "/placeholder.jpg"} alt={place.name} fill className="object-cover" priority />
        )}
        
        {/* تدرج لوني للنصوص */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
        
        {/* أزرار الهيدر العائمة */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          {/* زر الرجوع للخلف - ينقلك للصفحة السابقة (الخريطة) */}
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition shadow-lg text-white"
          >
            <ArrowRight size={20} />
          </button>

          <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition shadow-lg text-white">
            <Share2 size={18} />
          </button>
        </div>

        {/* عنوان المكان والتصنيف */}
        <div className="absolute bottom-0 right-0 p-6 z-20 w-full">
          <span className="inline-block px-3 py-1 bg-[#C89B3C] text-black text-xs font-bold rounded-lg mb-3">
             {place.type === 'tourist' ? 'معلم سياحي' : place.type === 'restaurant' ? 'مطعم' : 'سكن'}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold mb-2">{place.name}</h1>
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <MapPin size={16} className="text-[#C89B3C]" />
            <span>منطقة عسير، المملكة العربية السعودية</span>
          </div>
        </div>
      </div>

      {/* ================= Content Section (التفاصيل) ================= */}
      <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#C89B3C]">عن المكان</h2>
          <p className="text-gray-300 leading-relaxed text-lg">{place.description}</p>
        </div>

        {/* معرض الصور (يظهر إذا كان هناك أكثر من صورة) */}
        {place.media_urls && place.media_urls.length > 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#C89B3C]">معرض الصور</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {place.media_urls.slice(1).map((url, idx) => (
                <div key={idx} className="aspect-square relative rounded-xl overflow-hidden bg-white/5 border border-white/5">
                  {url.includes("mp4") ? (
                    <video src={url} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={url} alt={`Gallery ${idx}`} fill className="object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= Sticky Action Bar (الأزرار السفلية) ================= */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 z-40">
        <div className="max-w-3xl mx-auto flex gap-3">
          {/* رابط خرائط جوجل */}
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex-1 bg-white/10 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition active:scale-95"
          >
            <Navigation size={20} className="text-[#C89B3C]" />
            <span>الوصول للموقع</span>
          </a>

          {/* زر المرشد الذكي */}
          <button 
            onClick={() => setIsGuideOpen(true)} 
            className="flex-1 bg-gradient-to-r from-[#C89B3C] to-[#b38a35] text-[#2B1F17] py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#C89B3C]/20 hover:shadow-[#C89B3C]/40 transition active:scale-95"
          >
            <Sparkles size={20} />
            <span>اسأل المرشد الذكي</span>
          </button>
        </div>
      </div>

      {/* ================= Smart Guide Modal (نافذة المرشد) ================= */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end md:items-center justify-center">
          <div className="bg-[#1a1a1a] w-full md:max-w-md md:rounded-3xl rounded-t-3xl border-t md:border border-white/10 p-6 animate-in slide-in-from-bottom-full duration-300 relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => { setIsGuideOpen(false); setGuideResponse(""); }} 
              className="absolute top-4 left-4 bg-white/5 p-2 rounded-full hover:bg-white/10 transition text-white"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center space-y-6 pt-4">
              {/* أيقونة المرشد */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#C89B3C] to-yellow-200 flex items-center justify-center shadow-lg shadow-[#C89B3C]/30 mb-2">
                <Sparkles size={32} className="text-[#2B1F17]" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">المرشد السياحي الذكي</h3>
                <p className="text-white/60 text-sm">
                  صور أي شيء غريب أو مثير للاهتمام في "{place.name}" وسأحكي لك قصته!
                </p>
              </div>

              {/* حالات العرض (تحليل / نتيجة / زر التصوير) */}
              {analyzing ? (
                <div className="bg-white/5 rounded-2xl p-6 w-full flex flex-col items-center gap-3 animate-pulse">
                  <Loader2 className="animate-spin text-[#C89B3C]" size={30} />
                  <p className="text-sm text-[#C89B3C]">جالس أحلل الصورة وأستخرج المعلومات... 🧐</p>
                </div>
              ) : guideResponse ? (
                <div className="bg-white/5 border border-[#C89B3C]/20 rounded-2xl p-6 w-full text-right animate-in fade-in zoom-in-95">
                  <p className="text-gray-200 leading-relaxed whitespace-pre-line">{guideResponse}</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="mt-4 text-xs text-[#C89B3C] font-bold border-b border-[#C89B3C] pb-0.5"
                  >
                    صوّر شيء ثاني؟
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full border-2 border-dashed border-white/20 bg-white/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#C89B3C] hover:bg-[#C89B3C]/5 transition group"
                >
                  <Camera size={40} className="text-white/40 group-hover:text-[#C89B3C] transition" />
                  <span className="text-sm font-bold text-white/60 group-hover:text-white">اضغط هنا لالتقاط صورة</span>
                </div>
              )}

              {/* Input الكاميرا المخفي */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}