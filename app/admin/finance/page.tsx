"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Save, Loader2, CreditCard, CheckCircle, XCircle, Banknote, LogOut, Briefcase, PlusCircle
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // البيانات
  const [settings, setSettings] = useState<CommissionSettings>({
    commission_tourist: "0",
    commission_housing: "0",
    commission_food: "0"
  });
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, pendingPayouts: 0, netProfit: 0 });

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

    // 1. جلب الإعدادات
    const { data: settingsData } = await supabase.from('platform_settings').select('*');
    if (settingsData) {
      const newSettings: any = {};
      settingsData.forEach(item => { newSettings[item.key] = item.value; });
      setSettings(prev => ({ ...prev, ...newSettings }));
    }

    // 2. جلب الطلبات
    const { data: payoutsData } = await supabase
      .from('payout_requests')
      .select(`*, profiles:provider_id (full_name)`)
      .order('created_at', { ascending: false });

    if (payoutsData) {
      const formattedPayouts = payoutsData.map((p: any) => ({
        ...p,
        provider_name: p.profiles?.full_name || "مستخدم غير معروف"
      }));
      setPayouts(formattedPayouts);
    }

    setStats({
      totalRevenue: 154300,
      netProfit: 23150,
      pendingPayouts: payoutsData?.filter((p: any) => p.status === 'pending').reduce((acc: number, curr: any) => acc + curr.amount, 0) || 0
    });

    setLoading(false);
  };

  // إضافة طلب تجريبي (وهمي)
  const addTestRequest = () => {
    const newRequest: PayoutRequest = {
      id: `temp_${Date.now()}`, // ID مؤقت مميز
      provider_id: "test",
      provider_name: "تجربة مزود " + Math.floor(Math.random() * 100),
      amount: Math.floor(Math.random() * 5000) + 500,
      iban: "SA5880000000000000000000",
      bank_name: "البنك الأهلي",
      status: "pending",
      created_at: new Date().toISOString()
    };
    
    // نضيفه في بداية القائمة
    setPayouts(prev => [newRequest, ...prev]);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'commission_tourist', value: settings.commission_tourist },
        { key: 'commission_housing', value: settings.commission_housing },
        { key: 'commission_food', value: settings.commission_food },
      ];
      const { error } = await supabase.from('platform_settings').upsert(updates);
      if (error) throw error;
      alert("✅ تم التحديث");
    } catch (error: any) {
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // معالجة الدفع (تم تعديلها لتقبل الطلبات التجريبية)
  const handlePayoutAction = async (id: string, action: 'paid' | 'rejected') => {
    const confirmMsg = action === 'paid' ? "هل تم تحويل المبلغ؟" : "رفض الطلب؟";
    if (!confirm(confirmMsg)) return;

    // 1. إذا كان طلب تجريبي (يبدأ بـ temp_)
    if (id.startsWith('temp_')) {
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: action } : p));
      alert(action === 'paid' ? "تم تسجيل الدفع (تجريبي) ✅" : "تم الرفض (تجريبي) ❌");
      return;
    }

    // 2. إذا كان طلب حقيقي (في قاعدة البيانات)
    const { error } = await supabase
      .from('payout_requests')
      .update({ status: action })
      .eq('id', id);

    if (!error) {
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: action } : p));
      alert(action === 'paid' ? "تم تسجيل الدفع بنجاح ✅" : "تم رفض الطلب ❌");
    } else {
      alert("حدث خطأ أثناء التحديث: " + error.message);
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
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className}`}>
      
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-black/40 border-l border-white/10 p-6 backdrop-blur-md">
        <div className="mb-10 flex justify-center pt-4"><Image src="/logo.png" alt="Admin" width={120} height={50} priority className="opacity-90" /></div>
        <nav className="space-y-2 flex-1">
          {menuItems.map((item, i) => item.show && (
            <Link key={i} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}>
              <item.icon size={20} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10"><button onClick={handleLogout} className="flex gap-3 text-red-400 hover:text-red-300 w-full"><LogOut size={20} /> خروج</button></div>
      </aside>

      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <DollarSign className="text-[#C89B3C]" /> المالية والأرباح
          </h1>
          <p className="text-white/60">إدارة العمولات، ومتابعة التحويلات المالية (جاهز للربط مع Moyasar).</p>
        </header>

        {loading ? (
           <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-6 rounded-2xl">
                 <p className="text-emerald-400 text-sm font-bold mb-1">إجمالي الإيرادات (تجريبي)</p>
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
              
              {/* Settings */}
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

              {/* Payouts Table */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-2">
                     <h3 className="font-bold text-lg flex items-center gap-2"><Banknote size={20} className="text-[#C89B3C]"/> طلبات سحب الرصيد</h3>
                     
                     {/* زر إضافة طلب تجريبي (دائم) */}
                     <button onClick={addTestRequest} className="text-[10px] bg-[#C89B3C]/20 text-[#C89B3C] hover:bg-[#C89B3C] hover:text-black px-2 py-1 rounded-lg border border-[#C89B3C]/30 transition flex items-center gap-1 font-bold">
                        <PlusCircle size={12}/> تجريبي
                     </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20">
                    <CreditCard size={14} />
                    <span>بوابة ميسر: جاهز للربط</span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                  </div>
                </div>

                {payouts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                    <Banknote size={40} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">لا توجد طلبات سحب معلقة حالياً.</p>
                    <p className="text-xs text-white/30 mt-2">اضغط على زر "تجريبي" بالأعلى لإضافة طلب وهمي.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {payouts.map((req) => (
                      <div key={req.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 hover:border-white/10 transition">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${req.id.startsWith('temp') ? 'bg-orange-500/20 text-orange-500' : 'bg-white/10 text-[#C89B3C]'}`}>
                            {req.provider_name?.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-white flex items-center gap-2">
                                {req.provider_name}
                                {req.id.startsWith('temp') && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">وهمي</span>}
                            </h4>
                            <div className="text-xs text-white/50 flex items-center gap-2 mt-1">
                               <span className="font-mono bg-white/5 px-1 rounded">{req.iban}</span>
                               <span className="text-[10px]">{req.bank_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-left">
                            <span className="block text-xs text-white/40">المبلغ</span>
                            <span className="text-xl font-bold text-white">{req.amount} ﷼</span>
                          </div>

                          {req.status === 'pending' ? (
                            <div className="flex gap-2">
                              <button onClick={() => handlePayoutAction(req.id, 'paid')} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition" title="تأكيد التحويل"><CheckCircle size={20} /></button>
                              <button onClick={() => handlePayoutAction(req.id, 'rejected')} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition" title="رفض الطلب"><XCircle size={20} /></button>
                            </div>
                          ) : (
                            <span className={`px-3 py-1 rounded text-xs font-bold border ${req.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                              {req.status === 'paid' ? 'تم التحويل' : 'مرفوض'}
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