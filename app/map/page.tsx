"use client";
export const dynamic = "force-dynamic";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import { Tajawal } from "next/font/google";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link"; 
import { 
  X, MapPin, ArrowRight, 
  Camera, BedDouble, UtensilsCrossed, Filter, Layers, 
  TreePine, Tent, Coffee, Landmark 
} from "lucide-react";
import { useRouter } from "next/navigation";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

interface Place {
  id: string;
  name: string;
  type: string; 
  category?: string; 
  lat: number;
  lng: number;
  description: string;
  media_urls: string[];
  price_range?: string;
}

interface Category {
  id: string;
  name: string;
}

export default function MapPage() {
  const router = useRouter();
  
  const [locations, setLocations] = useState<Place[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Place[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); 
  const [selectedLocation, setSelectedLocation] = useState<Place | null>(null);
  
  const [activeCategory, setActiveCategory] = useState('الكل'); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [viewState, setViewState] = useState({
    latitude: 18.216,
    longitude: 42.505,
    zoom: 10
  });
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. جلب الأماكن
    const { data: placesData } = await supabase
      .from('places')
      .select('*')
      .eq('is_active', true);
    
    if (placesData) {
      setLocations(placesData as any);
      setFilteredLocations(placesData as any);
    }

    // 2. جلب التصنيفات
    const { data: catsData } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', 'place') 
      .order('name');
      
    if (catsData) {
      setCategories(catsData);
    }
  };

  useEffect(() => {
    if (activeCategory === 'الكل') {
      setFilteredLocations(locations);
    } else {
      setFilteredLocations(locations.filter(loc => loc.category === activeCategory));
    }
  }, [activeCategory, locations]);

  // حماية المتغير من الـ null
  const getCategoryStyle = (categoryName: string | null | undefined) => {
    const safeName = categoryName || ""; 
    
    if (safeName.includes("مزرعة") || safeName.includes("ريف")) 
      return { icon: TreePine, color: "text-emerald-400", bg: "bg-emerald-600" };
    
    if (safeName.includes("أكل") || safeName.includes("طعام") || safeName.includes("مطعم")) 
      return { icon: Coffee, color: "text-amber-600", bg: "bg-amber-700" };
    
    if (safeName.includes("نزل") || safeName.includes("سكن") || safeName.includes("كخ")) 
      return { icon: Tent, color: "text-indigo-400", bg: "bg-indigo-600" };
    
    if (safeName.includes("قلعة") || safeName.includes("حصن") || safeName.includes("قصر") || safeName.includes("متحف")) 
      return { icon: Landmark, color: "text-[#C89B3C]", bg: "bg-[#C89B3C]" };

    return { icon: Camera, color: "text-gray-400", bg: "bg-gray-600" };
  };

  const handleActionClick = () => {
    if (!selectedLocation) return;
    router.push(`/place/${selectedLocation.id}`);
  };

  return (
    <main className={`relative h-screen flex flex-col ${tajawal.className} bg-black overflow-hidden`}>
      <video className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-60" src="/hero.mp4" autoPlay muted loop playsInline />
      
      {/* الشعار - تم تعديل الرابط ليوجه للصفحة الرئيسية دائماً */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/" className="block transition hover:opacity-80 hover:scale-105 duration-300">
          <Image src="/logo.png" alt="Sayyir Homepage" width={100} height={35} priority className="drop-shadow-xl" />
        </Link>
      </div>

      {/* زر الفلترة العائم */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`w-12 h-12 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg transition hover:bg-white/20 ${isFilterOpen ? 'bg-[#C89B3C] text-black' : 'bg-black/60 text-white'}`}
        >
          {isFilterOpen ? <X size={24} /> : <Filter size={24} />}
        </button>

        {isFilterOpen && (
          <div className="flex flex-col gap-2 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 animate-in slide-in-from-right-4 duration-300 min-w-[160px] max-h-[60vh] overflow-y-auto custom-scrollbar">
            
            <button
              onClick={() => { setActiveCategory('الكل'); setIsFilterOpen(false); }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition w-full ${activeCategory === 'الكل' ? 'bg-white/20 text-white border border-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <Layers size={16} />
              <span>الكل</span>
            </button>

            {categories.map((cat) => {
              const style = getCategoryStyle(cat.name);
              const Icon = style.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.name); setIsFilterOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition w-full ${activeCategory === cat.name ? 'bg-white/20 text-white border border-white/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon size={16} className={style.color} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative flex-1 w-full h-full">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: "100%", height: "100%" }}
          onClick={() => setSelectedLocation(null)}
        >
          <NavigationControl position="bottom-left" style={{ marginBottom: '100px', marginLeft: '20px' }} />

          {filteredLocations.map((loc) => {
            const style = getCategoryStyle(loc.category);
            const isSelected = selectedLocation?.id === loc.id;
            const Icon = style.icon;

            return (
              <Marker
                key={loc.id}
                latitude={loc.lat}
                longitude={loc.lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedLocation(loc);
                  setViewState(prev => ({ ...prev, latitude: loc.lat - 0.005, longitude: loc.lng, zoom: 14 }));
                }}
              >
                <div className={`group relative cursor-pointer flex flex-col items-center transition-all duration-300 ${isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-10'}`}>
                  <div className={`w-10 h-10 rounded-full ${style.bg} text-white flex items-center justify-center shadow-lg border-2 border-white relative z-10`}>
                    <Icon size={18} fill="currentColor" />
                  </div>
                  <div className={`w-3 h-3 ${style.bg} rotate-45 -mt-1.5 border-r border-b border-white/50`}></div>
                  
                  {!isSelected && (
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition bg-black/80 text-white text-[10px] px-2 py-1 rounded border border-white/20 whitespace-nowrap pointer-events-none">
                      {loc.name}
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}
        </Map>

        {selectedLocation && (
            <div className="absolute bottom-0 left-0 right-0 z-40 p-4 md:p-6 flex justify-center pointer-events-none">
                <div className="pointer-events-auto w-full max-w-xl animate-in slide-in-from-bottom-10 duration-500 fade-in">
                    <div className="rounded-3xl backdrop-blur-xl bg-[#1a1a1a]/95 border border-white/10 shadow-2xl p-4 text-white relative">
                        
                        <button onClick={() => setSelectedLocation(null)} className="absolute left-4 top-4 text-white/50 hover:text-white transition bg-white/5 rounded-full p-1.5 z-20 hover:bg-white/10">
                            <X size={18} />
                        </button>

                        <div className="flex gap-4">
                            <div className="w-24 h-24 shrink-0 rounded-xl bg-white/5 overflow-hidden relative border border-white/10">
                                {selectedLocation.media_urls && selectedLocation.media_urls.length > 0 ? (
                                   selectedLocation.media_urls[0].includes('mp4') ? (
                                     <video src={selectedLocation.media_urls[0]} className="w-full h-full object-cover" muted />
                                   ) : (
                                     <img src={selectedLocation.media_urls[0]} alt={selectedLocation.name} className="w-full h-full object-cover" />
                                   )
                                ) : (
                                   <div className="w-full h-full flex items-center justify-center text-white/20"><Camera size={24}/></div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-lg font-bold">{selectedLocation.name}</h2>
                                        {selectedLocation.category && (
                                          <span className={`text-[10px] px-2 py-0.5 rounded text-white ${getCategoryStyle(selectedLocation.category).bg}`}>
                                              {selectedLocation.category}
                                          </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                                        {selectedLocation.description || "استمتع بزيارة هذا المكان الرائع في عسير..."}
                                    </p>
                                </div>

                                <div className="flex justify-end mt-2">
                                    <button onClick={handleActionClick} className="bg-[#C89B3C] text-[#2B1F17] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#b38a35] transition flex items-center gap-1 shadow-lg shadow-[#C89B3C]/10">
                                        {selectedLocation.type === 'tourist' || selectedLocation.type === 'heritage' ? 'استكشف' : 'التفاصيل'} <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}