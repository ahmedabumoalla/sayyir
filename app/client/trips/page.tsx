"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  Calendar, MapPin, Clock, Users, CheckCircle2, XCircle, Hourglass, ArrowLeft, Loader2
} from "lucide-react";

interface Booking {
  id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  guests_count: number;
  total_price: string;
  services: {
    id: string;
    title: string;
    description: string;
    price: number;
    // يمكن إضافة image_url إذا توفرت
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

      // جلب الحجوزات مع تفاصيل الخدمة
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          services:service_id (
            id, title, description, price
          )
        `)
        .eq("user_id", session.user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setTrips(data as any);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = trips.filter((trip) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return trip.status === 'confirmed' || trip.status === 'pending';
    if (filter === 'completed') return trip.status === 'completed';
    if (filter === 'cancelled') return trip.status === 'cancelled';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/20"><CheckCircle2 size={14} /> مؤكد</div>;
      case 'pending': return <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full text-xs font-bold border border-amber-400/20"><Hourglass size={14} /> قيد الانتظار</div>;
      case 'completed': return <div className="flex items-center gap-1 text-gray-400 bg-gray-400/10 px-3 py-1 rounded-full text-xs font-bold border border-gray-400/20"><CheckCircle2 size={14} /> مكتملة</div>;
      case 'cancelled': return <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-bold border border-red-400/20"><XCircle size={14} /> ملغية</div>;
      default: return null;
    }
  };

  if (loading) return <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Calendar className="text-[#C89B3C]" /> رحلاتي وحجوزاتي</h2>
           <p className="text-white/60 text-sm">سجل كامل بجميع زياراتك وحجوزاتك.</p>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
          {['all', 'upcoming', 'completed'].map(f => (
             <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-[#C89B3C] text-[#2B1F17]' : 'text-white/60 hover:text-white'}`}>
                {f === 'all' ? 'الكل' : f === 'upcoming' ? 'قادمة' : 'سابقة'}
             </button>
          ))}
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
          <Calendar size={48} className="text-white/10 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">لا توجد رحلات</h3>
          <p className="text-white/50 mb-6">لم تقم بأي حجوزات تطابق هذا البحث.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((trip) => (
            <div key={trip.id} className="group flex flex-col md:flex-row bg-[#252525] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#C89B3C]/30">
              {/* صورة (افتراضية أو من الخدمة) */}
              <div className="relative w-full md:w-48 h-40 md:h-auto shrink-0 bg-black/20 flex items-center justify-center">
                 <Image src="/logo.png" alt="Service" width={80} height={40} className="opacity-50" />
              </div>

              <div className="flex-1 p-5 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{trip.services?.title || "حجز خدمة"}</h3>
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
                  <div className="text-sm font-bold text-[#C89B3C]">{trip.total_price} ريال</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}