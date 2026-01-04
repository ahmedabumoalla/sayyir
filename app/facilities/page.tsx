"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { MapPin, Star, User, ArrowRight, Loader2, Utensils, BedDouble } from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    const { data, error } = await supabase
      .from('services')
      .select(`*, profiles:provider_id (full_name, avatar_url)`)
      .in('service_type', ['accommodation', 'food'])
      .eq('status', 'approved');

    if (data) setFacilities(data);
    setLoading(false);
  };

  const filteredData = filter === 'all' 
    ? facilities 
    : facilities.filter(item => item.service_type === filter);

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER SECTION */}
      <div className="relative h-[40vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        {/* ✅ تم استبدال الصورة المكسورة بالشعار */}
        <Image 
          src="/logo.png" 
          alt="Sayyir Logo" 
          fill 
          className="object-contain p-20 opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-[#0a0a0a]" />
        
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">المرافق والخدمات</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            أفضل خيارات الإقامة والمطاعم الفاخرة لتكمل رحلتك في عسير.
          </p>
        </div>
        
        <Link href="/" className="absolute top-8 right-8 z-20 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition">
           <ArrowRight className="text-white" />
        </Link>
      </div>

      {/* FILTER TABS */}
      <div className="container mx-auto px-4 mt-8 flex justify-center gap-4">
        <button onClick={() => setFilter('all')} className={`px-6 py-2 rounded-full border transition ${filter === 'all' ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'border-white/20 text-white/60 hover:border-white'}`}>الكل</button>
        <button onClick={() => setFilter('accommodation')} className={`px-6 py-2 rounded-full border transition flex items-center gap-2 ${filter === 'accommodation' ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'border-white/20 text-white/60 hover:border-white'}`}><BedDouble size={18} /> سكن</button>
        <button onClick={() => setFilter('food')} className={`px-6 py-2 rounded-full border transition flex items-center gap-2 ${filter === 'food' ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'border-white/20 text-white/60 hover:border-white'}`}><Utensils size={18} /> مطاعم</button>
      </div>

      {/* CARDS GRID */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center h-40 items-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10"><p className="text-white/30">لا توجد خدمات متاحة حالياً</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredData.map((item) => (<FacilityCard key={item.id} data={item} />))}
          </div>
        )}
      </div>
    </main>
  );
}

function FacilityCard({ data }: { data: any }) {
  const isFood = data.service_type === 'food';
  return (
    <div className="group relative bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/10 hover:border-[#C89B3C]/30">
      <div className="relative h-64 w-full overflow-hidden">
        <Image src={data.images && data.images[0] ? data.images[0] : "/placeholder.jpg"} alt={data.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110"/>
        <div className={`absolute top-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold ${isFood ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
           {isFood ? <Utensils size={14} /> : <BedDouble size={14} />}
           <span>{isFood ? 'مطعم' : 'سكن'}</span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
           <h3 className="text-xl font-bold group-hover:text-[#C89B3C] transition">{data.title}</h3>
           <span className="text-[#C89B3C] font-bold text-lg">{data.price} ﷼</span>
        </div>
        <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-[#C89B3C] hover:text-[#2B1F17] transition-all mt-4">
          {isFood ? 'احجز طاولة' : 'عرض الغرف'}
        </button>
      </div>
    </div>
  );
}