"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  MapPin, ArrowRight, Loader2, Mountain, Landmark, 
  Clock, DollarSign, X, Info, PlayCircle 
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function LandmarksPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [zoomedMedia, setZoomedMedia] = useState<string | null>(null);

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

  // ✅ تم التصحيح: إجبار الدالة على إرجاع boolean دائماً
  const isVideo = (url: string): boolean => {
    if (!url) return false;
    // استخدام !! لتحويل النتيجة إلى true/false
    return !!(url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('video') || url.includes('mp4'));
  };

  const filteredPlaces = filter === 'all' ? places : places.filter(place => place.type === filter);

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER SECTION */}
      <div className="relative h-[45vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        <Image 
          src="/logo.png" 
          alt="Sayyir Logo" 
          fill 
          className="object-contain p-24 opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">كنوز عسير</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto font-medium">
            اكتشف سحر الطبيعة وعبق التاريخ في أهم الوجهات السياحية والتراثية.
          </p>
        </div>
        
        <Link href="/" className="absolute top-8 right-8 z-20 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition group">
           <ArrowRight className="text-white group-hover:-translate-x-1 transition" />
        </Link>
      </div>

      {/* FILTER TABS */}
      <div className="container mx-auto px-4 -mt-8 relative z-20 mb-12">
        <div className="flex justify-center gap-3 bg-white/5 backdrop-blur-xl p-2 rounded-full w-fit mx-auto border border-white/10 shadow-xl">
          <button onClick={() => setFilter('all')} className={`px-6 py-2 rounded-full transition text-sm font-bold ${filter === 'all' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}>الكل</button>
          <button onClick={() => setFilter('tourist')} className={`px-6 py-2 rounded-full transition flex items-center gap-2 text-sm font-bold ${filter === 'tourist' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Mountain size={16} /> سياحي</button>
          <button onClick={() => setFilter('heritage')} className={`px-6 py-2 rounded-full transition flex items-center gap-2 text-sm font-bold ${filter === 'heritage' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Landmark size={16} /> تراث</button>
        </div>
      </div>

      {/* GRID */}
      <div className="container mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex justify-center h-40 items-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10"><p className="text-white/40">لا توجد معالم مضافة حالياً.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPlaces.map((place) => (
                <div key={place.id} onClick={() => setSelectedPlace(place)} className="cursor-pointer">
                    <LandmarkCard data={place} isVideo={isVideo} />
                </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAILED MODAL */}
      {selectedPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="bg-[#1a1a1a] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header with Media Background */}
                <div className="relative h-64 md:h-80 shrink-0 bg-black">
                    {isVideo(selectedPlace.media_urls?.[0]) ? (
                        <video 
                            src={selectedPlace.media_urls[0]} 
                            className="w-full h-full object-cover opacity-80"
                            autoPlay 
                            muted 
                            loop 
                            playsInline 
                        />
                    ) : (
                        <Image 
                            src={selectedPlace.media_urls?.[0] || "/placeholder.jpg"} 
                            alt={selectedPlace.name} 
                            fill 
                            className="object-cover"
                        />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                    <button onClick={() => setSelectedPlace(null)} className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition z-10"><X size={24}/></button>
                    
                    <div className="absolute bottom-6 right-6 left-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${selectedPlace.type === 'heritage' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'}`}>
                                {selectedPlace.type === 'tourist' ? <Mountain size={14}/> : <Landmark size={14}/>}
                                {selectedPlace.type === 'tourist' ? 'معلم سياحي' : 'موقع تراثي'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedPlace.price > 0 ? 'bg-emerald-500 text-black' : 'bg-white/20 text-white backdrop-blur-md'}`}>
                                {selectedPlace.price > 0 ? `${selectedPlace.price} ريال` : 'دخول مجاني'}
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">{selectedPlace.name}</h2>
                        <div className="flex items-center gap-2 text-white/80 mt-1 text-sm">
                            <MapPin size={16} className="text-[#C89B3C]"/>
                            {selectedPlace.city || "عسير"}
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Main Info (Right) */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-[#C89B3C] mb-3 flex items-center gap-2"><Info size={20}/> نبذة عن المكان</h3>
                                <p className="text-gray-300 leading-relaxed whitespace-pre-line text-lg">{selectedPlace.description}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                                    <div className="p-2 bg-[#C89B3C]/10 rounded-lg text-[#C89B3C]"><DollarSign size={24}/></div>
                                    <div>
                                        <p className="text-xs text-gray-400">رسوم الدخول</p>
                                        <p className="font-bold text-lg text-white">
                                            {selectedPlace.price > 0 ? `${selectedPlace.price} ريال / للشخص` : 'مجاني تماماً'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {selectedPlace.services && (
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-3">الخدمات المتوفرة</h3>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-gray-300">
                                        {selectedPlace.services}
                                    </div>
                                </div>
                            )}

                            {selectedPlace.media_urls && selectedPlace.media_urls.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-3">معرض الوسائط</h3>
                                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                        {selectedPlace.media_urls.map((url: string, i: number) => (
                                            <div key={i} onClick={() => setZoomedMedia(url)} className="relative w-40 h-28 shrink-0 rounded-lg overflow-hidden border border-white/10 group cursor-pointer hover:border-[#C89B3C]/50 bg-black">
                                                {isVideo(url) ? (
                                                    <>
                                                        <video src={url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" muted />
                                                        <div className="absolute inset-0 flex items-center justify-center"><PlayCircle className="text-white/80 w-8 h-8"/></div>
                                                    </>
                                                ) : (
                                                    <Image src={url} alt={`Gallery ${i}`} fill className="object-cover group-hover:scale-110 transition duration-500"/>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar (Left) - Map & Hours */}
                        <div className="space-y-6">
                            
                            <div className="bg-[#252525] rounded-2xl overflow-hidden border border-white/10 h-64 relative shadow-lg group">
                                <Map
                                    initialViewState={{
                                        latitude: Number(selectedPlace.lat),
                                        longitude: Number(selectedPlace.lng),
                                        zoom: 13
                                    }}
                                    mapStyle="mapbox://styles/mapbox/satellite-streets-v12" 
                                    mapboxAccessToken={MAPBOX_TOKEN}
                                    attributionControl={false}
                                >
                                    <NavigationControl position="top-left" showCompass={false}/>
                                    <Marker latitude={Number(selectedPlace.lat)} longitude={Number(selectedPlace.lng)} color="#C89B3C"/>
                                </Map>
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="absolute bottom-3 left-3 right-3 bg-[#C89B3C] hover:bg-[#b38a35] text-black font-bold py-2 rounded-xl text-center text-sm shadow-lg transition flex items-center justify-center gap-2"
                                >
                                    <MapPin size={16}/> افتح في Google Maps
                                </a>
                            </div>

                            {selectedPlace.work_hours && selectedPlace.work_hours.length > 0 && (
                                <div className="bg-[#252525] p-5 rounded-2xl border border-white/5">
                                    <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-sm"><Clock size={16} className="text-[#C89B3C]"/> ساعات العمل</h4>
                                    <div className="space-y-2">
                                        {selectedPlace.work_hours.map((wh: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                                <span className={wh.is_active ? "text-white" : "text-white/30"}>{wh.day}</span>
                                                <span className={wh.is_active ? "text-[#C89B3C] dir-ltr" : "text-red-400"}>
                                                    {wh.is_active ? `${wh.from} - ${wh.to}` : "مغلق"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Lightbox */}
      {zoomedMedia && (
        <div 
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setZoomedMedia(null)}
        >
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition">
                <X size={32} />
            </button>
            <div className="relative w-full max-w-5xl h-[85vh] flex items-center justify-center">
                {isVideo(zoomedMedia) ? (
                    <video 
                        src={zoomedMedia} 
                        controls 
                        autoPlay 
                        className="max-w-full max-h-full rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    />
                ) : (
                    <Image 
                        src={zoomedMedia} 
                        alt="Zoomed View" 
                        fill 
                        className="object-contain"
                    />
                )}
            </div>
        </div>
      )}

    </main>
  );
}

function LandmarkCard({ data, isVideo }: { data: any, isVideo: (url: string) => boolean }) {
  const isHeritage = data.type === 'heritage';
  const mainMedia = data.media_urls && data.media_urls[0] ? data.media_urls[0] : null;
  const isMainMediaVideo = mainMedia ? isVideo(mainMedia) : false;
  
  return (
    <div className="group h-full relative bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/20 hover:border-[#C89B3C]/40">
        <div className="relative h-72 w-full overflow-hidden bg-black">
          {mainMedia ? (
              isMainMediaVideo ? (
                  <video 
                    src={mainMedia} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" 
                    muted 
                    loop 
                    autoPlay 
                    playsInline 
                  />
              ) : (
                  <Image src={mainMedia} alt={data.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110"/>
              )
          ) : (
              <Image src="/placeholder.jpg" alt={data.name} fill className="object-cover"/>
          )}
          
          <div className="absolute top-4 left-4 backdrop-blur-md bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
            {isHeritage ? <Landmark size={14} className="text-amber-400"/> : <Mountain size={14} className="text-emerald-400"/>}
            <span className="text-xs font-bold text-white">
                {isHeritage ? 'تراثي' : 'سياحي'}
            </span>
          </div>

          <div className={`absolute bottom-4 right-4 backdrop-blur text-white text-[10px] px-2 py-1 rounded-lg font-bold shadow-lg ${data.price > 0 ? 'bg-[#C89B3C]/90 text-black' : 'bg-emerald-500/90'}`}>
              {data.price > 0 ? `${data.price} ريال` : 'دخول مجاني'}
          </div>
        </div>
        <div className="p-6 relative -mt-10">
          <div className="bg-[#252525] backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition">{data.name}</h3>
              <div className="flex items-center gap-1 text-white/50 text-xs mb-3"><MapPin size={14} /><span>{data.city || "عسير، السعودية"}</span></div>
          </div>
        </div>
    </div>
  );
}