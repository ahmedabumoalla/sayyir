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
  Tent, Landmark, Mountain, Box, MapPin, Check
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

  const [viewState, setViewState] = useState({
    latitude: 18.216,
    longitude: 42.505,
    zoom: 10
  });
  
  // تصنيفات ثابتة للنوع
  const categoryFilters = [
    { label: 'الكل', value: 'الكل', icon: Layers },
    { label: 'معالم', value: 'places', icon: Landmark }, // يشمل التراثي والسياحي
    { label: 'مرافق', value: 'facilities', icon: Utensils }, // يشمل السكن والمطاعم والحرف
    { label: 'تجارب', value: 'experience', icon: Tent },
  ];

  useEffect(() => {
    fetchAllData();
    fetchCities();
  }, []);

  // جلب المدن من قاعدة البيانات
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

  // ✅ منطق الفلترة المزدوج (مدينة + تصنيف)
  useEffect(() => {
    let result = items;

    // 1. فلترة المدينة
    if (selectedCity !== 'الكل') {
        result = result.filter(item => item.city === selectedCity);
    }

    // 2. فلترة التصنيف
    if (selectedCategory !== 'الكل') {
        if (selectedCategory === 'places') {
            // المعالم فقط (جدول places) بس نستثني التجارب عشان تروح لفلتر التجارب
            result = result.filter(item => item.sourceTable === 'places' && item.type !== 'experience');
        } else if (selectedCategory === 'experience') {
            // التجارب فقط (من الأدمن أو المزود)
            result = result.filter(item => item.type === 'experience');
        } else if (selectedCategory === 'facilities') {
            // المرافق (خدمات ليست تجارب)
            result = result.filter(item => item.sourceTable === 'services' && item.type !== 'experience');
        }
    }

    setFilteredItems(result);
  }, [selectedCity, selectedCategory, items]);

  // ✅ تعديل منطق الأيقونات لإصلاح مشكلة التجارب
  const getItemStyle = (item: MapItem) => {
    // 1. الأولوية للتجارب (سواء من الأدمن أو المزود)
    if (item.type === 'experience') {
        return { icon: Tent, color: "text-emerald-400", bg: "bg-emerald-900" };
    }

    // 2. ثم نفحص المصدر
    if (item.sourceTable === 'places') {
        if (item.type === 'heritage') return { icon: Landmark, color: "text-[#C89B3C]", bg: "bg-[#4a3b2a]" };
        // الباقي معالم سياحية
        return { icon: Mountain, color: "text-blue-400", bg: "bg-blue-900" };
    } 
    
    // 3. باقي خدمات المزودين
    if (item.sub_category === 'lodging') return { icon: BedDouble, color: "text-indigo-400", bg: "bg-indigo-900" };
    if (item.sub_category === 'food') return { icon: Utensils, color: "text-orange-400", bg: "bg-orange-900" };
    if (item.sub_category === 'craft') return { icon: Box, color: "text-pink-400", bg: "bg-pink-900" };
    
    return { icon: MapPin, color: "text-gray-400", bg: "bg-gray-800" };
  };

  const handleActionClick = () => {
    if (!selectedLocation || !selectedLocation.id) return;
    if (selectedLocation.sourceTable === 'places') router.push(`/place/${selectedLocation.id}`);
    else router.push(`/service/${selectedLocation.id}`);
  };

  return (
    <main className={`relative h-screen flex flex-col ${tajawal.className} bg-black overflow-hidden`} dir="rtl">
      <video className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-60" src="/hero.mp4" autoPlay muted loop playsInline />
      
      <div className="absolute top-4 right-4 z-50">
        <Link href="/" className="block transition hover:opacity-80 hover:scale-105 duration-300">
          <Image src="/logo.png" alt="Sayyir Logo" width={100} height={35} priority className="drop-shadow-xl" />
        </Link>
      </div>

      {/* ✅ زر الفلتر والبطاقة المنبثقة */}
      <div className="absolute top-4 left-4 z-50 flex flex-col items-start gap-2">
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`h-12 px-4 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-2 shadow-lg transition hover:bg-white/20 ${isFilterOpen ? 'bg-[#C89B3C] text-black font-bold' : 'bg-black/60 text-white'}`}
        >
          <Filter size={20} />
          <span>تصفية الخريطة</span>
          {/* عرض عدد النتائج */}
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs ml-1">{filteredItems.length}</span>
        </button>

        {isFilterOpen && (
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-left-4 duration-300 w-[300px] flex flex-col gap-6">
            
            {/* 1. قسم المدن */}
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

            {/* 2. قسم التصنيف */}
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

            {/* زر إغلاق / تطبيق */}
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