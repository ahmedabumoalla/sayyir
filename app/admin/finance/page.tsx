"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  DollarSign, Settings, Save, Loader2, CreditCard, CheckCircle, Banknote, Briefcase,
  Ticket, Percent, Trash2, Plus, FileText, Download, Printer, Clock, XCircle, 
  AlertTriangle, UploadCloud, MessageSquare, Gavel, X, User, MapPin, CalendarDays
} from "lucide-react";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

interface PayoutRequest {
  id: string;
  provider_id: string;
  provider_name?: string;
  amount: number;
  iban: string;
  bank_name: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_url?: string;
  created_at: string;
}

interface PlatformSettings {
  commission_tourist: string; 
  commission_housing: string; 
  commission_food: string; 
  commission_lodging: string;
  commission_experience: string;
  commission_event: string;
  commission_facility: string;
  general_discount_code: string;
  general_discount_percent: string;
  is_general_discount_active: boolean;
  general_discount_categories: string[];
}

interface Marketer {
  id: string;
  code: string;
  discount_percent: number;
  marketer_type: 'individual' | 'company';
  marketer_name: string;
  marketer_commission: number;
  phone: string;
  email: string;
  bank_account: string;
  id_number?: string;
  commercial_register?: string;
  tax_number?: string;
  national_address?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  uses_count?: number; 
  marketer_earnings?: number;
}

interface BookingReport {
    id: string;
    service_title: string;
    provider_name: string;
    provider_email: string;
    client_name: string;
    client_email: string;
    status: string;
    payment_status: string;
    total_price: number;
    subtotal: number;
    platform_fee: number;
    coupon_code: string;
    cancellation_reason?: string;
    created_at: string;
    expires_at?: string;
    booking_date?: string;
    service_category?: string;
    sub_category?: string;
}

const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const exp = new Date(expiresAt).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setTimeLeft("انتهت المهلة");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className={`mt-2 flex items-center gap-1.5 w-fit px-2 py-1 rounded text-xs font-bold border ${isExpired ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'}`}>
      <Clock size={12} />
      <span className="font-mono dir-ltr">{timeLeft}</span>
    </div>
  );
};

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportTab, setReportTab] = useState<'all' | 'pending_approval' | 'pending_payment' | 'completed' | 'rejected' | 'cancellations'>('all');

  const [settings, setSettings] = useState<PlatformSettings>({
    commission_tourist: "0", commission_housing: "0", commission_food: "0",
    commission_lodging: "0", commission_experience: "0", commission_event: "0", commission_facility: "0",
    general_discount_code: "", general_discount_percent: "0", is_general_discount_active: false,
    general_discount_categories: []
  });
  
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [bookings, setBookings] = useState<BookingReport[]>([]); 
  const [providers, setProviders] = useState<{id: string, full_name: string}[]>([]);

  const [isMarketerModalOpen, setIsMarketerModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [selectedCancellation, setSelectedCancellation] = useState<BookingReport | null>(null);

  const [newMarketer, setNewMarketer] = useState<Partial<Marketer>>({ marketer_type: 'individual', start_date: new Date().toISOString().split('T')[0], end_date: '' });
  const [addingMarketer, setAddingMarketer] = useState(false);
  
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [currentPayoutId, setCurrentPayoutId] = useState<string>("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [penaltyData, setPenaltyData] = useState({ provider_id: '', amount: '', reason: '' });
  const [applyingPenalty, setApplyingPenalty] = useState(false);

  const [stats, setStats] = useState({ 
    totalRevenue: 0, pendingPayouts: 0, netProfit: 0,
    pendingApproval: 0, pendingPayment: 0, completedBookings: 0, 
    rejectedBookings: 0, cancellationRequests: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: settingsData } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
        if (settingsData) {
            setSettings({
                commission_tourist: settingsData.commission_tourist?.toString() || "0",
                commission_housing: settingsData.commission_housing?.toString() || "0",
                commission_food: settingsData.commission_food?.toString() || "0",
                commission_lodging: settingsData.commission_lodging?.toString() || settingsData.commission_housing?.toString() || "0",
                commission_experience: settingsData.commission_experience?.toString() || settingsData.commission_tourist?.toString() || "0",
                commission_event: settingsData.commission_event?.toString() || settingsData.commission_tourist?.toString() || "0",
                commission_facility: settingsData.commission_facility?.toString() || settingsData.commission_food?.toString() || "0",
                general_discount_code: settingsData.general_discount_code || "",
                general_discount_percent: settingsData.general_discount_percent?.toString() || "0",
                is_general_discount_active: settingsData.is_general_discount_active || false,
                general_discount_categories: settingsData.general_discount_categories || []
            });
        }

        const { data: payoutsData } = await supabase.from('payout_requests').select(`*, profiles:provider_id (full_name)`).order('created_at', { ascending: false });
        const realPayouts = payoutsData ? payoutsData.map((p: any) => ({ ...p, provider_name: p.profiles?.full_name || "غير معروف" })) : [];
        setPayouts(realPayouts);

        const { data: bookingsData } = await supabase
            .from('bookings')
            .select(`
                id, status, payment_status, total_price, subtotal, platform_fee, coupon_code, created_at, expires_at, cancellation_reason, check_in, execution_date, booking_date,
                services:service_id (title, service_category, sub_category),
                provider:provider_id (full_name, email),
                client:user_id (full_name, email)
            `)
            .order('created_at', { ascending: false });

        let currentBookings = bookingsData || [];
        const nowMs = new Date().getTime();
        const expiredIds: string[] = [];

        currentBookings = currentBookings.map((b: any) => {
            if (b.status === 'approved_unpaid' && b.expires_at) {
                if (new Date(b.expires_at).getTime() < nowMs) {
                    expiredIds.push(b.id);
                    b.status = 'cancelled';
                    b.payment_status = 'expired';
                }
            }
            return b;
        });

        if (expiredIds.length > 0) {
            await supabase
                .from('bookings')
                .update({ status: 'cancelled', payment_status: 'expired' })
                .in('id', expiredIds);
        }

        const formattedBookings: BookingReport[] = currentBookings.map((b: any) => {
            const subtotal = Number(b.subtotal || 0);
            const serviceCat = b.services?.service_category;
            const subCat = b.services?.sub_category;
            
            let commissionRate = 0;
            if (subCat === 'lodging') {
                commissionRate = Number(settingsData?.commission_lodging || settingsData?.commission_housing || 0);
            } else if (subCat === 'event') {
                commissionRate = Number(settingsData?.commission_event || settingsData?.commission_tourist || 0);
            } else if (serviceCat === 'experience' || subCat === 'experience') {
                commissionRate = Number(settingsData?.commission_experience || settingsData?.commission_tourist || 0);
            } else if (subCat === 'facility') {
                commissionRate = Number(settingsData?.commission_facility || settingsData?.commission_food || 0);
            }

            const calculatedPlatformFee = (subtotal * commissionRate) / 100;
            const finalPlatformFee = b.platform_fee > 0 ? Number(b.platform_fee) : calculatedPlatformFee;
            
            const bookingTargetDate = b.check_in || b.execution_date || b.booking_date;

            return {
                id: b.id,
                service_title: b.services?.title || "خدمة محذوفة",
                service_category: serviceCat,
                sub_category: subCat,
                provider_name: b.provider?.full_name || "غير معروف",
                provider_email: b.provider?.email || "",
                client_name: b.client?.full_name || "غير معروف",
                client_email: b.client?.email || "",
                status: b.status,
                payment_status: b.payment_status || 'unpaid',
                total_price: Number(b.total_price || 0),
                subtotal: subtotal,
                platform_fee: finalPlatformFee,
                coupon_code: b.coupon_code || '',
                created_at: b.created_at,
                expires_at: b.expires_at,
                booking_date: bookingTargetDate,
                cancellation_reason: b.cancellation_reason
            };
        });

        setBookings(formattedBookings);

        const { data: marketersData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        if (marketersData) {
            const enhancedMarketers = marketersData.map((m: any) => {
                const uses = formattedBookings.filter(b => b.coupon_code === m.code && b.payment_status === 'paid');
                const earnings = uses.reduce((sum, b) => sum + (b.subtotal * (Number(m.marketer_commission) / 100)), 0);
                return { ...m, uses_count: uses.length, marketer_earnings: earnings };
            });
            setMarketers(enhancedMarketers);
        }

        const { data: provs } = await supabase.from('profiles').select('id, full_name').eq('is_provider', true);
        if (provs) setProviders(provs);

        const paidBookings = formattedBookings.filter(b => b.payment_status === 'paid');
        setStats({
            totalRevenue: paidBookings.reduce((sum, b) => sum + b.total_price, 0),
            pendingPayouts: realPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
            netProfit: paidBookings.reduce((sum, b) => sum + b.platform_fee, 0),
            pendingApproval: formattedBookings.filter(b => b.status === 'pending').length,
            pendingPayment: formattedBookings.filter(b => b.status === 'approved_unpaid').length,
            completedBookings: formattedBookings.filter(b => b.status === 'confirmed').length,
            rejectedBookings: formattedBookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length,
            cancellationRequests: formattedBookings.filter(b => b.status === 'cancellation_requested').length
        });

    } catch (error) {
        console.error("Error fetching finance data:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('platform_settings').update({
            commission_tourist: parseFloat(settings.commission_experience) || 0,
            commission_housing: parseFloat(settings.commission_lodging) || 0,
            commission_food: parseFloat(settings.commission_facility) || 0,
            commission_lodging: parseFloat(settings.commission_lodging) || 0,
            commission_experience: parseFloat(settings.commission_experience) || 0,
            commission_event: parseFloat(settings.commission_event) || 0,
            commission_facility: parseFloat(settings.commission_facility) || 0,
            general_discount_code: settings.general_discount_code,
            general_discount_percent: parseFloat(settings.general_discount_percent) || 0,
            is_general_discount_active: settings.is_general_discount_active,
            general_discount_categories: settings.general_discount_categories
        }).eq('id', 1);

      if (error) throw error;
      alert("✅ تم حفظ الإعدادات بنجاح");
      fetchData();
    } catch (error: any) { alert("❌ خطأ: " + error.message); } finally { setSaving(false); }
  };

  const handleCategoryToggle = (cat: string) => {
      setSettings(prev => {
          const cats = prev.general_discount_categories || [];
          if (cats.includes(cat)) return { ...prev, general_discount_categories: cats.filter(c => c !== cat) };
          return { ...prev, general_discount_categories: [...cats, cat] };
      });
  };

  const handleAddMarketer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarketer.code || !newMarketer.discount_percent || !newMarketer.marketer_name || !newMarketer.start_date) return alert("يرجى تعبئة الحقول الأساسية");
    setAddingMarketer(true);
    try {
        const { data, error } = await supabase.from('coupons').insert([{
            ...newMarketer,
            code: newMarketer.code.toUpperCase(),
            discount_percent: parseFloat(newMarketer.discount_percent as any),
            marketer_commission: parseFloat(newMarketer.marketer_commission as any || '0'),
            start_date: newMarketer.start_date,
            end_date: newMarketer.end_date || null
        }]).select();
        if (error) throw error;
        if (data) {
            setMarketers([{...data[0], uses_count: 0, marketer_earnings: 0}, ...marketers]);
            setNewMarketer({ marketer_type: 'individual', start_date: new Date().toISOString().split('T')[0], end_date: '' });
            setIsMarketerModalOpen(false);
            alert("✅ تم إضافة المسوق بنجاح");
        }
    } catch (error: any) { alert("خطأ: " + error.message); } finally { setAddingMarketer(false); }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("حذف حساب المسوق والكود الخاص به؟")) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (!error) setMarketers(marketers.filter(c => c.id !== id));
  };

  const openReceiptModal = (id: string) => {
      setCurrentPayoutId(id);
      setReceiptFile(null);
      setIsReceiptModalOpen(true);
  };

  const handleApprovePayout = async () => {
    if (!receiptFile) return alert("الرجاء إرفاق إيصال التحويل أولاً");
    setUploadingReceipt(true);
    try {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `receipt_${currentPayoutId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receiptFile);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        
        const { error } = await supabase.from('payout_requests').update({ 
            status: 'approved',
            receipt_url: urlData.publicUrl 
        }).eq('id', currentPayoutId);
        
        if (error) throw error;

        setPayouts(prev => prev.map(p => p.id === currentPayoutId ? { ...p, status: 'approved', receipt_url: urlData.publicUrl } : p));
        alert("تم اعتماد التحويل ورفع الإيصال بنجاح ✅");
        setIsReceiptModalOpen(false);
    } catch (error: any) {
        alert("خطأ أثناء الاعتماد: " + error.message);
    } finally {
        setUploadingReceipt(false);
    }
  };

  const handleRejectPayout = async (id: string) => {
      if(!confirm("هل أنت متأكد من رفض الطلب وإعادة المبلغ لمحفظة المزود؟")) return;
      const { error } = await supabase.from('payout_requests').update({ status: 'rejected' }).eq('id', id);
      if (!error) {
          setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
          alert("تم الرفض بنجاح ✅");
      }
  };

  const handleApplyPenalty = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!penaltyData.provider_id || !penaltyData.amount || !penaltyData.reason) return alert("يرجى تعبئة كافة الحقول");
      if (!confirm("سيتم خصم هذا المبلغ من رصيد المزود. هل أنت متأكد؟")) return;
      
      setApplyingPenalty(true);
      try {
          const { error } = await supabase.from('admin_logs').insert([{
              action_type: 'apply_penalty',
              details: `خصم جزائي بقيمة ${penaltyData.amount} ريال من المزود. السبب: ${penaltyData.reason}`,
              admin_id: (await supabase.auth.getSession()).data.session?.user.id
          }]);
          if(error) throw error;
          
          alert("✅ تم تطبيق الإجراء الجزائي وخصم المبلغ من حساب المزود.");
          setIsPenaltyModalOpen(false);
          setPenaltyData({ provider_id: '', amount: '', reason: '' });
      } catch (err: any) {
          alert("خطأ: " + err.message);
      } finally {
          setApplyingPenalty(false);
      }
  };

  const handleCancellationAction = async (bookingId: string, action: 'approved' | 'rejected') => {
      const msg = action === 'approved' ? 'قبول الإلغاء وإرجاع المبلغ للعميل' : 'رفض الإلغاء والإبقاء على الحجز';
      if (!confirm(`هل أنت متأكد من ${msg}؟`)) return;
      
      try {
          const newStatus = action === 'approved' ? 'cancelled' : 'confirmed'; 
          const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
          if (error) throw error;
          
          setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
          setSelectedCancellation(null);
          alert("تم تنفيذ الإجراء بنجاح ✅");
      } catch (err: any) {
          alert("خطأ: " + err.message);
      }
  };

  const handleDirectEmail = (email: string, name: string, bookingId: string) => {
      const subject = encodeURIComponent(`بخصوص حجزك رقم #${bookingId.slice(0,6)} في منصة سيّر`);
      const body = encodeURIComponent(`مرحباً ${name}،\n\nنتواصل معك بخصوص الحجز المذكور أعلاه...\n\n`);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const exportToCSV = () => {
      const headers = ["رقم الحجز", "الخدمة", "المزود", "العميل", "السعر", "عمولة المنصة", "كود الخصم", "حالة الدفع", "تاريخ الحجز", "موعد الحجز"];
      const rows = bookings.map(b => [
          b.id, b.service_title, b.provider_name, b.client_name, b.total_price,
          b.platform_fee.toFixed(2), b.coupon_code || '-', b.payment_status, 
          new Date(b.created_at).toLocaleDateString('ar-SA'),
          b.booking_date ? new Date(b.booking_date).toLocaleDateString('ar-SA') : '-'
      ]);
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "sayyir_finance_report.csv");
      document.body.appendChild(link);
      link.click();
  };

  const filteredBookings = bookings.filter(b => {
      if (reportTab === 'all') return true;
      if (reportTab === 'pending_approval') return b.status === 'pending';
      if (reportTab === 'pending_payment') return b.status === 'approved_unpaid';
      if (reportTab === 'completed') return b.status === 'confirmed';
      if (reportTab === 'rejected') return b.status === 'rejected' || b.status === 'cancelled';
      if (reportTab === 'cancellations') return b.status === 'cancellation_requested';
      return true;
  });

  const COMMISSIONS = [
    { key: 'commission_lodging', label: 'النزل والتأجير' },
    { key: 'commission_experience', label: 'التجارب السياحية' },
    { key: 'commission_event', label: 'الفعاليات' },
    { key: 'commission_facility', label: 'المرافق والمنتجات' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 print:bg-white print:text-black">
      
      <header className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
               <DollarSign className="text-[#C89B3C]" /> المالية والأرباح
            </h1>
            <p className="text-white/60">التحكم في العمولات، الخصومات، والتقارير المالية.</p>
          </div>
          <button onClick={() => setIsPenaltyModalOpen(true)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 text-sm">
              <Gavel size={16}/> إجراء جزائي لمزود
          </button>
      </header>

      <div className="hidden print:block mb-8 text-center border-b border-black pb-4">
          <h1 className="text-2xl font-bold">تقرير الحجوزات والمالية - منصة سيّر</h1>
          <p className="text-sm">تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
      </div>

      {loading ? (
         <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <p className="text-white/50 text-xs font-bold mb-1">إجمالي الإيرادات (المدفوعة)</p>
                <h2 className="text-2xl font-bold text-[#C89B3C]">{stats.totalRevenue.toLocaleString()} ﷼</h2>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
                <p className="text-white/50 text-xs font-bold mb-1">صافي أرباح المنصة</p>
                <h2 className="text-2xl font-bold text-emerald-400">{stats.netProfit.toLocaleString()} ﷼</h2>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <p className="text-white/50 text-xs font-bold mb-1">حجوزات مكتملة</p>
                <h2 className="text-2xl font-bold text-white">{stats.completedBookings}</h2>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <p className="text-white/50 text-xs font-bold mb-1">بانتظار الموافقة</p>
                <h2 className="text-2xl font-bold text-amber-400">{stats.pendingApproval}</h2>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 print:border-black print:bg-transparent print:text-black print:p-0">
              <div className="flex flex-wrap justify-between items-center mb-6 print:hidden">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-white"><FileText size={20} className="text-[#C89B3C]"/> تقرير الحجوزات والمراسلة</h3>
                  <div className="flex gap-2">
                      <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition"><Download size={16}/> اكسل (CSV)</button>
                      <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition"><Printer size={16}/> طباعة</button>
                  </div>
              </div>

              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar print:hidden">
                  <button onClick={() => setReportTab('all')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap ${reportTab === 'all' ? "bg-[#C89B3C] text-black font-bold" : "bg-black/20 text-white/60"}`}>الكل ({bookings.length})</button>
                  <button onClick={() => setReportTab('pending_approval')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${reportTab === 'pending_approval' ? "bg-amber-500 text-black font-bold" : "bg-black/20 text-white/60"}`}><Clock size={14}/> انتظار موافقة المزود ({stats.pendingApproval})</button>
                  <button onClick={() => setReportTab('pending_payment')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${reportTab === 'pending_payment' ? "bg-blue-500 text-white font-bold" : "bg-black/20 text-white/60"}`}><CreditCard size={14}/> انتظار دفع العميل ({stats.pendingPayment})</button>
                  <button onClick={() => setReportTab('completed')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${reportTab === 'completed' ? "bg-emerald-500 text-white font-bold" : "bg-black/20 text-white/60"}`}><CheckCircle size={14}/> مكتملة ({stats.completedBookings})</button>
                  <button onClick={() => setReportTab('cancellations')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${reportTab === 'cancellations' ? "bg-red-600 text-white font-bold animate-pulse" : "bg-black/20 text-white/60"}`}><AlertTriangle size={14}/> طلبات إلغاء واسترجاع ({stats.cancellationRequests})</button>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-right min-w-250 border-collapse print:min-w-full">
                      <thead className="bg-black/20 text-white/50 text-xs uppercase print:bg-gray-200 print:text-black">
                          <tr>
                              <th className="px-4 py-3">رقم وتاريخ الحجز</th>
                              <th className="px-4 py-3">الخدمة والمزود</th>
                              <th className="px-4 py-3">العميل</th>
                              <th className="px-4 py-3">المبالغ والأرباح</th>
                              <th className="px-4 py-3">الحالة والدفع</th>
                              <th className="px-4 py-3 text-center print:hidden">إجراءات / مراسلة</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm print:divide-gray-300">
                          {filteredBookings.map((booking) => (
                              <tr key={booking.id} className="hover:bg-white/5 transition print:hover:bg-transparent">
                                  <td className="px-4 py-3">
                                      <div className="font-mono text-xs mb-1">#{booking.id.slice(0,6)}</div>
                                      <div className="text-[11px] text-white/50 print:text-black">الطلب: {new Date(booking.created_at).toLocaleDateString('ar-SA')}</div>
                                      {booking.booking_date && (
                                          <div className="text-[11px] text-[#C89B3C] font-bold mt-1 flex items-center gap-1">
                                              <CalendarDays size={10} /> الموعد: {new Date(booking.booking_date).toLocaleDateString('ar-SA')}
                                          </div>
                                      )}
                                      {booking.status === 'approved_unpaid' && booking.expires_at && (
                                          <CountdownTimer expiresAt={booking.expires_at} />
                                      )}
                                  </td>
                                  <td className="px-4 py-3">
                                      <p className="font-bold text-white print:text-black">{booking.service_title}</p>
                                      <p className="text-xs text-white/50 print:text-black">المزود: {booking.provider_name}</p>
                                  </td>
                                  <td className="px-4 py-3">{booking.client_name}</td>
                                  <td className="px-4 py-3">
                                      <div className="font-bold text-[#C89B3C] print:text-black">{booking.total_price} ﷼</div>
                                      <div className="text-[11px] text-emerald-400 mt-1 font-bold bg-emerald-500/10 px-2 py-1 rounded w-fit border border-emerald-500/20">ربح المنصة: {booking.platform_fee.toFixed(2)} ﷼</div>
                                  </td>
                                  <td className="px-4 py-3 space-y-1">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold block w-fit ${
                                          booking.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 
                                          booking.payment_status === 'expired' ? 'bg-red-500/20 text-red-400' : 
                                          'bg-amber-500/20 text-amber-400'
                                      }`}>
                                          {booking.payment_status === 'paid' ? 'مدفوع' : 
                                           booking.payment_status === 'expired' ? 'لم يتم الدفع (انتهت المهلة)' : 
                                           'انتظار دفع العميل'}
                                      </span>
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold block w-fit ${
                                          booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                                          booking.status === 'pending' ? 'bg-blue-500/10 text-blue-400' :
                                          booking.status === 'approved_unpaid' ? 'bg-amber-500/10 text-amber-400' :
                                          booking.status === 'cancellation_requested' ? 'bg-red-600 text-white' :
                                          'bg-red-500/10 text-red-400'
                                      }`}>
                                          {booking.status === 'confirmed' ? 'مكتمل' : 
                                           booking.status === 'pending' ? 'انتظار موافقة المزود' : 
                                           booking.status === 'approved_unpaid' ? 'تم القبول (انتظار الدفع)' :
                                           booking.status === 'cancellation_requested' ? 'طلب إلغاء' :
                                           booking.status === 'cancelled' && booking.payment_status === 'expired' ? 'لم يتم الدفع من قبل العميل وتم انتهاء المهلة' :
                                           'مرفوض/ملغي'}
                                      </span>
                                  </td>
                                  <td className="px-4 py-3 text-center print:hidden">
                                      <div className="flex justify-center gap-2">
                                          {booking.status === 'cancellation_requested' ? (
                                              <button onClick={() => setSelectedCancellation(booking)} className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-700 transition font-bold shadow-lg animate-pulse">مراجعة الإلغاء</button>
                                          ) : (
                                              <>
                                                <button onClick={() => handleDirectEmail(booking.client_email, booking.client_name, booking.id)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 p-2 rounded-lg transition" title="مراسلة العميل"><User size={14}/></button>
                                                <button onClick={() => handleDirectEmail(booking.provider_email, booking.provider_name, booking.id)} className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 p-2 rounded-lg transition" title="مراسلة المزود"><Briefcase size={14}/></button>
                                              </>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {filteredBookings.length === 0 && <p className="text-center p-8 text-white/30 print:text-black">لا توجد بيانات.</p>}
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            
            <div className="lg:col-span-1 space-y-6">
                <div className={`border rounded-2xl p-6 transition-all duration-300 ${settings.is_general_discount_active ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Percent size={20} className={settings.is_general_discount_active ? "text-indigo-400" : "text-gray-400"}/> كود الخصم العام</h3>
                      <button onClick={() => setSettings({...settings, is_general_discount_active: !settings.is_general_discount_active})} className={`relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0 ${settings.is_general_discount_active ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                          <span className={`absolute top-1 right-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.is_general_discount_active ? '-translate-x-6' : 'translate-x-0'}`}></span>
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-white/60 mb-1 block">كود الخصم (مثال: SAYYIR26)</label>
                          <input type="text" disabled={!settings.is_general_discount_active} value={settings.general_discount_code} onChange={e => setSettings({...settings, general_discount_code: e.target.value.toUpperCase()})} className={`w-full bg-black/30 border rounded-xl py-2 px-4 text-white outline-none font-mono transition ${settings.is_general_discount_active ? 'border-indigo-500/50' : 'border-white/10 opacity-50'}`} />
                      </div>
                      <div>
                          <label className="text-xs text-white/60 mb-1 block">نسبة الخصم %</label>
                          <input type="number" disabled={!settings.is_general_discount_active} value={settings.general_discount_percent} onChange={e => setSettings({...settings, general_discount_percent: e.target.value})} className={`w-full bg-black/30 border rounded-xl py-2 px-4 text-white outline-none transition ${settings.is_general_discount_active ? 'border-indigo-500/50' : 'border-white/10 opacity-50'}`} />
                      </div>
                      <div>
                          <label className="text-xs text-white/60 mb-2 block">يطبق على الفئات التالية:</label>
                          <div className="grid grid-cols-2 gap-2">
                              {['lodging', 'experience', 'event', 'facility'].map((cat) => (
                                  <label key={cat} className={`flex items-center gap-2 text-sm cursor-pointer ${!settings.is_general_discount_active ? 'opacity-50 pointer-events-none' : ''}`}>
                                      <input type="checkbox" checked={settings.general_discount_categories.includes(cat)} onChange={() => handleCategoryToggle(cat)} className="accent-indigo-500" />
                                      {cat === 'lodging' ? 'النزل والتأجير' : cat === 'experience' ? 'التجارب' : cat === 'event' ? 'الفعاليات' : 'المرافق'}
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-white"><Settings size={20} className="text-[#C89B3C]"/> نسبة ربح المنصة</h3>
                  </div>
                  <div className="space-y-4">
                    {COMMISSIONS.map(({key, label}) => (
                        <div key={key}>
                          <label className="text-xs text-white/60 mb-2 block">{label}</label>
                          <div className="relative">
                              <input type="number" value={settings[key as keyof PlatformSettings] as string} onChange={e => setSettings({...settings, [key]: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[#C89B3C] outline-none" />
                              <span className="absolute left-4 top-3.5 text-white/30 font-bold">%</span>
                          </div>
                        </div>
                    ))}
                    <button onClick={handleSaveSettings} disabled={saving} className="w-full py-3 bg-[#C89B3C] hover:bg-[#b38a35] text-[#2B1F17] font-bold rounded-xl transition flex justify-center gap-2 mt-4">
                      {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> حفظ التعديلات</>}
                    </button>
                  </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-white"><Ticket size={20} className="text-[#C89B3C]"/> نظام التسويق بالعمولة (المسوقين)</h3>
                      <button onClick={() => setIsMarketerModalOpen(true)} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#b38a35] transition flex items-center gap-1"><Plus size={16}/> إضافة مسوق</button>
                  </div>
                  <div className="space-y-3 max-h-75 overflow-y-auto custom-scrollbar pr-2">
                      {marketers.map((coupon) => (
                          <div key={coupon.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="flex flex-col gap-1 w-full md:w-1/3">
                                  <span className="font-bold text-white text-sm">{coupon.marketer_name} <span className="text-[10px] bg-white/10 px-1.5 rounded text-white/60 ml-1">{coupon.marketer_type === 'company' ? 'شركة' : 'فرد'}</span></span>
                                  <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-[#C89B3C] bg-[#C89B3C]/10 px-2 py-0.5 rounded text-xs border border-[#C89B3C]/20">{coupon.code}</span>
                                      <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-1 rounded">يخصم للعميل {coupon.discount_percent}%</span>
                                  </div>
                                  <div className="text-[10px] text-white/40 mt-1 flex gap-2">
                                      <span>صالح من: {coupon.start_date ? new Date(coupon.start_date).toLocaleDateString('ar-SA') : '-'}</span>
                                      <span>إلى: {coupon.end_date ? new Date(coupon.end_date).toLocaleDateString('ar-SA') : '-'}</span>
                                  </div>
                              </div>
                              
                              <div className="flex flex-1 w-full justify-between items-center text-xs">
                                  <div className="text-center px-2 border-l border-white/10 flex-1">
                                      <span className="block text-white/50 mb-1">العمولة</span>
                                      <span className="font-bold">{coupon.marketer_commission}%</span>
                                  </div>
                                  <div className="text-center px-2 border-l border-white/10 flex-1">
                                      <span className="block text-white/50 mb-1">الاستخدامات</span>
                                      <span className="font-bold text-blue-400">{coupon.uses_count} مرة</span>
                                  </div>
                                  <div className="text-center px-2 flex-1">
                                      <span className="block text-white/50 mb-1">الرصيد المكتسب</span>
                                      <span className="font-bold text-emerald-400 font-mono">{(coupon.marketer_earnings || 0).toFixed(2)} ﷼</span>
                                  </div>
                              </div>

                              <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 rounded-lg transition shrink-0"><Trash2 size={16}/></button>
                          </div>
                      ))}
                      {marketers.length === 0 && <p className="text-center text-white/40 text-sm">لا يوجد مسوقين مسجلين.</p>}
                  </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-white"><Banknote size={20} className="text-[#C89B3C]"/> طلبات سحب الرصيد للمزودين</h3>
                  </div>
                  <div className="space-y-3 max-h-75 overflow-y-auto custom-scrollbar pr-2">
                    {payouts.map((req) => (
                      <div key={req.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-white text-lg">{req.provider_name}</h4>
                                <p className="text-xs text-white/60 mt-1">
                                    البنك: <span className="font-bold text-white">{req.bank_name}</span> | 
                                    الآيبان: <span className="font-mono text-white dir-ltr inline-block mr-1">{req.iban}</span>
                                </p>
                            </div>
                            <span className="text-xl font-bold text-[#C89B3C] font-mono bg-[#C89B3C]/10 px-3 py-1 rounded-lg border border-[#C89B3C]/20">{req.amount} ﷼</span>
                        </div>
                        {req.status === 'pending' ? (
                          <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
                              <button onClick={() => openReceiptModal(req.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-sm transition flex justify-center items-center gap-2"><UploadCloud size={16}/> اعتماد وإرفاق إيصال التحويل</button>
                              <button onClick={() => handleRejectPayout(req.id)} className="bg-red-500/20 text-red-400 font-bold px-6 py-2 rounded-lg text-sm hover:bg-red-500/30 transition">رفض</button>
                          </div>
                        ) : (
                           <div className="pt-2 flex justify-between items-center">
                               <span className={`text-xs w-fit px-3 py-1 rounded font-bold ${req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                  {req.status === 'approved' ? 'تم اعتماد التحويل' : 'تم الرفض'}
                               </span>
                               {req.receipt_url && <a href={req.receipt_url} target="_blank" className="text-xs text-blue-400 underline">عرض الإيصال المرفق</a>}
                           </div>
                        )}
                      </div>
                    ))}
                    {payouts.length === 0 && <div className="text-center py-4 text-white/40">لا توجد طلبات سحب.</div>}
                  </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isMarketerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#1e1e1e] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Ticket className="text-[#C89B3C]"/> إضافة مسوق جديد (كود خصم)</h2>
                      <button onClick={() => setIsMarketerModalOpen(false)} className="text-white/50 hover:text-white"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleAddMarketer} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                      <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={newMarketer.marketer_type === 'individual'} onChange={() => setNewMarketer({...newMarketer, marketer_type: 'individual'})} className="accent-[#C89B3C]"/> فرد / صانع محتوى</label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={newMarketer.marketer_type === 'company'} onChange={() => setNewMarketer({...newMarketer, marketer_type: 'company'})} className="accent-[#C89B3C]"/> جهة / شركة تسويق</label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs text-white/60 mb-1 block">اسم المسوق / الجهة *</label>
                              <input required type="text" value={newMarketer.marketer_name || ''} onChange={e=>setNewMarketer({...newMarketer, marketer_name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" />
                          </div>
                          <div>
                              <label className="text-xs text-white/60 mb-1 block">كود الخصم المراد إنشاؤه *</label>
                              <input required type="text" value={newMarketer.code || ''} onChange={e=>setNewMarketer({...newMarketer, code: e.target.value.toUpperCase()})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none font-mono" placeholder="مثال: AHMAD10" />
                          </div>
                          <div>
                              <label className="text-xs text-white/60 mb-1 block">نسبة الخصم للعميل % *</label>
                              <input required type="number" min="1" max="100" value={newMarketer.discount_percent || ''} onChange={e=>setNewMarketer({...newMarketer, discount_percent: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" />
                          </div>
                          <div>
                              <label className="text-xs text-white/60 mb-1 block">نسبة عمولة المسوق (من الدخل) % *</label>
                              <input required type="number" min="0" max="100" value={newMarketer.marketer_commission || ''} onChange={e=>setNewMarketer({...newMarketer, marketer_commission: parseFloat(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" />
                          </div>
                          
                          <div>
                              <label className="text-xs text-white/60 mb-1 block">تاريخ بداية الصلاحية *</label>
                              <input required type="date" value={newMarketer.start_date || ''} onChange={e=>setNewMarketer({...newMarketer, start_date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none scheme-dark" />
                          </div>
                          <div>
                              <label className="text-xs text-white/60 mb-1 block">تاريخ نهاية الصلاحية (يترك فارغاً لو دائم)</label>
                              <input type="date" value={newMarketer.end_date || ''} onChange={e=>setNewMarketer({...newMarketer, end_date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none scheme-dark" />
                          </div>

                          <div>
                              <label className="text-xs text-white/60 mb-1 block">رقم الجوال للتواصل</label>
                              <input type="text" value={newMarketer.phone || ''} onChange={e=>setNewMarketer({...newMarketer, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none dir-ltr text-left" />
                          </div>
                          <div>
                              <label className="text-xs text-white/60 mb-1 block">البريد الإلكتروني</label>
                              <input type="email" value={newMarketer.email || ''} onChange={e=>setNewMarketer({...newMarketer, email: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none dir-ltr text-left" />
                          </div>
                          <div className="md:col-span-2 border-t border-white/10 pt-4 mt-2">
                              <label className="text-xs text-[#C89B3C] font-bold mb-3 block">البيانات المالية والرسمية</label>
                          </div>
                          <div className="md:col-span-2">
                              <label className="text-xs text-white/60 mb-1 block">الحساب البنكي (اسم البنك والآيبان)</label>
                              <input type="text" value={newMarketer.bank_account || ''} onChange={e=>setNewMarketer({...newMarketer, bank_account: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" placeholder="مثال: الراجحي - SA00000000000" />
                          </div>
                          {newMarketer.marketer_type === 'individual' ? (
                              <div className="md:col-span-2">
                                  <label className="text-xs text-white/60 mb-1 block">رقم الهوية / الإقامة</label>
                                  <input type="text" value={newMarketer.id_number || ''} onChange={e=>setNewMarketer({...newMarketer, id_number: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" />
                              </div>
                          ) : (
                              <>
                                  <div>
                                      <label className="text-xs text-white/60 mb-1 block">رقم السجل التجاري</label>
                                      <input type="text" value={newMarketer.commercial_register || ''} onChange={e=>setNewMarketer({...newMarketer, commercial_register: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" />
                                  </div>
                                  <div>
                                      <label className="text-xs text-white/60 mb-1 block">الرقم الضريبي</label>
                                      <input type="text" value={newMarketer.tax_number || ''} onChange={e=>setNewMarketer({...newMarketer, tax_number: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" />
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="text-xs text-white/60 mb-1 block">العنوان الوطني للشركة</label>
                                      <input type="text" value={newMarketer.national_address || ''} onChange={e=>setNewMarketer({...newMarketer, national_address: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#C89B3C] outline-none" />
                                  </div>
                              </>
                          )}
                      </div>
                      <div className="flex gap-3 pt-6 mt-4 border-t border-white/10">
                          <button type="submit" disabled={addingMarketer} className="flex-1 bg-[#C89B3C] text-black font-bold py-3 rounded-xl hover:bg-[#b38a35] transition flex items-center justify-center gap-2">
                              {addingMarketer ? <Loader2 className="animate-spin" /> : "حفظ المسوق والكود"}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isReceiptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
             <div className="bg-[#1e1e1e] w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl text-center">
                 <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><UploadCloud size={30}/></div>
                 <h3 className="text-xl font-bold text-white mb-2">إرفاق إيصال التحويل</h3>
                 <p className="text-white/60 text-sm mb-6">يرجى رفع صورة إيصال الحوالة البنكية لإثبات تحويل المبلغ لحساب المزود لإنهاء الطلب.</p>
                 
                 <input type="file" accept="image/*,.pdf" ref={fileInputRef} onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)} className="hidden" />
                 
                 <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/20 bg-black/30 rounded-xl p-6 mb-6 cursor-pointer hover:border-[#C89B3C] transition">
                     {receiptFile ? <p className="text-[#C89B3C] font-bold text-sm truncate">{receiptFile.name}</p> : <p className="text-white/40 text-sm">اضغط هنا لاختيار الملف من جهازك</p>}
                 </div>

                 <div className="flex gap-3">
                     <button onClick={handleApprovePayout} disabled={!receiptFile || uploadingReceipt} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
                         {uploadingReceipt ? <Loader2 className="animate-spin"/> : "تأكيد واعتماد"}
                     </button>
                     <button onClick={() => setIsReceiptModalOpen(false)} className="px-6 bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition">إلغاء</button>
                 </div>
             </div>
          </div>
      )}

      {isPenaltyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
             <div className="bg-[#1e1e1e] w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-white flex items-center gap-2"><Gavel className="text-red-500"/> تطبيق إجراء جزائي</h3>
                     <button onClick={() => setIsPenaltyModalOpen(false)} className="text-white/50 hover:text-white"><X size={20}/></button>
                 </div>
                 
                 <form onSubmit={handleApplyPenalty} className="space-y-4">
                     <div>
                         <label className="text-xs text-white/60 mb-1 block">اختر مزود الخدمة المخالف</label>
                         <select required value={penaltyData.provider_id} onChange={e => setPenaltyData({...penaltyData, provider_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none appearance-none">
                             <option value="">اختر...</option>
                             {providers.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="text-xs text-white/60 mb-1 block">مبلغ الخصم (ريال)</label>
                         <input required type="number" min="1" value={penaltyData.amount} onChange={e => setPenaltyData({...penaltyData, amount: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none" />
                     </div>
                     <div>
                         <label className="text-xs text-white/60 mb-1 block">سبب المخالفة (يظهر للمزود)</label>
                         <textarea required rows={3} value={penaltyData.reason} onChange={e => setPenaltyData({...penaltyData, reason: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none resize-none" placeholder="مثال: سوء تعامل مع العميل وعدم تقديم الخدمة المتفق عليها..." />
                     </div>
                     <button type="submit" disabled={applyingPenalty} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition mt-4 flex items-center justify-center gap-2">
                         {applyingPenalty ? <Loader2 className="animate-spin"/> : "خصم المبلغ واعتماد المخالفة"}
                     </button>
                 </form>
             </div>
          </div>
      )}

      {selectedCancellation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
             <div className="bg-[#1e1e1e] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-white/10 flex justify-between items-center bg-red-500/10 rounded-t-3xl">
                     <h2 className="text-xl font-bold text-red-400 flex items-center gap-2"><AlertTriangle/> مراجعة طلب إلغاء حجز</h2>
                     <button onClick={() => setSelectedCancellation(null)} className="text-white/50 hover:text-white"><X size={24}/></button>
                 </div>
                 
                 <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                     <div className="grid grid-cols-2 gap-4">
                         <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                             <p className="text-xs text-white/50 mb-1">رقم الحجز</p>
                             <p className="font-mono font-bold text-lg text-white">#{selectedCancellation?.id.slice(0,8)}</p>
                         </div>
                         <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                             <p className="text-xs text-white/50 mb-1">المبلغ المطلوب استرجاعه</p>
                             <p className="font-mono font-bold text-lg text-[#C89B3C]">{selectedCancellation?.total_price} ﷼</p>
                         </div>
                     </div>

                     <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                         <p className="text-xs text-[#C89B3C] font-bold border-b border-white/10 pb-2 mb-2">تفاصيل العميل (طالب الإلغاء)</p>
                         <p className="text-sm text-white"><span className="text-white/50 w-20 inline-block">الاسم:</span> {selectedCancellation?.client_name}</p>
                         <p className="text-sm text-white flex items-center gap-2">
                             <span className="text-white/50 w-20 inline-block">الإيميل:</span> {selectedCancellation?.client_email}
                             <button onClick={() => handleDirectEmail(selectedCancellation?.client_email || '', selectedCancellation?.client_name || '', selectedCancellation?.id || '')} className="text-blue-400 hover:underline text-xs">(مراسلة)</button>
                         </p>
                     </div>

                     <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                         <p className="text-xs text-[#C89B3C] font-bold border-b border-white/10 pb-2 mb-2">تفاصيل الخدمة والمزود</p>
                         <p className="text-sm text-white"><span className="text-white/50 w-20 inline-block">الخدمة:</span> {selectedCancellation?.service_title}</p>
                         <p className="text-sm text-white flex items-center gap-2">
                             <span className="text-white/50 w-20 inline-block">المزود:</span> {selectedCancellation?.provider_name}
                             <button onClick={() => handleDirectEmail(selectedCancellation?.provider_email || '', selectedCancellation?.provider_name || '', selectedCancellation?.id || '')} className="text-blue-400 hover:underline text-xs">(مراسلة)</button>
                         </p>
                     </div>

                     <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                         <p className="text-xs text-red-400 font-bold mb-2">سبب الإلغاء المكتوب من قبل العميل:</p>
                         <p className="text-sm text-white leading-relaxed">{selectedCancellation?.cancellation_reason || "لم يتم كتابة سبب واضح."}</p>
                     </div>
                 </div>

                 <div className="p-6 border-t border-white/10 bg-[#151515] rounded-b-3xl flex flex-col md:flex-row gap-3">
                     <button onClick={() => handleCancellationAction(selectedCancellation?.id || '', 'approved')} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 transition flex justify-center items-center gap-2">
                         <CheckCircle size={18}/> قبول الإلغاء وإرجاع المبلغ
                     </button>
                     <button onClick={() => handleCancellationAction(selectedCancellation?.id || '', 'rejected')} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold py-3 px-6 rounded-xl transition flex justify-center items-center gap-2 shrink-0">
                         <XCircle size={18}/> رفض الإلغاء
                     </button>
                 </div>
             </div>
          </div>
      )}

    </div>
  );
}