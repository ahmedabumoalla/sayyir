"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
  Search, MapPin, Filter, Star, Loader2, Home, Utensils, Mountain, ArrowLeft, Clock, CalendarDays 
} from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

// مكون المحتوى الرئيسي (مفصول لدعم Suspense)
function ServicesContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') || 'all';

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // الفلاتر
  const [filterType, setFilterType] = useState(initialType);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetchServices();
    fetchCities();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    // جلب الخدمات المعتمدة فقط
    const { data, error } = await supabase
      .from("services")
      .select(`*, profiles:provider_id(full_name, is_approved)`)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (!error && data) setServices(data);
    setLoading(false);
  };

  const fetchCities = async () => {
      const { data } = await supabase.from('cities').select('name');
      if(data) setCities(data.map(c => c.name));
  };

  // تصفية البيانات
  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || 
                        (filterType === 'facilities' ? ['housing', 'food'].includes(service.service_type) : service.service_type === filterType) ||
                        (filterType === 'experiences' && service.service_type === 'experience');
    
    // فلترة مؤقتة للمدينة بناء على النص إذا لم يكن هناك عمود مخصص
    const matchesCity = cityFilter === 'all' || JSON.stringify(service).includes(cityFilter);

    return matchesSearch && matchesType && matchesCity;
  });

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
        
        {/* === Header & Filters === */}
        <div className="flex flex-col gap-8 mb-12">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">اكتشف عسير</h1>
                <p className="text-white/60 max-w-2xl mx-auto">تصفح أفضل أماكن الإقامة، المطاعم، والتجارب السياحية الفريدة.</p>
            </div>

            <div className="bg-[#1E1E1E] p-4 rounded-3xl border border-white/5 shadow-2xl flex flex-col md:flex-row gap-4 items-center">
                {/* البحث */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-4 top-3.5 text-white/40" size={20}/>
                    <input 
                        type="text" 
                        placeholder="ابحث عن خدمة، مكان..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pr-12 pl-4 text-white focus:border-[#C89B3C] outline-none transition"
                    />
                </div>

                {/* فلتر النوع */}
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
                    {[
                        { id: 'all', label: 'الكل' },
                        { id: 'housing', label: 'سكن', icon: Home },
                        { id: 'food', label: 'مأكولات', icon: Utensils },
                        { id: 'experience', label: 'تجارب', icon: Mountain },
                    ].map((type) => (
                        <button 
                            key={type.id}
                            onClick={() => setFilterType(type.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${filterType === type.id ? 'bg-[#C89B3C] text-[#2B1F17]' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                        >
                            {type.icon && <type.icon size={16}/>}
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* فلتر المدينة */}
                <div className="relative w-full md:w-48">
                    <MapPin className="absolute right-3 top-3.5 text-white/40" size={18}/>
                    <select 
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pr-10 pl-4 text-white appearance-none focus:border-[#C89B3C] outline-none cursor-pointer"
                    >
                        <option value="all">كل المدن</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {/* === Services Grid === */}
        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-12 h-12"/></div>
        ) : filteredServices.length === 0 ? (
            <div className="text-center py-20 text-white/40 border border-white/10 rounded-3xl border-dashed bg-white/5">
                <Filter size={48} className="mx-auto mb-4 opacity-50"/>
                <p>لا توجد نتائج تطابق بحثك.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredServices.map((service) => {
                    const image = service.details?.images?.[0] || "/placeholder.jpg";
                    
                    // ✅ التحقق الذكي من التوفر بناءً على المنطق الذي اتفقنا عليه
                    const isLimitedCapacity = service?.service_category === 'experience' && service?.sub_category !== 'event';
                    const isSoldOut = isLimitedCapacity ? (service.max_capacity === null || service.max_capacity <= 0) : false;

                    return (
                        <Link href={`/service/${service.id}`} key={service.id} className="group bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/5 hover:border-[#C89B3C]/50 transition duration-500 hover:-translate-y-2 shadow-lg flex flex-col">
                            <div className="relative h-64 overflow-hidden">
                                <Image src={image} alt={service.title} fill className="object-cover group-hover:scale-110 transition duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent opacity-80" />
                                
                                <div className="absolute top-4 left-4 flex flex-col gap-2">
                                    <span className="bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1 w-fit">
                                        <Star size={12} className="text-yellow-400 fill-yellow-400"/> 4.8
                                    </span>
                                </div>

                                <div className="absolute top-4 right-4">
                                    {isSoldOut ? (
                                        <span className="bg-red-500/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">نفذت المقاعد</span>
                                    ) : (
                                        <span className="bg-[#C89B3C]/90 backdrop-blur-md text-[#2B1F17] text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                                            {service.price === 0 ? 'مجاني' : `${service.price} ﷼`}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex items-center gap-2 mb-2 text-xs text-[#C89B3C] font-bold uppercase tracking-wider">
                                    {service.service_type === 'housing' ? <Home size={14}/> : service.service_type === 'food' ? <Utensils size={14}/> : <Mountain size={14}/>}
                                    {service.service_type === 'housing' ? 'سكن' : service.service_type === 'food' ? 'مطاعم' : 'تجارب'}
                                </div>
                                
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-[#C89B3C] transition">{service.title}</h3>
                                <p className="text-white/50 text-sm mb-4 line-clamp-2 leading-relaxed">{service.description}</p>
                                
                                {/* ✅ إضافة أيقونات سريعة تخبر العميل بنوع الجدولة الموجودة دون زحمة */}
                                <div className="flex items-center gap-3 mb-4 mt-auto">
                                    {service.work_hours?.length > 0 && (
                                        <span className="text-xs text-white/40 flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Clock size={12}/> أوقات عمل</span>
                                    )}
                                    {service.details?.sessions?.length > 0 && (
                                        <span className="text-xs text-white/40 flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><CalendarDays size={12}/> مواعيد متاحة</span>
                                    )}
                                </div>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white font-bold">
                                            {service.profiles?.full_name?.charAt(0)}
                                        </div>
                                        <span className="text-xs text-white/60">{service.profiles?.full_name}</span>
                                    </div>
                                    <span className="text-xs text-[#C89B3C] flex items-center gap-1 group-hover:translate-x-[-5px] transition duration-300 font-bold">
                                        التفاصيل <ArrowLeft size={12}/>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <main dir="rtl" className={`min-h-screen bg-[#121212] text-white ${tajawal.className}`}>
      {/* Header بسيط للصفحة */}
      <header className="sticky top-0 z-50 bg-[#121212]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center shadow-lg">
         <Link href="/" className="flex items-center gap-2 text-white hover:text-[#C89B3C] transition">
            <ArrowLeft size={20} className="rotate-180" />
            <span className="font-bold">الرئيسية</span>
         </Link>
         <Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90"/>
         <div className="w-20"></div> {/* Spacer for center alignment */}
      </header>

      <Suspense fallback={<div className="h-screen flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10"/></div>}>
         <ServicesContent />
      </Suspense>
    </main>
  );
}