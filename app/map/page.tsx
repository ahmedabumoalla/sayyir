"use client";
export const dynamic = "force-dynamic";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";
import { Tajawal } from "next/font/google";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link"; 
import { 
  X, ArrowRight, Camera, 
  BedDouble, Utensils, Filter, Layers, 
  Tent, Landmark, Mountain, Box, MapPin, Check, Search
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
  category_id?: string;
  sub_category?: string;
  city?: string;
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
  const [hoveredLocation, setHoveredLocation] = useState<MapItem | null>(null);
  
  // ✅ بيانات الفلترة
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('الكل');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ✅ بيانات البحث
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MapItem[]>([]);

  // ✅ بيانات أيقونات التصنيفات
  const [dbIcons, setDbIcons] = useState<Record<string, string>>({});

  const [viewState, setViewState] = useState({
    latitude: 18.216,
    longitude: 42.505,
    zoom: 10
  });
  
  // تصنيفات ثابتة للنوع
  const categoryFilters = [
    { label: 'الكل', value: 'الكل', icon: Layers },
    { label: 'معالم', value: 'places', icon: Landmark }, 
    { label: 'مرافق', value: 'facilities', icon: Utensils }, 
    { label: 'تجارب', value: 'experience', icon: Tent },
  ];

  useEffect(() => {
    fetchCategoriesIcons();
    fetchAllData();
    fetchCities();
  }, []);

  const fetchCategoriesIcons = async () => {
    const { data } = await supabase.from('categories').select('id, name, type, icon_url');
    if (data) {
        const iconsMap: Record<string, string> = {};
        data.forEach(cat => {
            if (cat.icon_url) {
                iconsMap[cat.id] = cat.icon_url;         
                iconsMap[cat.name] = cat.icon_url;       
                if (cat.type) iconsMap[cat.type] = cat.icon_url; 
            }
        });
        setDbIcons(iconsMap);
    }
  };

  const fetchCities = async () => {
    const { data } = await supabase.from('cities').select('name').order('name');
    if (data) {
        setCitiesList(data.map(c => c.name));
    }
  };

  const fetchAllData = async () => {
    try {
      const { data: placesData } = await supabase.from('places').select('*').eq('is_active', true);
      const { data: servicesData } = await supabase.from('services').select('*').eq('status', 'approved');

      const allItems: MapItem[] = [];

      if (placesData) {
        placesData.forEach((p: any) => {
          allItems.push({
            id: p.id,
            name: p.name,
            type: p.type,
            category: p.category,
            category_id: p.category_id,
            city: p.city,
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
          if (!s.location_lat || !s.location_lng) return;
          if (s.sub_category === 'craft' && s.stock_quantity !== null && s.stock_quantity <= 0) return;
          if (s.capacity_type === 'limited' && s.max_capacity !== null && (s.current_bookings || 0) >= s.max_capacity) return;

          allItems.push({
            id: s.id,
            name: s.title,
            type: s.service_category === 'experience' ? 'experience' : s.sub_category || 'service',
            sub_category: s.sub_category,
            category: s.category,
            category_id: s.category_id,
            city: s.city,
            lat: s.location_lat,
            lng: s.location_lng,
            description: s.description,
            media_urls: s.image_url ? [s.image_url] : [],
            price: s.price,
            sourceTable: 'services'
          });
        });
      }

      setItems(allItems);
      setFilteredItems(allItems);

    } catch (error) {
      console.error("Error fetching map data:", error);
    }
  };

  useEffect(() => {
    let result = items;
    if (selectedCity !== 'الكل') {
        result = result.filter(item => item.city === selectedCity);
    }
    if (selectedCategory !== 'الكل') {
        if (selectedCategory === 'places') {
            result = result.filter(item => item.sourceTable === 'places' && item.type !== 'experience');
        } else if (selectedCategory === 'experience') {
            result = result.filter(item => item.type === 'experience');
        } else if (selectedCategory === 'facilities') {
            result = result.filter(item => item.sourceTable === 'services' && item.type !== 'experience');
        }
    }
    setFilteredItems(result);
  }, [selectedCity, selectedCategory, items]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
        setSearchResults([]);
        return;
    }
    const lowerQuery = query.toLowerCase();
    const results = items.filter(item => 
        item.name.toLowerCase().includes(lowerQuery) || 
        (item.city && item.city.toLowerCase().includes(lowerQuery))
    );
    setSearchResults(results.slice(0, 5));
  };

  const handleSelectSearchResult = (item: MapItem) => {
    setSelectedLocation(item);
    setViewState({
        latitude: item.lat - 0.005,
        longitude: item.lng,
        zoom: 15
    });
    setSearchResults([]); 
    setSearchQuery(""); 
  };

  const getItemStyle = (item: MapItem) => {
    const customIconUrl = dbIcons[item.category_id || ''] || dbIcons[item.category || ''] || dbIcons[item.sub_category || ''] || dbIcons[item.type || ''];

    let style = { icon: MapPin, color: "text-gray-400", bg: "bg-gray-800", iconUrl: customIconUrl };

    if (item.type === 'experience') style = { icon: Tent, color: "text-emerald-400", bg: "bg-emerald-900", iconUrl: customIconUrl };
    else if (item.sourceTable === 'places') {
        if (item.type === 'heritage' || item.type === 'heritage_landmark') style = { icon: Landmark, color: "text-[#C89B3C]", bg: "bg-[#4a3b2a]", iconUrl: customIconUrl };
        else style = { icon: Mountain, color: "text-blue-400", bg: "bg-blue-900", iconUrl: customIconUrl };
    } 
    else if (item.sub_category === 'lodging') style = { icon: BedDouble, color: "text-indigo-400", bg: "bg-indigo-900", iconUrl: customIconUrl };
    else if (item.sub_category === 'food') style = { icon: Utensils, color: "text-orange-400", bg: "bg-orange-900", iconUrl: customIconUrl };
    else if (item.sub_category === 'craft') style = { icon: Box, color: "text-pink-400", bg: "bg-pink-900", iconUrl: customIconUrl };

    return style;
  };

  const handleActionClick = () => {
    if (!selectedLocation || !selectedLocation.id) return;
    if (selectedLocation.sourceTable === 'places') router.push(`/place/${selectedLocation.id}`);
    else router.push(`/service/${selectedLocation.id}`);
  };

  return (
    <main className={`relative h-screen flex flex-col ${tajawal.className} bg-black overflow-hidden`} dir="rtl">
      <video className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-60" src="/hero.mp4" autoPlay muted loop playsInline />
      
      {/* ================== الشعار وزر الرجوع =================== */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3 md:gap-4">
        {/* زر الرجوع الجديد */}
        <button 
          onClick={() => router.push('/')}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white hover:bg-[#C89B3C] hover:text-black hover:border-[#C89B3C] transition-all shadow-lg group"
          title="العودة للرئيسية"
        >
          <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
        </button>
        
        {/* الشعار */}
        <Link href="/" className="block transition hover:opacity-80 hover:scale-105 duration-300">
          <Image src="/logo.png" alt="Sayyir Logo" width={90} height={30} priority className="drop-shadow-xl md:w-[100px]" />
        </Link>
      </div>

      {/* ================== شريط البحث =================== */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 mt-14 md:mt-0">
        <div className="relative group">
            <div className="relative flex items-center bg-black/60 backdrop-blur-xl border border-white/20 rounded-full px-4 h-12 shadow-2xl transition focus-within:bg-black/80 focus-within:border-[#C89B3C]/50">
                <Search className="text-white/50 ml-3" size={20} />
                <input 
                    type="text" 
                    placeholder="ابحث عن معلم، فندق، مطعم..." 
                    className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-white/40 h-full"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="text-white/30 hover:text-white transition">
                        <X size={16} />
                    </button>
                )}
            </div>

            {searchResults.length > 0 && (
                <div className="absolute top-14 left-0 right-0 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {searchResults.map((result) => {
                        const style = getItemStyle(result);
                        const Icon = style.icon;
                        return (
                            <button 
                                key={`${result.sourceTable}-${result.id}`}
                                onClick={() => handleSelectSearchResult(result)}
                                className="w-full text-right flex items-center gap-3 p-3 hover:bg-white/10 transition border-b border-white/5 last:border-0"
                            >
                                <div className={`w-8 h-8 rounded-full ${style.iconUrl ? 'bg-transparent' : style.bg} flex items-center justify-center text-white shrink-0 overflow-hidden`}>
                                    {style.iconUrl ? (
                                        <img src={style.iconUrl} alt="icon" className="w-full h-full object-contain drop-shadow-md" />
                                    ) : (
                                        <Icon size={14} />
                                    )}
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold line-clamp-1">{result.name}</p>
                                    <p className="text-white/40 text-xs">{result.city || result.type}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      <div className="absolute top-4 left-4 z-50 flex flex-col items-start gap-2">
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`h-11 w-11 md:w-auto md:px-4 rounded-full md:rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center gap-2 shadow-lg transition hover:bg-white/20 ${isFilterOpen ? 'bg-[#C89B3C] text-black font-bold' : 'bg-black/60 text-white'}`}
        >
          <Filter size={20} />
          <span className="hidden md:inline text-sm">تصفية</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] hidden md:inline">{filteredItems.length}</span>
        </button>

        {isFilterOpen && (
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-left-4 duration-300 w-[300px] flex flex-col gap-6 mt-14 md:mt-0">
            <div>
                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><MapPin size={14}/> اختر المدينة</h3>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => setSelectedCity('الكل')}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition ${selectedCity === 'الكل' ? 'bg-white text-black border-white' : 'bg-transparent text-white/60 border-white/10 hover:border-white/30'}`}
                    >
                        الكل
                    </button>
                    {citiesList.map(city => (
                        <button 
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition ${selectedCity === city ? 'bg-white text-black border-white' : 'bg-transparent text-white/60 border-white/10 hover:border-white/30'}`}
                        >
                            {city}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-px bg-white/10 w-full"></div>
            <div>
                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Layers size={14}/> اختر التصنيف</h3>
                <div className="grid grid-cols-2 gap-2">
                    {categoryFilters.map(cat => (
                        <button 
                            key={cat.value}
                            onClick={() => setSelectedCategory(cat.value)}
                            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition ${selectedCategory === cat.value ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'bg-transparent text-white/60 border-white/10 hover:border-white/30'}`}
                        >
                            <cat.icon size={14} /> {cat.label}
                            {selectedCategory === cat.value && <Check size={12} className="mr-auto"/>}
                        </button>
                    ))}
                </div>
            </div>
            <button onClick={() => setIsFilterOpen(false)} className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs font-bold transition">
                إغلاق القائمة
            </button>
          </div>
        )}
      </div>

      <div className="relative flex-1 w-full h-full">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12" 
          style={{ width: "100%", height: "100%" }}
          onClick={() => setSelectedLocation(null)}
        >
          <NavigationControl position="bottom-right" style={{ marginBottom: '100px', marginRight: '20px' }} />

          {hoveredLocation && (
            <Popup
              latitude={hoveredLocation.lat}
              longitude={hoveredLocation.lng}
              closeButton={false}
              anchor="bottom"
              offset={25}
              className="z-50 pointer-events-none"
            >
              <div className="bg-black/90 backdrop-blur text-white text-xs p-2 rounded-lg border border-[#C89B3C]/30 shadow-xl min-w-[120px] text-center font-bold">
                  <p className="text-[#C89B3C] mb-1">{hoveredLocation.name}</p>
              </div>
            </Popup>
          )}

          {filteredItems.map((loc) => {
            const style = getItemStyle(loc);
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
                <div 
                    onMouseEnter={() => setHoveredLocation(loc)}
                    onMouseLeave={() => setHoveredLocation(null)}
                    className={`group relative cursor-pointer flex flex-col items-center transition-all duration-300 ${isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-10'}`}
                >
                  {style.iconUrl ? (
                      <img 
                          src={style.iconUrl} 
                          alt={loc.name} 
                          className="w-12 h-12 object-contain drop-shadow-2xl" 
                      />
                  ) : (
                      <>
                          <div className={`w-10 h-10 rounded-full ${style.bg} border-2 border-white/20 text-white flex items-center justify-center shadow-lg relative z-10 overflow-hidden p-1.5`}>
                              <Icon size={18} />
                          </div>
                          <div className={`w-3 h-3 ${style.bg} rotate-45 -mt-1.5 border-r border-b border-white/20`}></div>
                      </>
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
                        <button onClick={() => setSelectedLocation(null)} className="absolute left-4 top-4 text-white/50 hover:text-white transition bg-white/5 rounded-full p-1.5 z-20">
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
                                    <button 
                                      onClick={handleActionClick} 
                                      className="bg-[#C89B3C] text-[#2B1F17] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#b38a35] transition flex items-center gap-1 shadow-lg"
                                    >
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