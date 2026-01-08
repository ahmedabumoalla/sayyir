"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  CheckCircle, XCircle, Clock, Users, 
  CreditCard, MessageSquare, Calendar, ChevronDown, ChevronUp, Loader2 
} from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ProviderBookings() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null); // لتوسيع تفاصيل حجز معين

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        services (title, price),
        profiles!user_id (full_name, email)
      `)
      .eq("provider_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

  const handleStatusChange = async (booking: any, newStatus: string) => {
    let rejectionReason = null;
    
    if (newStatus === 'rejected') {
      rejectionReason = prompt("الرجاء كتابة سبب الرفض (سيظهر للعميل في الإيميل):");
      if (!rejectionReason) return;
    }

    const { error } = await supabase
      .from("bookings")
      .update({ 
        status: newStatus === 'approved' ? 'approved_waiting_payment' : newStatus,
        rejection_reason: rejectionReason
      })
      .eq("id", booking.id);

    if (!error) {
      // 1. تحديث الواجهة
      setRequests(prev => prev.map(r => r.id === booking.id ? {
        ...r, 
        status: newStatus === 'approved' ? 'approved_waiting_payment' : newStatus,
        rejection_reason: rejectionReason
      } : r));
      
      // 2. إرسال الإيميل للعميل عبر الـ API الخاص بك
      try {
        await fetch('/api/emails/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: newStatus === 'approved' ? 'booking_approved_pay_now' : 'booking_rejected',
            email: booking.profiles?.email,
            name: booking.profiles?.full_name,
            serviceTitle: booking.services?.title,
            reason: rejectionReason,
            paymentLink: `${window.location.origin}/my-bookings` // توجيه العميل لصفحة حجوزاته للدفع
          }),
        });
        toast.success(newStatus === 'approved' ? "تمت الموافقة وإشعار العميل بالدفع" : "تم الرفض وإرسال السبب للعميل");
      } catch (e) {
        console.error("Email API Error:", e);
        toast.error("فشل إرسال الإيميل لكن تم تحديث الحالة");
      }
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-[#C89B3C]"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 bg-[#0a0a0a] min-h-screen text-white">
      <Toaster position="top-center" richColors />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <Calendar className="text-[#C89B3C]" /> إدارة الطلبات الواردة
        </h1>

        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
              {/* الرأس (المعلومات الأساسية) */}
              <div 
                className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">#{req.id.slice(0,8)}</span>
                    <h3 className="font-bold text-lg text-[#C89B3C]">{req.services?.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <Clock size={14}/> {req.booking_date} | {req.booking_time}
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                        req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        req.status === 'approved_waiting_payment' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                        req.status === 'paid' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                        {req.status === 'pending' ? 'بانتظار ردك' :
                         req.status === 'approved_waiting_payment' ? 'انتظار الدفع' :
                         req.status === 'paid' ? 'حجز مؤكد ✅' : 'مرفوض'}
                    </span>
                    {expandedId === req.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </div>
              </div>

              {/* التفاصيل الموسعة */}
              {expandedId === req.id && (
                <div className="px-5 pb-6 border-t border-white/5 pt-5 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 text-gray-300">
                            <Users size={16} className="text-[#C89B3C]"/>
                            <span>عدد الأشخاص: <strong>{req.guests_count}</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">
                            <CreditCard size={16} className="text-[#C89B3C]"/>
                            <span>المبلغ الإجمالي: <strong>{req.total_price} ر.س</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">
                            <MessageSquare size={16} className="text-[#C89B3C]"/>
                            <span>العميل: <strong>{req.profiles?.full_name}</strong> ({req.profiles?.email})</span>
                        </div>
                    </div>

                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><MessageSquare size={12}/> ملاحظات العميل:</p>
                        <p className="text-sm italic">{req.additional_notes || "لا توجد ملاحظات إضافية"}</p>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  {req.status === 'pending' && (
                    <div className="flex gap-3 justify-end border-t border-white/5 pt-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(req, 'rejected'); }}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold"
                      >
                        <XCircle size={18}/> رفض الطلب
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(req, 'approved'); }}
                        className="flex items-center gap-2 px-8 py-2 rounded-xl bg-[#C89B3C] text-black hover:bg-[#b38a35] transition-all font-bold shadow-lg shadow-[#C89B3C]/10"
                      >
                        <CheckCircle size={18}/> قبول الطلب
                      </button>
                    </div>
                  )}

                  {req.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-xs text-red-400">
                        <strong>سبب الرفض المرسل:</strong> {req.rejection_reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-center py-20 bg-[#1a1a1a] rounded-3xl border border-dashed border-white/10 text-gray-500">
                لا توجد طلبات حجوزات حالية.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}