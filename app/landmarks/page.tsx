"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { MapPin, ArrowRight, Loader2, Mountain, Landmark, Camera } from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function LandmarksPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setPlaces(data);
    setLoading(false);
  };

  const filteredPlaces = filter === 'all' ? places : places.filter(place => place.type === filter);

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`}>
      
      {/* HEADER SECTION */}
      <div className="relative h-[45vh] w-full flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
        {/* ✅ تم استبدال الصورة المكسورة بالشعار */}
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
          <button onClick={() => setFilter('tourist')} className={`px-6 py-2 rounded-full transition flex items-center gap-2 text-sm font-bold ${filter === 'tourist' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}><Mountain size={16} /> طبيعة</button>
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
            {filteredPlaces.map((place) => (<LandmarkCard key={place.id} data={place} />))}
          </div>
        )}
      </div>
    </main>
  );
}

function LandmarkCard({ data }: { data: any }) {
  const isHeritage = data.type === 'heritage';
  return (
    <Link href={`/place/${data.id}`} className="block h-full">
      <div className="group h-full relative bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/20 hover:border-[#C89B3C]/40">
        <div className="relative h-72 w-full overflow-hidden">
          <Image src={data.media_urls && data.media_urls[0] ? data.media_urls[0] : "/placeholder.jpg"} alt={data.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110"/>
          <div className="absolute top-4 left-4 backdrop-blur-md bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
            {isHeritage ? <Landmark size={14} className="text-amber-400"/> : <Mountain size={14} className="text-emerald-400"/>}
            <span className="text-xs font-bold text-white">{isHeritage ? 'تراثي' : 'سياحي'}</span>
          </div>
          <div className="absolute top-4 right-4 bg-[#C89B3C] text-black p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"><Camera size={18} /></div>
        </div>
        <div className="p-6 relative -mt-10">
          <div className="bg-[#252525] backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-xl">
             <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition">{data.name}</h3>
             <div className="flex items-center gap-1 text-white/50 text-xs mb-3"><MapPin size={14} /><span>عسير، السعودية</span></div>
          </div>
        </div>
      </div>
    </Link>
  );
}