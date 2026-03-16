"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  MapPin, ArrowRight, Loader2, Search, X, Ticket, Calendar, PlayCircle
} from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('status', 'approved')
      .eq('sub_category', 'event') 
      .order('created_at', { ascending: false });

    if (data) setEvents(data);
    setLoading(false);
  };

  const isVideo = (url: string): boolean => {
    if (!url) return false;
    return !!(url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('video') || url.includes('mp4'));
  };

  const filteredEvents = events.filter(event => {
    const query = searchQuery.toLowerCase().trim();
    return query === "" || 
        event.title.toLowerCase().includes(query) ||
        (event.description && event.description.toLowerCase().includes(query));
  });

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER SECTION */}
      <div className="relative h-[40vh] md:h-[45vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <Image src="/logo.png" alt="Sayyir Logo" fill className="object-contain p-16 md:p-24 opacity-30" />
        <div className="absolute inset-0 bg-gradientto-b from-black/50 via-black/70 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2 md:mb-4 drop-shadow-lg flex justify-center items-center gap-4">
              <Ticket className="text-[#C89B3C]" size={48} /> فعاليات عسير
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium">
            عش أجواء المتعة مع أفضل المهرجانات، العروض الحية، والأنشطة الترفيهية في المنطقة.
          </p>
        </div>
        
        <Link href="/" className="absolute top-6 right-6 md:top-8 md:right-8 z-20 p-2 md:p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition group">
           <ArrowRight className="text-white group-hover:-translate-x-1 transition w-5 h-5 md:w-6 md:h-6" />
        </Link>
      </div>

      {/* SEARCH SECTION */}
      <div className="container mx-auto px-4 -mt-6 md:-mt-8 relative z-30 mb-12">
        <div className="max-w-md mx-auto relative group">
            <div className="relative flex items-center bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/20 rounded-full px-3 md:px-4 h-10 md:h-12 shadow-2xl transition focus-within:bg-[#1a1a1a] focus-within:border-[#C89B3C]/50">
                <Search className="text-white/50 ml-2 md:ml-3 shrink-0 w-4 h-4 md:w-5 md:h-5" />
                <input
                    type="text"
                    placeholder="ابحث عن فعالية، مهرجان..."
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

      {/* GRID */}
      <div className="container mx-auto px-4 pb-16 md:pb-20">
        {loading ? (
          <div className="flex justify-center h-32 md:h-40 items-center"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8 md:w-10 md:h-10" /></div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 md:py-20 bg-white/5 rounded-2xl md:rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-3 md:gap-4 px-4">
              <Ticket className="text-white/20 w-10 h-10 md:w-12 md:h-12" />
              <p className="text-white/40 text-sm md:text-base">لا توجد فعاليات متاحة حالياً تطابق بحثك.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredEvents.map((event) => (
                <Link key={event.id} href={`/service/${event.id}`} className="block transition-transform hover:-translate-y-2">
                    <EventCard data={event} isVideo={isVideo} />
                </Link>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}

function EventCard({ data, isVideo }: { data: any, isVideo: (url: string) => boolean }) {
  const mainMedia = data.image_url;
  const mediaIsVideo = mainMedia ? isVideo(mainMedia) : false;
  
  // ✅ التعديل هنا: تحويل السعر لرقم لضمان المقارنة الصحيحة
  const priceValue = Number(data.price) || 0;
  
  return (
    <div className="group h-full relative bg-[#1a1a1a] rounded-3xl md:rounded-2rem overflow-hidden border border-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-[#C89B3C]/20 hover:border-[#C89B3C]/40 flex flex-col">
        <div className="relative h-56 sm:h-64 md:h-72 w-full overflow-hidden bg-black flex items-center justify-center shrink-0">
          {mainMedia ? (
              mediaIsVideo ? (
                  <video src={mainMedia} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" muted loop autoPlay playsInline />
              ) : (
                  <Image src={mainMedia} alt={data.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }} />
              )
          ) : (
              <Image src="/placeholder.jpg" alt={data.title} fill className="object-cover"/>
          )}
          
          <div className="absolute top-3 left-3 md:top-4 md:left-4 backdrop-blur-md bg-black/30 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-white/10 flex items-center gap-1 z-10">
            {mediaIsVideo ? <PlayCircle className="text-[#C89B3C] w-3 h-3 md:w-3.5 md:h-3.5"/> : <Ticket className="text-[#C89B3C] w-3 h-3 md:w-3.5 md:h-3.5"/>}
            <span className="text-[10px] md:text-xs font-bold text-white">فعالية</span>
          </div>

          {/* ✅ التعديل هنا: إظهار السعر وإظهار مجاني بخلفية مختلفة */}
          <div className={`absolute bottom-3 right-3 md:bottom-4 md:right-4 backdrop-blur text-white text-[9px] md:text-[10px] px-2 py-1 rounded-md md:rounded-lg font-bold shadow-lg z-10 ${priceValue > 0 ? 'bg-[#C89B3C]/90 text-black' : 'bg-emerald-500/90'}`}>
              {priceValue > 0 ? `دخول: ${priceValue} ريال` : 'دخول مجاني'}
          </div>
        </div>
        
        <div className="p-4 md:p-6 flex flex-col flex-1 relative -mt-6 z-20">
          <div className="bg-[#252525] backdrop-blur-xl border border-white/5 p-4 rounded-xl shadow-xl flex-1 flex flex-col">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition line-clamp-1">{data.title}</h3>
              
              <div className="flex flex-col gap-2 mb-3">
                  {data.details?.event_info?.dates?.startDate && (
                      <div className="flex items-center gap-1.5 text-white/50 text-[10px] md:text-xs">
                          <Calendar className="w-3 h-3 shrink-0 text-[#C89B3C]" />
                          <span>تاريخ البدء: <span className="dir-ltr">{data.details.event_info.dates.startDate}</span></span>
                      </div>
                  )}
                  {data.details?.event_info?.dates?.endDate && (
                      <div className="flex items-center gap-1.5 text-white/50 text-[10px] md:text-xs">
                          <Calendar className="w-3 h-3 shrink-0 text-red-400" />
                          <span>ينتهي في: <span className="dir-ltr">{data.details.event_info.dates.endDate}</span></span>
                      </div>
                  )}
              </div>

              <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-4 flex-1">
                  {data.description}
              </p>

              <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-auto">
                 <span className="text-xs text-white/40 flex items-center gap-1 group-hover:text-white transition">استكشف الفعالية <ArrowRight size={12} className="rotate-180"/></span>
              </div>
          </div>
        </div>
    </div>
  );
}