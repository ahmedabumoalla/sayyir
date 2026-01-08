"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Save, Loader2, CreditCard, CheckCircle, Banknote, LogOut, Briefcase,
  Menu, X, User, Home, Copy, Ticket, Percent, Trash2, Plus, Power
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

// الأنواع (Types)
interface PayoutRequest {
  id: string;
  provider_id: string;
  provider_name?: string;
  amount: number;
  iban: string;
  bank_name: string;
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
}

interface PlatformSettings {
  commission_tourist: string;
  commission_housing: string;
  commission_food: string;
  // إعدادات الخصم العام الجديدة
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
}

export default function FinancePage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // UI States
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  // Data States
  const [settings, setSettings] = useState<PlatformSettings>({
    commission_tourist: "0",
    commission_housing: "0",
    commission_food: "0",
    general_discount_percent: "0",
    is_general_discount_active: false
  });
  
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  
  // New Coupon Form
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_percent: '',
    marketer_name: '',
    marketer_commission: ''
  });
  const [addingCoupon, setAddingCoupon] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    pendingPayouts: 0, 
    netProfit: 0 
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
        // 1. جلب إعدادات المنصة (العمولات + الخصم العام)
        const { data: settingsData } = await supabase
            .from('platform_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsData) {
            setSettings({
                commission_tourist: settingsData.commission_tourist?.toString() || "0",
                commission_housing: settingsData.commission_housing?.toString() || "0",
                commission_food: settingsData.commission_food?.toString() || "0",
                general_discount_percent: settingsData.general_discount_percent?.toString() || "0",
                is_general_discount_active: settingsData.is_general_discount_active || false
            });
        }

        // 2. جلب الكوبونات
        const { data: couponsData } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (couponsData) setCoupons(couponsData);

        // 3. جلب طلبات السحب
        const { data: payoutsData } = await supabase
            .from('payout_requests')
            .select(`*, profiles:provider_id (full_name)`)
            .order('created_at', { ascending: false });

        const realPayouts = payoutsData ? payoutsData.map((p: any) => ({
            ...p,
            provider_name: p.profiles?.full_name || "مستخدم غير معروف"
        })) : [];
        
        setPayouts(realPayouts);

        // 4. الحسابات المالية (تقريبية)
        const { data: paymentsData } = await supabase
            .from('payments') // تأكد أن لديك جدول payments
            .select('amount')
            .eq('status', 'succeeded');

        const totalRevenueCalc = paymentsData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
        const pendingTotalCalc = realPayouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
        
        // حساب تقريبي للربح (يمكن تعديله لاحقاً ليكون أدق)
        const netProfitCalc = totalRevenueCalc * 0.10; // افتراض هامش ربح 10% للتجربة

        setStats({
            totalRevenue: totalRevenueCalc,
            pendingPayouts: pendingTotalCalc,
            netProfit: netProfitCalc
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
      // تحديث الجدول مباشرة (أو عبر API لو كنت تفضل ذلك)
      const { error } = await supabase
        .from('platform_settings')
        .update({
            commission_tourist: parseFloat(settings.commission_tourist),
            commission_housing: parseFloat(settings.commission_housing),
            commission_food: parseFloat(settings.commission_food),
            general_discount_percent: parseFloat(settings.general_discount_percent),
            is_general_discount_active: settings.is_general_discount_active
        })
        .eq('id', 1);

      if (error) throw error;
      alert("✅ تم حفظ الإعدادات والخصومات بنجاح");
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_percent) {
        alert("يرجى تعبئة الكود ونسبة الخصم");
        return;
    }

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
            setCoupons([data[0], ...coupons]);
            setNewCoupon({ code: '', discount_percent: '', marketer_name: '', marketer_commission: '' });
            alert("✅ تم إضافة الكوبون");
        }
    } catch (error: any) {
        alert("خطأ: " + error.message);
    } finally {
        setAddingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("حذف الكوبون؟")) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (!error) setCoupons(coupons.filter(c => c.id !== id));
  };

  const handlePayoutAction = async (id: string, action: 'paid' | 'rejected') => {
    if(!confirm(action === 'paid' ? "تأكيد التحويل؟" : "رفض الطلب؟")) return;
    
    // تحديث الحالة محلياً وقاعدة البيانات
    const { error } = await supabase
        .from('payout_requests')
        .update({ status: action })
        .eq('id', id);

    if (!error) {
        setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: action } : p));
        alert("تم تحديث الحالة ✅");
    } else {
        alert("خطأ في التحديث");
    }
  };

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

  return (
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className} relative`}>
      
      {/* Sidebar & Mobile Header (نفس الكود السابق للحفاظ على التصميم) */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]"><Menu size={24} /></button>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2"><Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" /></Link>
        <div className="relative">
          <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10"><User size={20} /></button>
          {isProfileMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition">تسجيل الخروج</button>
            </div>
          )}
        </div>
      </div>
      {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />}
      <aside className={`fixed md:sticky top-0 right-0 h-screen w-64 bg-[#151515] md:bg-black/40 border-l border-white/10 p-6 backdrop-blur-md z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
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
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen pt-24 md:pt-10">
        
        <header className="flex justify-between items-center mb-10">
           <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
                 <DollarSign className="text-[#C89B3C]" /> المالية والأرباح
              </h1>
              <p className="text-white/60">التحكم في العمولات، الخصومات العامة، والكوبونات.</p>
           </div>
        </header>

        {loading ? (
           <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-6 rounded-2xl">
                  <p className="text-emerald-400 text-sm font-bold mb-1">إجمالي الإيرادات</p>
                  <h2 className="text-3xl font-bold text-white">{stats.totalRevenue.toLocaleString()} ﷼</h2>
              </div>
              <div className="bg-gradient-to-br from-[#C89B3C]/10 to-orange-600/5 border border-[#C89B3C]/20 p-6 rounded-2xl">
                  <p className="text-[#C89B3C] text-sm font-bold mb-1">صافي أرباح المنصة</p>
                  <h2 className="text-3xl font-bold text-white">{stats.netProfit.toLocaleString()} ﷼</h2>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-6 rounded-2xl">
                  <p className="text-blue-400 text-sm font-bold mb-1">مستحقات معلقة للمزودين</p>
                  <h2 className="text-3xl font-bold text-white">{stats.pendingPayouts.toLocaleString()} ﷼</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Right Column: Settings */}
              <div className="lg:col-span-1 space-y-6">
                  
                  {/* 1. General Discount (New Feature) */}
                  <div className={`border rounded-2xl p-6 transition-all duration-300 ${settings.is_general_discount_active ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Percent size={20} className={settings.is_general_discount_active ? "text-indigo-400" : "text-gray-400"}/> الخصم العام</h3>
                        <button 
                            onClick={() => setSettings({...settings, is_general_discount_active: !settings.is_general_discount_active})}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${settings.is_general_discount_active ? 'bg-indigo-500' : 'bg-gray-600'}`}
                        >
                            <span className={`absolute top-1 right-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.is_general_discount_active ? '-translate-x-6' : 'translate-x-0'}`}></span>
                        </button>
                    </div>
                    
                    <p className="text-xs text-white/50 mb-4">عند التفعيل، سيتم تطبيق هذا الخصم تلقائياً على جميع الخدمات في المنصة.</p>
                    
                    <div className="relative">
                        <input 
                            type="number" 
                            disabled={!settings.is_general_discount_active}
                            value={settings.general_discount_percent} 
                            onChange={e => setSettings({...settings, general_discount_percent: e.target.value})} 
                            className={`w-full bg-black/30 border rounded-xl py-3 px-4 text-white outline-none transition ${settings.is_general_discount_active ? 'border-indigo-500/50 focus:border-indigo-500' : 'border-white/10 opacity-50'}`} 
                        />
                        <span className="absolute left-4 top-3.5 text-white/30 font-bold">%</span>
                    </div>
                  </div>

                  {/* 2. Commissions Settings */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20} className="text-[#C89B3C]"/> ضبط العمولات</h3>
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
                        {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> حفظ كل التعديلات</>}
                      </button>
                    </div>
                  </div>
              </div>

              {/* Left Column: Coupons & Payouts */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Coupons Management */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                       <h3 className="font-bold text-lg flex items-center gap-2"><Ticket size={20} className="text-[#C89B3C]"/> إدارة الكوبونات</h3>
                    </div>

                    {/* Add Coupon Form */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                        <input type="text" placeholder="الكود (SAVE20)" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} className="bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white" />
                        <input type="number" placeholder="الخصم %" value={newCoupon.discount_percent} onChange={e => setNewCoupon({...newCoupon, discount_percent: e.target.value})} className="bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white" />
                        <input type="text" placeholder="اسم المسوق (اختياري)" value={newCoupon.marketer_name} onChange={e => setNewCoupon({...newCoupon, marketer_name: e.target.value})} className="bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white" />
                        <button onClick={handleAddCoupon} disabled={addingCoupon} className="bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition">
                            {addingCoupon ? "..." : "إضافة +"}
                        </button>
                    </div>

                    {/* Coupons List */}
                    <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                        {coupons.map((coupon) => (
                            <div key={coupon.id} className="bg-black/20 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-[#C89B3C] bg-[#C89B3C]/10 px-2 py-1 rounded">{coupon.code}</span>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white">{coupon.discount_percent}% خصم</span>
                                        <span className="text-xs text-white/50">{coupon.marketer_name || 'بدون مسوق'}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        {coupons.length === 0 && <p className="text-center text-white/30 text-sm">لا توجد كوبونات.</p>}
                    </div>
                </div>

                {/* 2. Payouts Table */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Banknote size={20} className="text-[#C89B3C]"/> طلبات سحب الرصيد</h3>
                  </div>

                  {payouts.length === 0 ? (
                    <div className="text-center py-8 text-white/40">لا توجد طلبات معلقة.</div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {payouts.map((req) => (
                        <div key={req.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h4 className="font-bold text-white">{req.provider_name}</h4>
                                  <p className="text-xs text-white/40">{req.bank_name} - <span className="font-mono">{req.iban}</span></p>
                              </div>
                              <span className="text-xl font-bold text-[#C89B3C]">{req.amount} ﷼</span>
                          </div>
                          
                          {req.status === 'pending' ? (
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => handlePayoutAction(req.id, 'paid')} className="flex-1 bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg text-sm hover:bg-emerald-500/30 transition">تأكيد التحويل</button>
                                <button onClick={() => handlePayoutAction(req.id, 'rejected')} className="bg-red-500/20 text-red-400 px-4 py-1.5 rounded-lg text-sm hover:bg-red-500/30 transition">رفض</button>
                            </div>
                          ) : (
                             <span className={`text-xs w-fit px-2 py-1 rounded ${req.status === 'paid' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                {req.status === 'paid' ? 'تم الدفع' : 'مرفوض'}
                             </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}