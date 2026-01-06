"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { ArrowRight, Loader2, Compass, Clock, Activity } from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    try {
      // ✅ التعديل الجذري: نجلب من جدول places بدلاً من services
      const { data, error } = await supabase
        .from('places') 
        .select('*')
        .eq('type', 'experience') // حسب كود الأدمن، النوع هو experience
        .eq('is_active', true);   // نجلب فقط العناصر النشطة

      if (error) throw error;

      if (data) {
        setExperiences(data);
      }
    } catch (err) {
      console.error("خطأ في جلب البيانات:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER */}
      <div className="relative h-[40vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <Image 
          src="/logo.png" 
          alt="Sayyir Logo" 
          fill 
          sizes="100vw"
          className="object-contain p-20 opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">التجارب السياحية</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            عش مغامرات لا تُنسى مع أهل المنطقة، من الهايكنج في الجبال إلى جلسات السمر التراثية.
          </p>
        </div>
        
        <Link href="/" className="absolute top-8 right-8 z-20 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition">
           <ArrowRight className="text-white" />
        </Link>
      </div>

      {/* LIST */}
      <div className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center h-60 items-center">
            <Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" />
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <h3 className="text-2xl font-bold text-white/50">لا توجد تجارب متاحة حالياً</h3>
            <p className="text-white/30 mt-2">تأكد من إضافة تجارب من لوحة التحكم وتفعيلها</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiences.map((exp) => (
              <ExperienceCard key={exp.id} data={exp} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ExperienceCard({ data }: { data: any }) {
  // ✅ التعديل: استخدام media_urls بدلاً من images حسب كود الأدمن
  const imageUrl = data.media_urls && data.media_urls[0] ? data.media_urls[0] : "/placeholder.jpg";
  
  // ✅ التعديل: استخدام name بدلاً من title
  const title = data.name;

  return (
    <div className="group relative bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/10 hover:border-[#C89B3C]/30 flex flex-col h-full">
      <div className="relative h-64 w-full overflow-hidden shrink-0">
        {/* استخدام img العادية لتفادي مشاكل الدومين والسيرفر */}
<img 
  src={imageUrl} 
  alt={title} 
  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
/>
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-[#C89B3C]/50 px-4 py-2 rounded-xl">
          <span className="text-[#C89B3C] font-bold text-lg">
             {data.price && data.price > 0 ? `${data.price} ﷼` : 'مجاني'}
          </span>
        </div>
        
        {/* Subtype Badge */}
        {data.subtype && (
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                <Compass size={12} /> {data.subtype}
            </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-2xl font-bold mb-2 group-hover:text-[#C89B3C] transition">{title}</h3>
        
        {/* معلومات إضافية (المدة والصعوبة) إذا وجدت */}
        <div className="flex gap-4 mb-3 text-xs text-white/50">
            {data.duration && (
                <div className="flex items-center gap-1"><Clock size={14} className="text-[#C89B3C]"/> {data.duration}</div>
            )}
            {data.difficulty && (
                <div className="flex items-center gap-1"><Activity size={14} className="text-[#C89B3C]"/> {data.difficulty}</div>
            )}
        </div>

        <p className="text-white/60 text-sm line-clamp-2 mb-6 flex-1">{data.description}</p>
        
        <Link href={`/place/${data.id}`} className="w-full block">
            <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-[#C89B3C] hover:text-[#2B1F17] transition-all">
            احجز تجربتك
            </button>
        </Link>
      </div>
    </div>
  );
}