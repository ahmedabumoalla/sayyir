"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Save, Loader2, CreditCard, CheckCircle, XCircle, Banknote, LogOut, Briefcase,
  Menu, X, User, Home, Copy
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

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

interface CommissionSettings {
  commission_tourist: string;
  commission_housing: string;
  commission_food: string;
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
  const [settings, setSettings] = useState<CommissionSettings>({
    commission_tourist: "0",
    commission_housing: "0",
    commission_food: "0"
  });
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  
  // الإحصائيات (تبدأ من الصفر وتحسب ديناميكياً)
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
        // 1. جلب إعدادات النسب (من الصف الحقيقي)
        const { data: settingsData } = await supabase
            .from('platform_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsData) {
            setSettings({
                commission_tourist: settingsData.commission_tourist || "0",
                commission_housing: settingsData.commission_housing || "0",
                commission_food: settingsData.commission_food || "0"
            });
        }

        // 2. جلب طلبات السحب (البيانات الحقيقية فقط)
        const { data: payoutsData } = await supabase
            .from('payout_requests')
            .select(`*, profiles:provider_id (full_name)`)
            .order('created_at', { ascending: false });

        const realPayouts = payoutsData ? payoutsData.map((p: any) => ({
            ...p,
            provider_name: p.profiles?.full_name || "مستخدم غير معروف"
        })) : [];
        
        setPayouts(realPayouts);

        // 3. جلب المدفوعات الحقيقية (Payments) لحساب الإيرادات
        // نفترض وجود جدول payments يسجل عمليات الدفع الناجحة من العملاء
        const { data: paymentsData } = await supabase
            .from('payments')
            .select('amount')
            .eq('status', 'succeeded'); // فقط العمليات الناجحة

        // --- الحسابات الحقيقية (Real Logic) ---
        
        // أ. إجمالي الدخل (ما دفعه العملاء)
        const totalRevenueCalc = paymentsData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

        // ب. المستحقات المعلقة (طلبات سحب لم تدفع بعد)
        const pendingTotalCalc = realPayouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);

        // ج. المستحقات المدفوعة (ما تم تحويله للمزودين فعلياً)
        const paidTotalCalc = realPayouts.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);

        // د. صافي الربح (إجمالي الدخل - ما تم دفعه للمزودين - ما ينتظر الدفع)
        // ملاحظة: هذه معادلة تقريبية، الأدق هو جمع (نسبة العمولة * كل عملية)
        const netProfitCalc = totalRevenueCalc - paidTotalCalc - pendingTotalCalc;

        setStats({
            totalRevenue: totalRevenueCalc,
            pendingPayouts: pendingTotalCalc,
            netProfit: netProfitCalc > 0 ? netProfitCalc : 0 // منع الأرقام السالبة
        });

    } catch (error) {
        console.error("Error fetching finance data:", error);
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("تم نسخ الآيبان ✅");
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/finance/action', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
              actionType: 'save_settings',
              settings: settings
          })
      });

      if (!response.ok) throw new Error("فشل حفظ الإعدادات");

      alert("✅ تم حفظ النسب في قاعدة البيانات");
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePayoutAction = async (id: string, action: 'paid' | 'rejected') => {
    const payoutItem = payouts.find(p => p.id === id);
    if (!payoutItem) return;

    const confirmMsg = action === 'paid' 
        ? `تأكيد التحويل؟\nسيتم خصم ${payoutItem.amount} ريال وتسجيل الطلب كمدفوع.` 
        : "هل أنت متأكد من رفض الطلب؟";
        
    if (!confirm(confirmMsg)) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch('/api/admin/finance/action', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ 
                actionType: 'update_payout',
                requestId: id,
                status: action,
                amount: payoutItem.amount,
                providerName: payoutItem.provider_name
            })
        });

        if (!response.ok) throw new Error("فشل تنفيذ العملية");

        // تحديث الواجهة فوراً
        setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: action } : p));
        
        // إعادة حساب الأرقام (لتحديث العدادات فوراً بعد الدفع)
        fetchData(); 

        alert(action === 'paid' ? "✅ تم تسجيل التحويل بنجاح" : "❌ تم رفض الطلب");

    } catch (error: any) {
        alert("حدث خطأ: " + error.message);
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
      
      {/* 1. Mobile Header Bar */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]">
          <Menu size={24} />
        </button>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
           <Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" />
        </Link>
        <div className="relative">
          <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10">
            <User size={20} />
          </button>
          {isProfileMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <Link href="/admin/profile" className="block px-4 py-3 hover:bg-white/5 text-sm transition">الحساب الشخصي</Link>
              <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition">تسجيل الخروج</button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Sidebar Overlay */}
      {isSidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />
      )}

      {/* 3. Sidebar */}
      <aside className={`fixed md:sticky top-0 right-0 h-screen w-64 bg-[#151515] md:bg-black/40 border-l border-white/10 p-6 backdrop-blur-md z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute top-4 left-4 p-2 text-white/50 hover:text-white"><X size={24} /></button>
        <div className="mb-10 flex justify-center pt-4">
          <Link href="/" title="العودة للرئيسية"><Image src="/logo.png" alt="Admin" width={120} height={50} priority className="opacity-90 hover:opacity-100 transition" /></Link>
        </div>
        <nav className="space-y-2 flex-1 h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
          {menuItems.map((item, index) => (
            item.show && (
              <Link key={index} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}>
                <item.icon size={20} /><span>{item.label}</span>
              </Link>
            )
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10 mt-auto"><button onClick={handleLogout} className="flex gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 hover:bg-white/5 rounded-xl transition items-center"><LogOut size={20} /> خروج</button></div>
      </aside>

      {/* 4. Main Content */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen pt-24 md:pt-10">
        
        <header className="hidden md:flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <DollarSign className="text-[#C89B3C]" /> المالية والأرباح
                </h1>
                <p className="text-white/60">إدارة العمولات، ومتابعة التحويلات المالية.</p>
            </div>
            <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition" title="الموقع الرئيسي"><Home size={20} className="text-white/70" /></Link>
        </header>

        <div className="md:hidden mb-6">
             <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <DollarSign className="text-[#C89B3C]" size={24} /> المالية والأرباح
             </h1>
             <p className="text-white/60 text-sm">إدارة العمولات والتحويلات.</p>
        </div>

        {loading ? (
           <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* البطاقات الإحصائية (حقيقية الآن) */}
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
              
              {/* Settings Section */}
              <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 h-fit">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20} className="text-[#C89B3C]"/> ضبط العمولات</h3>
                  <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white/50">% من كل عملية</span>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="text-xs text-white/60 mb-2 block">السياحة والتجارب</label>
                    <div className="relative">
                      <input type="number" value={settings.commission_tourist} onChange={e => setSettings({...settings, commission_tourist: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[#C89B3C] outline-none" />
                      <span className="absolute left-4 top-3.5 text-white/30 font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-2 block">السكن والنُزل</label>
                    <div className="relative">
                      <input type="number" value={settings.commission_housing} onChange={e => setSettings({...settings, commission_housing: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[#C89B3C] outline-none" />
                      <span className="absolute left-4 top-3.5 text-white/30 font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-2 block">المطاعم والكافيهات</label>
                    <div className="relative">
                      <input type="number" value={settings.commission_food} onChange={e => setSettings({...settings, commission_food: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[#C89B3C] outline-none" />
                      <span className="absolute left-4 top-3.5 text-white/30 font-bold">%</span>
                    </div>
                  </div>

                  <button onClick={handleSaveSettings} disabled={saving} className="w-full py-3 bg-[#C89B3C] hover:bg-[#b38a35] text-[#2B1F17] font-bold rounded-xl transition flex justify-center gap-2">
                    {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> حفظ التعديلات</>}
                  </button>
                </div>
              </div>

              {/* Payouts Table Section */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Banknote size={20} className="text-[#C89B3C]"/> طلبات سحب الرصيد</h3>
                </div>

                {payouts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                    <Banknote size={40} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">لا توجد طلبات سحب معلقة حالياً.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {payouts.map((req) => (
                      <div key={req.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col gap-4 hover:border-white/10 transition">
                        
                        {/* Provider Info & Amount */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-white/10 text-[#C89B3C]">
                                    {req.provider_name?.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{req.provider_name}</h4>
                                    <span className="text-xs text-white/40 block mt-0.5">{new Date(req.created_at).toLocaleDateString('ar-SA')}</span>
                                </div>
                            </div>
                            <div className="text-left">
                                <span className="block text-xs text-white/40">المبلغ المطلوب</span>
                                <span className="text-xl font-bold text-[#C89B3C]">{req.amount} ﷼</span>
                            </div>
                        </div>

                        {/* Bank Details (Copyable) */}
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CreditCard size={16} className="text-blue-400"/>
                                <div>
                                    <p className="text-xs text-white/50">{req.bank_name}</p>
                                    <p className="text-sm font-mono tracking-wider text-white">{req.iban}</p>
                                </div>
                            </div>
                            <button onClick={()=>copyToClipboard(req.iban)} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded text-white flex items-center gap-1 transition">
                                <Copy size={12}/> نسخ
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-2 border-t border-white/5">
                          {req.status === 'pending' ? (
                            <div className="flex gap-3 w-full">
                              <button onClick={() => handlePayoutAction(req.id, 'rejected')} className="flex-1 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition text-sm font-bold border border-red-500/20">رفض</button>
                              <button onClick={() => handlePayoutAction(req.id, 'paid')} className="flex-[2] py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition text-sm font-bold border border-emerald-500/20 flex items-center justify-center gap-2">
                                <CheckCircle size={16}/> تم التحويل (تسجيل)
                              </button>
                            </div>
                          ) : (
                            <span className={`w-full text-center py-2 rounded text-xs font-bold border ${req.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                              {req.status === 'paid' ? '✅ تم دفع المستحقات' : '❌ تم رفض الطلب'}
                            </span>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}