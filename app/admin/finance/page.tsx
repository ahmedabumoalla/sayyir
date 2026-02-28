"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Save, Loader2, CreditCard, CheckCircle, Banknote, LogOut, Briefcase,
  Menu, X, User, Home, Ticket, Percent, Trash2, Plus,
  FileText, Download, Printer, Clock, XCircle, AlertTriangle
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

// --- الأنواع (Types) ---
interface PayoutRequest {
  id: string;
  provider_id: string;
  provider_name?: string;
  amount: number;
  iban: string;
  bank_name: string;
  status: 'pending' | 'approved' | 'rejected'; // ✅ تم التصحيح لتطابق الداتابيز
  created_at: string;
}

interface PlatformSettings {
  commission_tourist: string;
  commission_housing: string;
  commission_food: string;
  general_discount_percent: string;
  is_general_discount_active: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  marketer_name: string;
  marketer_commission: number;
  created_at: string;
  // ✅ أضفنا هذه للحسابات الحية
  uses_count?: number; 
  marketer_earnings?: number;
}

interface BookingReport {
    id: string;
    service_title: string;
    provider_name: string;
    client_name: string;
    status: string;
    payment_status: string;
    total_price: number;
    subtotal: number;
    platform_fee: number;
    coupon_code: string;
    created_at: string;
    rejection_reason?: string;
}

export default function FinancePage() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [reportTab, setReportTab] = useState<'all' | 'pending_approval' | 'pending_payment' | 'completed' | 'rejected'>('all');

  const [settings, setSettings] = useState<PlatformSettings>({
    commission_tourist: "0", commission_housing: "0", commission_food: "0",
    general_discount_percent: "0", is_general_discount_active: false
  });
  
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [bookings, setBookings] = useState<BookingReport[]>([]); 

  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: '', marketer_name: '', marketer_commission: '' });
  const [addingCoupon, setAddingCoupon] = useState(false);
  
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    pendingPayouts: 0, 
    netProfit: 0,
    pendingApproval: 0,
    pendingPayment: 0,
    completedBookings: 0,
    rejectedBookings: 0
  });

  useEffect(() => {
    checkRole();
    fetchData();
  }, []);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', session.user.id).single();
      if (data?.is_super_admin) setIsSuperAdmin(true);
    } else {
      router.replace("/login");
    }
  };

  const fetchData = async () => {
    setLoading(true);

    try {
        // 1. Settings
        const { data: settingsData } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
        if (settingsData) {
            setSettings({
                commission_tourist: settingsData.commission_tourist?.toString() || "0",
                commission_housing: settingsData.commission_housing?.toString() || "0",
                commission_food: settingsData.commission_food?.toString() || "0",
                general_discount_percent: settingsData.general_discount_percent?.toString() || "0",
                is_general_discount_active: settingsData.is_general_discount_active || false
            });
        }

        // 2. Payouts
        const { data: payoutsData } = await supabase.from('payout_requests').select(`*, profiles:provider_id (full_name)`).order('created_at', { ascending: false });
        const realPayouts = payoutsData ? payoutsData.map((p: any) => ({ ...p, provider_name: p.profiles?.full_name || "مستخدم غير معروف" })) : [];
        setPayouts(realPayouts);

        // 3. Bookings Report (جلب كل التفاصيل المالية)
        const { data: bookingsData } = await supabase
            .from('bookings')
            .select(`
                id, status, payment_status, total_price, subtotal, platform_fee, coupon_code, created_at, rejection_reason,
                services:service_id (title),
                provider:provider_id (full_name),
                client:user_id (full_name)
            `)
            .order('created_at', { ascending: false });

        const formattedBookings: BookingReport[] = bookingsData ? bookingsData.map((b: any) => ({
            id: b.id,
            service_title: b.services?.title || "خدمة محذوفة",
            provider_name: b.provider?.full_name || "غير معروف",
            client_name: b.client?.full_name || "غير معروف",
            status: b.status,
            payment_status: b.payment_status || 'unpaid',
            total_price: Number(b.total_price || 0),
            subtotal: Number(b.subtotal || 0),
            platform_fee: Number(b.platform_fee || 0),
            coupon_code: b.coupon_code || '',
            created_at: b.created_at,
            rejection_reason: b.rejection_reason
        })) : [];

        setBookings(formattedBookings);

        // 4. Coupons & Marketer Earnings Calculation (نظام احتساب عمولة المسوق) ✅
        const { data: couponsData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        
        let enhancedCoupons: Coupon[] = [];
        if (couponsData) {
            enhancedCoupons = couponsData.map((coupon: any) => {
                // إيجاد الحجوزات المدفوعة التي استخدمت هذا الكوبون
                const couponUses = formattedBookings.filter(b => b.coupon_code === coupon.code && b.payment_status === 'paid');
                
                // حساب أرباح المسوق (مجموع المبالغ الأساسية * نسبة المسوق)
                const earnings = couponUses.reduce((sum, b) => sum + (b.subtotal * (Number(coupon.marketer_commission) / 100)), 0);
                
                return {
                    ...coupon,
                    uses_count: couponUses.length,
                    marketer_earnings: earnings
                };
            });
            setCoupons(enhancedCoupons);
        }

        // 5. الحسابات الدقيقة للمنصة (Stats) ✅
        const paidBookings = formattedBookings.filter(b => b.payment_status === 'paid');
        const totalRevenueCalc = paidBookings.reduce((sum, b) => sum + b.total_price, 0);
        const netProfitCalc = paidBookings.reduce((sum, b) => sum + b.platform_fee, 0); // مجموع عمولات المنصة الحقيقية
        const pendingPayoutsCalc = realPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
        
        setStats({
            totalRevenue: totalRevenueCalc,
            pendingPayouts: pendingPayoutsCalc,
            netProfit: netProfitCalc,
            pendingApproval: formattedBookings.filter(b => b.status === 'pending').length,
            pendingPayment: formattedBookings.filter(b => b.status === 'approved_unpaid').length,
            completedBookings: formattedBookings.filter(b => b.status === 'confirmed').length,
            rejectedBookings: formattedBookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length
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
            commission_tourist: parseFloat(settings.commission_tourist),
            commission_housing: parseFloat(settings.commission_housing),
            commission_food: parseFloat(settings.commission_food),
            general_discount_percent: parseFloat(settings.general_discount_percent),
            is_general_discount_active: settings.is_general_discount_active
        }).eq('id', 1);

      if (error) throw error;
      alert("✅ تم حفظ الإعدادات والخصومات بنجاح");
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_percent) return alert("يرجى تعبئة الكود ونسبة الخصم");
    setAddingCoupon(true);
    try {
        const { data, error } = await supabase.from('coupons').insert([{
            code: newCoupon.code.toUpperCase(),
            discount_percent: parseFloat(newCoupon.discount_percent),
            marketer_name: newCoupon.marketer_name || 'بدون مسوق',
            marketer_commission: parseFloat(newCoupon.marketer_commission || '0'),
        }]).select();
        if (error) throw error;
        if (data) {
            setCoupons([{...data[0], uses_count: 0, marketer_earnings: 0}, ...coupons]);
            setNewCoupon({ code: '', discount_percent: '', marketer_name: '', marketer_commission: '' });
            alert("✅ تم إضافة الكوبون");
        }
    } catch (error: any) { alert("خطأ: " + error.message); } finally { setAddingCoupon(false); }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("حذف الكوبون؟")) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (!error) setCoupons(coupons.filter(c => c.id !== id));
  };

  // ✅ إجراءات السحب متصلة بقاعدة البيانات بشكل سليم
  const handlePayoutAction = async (id: string, action: 'approved' | 'rejected') => {
    if(!confirm(action === 'approved' ? "هل تم التحويل البنكي للمزود بالفعل؟" : "هل أنت متأكد من رفض الطلب؟")) return;
    
    const { error } = await supabase.from('payout_requests').update({ status: action }).eq('id', id);
    if (!error) {
        setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: action } : p));
        alert("تم تحديث الحالة بنجاح ✅");
    } else {
        alert("خطأ أثناء التحديث: " + error.message);
    }
  };

  const exportToCSV = () => {
      const headers = ["رقم الحجز", "الخدمة", "المزود", "العميل", "السعر", "عمولة المنصة", "كود الخصم", "حالة الدفع", "تاريخ الحجز"];
      const rows = bookings.map(b => [
          b.id, b.service_title, b.provider_name, b.client_name, b.total_price,
          b.platform_fee, b.coupon_code || '-', b.payment_status, new Date(b.created_at).toLocaleDateString('ar-SA')
      ]);
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "sayyir_finance_report.csv");
      document.body.appendChild(link);
      link.click();
  };

  const handlePrint = () => { window.print(); };
  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  const menuItems = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "طلبات الانضمام", icon: Briefcase, href: "/admin/requests", show: true },
    { label: "إدارة المعالم", icon: Map, href: "/admin/landmarks", show: true },
    { label: "المستخدمين", icon: Users, href: "/admin/customers", show: true },
    { label: "المالية والأرباح", icon: DollarSign, href: "/admin/finance", show: true },
    { label: "فريق الإدارة", icon: ShieldAlert, href: "/admin/users", show: isSuperAdmin },
    { label: "الإعدادات", icon: Settings, href: "/admin/settings", show: true },
  ];

  const filteredBookings = bookings.filter(b => {
      if (reportTab === 'all') return true;
      if (reportTab === 'pending_approval') return b.status === 'pending';
      if (reportTab === 'pending_payment') return b.status === 'approved_unpaid';
      if (reportTab === 'completed') return b.status === 'confirmed';
      if (reportTab === 'rejected') return b.status === 'rejected' || b.status === 'cancelled';
      return true;
  });

  return (
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className} relative print:bg-white print:text-black`}>
      
      {/* Sidebar & Header (Hidden on Print) */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center print:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]"><Menu size={24} /></button>
        <Link href="/"><Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" /></Link>
        <div className="relative">
          <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10"><User size={20} /></button>
          {isProfileMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition">تسجيل الخروج</button>
            </div>
          )}
        </div>
      </div>

      {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm print:hidden" />}
      
      <aside className={`fixed md:sticky top-0 right-0 h-screen w-64 bg-[#151515] md:bg-black/40 border-l border-white/10 p-6 backdrop-blur-md z-50 transition-transform duration-300 ease-in-out print:hidden ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="mb-10 flex justify-center pt-4"><Link href="/"><Image src="/logo.png" alt="Admin" width={120} height={50} priority className="opacity-90 hover:opacity-100 transition" /></Link></div>
        <nav className="space-y-2 flex-1 h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
          {menuItems.map((item, index) => item.show && (
            <Link key={index} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}>
              <item.icon size={20} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen pt-24 md:pt-10 print:pt-0 print:overflow-visible">
        
        <header className="flex justify-between items-center mb-10 print:hidden">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
                 <DollarSign className="text-[#C89B3C]" /> المالية والأرباح
              </h1>
              <p className="text-white/60">التحكم في العمولات، الخصومات، ومتابعة تقارير الحجوزات.</p>
            </div>
        </header>

        {/* Print Header */}
        <div className="hidden print:block mb-8 text-center border-b border-black pb-4">
            <h1 className="text-2xl font-bold">تقرير الحجوزات والمالية - منصة سيّر</h1>
            <p className="text-sm">تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>

        {loading ? (
           <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. Stats Cards */}
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

            {/* 2. Bookings Report Section */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 print:border-black print:bg-white print:text-black print:p-0">
                <div className="flex flex-wrap justify-between items-center mb-6 print:hidden">
                    <h3 className="font-bold text-lg flex items-center gap-2"><FileText size={20} className="text-[#C89B3C]"/> تقرير الحجوزات المفصل</h3>
                    <div className="flex gap-2">
                        <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition"><Download size={16}/> اكسل (CSV)</button>
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition"><Printer size={16}/> طباعة / PDF</button>
                    </div>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 print:hidden">
                    <button onClick={() => setReportTab('all')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap ${reportTab === 'all' ? "bg-[#C89B3C] text-black font-bold" : "bg-black/20 text-white/60"}`}>الكل ({bookings.length})</button>
                    <button onClick={() => setReportTab('pending_approval')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${reportTab === 'pending_approval' ? "bg-amber-500 text-black font-bold" : "bg-black/20 text-white/60"}`}><Clock size={14}/> انتظار الموافقة ({stats.pendingApproval})</button>
                    <button onClick={() => setReportTab('pending_payment')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${reportTab === 'pending_payment' ? "bg-blue-500 text-white font-bold" : "bg-black/20 text-white/60"}`}><CreditCard size={14}/> انتظار الدفع ({stats.pendingPayment})</button>
                    <button onClick={() => setReportTab('completed')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${reportTab === 'completed' ? "bg-emerald-500 text-white font-bold" : "bg-black/20 text-white/60"}`}><CheckCircle size={14}/> مكتملة ({stats.completedBookings})</button>
                    <button onClick={() => setReportTab('rejected')} className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap flex items-center gap-2 ${reportTab === 'rejected' ? "bg-red-500 text-white font-bold" : "bg-black/20 text-white/60"}`}><XCircle size={14}/> مرفوضة/ملغية ({stats.rejectedBookings})</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[1000px] border-collapse print:min-w-full">
                        <thead className="bg-black/20 text-white/50 text-xs uppercase print:bg-gray-200 print:text-black">
                            <tr>
                                <th className="px-4 py-3">رقم الحجز</th>
                                <th className="px-4 py-3">الخدمة</th>
                                <th className="px-4 py-3">المزود</th>
                                <th className="px-4 py-3">السعر النهائي</th>
                                <th className="px-4 py-3">عمولة المنصة</th>
                                <th className="px-4 py-3">الدفع</th>
                                <th className="px-4 py-3">حالة الطلب</th>
                                <th className="px-4 py-3">التاريخ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm print:divide-gray-300">
                            {filteredBookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-white/5 transition print:hover:bg-transparent">
                                    <td className="px-4 py-3 font-mono text-xs">{booking.id.slice(0,6)}</td>
                                    <td className="px-4 py-3 font-bold">{booking.service_title}</td>
                                    <td className="px-4 py-3">{booking.provider_name}</td>
                                    <td className="px-4 py-3 font-bold text-[#C89B3C] print:text-black">{booking.total_price} ﷼</td>
                                    <td className="px-4 py-3 font-bold text-emerald-400 print:text-black">{booking.platform_fee > 0 ? `+${booking.platform_fee} ﷼` : '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${booking.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {booking.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                            booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 print:bg-transparent print:text-black' :
                                            booking.status === 'pending' ? 'bg-amber-500/10 text-amber-400 print:bg-transparent print:text-black' :
                                            booking.status === 'approved_unpaid' ? 'bg-blue-500/10 text-blue-400 print:bg-transparent print:text-black' :
                                            'bg-red-500/10 text-red-400 print:bg-transparent print:text-black'
                                        }`}>
                                            {booking.status === 'confirmed' ? 'مكتمل' : 
                                             booking.status === 'pending' ? 'انتظار الموافقة' : 
                                             booking.status === 'approved_unpaid' ? 'انتظار الدفع' : 
                                             'مرفوض/ملغي'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-white/50 print:text-black">{new Date(booking.created_at).toLocaleDateString('ar-SA')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredBookings.length === 0 && <p className="text-center p-8 text-white/30 print:text-black">لا توجد بيانات.</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
              
              {/* 3. Settings Column */}
              <div className="lg:col-span-1 space-y-6">
                  {/* General Discount */}
                  <div className={`border rounded-2xl p-6 transition-all duration-300 ${settings.is_general_discount_active ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Percent size={20} className={settings.is_general_discount_active ? "text-indigo-400" : "text-gray-400"}/> الخصم العام</h3>
                        <button 
                            onClick={() => setSettings({...settings, is_general_discount_active: !settings.is_general_discount_active})}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${settings.is_general_discount_active ? 'bg-indigo-500' : 'bg-gray-600'}`}
                        >
                            <span className={`absolute top-1 right-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.is_general_discount_active ? '-translate-x-6' : 'translate-x-0'}`}></span>
                        </button>
                    </div>
                    <p className="text-xs text-white/50 mb-4">تفعيل خصم تلقائي على جميع الخدمات.</p>
                    <div className="relative">
                        <input type="number" disabled={!settings.is_general_discount_active} value={settings.general_discount_percent} onChange={e => setSettings({...settings, general_discount_percent: e.target.value})} className={`w-full bg-black/30 border rounded-xl py-3 px-4 text-white outline-none transition ${settings.is_general_discount_active ? 'border-indigo-500/50' : 'border-white/10 opacity-50'}`} />
                        <span className="absolute left-4 top-3.5 text-white/30 font-bold">%</span>
                    </div>
                  </div>

                  {/* Commissions Settings */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20} className="text-[#C89B3C]"/> نسب العمولة العامة</h3>
                    </div>
                    <div className="space-y-4">
                      {['commission_tourist', 'commission_housing', 'commission_food'].map((key) => (
                          <div key={key}>
                            <label className="text-xs text-white/60 mb-2 block">
                                {key === 'commission_tourist' ? 'السياحة والتجارب' : key === 'commission_housing' ? 'السكن والنُزل' : 'المطاعم والكافيهات'}
                            </label>
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

              {/* 4. Operations (Coupons & Payouts) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Coupons & Marketers ✅ */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Ticket size={20} className="text-[#C89B3C]"/> الكوبونات والمسوقين</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                        <input type="text" placeholder="الكود" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} className="col-span-1 bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-[#C89B3C] outline-none" />
                        <input type="number" placeholder="الخصم للعميل %" value={newCoupon.discount_percent} onChange={e => setNewCoupon({...newCoupon, discount_percent: e.target.value})} className="col-span-1 bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-[#C89B3C] outline-none" title="الخصم للعميل" />
                        <input type="text" placeholder="اسم المسوق" value={newCoupon.marketer_name} onChange={e => setNewCoupon({...newCoupon, marketer_name: e.target.value})} className="col-span-1 bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-[#C89B3C] outline-none" />
                        <input type="number" placeholder="عمولة المسوق %" value={newCoupon.marketer_commission} onChange={e => setNewCoupon({...newCoupon, marketer_commission: e.target.value})} className="col-span-1 bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-[#C89B3C] outline-none" title="عمولة المسوق" />
                        <button onClick={handleAddCoupon} disabled={addingCoupon} className="col-span-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition">{addingCoupon ? "..." : "إضافة +"}</button>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {coupons.map((coupon) => (
                            <div key={coupon.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <span className="font-mono font-bold text-[#C89B3C] bg-[#C89B3C]/10 px-3 py-1.5 rounded-lg border border-[#C89B3C]/20">{coupon.code}</span>
                                    <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded">خصم {coupon.discount_percent}%</span>
                                </div>
                                
                                <div className="flex flex-1 w-full justify-between items-center text-xs">
                                    <div className="text-center px-4 border-l border-white/10">
                                        <span className="block text-white/50 mb-1">المسوق</span>
                                        <span className="font-bold">{coupon.marketer_name} ({coupon.marketer_commission}%)</span>
                                    </div>
                                    <div className="text-center px-4 border-l border-white/10">
                                        <span className="block text-white/50 mb-1">الاستخدامات</span>
                                        <span className="font-bold text-blue-400">{coupon.uses_count} مرات</span>
                                    </div>
                                    <div className="text-center px-4">
                                        <span className="block text-white/50 mb-1">أرباح المسوق</span>
                                        <span className="font-bold text-emerald-400 font-mono">{(coupon.marketer_earnings || 0).toFixed(2)} ﷼</span>
                                    </div>
                                </div>

                                <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 rounded-lg transition"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payouts (الربط الصحيح مع قاعدة البيانات) ✅ */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Banknote size={20} className="text-[#C89B3C]"/> طلبات سحب الرصيد للمزودين</h3>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
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
                              <span className="text-2xl font-bold text-[#C89B3C] font-mono bg-[#C89B3C]/10 px-3 py-1 rounded-lg border border-[#C89B3C]/20">{req.amount} ﷼</span>
                          </div>
                          {req.status === 'pending' ? (
                            <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
                                <button onClick={() => handlePayoutAction(req.id, 'approved')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-sm transition">اعتماد وتحويل</button>
                                <button onClick={() => handlePayoutAction(req.id, 'rejected')} className="bg-red-500/20 text-red-400 font-bold px-6 py-2 rounded-lg text-sm hover:bg-red-500/30 transition">رفض</button>
                            </div>
                          ) : (
                             <div className="pt-2">
                                 <span className={`text-xs w-fit px-3 py-1 rounded font-bold ${req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {req.status === 'approved' ? 'تم اعتماد التحويل' : 'تم الرفض'}
                                 </span>
                             </div>
                          )}
                        </div>
                      ))}
                      {payouts.length === 0 && <div className="text-center py-4 text-white/40">لا توجد طلبات سحب.</div>}
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}