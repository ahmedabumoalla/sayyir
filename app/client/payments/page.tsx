"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Wallet,
  Loader2
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  description: string;
  payment_method: string;
  created_at: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const paymentData = data as Payment[];
      setPayments(paymentData);

      // حساب إجمالي المصروفات الناجحة فقط
      const total = paymentData
        .filter(p => p.status === 'succeeded')
        .reduce((sum, current) => sum + current.amount, 0);
      setTotalSpent(total);

    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'succeeded':
        return { icon: <CheckCircle2 size={16} />, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "ناجحة" };
      case 'failed':
        return { icon: <XCircle size={16} />, color: "text-red-400", bg: "bg-red-400/10", label: "فشلت" };
      case 'pending':
        return { icon: <Clock size={16} />, color: "text-amber-400", bg: "bg-amber-400/10", label: "معالجة" };
      case 'refunded':
        return { icon: <ArrowDownLeft size={16} />, color: "text-blue-400", bg: "bg-blue-400/10", label: "مسترجعة" };
      default:
        return { icon: <CreditCard size={16} />, color: "text-gray-400", bg: "bg-gray-400/10", label: status };
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
      
      {/* الهيدر مع بطاقة الملخص */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
           <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
             <CreditCard className="text-[#C89B3C]" />
             سجل المدفوعات
           </h2>
           <p className="text-white/60 text-sm">تتبع جميع العمليات المالية التي تمت عبر حسابك.</p>
        </div>

        {/* بطاقة إجمالي المصروفات */}
        <div className="bg-gradient-to-br from-[#C89B3C]/20 to-[#C89B3C]/5 border border-[#C89B3C]/20 rounded-2xl p-5 min-w-[250px] flex items-center gap-4">
          <div className="p-3 bg-[#C89B3C] rounded-full text-[#2B1F17]">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[#C89B3C] text-sm font-medium mb-1">إجمالي المصروفات</p>
            <h3 className="text-2xl font-bold text-white">{totalSpent.toLocaleString()} <span className="text-sm font-normal text-white/60">ريال</span></h3>
          </div>
        </div>
      </div>

      {/* جدول العمليات */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
        {payments.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/50">لا توجد عمليات دفع مسجلة حتى الآن.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-black/20 text-white/50 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">العملية</th>
                  <th className="px-6 py-4 font-medium">المبلغ</th>
                  <th className="px-6 py-4 font-medium">الحالة</th>
                  <th className="px-6 py-4 font-medium">طريقة الدفع</th>
                  <th className="px-6 py-4 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-white/80">
                {payments.map((payment) => {
                  const style = getStatusStyle(payment.status);
                  return (
                    <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{payment.description}</div>
                        <div className="text-xs text-white/40">ID: {payment.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 font-bold font-mono text-lg">
                        {payment.amount} <span className="text-xs text-white/40">{payment.currency}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-white/5 ${style.bg} ${style.color}`}>
                          {style.icon}
                          {style.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                           <CreditCard size={14} className="text-white/40" />
                           {payment.payment_method}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-white/50 flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(payment.created_at).toLocaleDateString('ar-SA')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}