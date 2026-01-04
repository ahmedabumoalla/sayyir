"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";

interface ItemData {
  id: string;
  title: string;
  description: string;
  images: string[];
  location: string;
  price?: number;
  type?: string;
}

interface DynamicShowcaseProps {
  title: string;
  linkHref: string;
  data: any[]; 
  dataType: "places" | "services"; 
}

export default function DynamicShowcase({ title, linkHref, data, dataType }: DynamicShowcaseProps) {
  // حماية من البيانات الفارغة
  if (!data || !Array.isArray(data)) return null;

  const formattedData: ItemData[] = data.map((item) => ({
    id: item.id,
    title: dataType === "places" ? item.name : item.title,
    description: item.description,
    images: dataType === "places" ? (item.media_urls || []) : (item.images || []),
    location: "عسير",
    price: item.price,
    type: dataType === "places" ? item.type : item.service_type,
  }));

  const [visibleItems, setVisibleItems] = useState<ItemData[]>([]);

  useEffect(() => {
    if (formattedData.length === 0) return;
    setVisibleItems(formattedData.slice(0, 3)); 

    const interval = setInterval(() => {
      setVisibleItems((prev) => {
        if (formattedData.length > 0) {
            formattedData.push(formattedData.shift()!); 
            return [...formattedData.slice(0, 3)]; 
        }
        return prev;
      });
    }, 10000); 
    return () => clearInterval(interval);
  }, [data]);

  if (formattedData.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-8 px-2" dir="rtl">
        <h2 className="text-3xl font-bold text-white border-r-4 border-[#C89B3C] pr-4">
          {title}
        </h2>
        <Link href={linkHref} className="group flex items-center gap-2 text-[#C89B3C] hover:text-white transition-colors duration-300">
          <span className="text-sm font-bold">عرض الكل</span>
          <div className="p-1 rounded-full border border-[#C89B3C]/30 group-hover:border-white/50 transition">
             <ArrowRight size={14} className="group-hover:-translate-x-1 transition-transform rotate-180" />
          </div>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
        {visibleItems.map((item, index) => (
          <ShowcaseCard key={`${item.id}-${index}`} item={item} linkBase={dataType === 'places' ? '/place' : dataType === 'services' && item.type === 'experience' ? '/experiences' : '/facilities'} />
        ))}
      </div>
    </div>
  );
}

function ShowcaseCard({ item, linkBase }: { item: ItemData, linkBase: string }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  useEffect(() => {
    if (!item.images || item.images.length <= 1) return;
    const interval = setInterval(() => setCurrentImageIndex((prev) => (prev + 1) % item.images.length), 7000); 
    return () => clearInterval(interval);
  }, [item.images]);

  // تحديد الرابط الصحيح
  const finalLink = item.type === 'experience' ? '/experiences' : 
                    (item.type === 'accommodation' || item.type === 'food') ? '/facilities' : 
                    `/place/${item.id}`;

  return (
    <Link href={finalLink} className="block h-full">
      <div className="group h-96 relative bg-[#1a1a1a] rounded-[2rem] overflow-hidden border border-white/10 transition-all duration-700 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/10">
        <div className="relative h-full w-full">
          {item.images.length > 0 ? item.images.map((img, idx) => (
              <Image key={idx} src={img} alt={item.title} fill className={`object-cover transition-opacity duration-1000 ${idx === currentImageIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"}`} />
            )) : <Image src="/placeholder.jpg" alt="Placeholder" fill className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-right">
            <h3 className="text-xl font-bold text-white group-hover:text-[#C89B3C] transition">{item.title}</h3>
            <div className="flex items-center gap-1 text-white/60 text-xs mt-2"><MapPin size={14} className="text-[#C89B3C]" /><span>{item.location}</span></div>
        </div>
      </div>
    </Link>
  );
}