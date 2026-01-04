"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Hourglass,
  ArrowLeft,
  Loader2
} from "lucide-react";

// تعريف نوع البيانات
interface Booking {
  id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  guests_count: number;
  total_price: string;
  location: {
    id: string;
    name: string;
    type: string;
    image_url: string;
  };
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          location:locations (
            id,
            name,
            type,
            image_url
          )
        `)
        .eq("user_id", session.user.id)
        .order('booking_date', { ascending: false }); // الأحدث أولاً

      if (error) throw error;
      setTrips(data as any);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  // دالة لتصفية الرحلات حسب التبويب المختار
  const filteredTrips = trips.filter((trip) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return trip.status === 'confirmed' || trip.status === 'pending';
    if (filter === 'completed') return trip.status === 'completed';
    if (filter === 'cancelled') return trip.status === 'cancelled';
    return true;
  });

  // دوال مساعدة للتنسيق
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/20"><CheckCircle2 size={14} /> مؤكد</div>;
      case 'pending':
        return <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full text-xs font-bold border border-amber-400/20"><Hourglass size={14} /> قيد الانتظار</div>;
      case 'completed':
        return <div className="flex items-center gap-1 text-gray-400 bg-gray-400/10 px-3 py-1 rounded-full text-xs font-bold border border-gray-400/20"><CheckCircle2 size={14} /> مكتملة</div>;
      case 'cancelled':
        return <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-bold border border-red-400/20"><XCircle size={14} /> ملغية</div>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* العنوان والفلتر */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
             <Calendar className="text-[#C89B3C]" />
             رحلاتي وحجوزاتي
           </h2>
           <p className="text-white/60 text-sm">سجل كامل بجميع زياراتك وحجوزاتك في منصة سيّر.</p>
        </div>

        {/* أزرار الفلترة (Tabs) */}
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}
          >
            الكل
          </button>
          <button 
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'upcoming' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}
          >
            قادمة
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'completed' ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}
          >
            مكتملة
          </button>
        </div>
      </div>

      {/* قائمة الرحلات */}
      {filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
          <Calendar size={48} className="text-white/10 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">لا توجد رحلات في هذا التصنيف</h3>
          <p className="text-white/50 mb-6">لم تقم بأي حجوزات تطابق هذا البحث.</p>
          {filter !== 'all' && (
             <button onClick={() => setFilter('all')} className="text-[#C89B3C] hover:underline">عرض جميع الرحلات</button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((trip) => (
            <div 
              key={trip.id} 
              className="group flex flex-col md:flex-row bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300"
            >
              {/* صورة المكان */}
              <div className="relative w-full md:w-48 h-40 md:h-auto shrink-0">
                <Image 
                  src={trip.location?.image_url || "/logo.png"} 
                  alt={trip.location?.name || "مكان"} 
                  fill 
                  className="object-cover group-hover:scale-105 transition duration-700"
                />
              </div>

              {/* التفاصيل */}
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{trip.location?.name}</h3>
                    <div className="flex items-center gap-4 text-white/60 text-sm">
                      <span className="flex items-center gap-1"><MapPin size={14} className="text-[#C89B3C]" /> عسير</span>
                      <span className="flex items-center gap-1"><Users size={14} /> {trip.guests_count} ضيوف</span>
                    </div>
                  </div>
                  {getStatusBadge(trip.status)}
                </div>

                <div className="flex items-end justify-between border-t border-white/5 pt-4 mt-2">
                  <div className="flex items-center gap-2 text-white/80">
                     <Clock size={16} className="text-[#C89B3C]" />
                     <span className="text-sm font-medium">
                       {new Date(trip.booking_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                     </span>
                  </div>
                  
                  <Link href={`/place/${trip.location?.id}`}>
                    <button className="flex items-center gap-2 text-sm text-white hover:text-[#C89B3C] transition">
                      عرض التفاصيل <ArrowLeft size={16} />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}