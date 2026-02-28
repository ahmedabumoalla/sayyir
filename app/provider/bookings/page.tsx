"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Clock, CheckCircle, XCircle, AlertCircle, Calendar, 
  User, MapPin, DollarSign, FileText, ChevronLeft, 
  Loader2, Filter, Send, X, ShieldAlert, Receipt,
  Mail, Phone, Briefcase, Info, Compass, Home, Utensils
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

    let query = supabase
      .from('bookings')
      .select(`
        *,
        profiles:user_id (full_name, email, phone, avatar_url),
        services:service_id (*) 
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
    }
    if (data) setBookings(data);
    setLoading(false);
  };

  // 1. منطق الموافقة وإصدار الفاتورة
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
                clientPhone: selectedBooking.profiles?.phone,
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

  // 2. منطق الرفض
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
                clientPhone: selectedBooking.profiles?.phone,
                adminEmail: 'info@sayyir.sa',
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

  // ✅ 3. التأكيد اليدوي للحجوزات المعلقة/القديمة المدفوعة في Paymob
  const handleManualConfirm = async () => {
    if (!confirm("هل تأكدت من وصول المبلغ في Paymob؟ سيتم تحويل الحجز إلى (مؤكد ومدفوع).")) return;
    setActionLoading(true);
    try {
        // توليد كود تذكرة في حال كان الحجز قديماً ولا يملك كود
        const ticketCode = selectedBooking.ticket_qr_code || (typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2));

        const { error } = await supabase
            .from('bookings')
            .update({
                status: 'confirmed',
                payment_status: 'paid',
                ticket_qr_code: ticketCode
            })
            .eq('id', selectedBooking.id);

        if (error) throw error;

        alert("✅ تم تأكيد الدفع يدوياً بنجاح.");
        setSelectedBooking(null);
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
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl transition relative whitespace-nowrap ${filter === tab.k ? 'text-[#C89B3C] bg-white/5' : 'text-white/50 hover:text-white'}`}
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
                  <div key={bookingItem.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 hover:border-[#C89B3C]/50 transition group relative flex flex-col">
                      
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
                          <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden relative border border-white/5">
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

                      <div className="space-y-3 mb-6 bg-black/40 p-4 rounded-xl border border-white/5 flex-1">
                          <div className="flex justify-between text-xs">
                              <span className="text-white/50">الخدمة المطلوبة:</span>
                              <span className="text-white font-bold truncate max-w-[150px]">{bookingItem.services?.title}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                              <span className="text-white/50">الموعد:</span>
                              <span className="text-[#C89B3C] font-mono">{bookingItem.booking_date || bookingItem.execution_date?.split('T')[0] || '-'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                              <span className="text-white/50">الكمية/العدد:</span>
                              <span className="text-white">{bookingItem.quantity}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-3 border-t border-white/10 mt-2">
                              <span className="text-white/50">الإجمالي المستحق:</span>
                              <span className="text-lg font-bold text-[#C89B3C] font-mono">{bookingItem.total_price} ﷼</span>
                          </div>
                      </div>

                      <button 
                        onClick={() => setSelectedBooking(bookingItem)}
                        className="mt-auto w-full py-3 bg-white/5 hover:bg-[#C89B3C] hover:text-black rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 border border-white/5 group-hover:border-[#C89B3C]"
                      >
                          <FileText size={16}/> عرض التفاصيل واتخاذ إجراء
                      </button>
                  </div>
              ))}
          </div>
      )}

      {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-[#1e1e1e] w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
                      <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              {selectedBooking.status === 'pending' ? <AlertCircle className="text-yellow-500"/> : <Receipt className="text-[#C89B3C]"/>}
                              تفاصيل الحجز الشاملة #{selectedBooking.id.slice(0,8)}
                          </h2>
                      </div>
                      <button onClick={() => { setSelectedBooking(null); setShowRejectModal(false); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><X size={20}/></button>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                      
                      {/* 1. بيانات العميل */}
                      <div>
                          <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><User size={18}/> بيانات العميل</h3>
                          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 bg-black/30 p-5 rounded-2xl border border-white/5">
                               <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden relative shrink-0">
                                  {selectedBooking.profiles?.avatar_url ? <Image src={selectedBooking.profiles.avatar_url} fill alt="Client" className="object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[#C89B3C]"><User size={24}/></div>}
                               </div>
                               <div className="flex-1 w-full text-center md:text-right">
                                   <p className="text-white font-bold text-lg mb-2">{selectedBooking.profiles?.full_name}</p>
                                   <div className="flex flex-col md:flex-row gap-4 text-white/60 text-sm justify-center md:justify-start">
                                       <span className="flex items-center justify-center md:justify-start gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg"><Mail size={14}/> {selectedBooking.profiles?.email}</span>
                                       {selectedBooking.profiles?.phone && (
                                           <span className="flex items-center justify-center md:justify-start gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg"><Phone size={14}/> <span className="dir-ltr">{selectedBooking.profiles.phone}</span></span>
                                       )}
                                   </div>
                               </div>
                          </div>
                      </div>

                      {/* 2. بيانات الخدمة المحجوزة */}
                      <div>
                          <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Briefcase size={18}/> الخدمة المحجوزة</h3>
                          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 relative overflow-hidden">
                              <div className={`absolute top-0 right-0 bottom-0 w-1 ${
                                  selectedBooking.services?.service_category === 'experience' ? 'bg-emerald-500' :
                                  selectedBooking.services?.sub_category === 'lodging' ? 'bg-blue-500' : 'bg-orange-500'
                              }`}></div>

                              <div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/70">
                                          {selectedBooking.services?.service_category === 'experience' ? 'تجربة سياحية' : selectedBooking.services?.sub_category === 'lodging' ? 'سكن ونزل' : 'مرفق / طعام'}
                                      </span>
                                  </div>
                                  <p className="font-bold text-xl text-white">{selectedBooking.services?.title}</p>
                                  <p className="text-sm text-white/50 mt-2 line-clamp-2 leading-relaxed">{selectedBooking.services?.description}</p>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5 text-sm">
                                  <div>
                                      <span className="block text-white/40 text-xs mb-1">مدة الخدمة</span>
                                      <span className="font-bold flex items-center gap-1"><Clock size={14} className="text-[#C89B3C]"/> {selectedBooking.services?.duration || '-'}</span>
                                  </div>
                                  <div>
                                      <span className="block text-white/40 text-xs mb-1">الموقع</span>
                                      <span className="font-bold flex items-center gap-1 truncate"><MapPin size={14} className="text-[#C89B3C]"/> {selectedBooking.services?.location || 'عسير'}</span>
                                  </div>
                                  <div>
                                      <span className="block text-white/40 text-xs mb-1">سعر الوحدة</span>
                                      <span className="font-bold font-mono">{selectedBooking.services?.price} ﷼</span>
                                  </div>
                                  <div>
                                      <span className="block text-white/40 text-xs mb-1">الحد الأقصى</span>
                                      <span className="font-bold text-white/80">{selectedBooking.services?.max_capacity || 'مفتوح'}</span>
                                  </div>
                              </div>
                              
                              {(selectedBooking.services?.requirements || selectedBooking.services?.meeting_point) && (
                                  <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {selectedBooking.services?.requirements && (
                                          <div className="bg-black/20 p-3 rounded-lg">
                                              <span className="text-xs text-[#C89B3C] font-bold block mb-1">المتطلبات من العميل:</span>
                                              <span className="text-xs text-white/70 leading-relaxed">{selectedBooking.services.requirements}</span>
                                          </div>
                                      )}
                                      {selectedBooking.services?.meeting_point && (
                                          <div className="bg-black/20 p-3 rounded-lg">
                                              <span className="text-xs text-[#C89B3C] font-bold block mb-1">نقطة التجمع:</span>
                                              <span className="text-xs text-white/70 leading-relaxed">{selectedBooking.services.meeting_point}</span>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* 3. تفاصيل الحجز والفاتورة */}
                      <div>
                          <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Receipt size={18}/> تفاصيل الحجز المالي</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                                  <p className="text-xs text-white/50 mb-1">التاريخ المحدد</p>
                                  <p className="font-bold text-sm font-mono text-white">{selectedBooking.execution_date ? new Date(selectedBooking.execution_date).toLocaleString('ar-SA') : (selectedBooking.booking_date || 'غير محدد')}</p>
                              </div>
                              <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                                  <p className="text-xs text-white/50 mb-1">الكمية / العدد</p>
                                  <p className="font-bold text-xl">{selectedBooking.quantity}</p>
                              </div>
                              <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                                  <p className="text-xs text-white/50 mb-1">حالة الدفع</p>
                                  <p className={`font-bold text-sm ${selectedBooking.payment_status === 'paid' ? 'text-emerald-400' : 'text-yellow-500'}`}>
                                      {selectedBooking.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                                  </p>
                              </div>
                              <div className="bg-[#C89B3C]/10 p-4 rounded-xl border border-[#C89B3C]/30 text-center shadow-inner">
                                  <p className="text-xs text-[#C89B3C] mb-1 font-bold">الإجمالي المستحق</p>
                                  <p className="font-bold text-2xl font-mono text-[#C89B3C]">{selectedBooking.total_price} ﷼</p>
                              </div>
                          </div>
                      </div>

                      {selectedBooking.notes && (
                          <div className="bg-yellow-500/10 p-5 rounded-xl border border-yellow-500/20">
                              <p className="text-yellow-500 text-sm font-bold mb-2 flex items-center gap-2"><Info size={16}/> ملاحظات من العميل:</p>
                              <p className="text-white/80 text-sm leading-relaxed">{selectedBooking.notes}</p>
                          </div>
                      )}

                      {selectedBooking.status === 'approved_unpaid' && selectedBooking.expires_at && (
                          <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex items-center gap-3">
                              <Clock className="text-blue-400"/>
                              <div>
                                  <p className="text-blue-400 font-bold text-sm">تم القبول، بانتظار دفع العميل</p>
                                  <p className="text-white/60 text-xs">تلغى الفاتورة تلقائياً في: <span className="text-white font-mono dir-ltr">{new Date(selectedBooking.expires_at).toLocaleString('ar-SA')}</span></p>
                              </div>
                          </div>
                      )}

                      {selectedBooking.status === 'rejected' && selectedBooking.rejection_reason && (
                          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-start gap-3">
                              <XCircle className="text-red-400 mt-0.5 shrink-0"/>
                              <div>
                                  <p className="text-red-400 font-bold text-sm mb-1">سبب الرفض المرسل للعميل:</p>
                                  <p className="text-white/80 text-sm whitespace-pre-line">{selectedBooking.rejection_reason}</p>
                              </div>
                          </div>
                      )}

                  </div>

                  {/* Actions Footer */}
                  <div className="p-6 border-t border-white/10 bg-[#151515] rounded-b-3xl mt-auto">
                    {selectedBooking.status === 'pending' && (
                        !showRejectModal ? (
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                onClick={handleApprove} 
                                disabled={actionLoading}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin"/> : <><CheckCircle size={20}/> قبول الطلب وإصدار الفاتورة</>}
                                </button>
                                <button 
                                onClick={() => setShowRejectModal(true)} 
                                className="sm:w-1/3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/50 font-bold py-4 rounded-xl transition"
                                >
                                    رفض الطلب
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-2 bg-red-500/5 p-5 rounded-2xl border border-red-500/20">
                                <label className="text-sm text-red-400 font-bold mb-3 flex items-center gap-2"><ShieldAlert size={16}/> سبب الرفض (سيتم إرساله للعميل):</label>
                                <textarea 
                                rows={3} 
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-red-500 mb-4 transition"
                                placeholder="نعتذر لعدم التوفر في هذا الوقت..."
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                />
                                <div className="flex gap-3">
                                    <button 
                                    onClick={handleReject} 
                                    disabled={actionLoading || !rejectReason}
                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 className="animate-spin"/> : <><Send size={18}/> إرسال الرفض</>}
                                    </button>
                                    <button onClick={() => setShowRejectModal(false)} className="px-8 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition">إلغاء</button>
                                </div>
                            </div>
                        )
                    )}

                    {/* ✅ الزر الجديد للتأكيد اليدوي للحجوزات القديمة */}
                    {selectedBooking.status === 'approved_unpaid' && (
                        <button 
                            onClick={handleManualConfirm} 
                            disabled={actionLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition shadow-lg shadow-blue-600/20"
                        >
                            {actionLoading ? <Loader2 className="animate-spin"/> : <><CheckCircle size={20}/> تأكيد الدفع يدوياً (للحجوزات القديمة)</>}
                        </button>
                    )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}