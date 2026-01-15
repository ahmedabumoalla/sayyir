"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Search, CheckCircle, XCircle, Loader2, FileText, Briefcase, 
  Menu, X, User, LogOut, Eye, MapPin, Phone, Mail, Calendar, ExternalLink
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

// تعريف شكل البيانات القادمة من نموذج التسجيل
interface RequestData {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  status: 'pending' | 'approved' | 'rejected';
  dynamic_data: Record<string, any>; // البيانات المتغيرة (صور، خرائط، الخ)
  created_at: string;
}

export default function JoinRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // States
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  
  // UI States
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkRole();
    fetchRequests();
  }, [filter]);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', session.user.id).single();
        if (data?.is_super_admin) setIsSuperAdmin(true);
    } else {
        router.replace("/login");
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    // نفترض أن الجدول اسمه provider_requests أو نفس الجدول الذي يصب فيه النموذج
    const { data, error } = await supabase
      .from('provider_requests') 
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  // ✅ التعديل الرئيسي هنا:
  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    if (action === 'reject' && !rejectionReason) return alert("الرجاء كتابة سبب الرفض");

    if (!confirm(action === 'approve' ? "هل أنت متأكد من قبول هذا المزود وإنشاء حساب له؟" : "هل أنت متأكد من رفض الطلب؟")) return;

    setActionLoading(true);
    try {
        // 1. جلب معرف الأدمن الحالي (Requester ID)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("جلسة العمل انتهت، يرجى تسجيل الدخول مرة أخرى");

        const adminId = session.user.id;
        
        // 2. تحديد الرابط والبيانات بناءً على الإجراء
        let endpoint = '';
        let body = {};

        if (action === 'approve') {
            endpoint = '/api/admin/approve';
            body = { 
                requestId: selectedRequest.id, 
                requesterId: adminId // ✅ ضروري جداً للتحقق الأمني في الباك إند
            };
        } else {
            endpoint = '/api/admin/reject';
            body = { 
                requestId: selectedRequest.id, 
                reason: rejectionReason 
            };
        }

        // 3. إرسال الطلب
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "فشل المعالجة");

        alert(`✅ تم ${action === 'approve' ? 'قبول' : 'رفض'} الطلب بنجاح`);
        setSelectedRequest(null);
        setRejectionReason("");
        fetchRequests(); // تحديث القائمة

    } catch (error: any) {
        console.error(error);
        alert("حدث خطأ: " + error.message);
    } finally {
        setActionLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  // Helper to render dynamic values smartly
  const renderDynamicValue = (key: string, value: any) => {
    // 1. إذا كان إحداثيات خريطة
    if (value && typeof value === 'object' && 'lat' in value && 'lng' in value) {
        return (
            <a 
                href={`https://www.google.com/maps?q=${value.lat},${value.lng}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:underline bg-blue-500/10 p-2 rounded-lg w-fit"
            >
                <MapPin size={16}/> عرض الموقع على Google Maps
            </a>
        );
    }
    // 2. إذا كان مصفوفة روابط (صور/ملفات)
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].startsWith('http')) {
        return (
            <div className="flex gap-2 overflow-x-auto pb-2">
                {value.map((url, i) => (
                    <a key={i} href={url} target="_blank" className="block w-24 h-24 relative rounded-lg overflow-hidden border border-white/20 hover:border-[#C89B3C] transition">
                        <img src={url} alt="file" className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition"><Eye className="text-white"/></div>
                    </a>
                ))}
            </div>
        );
    }
    // 3. إذا كان نص طويل
    if (typeof value === 'string' && value.length > 50) {
        return <p className="text-white/80 text-sm whitespace-pre-line bg-black/20 p-3 rounded-lg border border-white/5">{value}</p>;
    }
    // 4. القيم العادية
    return <span className="text-white font-medium">{String(value)}</span>;
  };

  // القائمة الجانبية (نفس باقي الصفحات لتوحيد التصميم)
  const menuItems = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "طلبات الانضمام", icon: Briefcase, href: "/admin/requests", show: true }, // 👈 نحن هنا
    { label: "إدارة المعالم", icon: Map, href: "/admin/landmarks", show: true },
    { label: "المستخدمين", icon: Users, href: "/admin/customers", show: true },
    { label: "المالية والأرباح", icon: DollarSign, href: "/admin/finance", show: true },
    { label: "فريق الإدارة", icon: ShieldAlert, href: "/admin/users", show: isSuperAdmin },
    { label: "الإعدادات", icon: Settings, href: "/admin/settings", show: true },
  ];

  return (
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className} relative`}>
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]"><Menu size={24} /></button>
        <Link href="/"><Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" /></Link>
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
        <div className="pt-6 border-t border-white/10 mt-auto"><button onClick={handleLogout} className="flex gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 hover:bg-white/5 rounded-xl transition items-center"><LogOut size={20} /> خروج</button></div>
      </aside>

      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen pt-24 md:pt-10">
        
        <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
                 <Briefcase className="text-[#C89B3C]" /> طلبات الانضمام
              </h1>
              <p className="text-white/60">مراجعة طلبات مزودي الخدمة الجدد والموافقة عليها.</p>
            </div>
        </header>

        {/* Filters */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
            <button onClick={() => setFilter('pending')} className={`pb-2 px-4 transition ${filter === 'pending' ? 'text-[#C89B3C] border-b-2 border-[#C89B3C] font-bold' : 'text-white/50 hover:text-white'}`}>قيد الانتظار</button>
            <button onClick={() => setFilter('approved')} className={`pb-2 px-4 transition ${filter === 'approved' ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : 'text-white/50 hover:text-white'}`}>المقبولة</button>
            <button onClick={() => setFilter('rejected')} className={`pb-2 px-4 transition ${filter === 'rejected' ? 'text-red-400 border-b-2 border-red-400 font-bold' : 'text-white/50 hover:text-white'}`}>المرفوضة</button>
        </div>

        {loading ? (
           <div className="h-[50vh] flex items-center justify-center text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10" /></div>
        ) : requests.length === 0 ? (
            <div className="text-center p-20 bg-white/5 rounded-2xl border border-white/5 text-white/40 flex flex-col items-center">
                <Briefcase size={40} className="mb-4 opacity-20"/>
                لا يوجد طلبات في هذه القائمة.
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {requests.map((req) => (
                <div key={req.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#C89B3C]/30 transition group flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#C89B3C]/20 flex items-center justify-center text-[#C89B3C] text-xl font-bold">
                                {req.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-white line-clamp-1">{req.name}</h3>
                                <p className="text-xs text-white/50">{req.service_type || 'خدمة عامة'}</p>
                            </div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded border ${
                            req.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                            req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                            {req.status === 'pending' ? 'جديد' : req.status === 'approved' ? 'مقبول' : 'مرفوض'}
                        </span>
                    </div>
                    
                    <div className="space-y-2 mb-6 text-sm text-white/70 bg-black/20 p-3 rounded-xl">
                        <div className="flex items-center gap-2"><Mail size={14} className="text-[#C89B3C]"/> {req.email}</div>
                        <div className="flex items-center gap-2"><Phone size={14} className="text-[#C89B3C]"/> {req.phone}</div>
                        <div className="flex items-center gap-2"><Calendar size={14} className="text-white/30"/> {new Date(req.created_at).toLocaleDateString('ar-SA')}</div>
                    </div>

                    <button onClick={() => setSelectedRequest(req)} className="mt-auto w-full py-2.5 bg-white/10 hover:bg-[#C89B3C] hover:text-black font-bold rounded-xl transition flex justify-center items-center gap-2 border border-white/5 group-hover:border-[#C89B3C]">
                        <Eye size={18}/> معاينة التفاصيل
                    </button>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Request Details */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#1e1e1e] w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-[#C89B3C]/10 to-transparent">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">تفاصيل طلب الانضمام</h2>
                        <p className="text-xs text-white/50">رقم الطلب: {selectedRequest.id}</p>
                    </div>
                    <button onClick={() => setSelectedRequest(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-white/40 block mb-1">الاسم التجاري/الشخصي</span>
                            <span className="font-bold">{selectedRequest.name}</span>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-white/40 block mb-1">البريد الإلكتروني</span>
                            <span className="font-bold font-mono text-sm">{selectedRequest.email}</span>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-white/40 block mb-1">رقم الجوال</span>
                            <span className="font-bold font-mono dir-ltr">{selectedRequest.phone}</span>
                        </div>
                    </div>

                    {/* Dynamic Data Rendering */}
                    <h3 className="text-[#C89B3C] font-bold text-lg mb-4 flex items-center gap-2"><FileText size={20}/> البيانات المرفقة</h3>
                    <div className="space-y-4">
                        {selectedRequest.dynamic_data && Object.entries(selectedRequest.dynamic_data).map(([key, value], idx) => {
                            if(!value) return null;
                            return (
                                <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                    <p className="text-xs text-[#C89B3C] font-bold mb-2 uppercase">بيانات إضافية (ID: {key})</p>
                                    <div className="text-sm">
                                        {renderDynamicValue(key, value)}
                                    </div>
                                </div>
                            );
                        })}
                        {(!selectedRequest.dynamic_data || Object.keys(selectedRequest.dynamic_data).length === 0) && (
                            <p className="text-white/40 text-sm">لا توجد بيانات إضافية.</p>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-[#151515] flex flex-col md:flex-row gap-4 justify-end">
                    {selectedRequest.status === 'pending' ? (
                        <>
                            <div className="flex-1">
                                <input 
                                    type="text" 
                                    placeholder="سبب الرفض (إلزامي في حال الرفض)..." 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => handleAction('reject')} 
                                disabled={actionLoading}
                                className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50"
                            >
                                رفض الطلب
                            </button>
                            <button 
                                onClick={() => handleAction('approve')} 
                                disabled={actionLoading}
                                className="bg-emerald-500 text-white hover:bg-emerald-600 px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="animate-spin"/> : <><CheckCircle size={20}/> قبول وإنشاء حساب</>}
                            </button>
                        </>
                    ) : (
                        <div className="w-full text-center text-white/50 text-sm py-2">
                            تم {selectedRequest.status === 'approved' ? 'قبول' : 'رفض'} هذا الطلب سابقاً.
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </main>
  );
}