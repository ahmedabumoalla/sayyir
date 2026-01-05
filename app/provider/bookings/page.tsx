"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Calendar, User, Clock, CheckCircle, XCircle } from "lucide-react";

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(!session) return;

        // 1. جلب خدمات المزود
        const { data: myServices } = await supabase.from('services').select('id, title').eq('provider_id', session.user.id);
        const serviceIds = myServices?.map(s => s.id) || [];

        if (serviceIds.length > 0) {
            // 2. جلب الحجوزات لهذه الخدمات
            const { data } = await supabase.from('bookings')
                .select('*, profiles:user_id(full_name, phone)')
                .in('service_id', serviceIds)
                .order('booking_date', { ascending: false });
            
            // دمج اسم الخدمة مع الحجز
            const enrichedBookings = data?.map(b => ({
                ...b,
                service_title: myServices?.find(s => s.id === b.service_id)?.title
            }));
            
            if (enrichedBookings) setBookings(enrichedBookings);
        }
        setLoading(false);
    };
    fetchBookings();
  }, []);

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white mb-6">إدارة الحجوزات</h1>
        {loading ? <p className="text-[#C89B3C]">جاري التحميل...</p> : bookings.length === 0 ? <p className="text-white/40">لا توجد حجوزات.</p> : (
            <div className="grid gap-4">
                {bookings.map(booking => (
                    <div key={booking.id} className="bg-[#252525] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="bg-white/10 p-3 rounded-full text-[#C89B3C]"><Calendar size={24}/></div>
                            <div>
                                <h4 className="font-bold text-white">{booking.service_title}</h4>
                                <p className="text-white/50 text-sm flex items-center gap-2"><User size={12}/> {booking.profiles?.full_name} ({booking.profiles?.phone})</p>
                                <p className="text-white/50 text-sm flex items-center gap-2"><Clock size={12}/> {booking.booking_date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${booking.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {booking.status === 'confirmed' ? 'مؤكد' : booking.status}
                            </span>
                            {/* أزرار قبول/رفض */}
                            {booking.status === 'pending' && (
                                <>
                                    <button className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"><CheckCircle size={18}/></button>
                                    <button className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition"><XCircle size={18}/></button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}