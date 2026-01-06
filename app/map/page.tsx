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
  X, ArrowRight, Camera, 
  BedDouble, Utensils, Filter, Layers, 
  TreePine, Tent, Landmark, Mountain 
} from "lucide-react";
import { useRouter } from "next/navigation";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

interface MapItem {
  id: string;
  name: string;
  type: string;
  category?: string;
  lat: number;
  lng: number;
  description: string;
  media_urls: string[];
  price?: string;
  sourceTable: 'places' | 'services';
}

export default function MapPage() {
  const router = useRouter();
  
  const [items, setItems] = useState<MapItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MapItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MapItem | null>(null);
  
  const [activeFilter, setActiveFilter] = useState('الكل'); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [viewState, setViewState] = useState({
    latitude: 18.216,
    longitude: 42.505,
    zoom: 10
  });
  
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: placesData } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', true);
      
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'approved');

      const allItems: MapItem[] = [];

      if (placesData) {
        placesData.forEach((p: any) => {
          allItems.push({
            id: p.id,
            name: p.name,
            type: p.type,
            category: p.category,
            lat: p.lat,
            lng: p.lng,
            description: p.description,
            media_urls: p.media_urls || [],
            sourceTable: 'places'
          });
        });
      }

      if (servicesData) {
        servicesData.forEach((s: any) => {
          if (s.lat && s.lng) {
            allItems.push({
              id: s.id,
              name: s.title,
              type: s.service_type,
              category: s.category,
              lat: s.lat,
              lng: s.lng,
              description: s.description,
              media_urls: s.images || [],
              price: s.price,
              sourceTable: 'services'
            });
          }
        });
      }

      setItems(allItems);
      setFilteredItems(allItems);

    } catch (error) {
      console.error("Error fetching map data:", error);
    }
  };

  useEffect(() => {
    if (activeFilter === 'الكل') {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => {
        if (activeFilter === 'معالم' && (item.type === 'tourist' || item.type === 'heritage')) return true;
        if (activeFilter === 'سكن' && item.type === 'accommodation') return true;
        if (activeFilter === 'مطاعم' && item.type === 'food') return true;
        if (activeFilter === 'تجارب' && item.type === 'experience') return true;
        return false;
      }));
    }
  }, [activeFilter, items]);

  const getItemStyle = (type: string) => {
    switch (type) {
      case 'accommodation':
        return { icon: BedDouble, color: "text-indigo-400", bg: "bg-indigo-900" };
      case 'food':
        return { icon: Utensils, color: "text-orange-400", bg: "bg-orange-900" };
      case 'experience':
        return { icon: Tent, color: "text-emerald-400", bg: "bg-emerald-900" };
      case 'heritage':
        return { icon: Landmark, color: "text-[#C89B3C]", bg: "bg-[#4a3b2a]" };
      case 'tourist':
        return { icon: Mountain, color: "text-blue-400", bg: "bg-blue-900" };
      default:
        return { icon: Camera, color: "text-gray-400", bg: "bg-gray-800" };
    }
  };

  const handleActionClick = () => {
    if (!selectedLocation) return;
    if (selectedLocation.sourceTable === 'places') {
      router.push(`/place/${selectedLocation.id}`);
    } else {
      router.push(`/service/${selectedLocation.id}`);
    }
  };

  const filters = [
    { label: 'الكل', icon: Layers },
    { label: 'معالم', icon: Landmark },
    { label: 'سكن', icon: BedDouble },
    { label: 'مطاعم', icon: Utensils },
    { label: 'تجارب', icon: Tent },
  ];

  return (
    <main className={`relative h-screen flex flex-col ${tajawal.className} bg-black overflow-hidden`}>
      <video className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-60" src="/hero.mp4" autoPlay muted loop playsInline />
      
      <div className="absolute top-4 left-4 z-50">
        <Link href="/" className="block transition hover:opacity-80 hover:scale-105 duration-300">
          <Image src="/logo.png" alt="Sayyir Homepage" width={100} height={35} priority className="drop-shadow-xl" />
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`w-12 h-12 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg transition hover:bg-white/20 ${isFilterOpen ? 'bg-[#C89B3C] text-black' : 'bg-black/60 text-white'}`}
        >
          {isFilterOpen ? <X size={24} /> : <Filter size={24} />}
        </button>

        {isFilterOpen && (
          <div className="flex flex-col gap-2 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 animate-in slide-in-from-right-4 duration-300 min-w-[140px]">
            {filters.map((f) => (
               <button
                 key={f.label}
                 onClick={() => { setActiveFilter(f.label); setIsFilterOpen(false); }}
                 className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition w-full ${activeFilter === f.label ? 'bg-[#C89B3C] text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
               >
                 <f.icon size={16} />
                 <span>{f.label}</span>
               </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex-1 w-full h-full">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          // تم تغيير الستايل إلى satellite-streets-v12 (يظهر البيوت والشوارع الحقيقية)
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12" 
          style={{ width: "100%", height: "100%" }}
          onClick={() => setSelectedLocation(null)}
        >
          <NavigationControl position="bottom-left" style={{ marginBottom: '100px', marginLeft: '20px' }} />

          {filteredItems.map((loc) => {
            const style = getItemStyle(loc.type);
            const isSelected = selectedLocation?.id === loc.id;
            const Icon = style.icon;

            return (
              <Marker
                key={`${loc.sourceTable}-${loc.id}`}
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
                  <div className={`w-10 h-10 rounded-full ${style.bg} border-2 border-white/20 text-white flex items-center justify-center shadow-lg relative z-10`}>
                    <Icon size={18} />
                  </div>
                  <div className={`w-3 h-3 ${style.bg} rotate-45 -mt-1.5 border-r border-b border-white/20`}></div>
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
                                   <Image src={selectedLocation.media_urls[0]} alt={selectedLocation.name} fill className="object-cover" />
                                ) : (
                                   <div className="w-full h-full flex items-center justify-center text-white/20"><Camera size={24}/></div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-lg font-bold">{selectedLocation.name}</h2>
                                        {selectedLocation.price && (
                                            <span className="text-[#C89B3C] text-xs font-bold bg-[#C89B3C]/10 px-2 py-0.5 rounded">
                                                {selectedLocation.price} ﷼
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                                        {selectedLocation.description || "لا يوجد وصف متاح."}
                                    </p>
                                </div>

                                <div className="flex justify-end mt-2">
                                    <button onClick={handleActionClick} className="bg-[#C89B3C] text-[#2B1F17] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#b38a35] transition flex items-center gap-1 shadow-lg shadow-[#C89B3C]/10">
                                        التفاصيل <ArrowRight size={14} />
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