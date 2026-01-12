"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Clock, CheckCircle, XCircle, AlertCircle, Calendar, 
  User, MapPin, DollarSign, FileText, ChevronLeft, 
  Loader2, Filter, Send, X, ShieldAlert, Receipt
} from "lucide-react";
import Image from "next/image";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // حالات الإجراءات
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // ✅ تم إزالة phone_number لأنه غير موجود في الجدول ويسبب الخطأ
    let query = supabase
      .from('bookings')
      .select(`
        *,
        profiles:user_id (full_name, email, avatar_url),
        services:service_id (title, location_lat, location_lng, duration)
      `)
      .eq('provider_id', session.user.id)
      .order('created_at', { ascending: false });

    // الفلترة
    if (filter === 'pending') query = query.eq('status', 'pending');
    if (filter === 'active') query = query.in('status', ['confirmed', 'approved_unpaid']);
    if (filter === 'history') query = query.in('status', ['rejected', 'cancelled', 'expired', 'completed']);

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching bookings:", error);
        // alert("خطأ في جلب الحجوزات: " + error.message); // للتجربة فقط
    }
    if (data) setBookings(data);
    setLoading(false);
  };

  // ✅ 1. منطق الموافقة وإصدار الفاتورة
  const handleApprove = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);

    try {
        const now = new Date();
        const executionDate = selectedBooking.execution_date ? new Date(selectedBooking.execution_date) : null;
        let expiresAt = new Date();

        if (executionDate) {
            const diffInHours = (executionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (diffInHours <= 3 && diffInHours > 0) {
                expiresAt.setHours(expiresAt.getHours() + 1);
            } else {
                expiresAt.setHours(expiresAt.getHours() + 24);
            }
        } else {
            expiresAt.setHours(expiresAt.getHours() + 24);
        }

        const { error } = await supabase
            .from('bookings')
            .update({
                status: 'approved_unpaid',
                expires_at: expiresAt.toISOString()
            })
            .eq('id', selectedBooking.id);

        if (error) throw error;

        await fetch('/api/emails/send', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                type: 'booking_approved_invoice',
                email: selectedBooking.profiles?.email,
                clientName: selectedBooking.profiles?.full_name,
                serviceTitle: selectedBooking.services?.title,
                amount: selectedBooking.total_price,
                expiryTime: expiresAt.toLocaleString('ar-SA'),
                bookingId: selectedBooking.id
            })
        });

        alert("✅ تم قبول الطلب وإرسال الفاتورة للعميل.");
        setSelectedBooking(null);
        fetchBookings();

    } catch (err: any) {
        alert("خطأ: " + err.message);
    } finally {
        setActionLoading(false);
    }
  };

  // ✅ 2. منطق الرفض
  const handleReject = async () => {
    if (!selectedBooking || !rejectReason) return alert("الرجاء كتابة سبب الرفض");
    setActionLoading(true);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'rejected',
                rejection_reason: rejectReason
            })
            .eq('id', selectedBooking.id);

        if (updateError) throw updateError;

        const { error: adminError } = await supabase
            .from('admin_notifications')
            .insert([{
                booking_id: selectedBooking.id,
                type: 'booking_rejected',
                message: `قام المزود برفض الحجز رقم #${selectedBooking.id.slice(0,6)}`,
                provider_name: session?.user?.user_metadata?.full_name || 'مزود خدمة',
                details: { reason: rejectReason, service: selectedBooking.services?.title }
            }]);
        
        if (adminError) console.error("Admin notification failed", adminError);

        await fetch('/api/emails/send', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                type: 'booking_rejected_notification',
                clientEmail: selectedBooking.profiles?.email,
                adminEmail: 'admin@sayyir.sa',
                serviceTitle: selectedBooking.services?.title,
                reason: rejectReason
            })
        });

        alert("تم رفض الطلب.");
        setShowRejectModal(false);
        setSelectedBooking(null);
        setRejectReason("");
        fetchBookings();

    } catch (err: any) {
        alert("خطأ: " + err.message);
    } finally {
        setActionLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 ${tajawal.className}`}>
      
      <div className="flex justify-between items-end mb-8">
         <div>
             <h1 className="text-3xl font-bold text-white mb-2">إدارة الحجوزات</h1>
             <p className="text-white/50 text-sm">تابع الطلبات الواردة واتخذ الإجراءات.</p>
         </div>
      </div>

      <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto pb-2">
          {[{k:'pending', l:'طلبات جديدة', i: AlertCircle}, {k:'active', l:'نشطة / بانتظار الدفع', i: Clock}, {k:'history', l:'السجل السابق', i: FileText}].map(tab => (
              <button 
                key={tab.k} 
                onClick={() => setFilter(tab.k)} 
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl transition relative ${filter === tab.k ? 'text-[#C89B3C] bg-white/5' : 'text-white/50 hover:text-white'}`}
              >
                  <tab.i size={18}/> 
                  <span className="font-bold">{tab.l}</span>
                  {filter === tab.k && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C89B3C]"/>}
              </button>
          ))}
      </div>

      {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C]" size={40}/></div>
      ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
              <FileText size={48} className="mx-auto text-white/20 mb-4"/>
              <p className="text-white/40">لا توجد حجوزات في هذه القائمة.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.map(bookingItem => (
                  <div key={bookingItem.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 hover:border-[#C89B3C]/50 transition group relative">
                      
                      <div className={`absolute top-4 left-4 px-2 py-1 rounded text-[10px] font-bold ${
                          bookingItem.status === 'pending' ? 'bg-yellow-500 text-black' :
                          bookingItem.status === 'approved_unpaid' ? 'bg-blue-500 text-white' :
                          bookingItem.status === 'confirmed' ? 'bg-emerald-500 text-black' :
                          'bg-red-500/20 text-red-400'
                      }`}>
                          {bookingItem.status === 'pending' ? 'طلب جديد' : 
                           bookingItem.status === 'approved_unpaid' ? 'بانتظار دفع العميل' :
                           bookingItem.status === 'confirmed' ? 'مؤكد ومدفوع' : 
                           bookingItem.status === 'rejected' ? 'مرفوض' : 'ملغي/منتهي'}
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden relative">
                              {bookingItem.profiles?.avatar_url ? (
                                  <Image src={bookingItem.profiles.avatar_url} fill alt="Client" className="object-cover"/>
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#C89B3C] font-bold"><User/></div>
                              )}
                          </div>
                          <div>
                              <p className="font-bold text-white text-sm">{bookingItem.profiles?.full_name || "عميل"}</p>
                              <p className="text-xs text-white/50 dir-ltr">{new Date(bookingItem.created_at).toLocaleDateString('ar-SA')}</p>
                          </div>
                      </div>

                      <div className="space-y-3 mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                          <div className="flex justify-between text-xs">
                              <span className="text-white/50">الخدمة:</span>
                              <span className="text-white font-bold">{bookingItem.services?.title}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                              <span className="text-white/50">التاريخ:</span>
                              <span className="text-[#C89B3C] font-mono">{bookingItem.booking_date || bookingItem.execution_date?.split('T')[0] || '-'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                              <span className="text-white/50">العدد:</span>
                              <span className="text-white">{bookingItem.quantity} أشخاص</span>
                          </div>
                          <div className="flex justify-between text-xs pt-2 border-t border-white/10">
                              <span className="text-white/50">الإجمالي:</span>
                              <span className="text-xl font-bold text-[#C89B3C] font-mono">{bookingItem.total_price} ﷼</span>
                          </div>
                      </div>

                      <button 
                        onClick={() => setSelectedBooking(bookingItem)}
                        className="w-full py-3 bg-white/5 hover:bg-[#C89B3C] hover:text-black rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                      >
                          <FileText size={16}/> عرض التفاصيل واتخاذ إجراء
                      </button>
                  </div>
              ))}
          </div>
      )}

      {/* --- Full Details Modal --- */}
      {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-[#1e1e1e] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                  
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
                      <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              {selectedBooking.status === 'pending' ? <AlertCircle className="text-yellow-500"/> : <FileText className="text-[#C89B3C]"/>}
                              تفاصيل الحجز #{selectedBooking.id.slice(0,6)}
                          </h2>
                      </div>
                      <button onClick={() => { setSelectedBooking(null); setShowRejectModal(false); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><X size={20}/></button>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                      
                      <div className="flex items-center gap-4 bg-black/30 p-4 rounded-xl border border-white/5">
                           <div className="w-14 h-14 rounded-full bg-white/10 overflow-hidden relative">
                              {selectedBooking.profiles?.avatar_url ? <Image src={selectedBooking.profiles.avatar_url} fill alt="Client" className="object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[#C89B3C]"><User/></div>}
                           </div>
                           <div>
                               <p className="text-white font-bold">{selectedBooking.profiles?.full_name}</p>
                               <p className="text-white/50 text-sm">{selectedBooking.profiles?.email}</p>
                               {/* تم إخفاء رقم الهاتف لأنه غير موجود حالياً في قاعدة البيانات */}
                           </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-4 rounded-xl">
                              <p className="text-xs text-white/50 mb-1">الخدمة المطلوبة</p>
                              <p className="font-bold text-sm">{selectedBooking.services?.title}</p>
                          </div>
                          <div className="bg-white/5 p-4 rounded-xl">
                              <p className="text-xs text-white/50 mb-1">توقيت التجربة</p>
                              {/* ✅ تم تصحيح الخطأ هنا: استخدام selectedBooking بدلاً من booking */}
                              <p className="font-bold text-sm font-mono text-[#C89B3C]">{selectedBooking.execution_date ? new Date(selectedBooking.execution_date).toLocaleString('ar-SA') : (selectedBooking.booking_date || 'غير محدد')}</p>
                          </div>
                          <div className="bg-white/5 p-4 rounded-xl">
                              <p className="text-xs text-white/50 mb-1">العدد المطلوب</p>
                              <p className="font-bold text-sm">{selectedBooking.quantity} أشخاص</p>
                          </div>
                          <div className="bg-white/5 p-4 rounded-xl">
                              <p className="text-xs text-white/50 mb-1">الإجمالي المستحق</p>
                              <p className="font-bold text-xl font-mono text-emerald-400">{selectedBooking.total_price} ﷼</p>
                          </div>
                      </div>

                      {selectedBooking.notes && (
                          <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                              <p className="text-yellow-500 text-xs font-bold mb-2">ملاحظات العميل:</p>
                              <p className="text-white/80 text-sm">{selectedBooking.notes}</p>
                          </div>
                      )}

                      {selectedBooking.status === 'approved_unpaid' && selectedBooking.expires_at && (
                          <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex items-center gap-3">
                              <Clock className="text-blue-400"/>
                              <div>
                                  <p className="text-blue-400 font-bold text-sm">بانتظار الدفع</p>
                                  <p className="text-white/60 text-xs">تنتهي صلاحية الفاتورة في: <span className="text-white font-mono dir-ltr">{new Date(selectedBooking.expires_at).toLocaleString('ar-SA')}</span></p>
                              </div>
                          </div>
                      )}

                      {selectedBooking.status === 'rejected' && selectedBooking.rejection_reason && (
                          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                              <p className="text-red-400 font-bold text-xs mb-1">سبب الرفض:</p>
                              <p className="text-white text-sm">{selectedBooking.rejection_reason}</p>
                          </div>
                      )}

                  </div>

                  {selectedBooking.status === 'pending' && (
                      <div className="p-6 border-t border-white/10 bg-[#151515] rounded-b-3xl">
                          {!showRejectModal ? (
                              <div className="flex gap-4">
                                  <button 
                                    onClick={handleApprove} 
                                    disabled={actionLoading}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                                  >
                                      {actionLoading ? <Loader2 className="animate-spin"/> : <><Receipt size={20}/> قبول وإصدار الفاتورة</>}
                                  </button>
                                  <button 
                                    onClick={() => setShowRejectModal(true)} 
                                    className="flex-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/50 font-bold py-3.5 rounded-xl transition"
                                  >
                                      رفض الطلب
                                  </button>
                              </div>
                          ) : (
                              <div className="animate-in fade-in slide-in-from-bottom-2">
                                  <label className="text-sm text-white/70 mb-2 block">سبب الرفض (سيتم إرساله للعميل وللإدارة):</label>
                                  <textarea 
                                    rows={3} 
                                    className="w-full bg-black/40 border border-red-500/50 rounded-xl p-3 text-white text-sm outline-none focus:border-red-500 mb-4"
                                    placeholder="اكتب سبب الرفض هنا بوضوح..."
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                  />
                                  <div className="flex gap-3">
                                      <button 
                                        onClick={handleReject} 
                                        disabled={actionLoading || !rejectReason}
                                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2"
                                      >
                                          {actionLoading ? <Loader2 className="animate-spin"/> : <><ShieldAlert size={18}/> تأكيد الرفض</>}
                                      </button>
                                      <button onClick={() => setShowRejectModal(false)} className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl transition">إلغاء</button>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
}