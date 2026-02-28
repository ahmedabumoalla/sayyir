"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map, DollarSign, Settings, ShieldAlert,
  Search, CheckCircle, XCircle, Loader2, FileText, Briefcase, 
  Menu, X, User, LogOut, Eye, MapPin, Phone, Mail, Calendar, ExternalLink,
  Building, CreditCard, Hash, MapIcon, Link as LinkIcon, Percent, Save // ✅ تمت إضافة الأيقونات المطلوبة
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

const LABELS_DICT: Record<string, string> = {
    company_name: "اسم الشركة / المؤسسة",
    commercial_register: "رقم السجل التجاري",
    commercial_license: "الترخيص التجاري",
    tax_number: "الرقم الضريبي",
    id_number: "رقم الهوية / الإقامة",
    city: "المدينة",
    address: "العنوان التفصيلي",
    bank_name: "اسم البنك",
    iban: "رقم الآيبان (IBAN)",
    description: "وصف الخدمة المقدمة",
    website: "الموقع الإلكتروني / رابط",
    social_media: "حسابات التواصل",
    files: "المرفقات والمستندات",
    images: "صور المكان / الخدمة",
    location: "الإحداثيات الجغرافية",
    "341194A4-EE4A-41B8-BAA7-5EA6A5B7DE58": "البريد الإلكتروني الإضافي",
    "E90FC2FC-B69A-4CBA-98B6-DF134C836CBD": "رقم الجوال للتواصل",
    "AA372A24-E6ED-4300-99B0-6E8E2F3792FB": "اسم المنشأة / الاسم التجاري",
    "561C6D03-487C-46C0-AFFD-861EDB928C5D": "اسم مقدم الطلب",
    "D06E380D-CAC2-4D54-8C2E-5919F6E2A112": "هل تمتلك رخصة تجارية؟ / موافقة", 
    "F003760E-1516-4B9D-8635-89F6A01085A6": "نوع الخدمة أو الفعالية",
};

interface RequestData {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  status: 'pending' | 'approved' | 'rejected';
  dynamic_data: Record<string, any>;
  created_at: string;
}

export default function JoinRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // States الخاصة بالعمولة للمزود
  const [useCustomCommission, setUseCustomCommission] = useState(false);
  const [customCommission, setCustomCommission] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

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

  // ✅ دالة لفتح المودال وجلب نسبة المزود الحالية إذا كان مقبولاً
  const openModal = async (req: RequestData) => {
      setSelectedRequest(req);
      setRejectionReason("");
      setUseCustomCommission(false);
      setCustomCommission("");
      setSavingCommission(false);

      // إذا كان المزود مقبول، نبحث عن نسبته المحفوظة في جدول profiles لعرضها
      if (req.status === 'approved') {
          const { data } = await supabase.from('profiles').select('custom_commission').eq('email', req.email).single();
          if (data && data.custom_commission !== null && data.custom_commission !== undefined) {
              setUseCustomCommission(true);
              setCustomCommission(data.custom_commission.toString());
          }
      }
  };

  // ✅ دالة جديدة تحديث عمولة المزود مباشرة (بدون التأثير على حالة الطلب)
  const handleUpdateCommission = async () => {
      if (!selectedRequest) return;
      if (useCustomCommission && !customCommission) return alert("الرجاء إدخال النسبة.");

      setSavingCommission(true);
      try {
          const newCommissionValue = useCustomCommission ? Number(customCommission) : null;
          
          // استخدام دالة المزامنة المباشرة لتجاوز مشكلة الـ Cache
          const { error: rpcError } = await supabase.rpc('force_update_provider_commission', {
              p_email: selectedRequest.email,
              p_commission: newCommissionValue
          });

          if (rpcError && rpcError.message.includes('Could not find the function')) {
             // Fallback للطريقة العادية في حال لم يتم تفعيل دالة SQL
             const { data: prof } = await supabase.from('profiles').select('id').eq('email', selectedRequest.email).single();
             if (prof) {
                 const { error: normalError } = await supabase.from('profiles').update({ custom_commission: newCommissionValue }).eq('id', prof.id);
                 if (normalError) throw normalError;
             } else {
                 throw new Error("لم يتم العثور على حساب المزود.");
             }
          } else if (rpcError) {
              throw rpcError;
          }

          alert("تم تحديث نسبة العمولة للمزود بنجاح ✅");
      } catch (err: any) {
          console.error(err);
          alert("حدث خطأ أثناء تحديث العمولة: " + err.message);
      } finally {
          setSavingCommission(false);
      }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    
    if (action === 'reject' && !rejectionReason) return alert("الرجاء كتابة سبب الرفض");
    
    // التحقق من إدخال النسبة في حال الموافقة واختيار نسبة مخصصة
    if (action === 'approve' && useCustomCommission && !customCommission) {
        return alert("الرجاء إدخال نسبة العمولة المخصصة أو اختيار الاعتماد على النسبة العامة.");
    }

    if (!confirm(action === 'approve' ? "هل أنت متأكد من قبول هذا المزود وإنشاء حساب له؟" : "هل أنت متأكد من رفض الطلب؟")) return;

    setActionLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("جلسة العمل انتهت، يرجى تسجيل الدخول مرة أخرى");

        const adminId = session.user.id;
        
        let endpoint = '';
        let body = {};

        if (action === 'approve') {
            endpoint = '/api/admin/approve';
            body = { 
                requestId: selectedRequest.id, 
                requesterId: adminId,
                customCommission: useCustomCommission ? Number(customCommission) : null // ✅ نرسل النسبة للباك إند
            };
        } else {
            endpoint = '/api/admin/reject';
            body = { 
                requestId: selectedRequest.id, 
                reason: rejectionReason 
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "فشل المعالجة");

        alert(`✅ تم ${action === 'approve' ? 'قبول' : 'رفض'} الطلب بنجاح. ${action === 'approve' ? '\nتم إرسال إيميل بكلمة المرور للمزود.' : ''}`);
        setSelectedRequest(null);
        setRejectionReason("");
        setUseCustomCommission(false);
        setCustomCommission("");
        fetchRequests(); 

    } catch (error: any) {
        console.error(error);
        alert("حدث خطأ: " + error.message);
    } finally {
        setActionLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  const renderDynamicValue = (value: any) => {
    if (!value) return <span className="text-white/30 text-xs">لا يوجد</span>;

    if (typeof value === 'object' && 'lat' in value && 'lng' in value) {
        return (
            <a href={`http://googleusercontent.com/maps.google.com/4{value.lat},${value.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-lg w-fit transition text-sm">
                <MapPin size={16}/> عرض الموقع على Google Maps
            </a>
        );
    }
    
    if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-white/30 text-xs">فارغ</span>;
        
        if (typeof value[0] === 'string' && (value[0].startsWith('http') || value[0].startsWith('/'))) {
            return (
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {value.map((url, i) => {
                        const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                        const isDoc = url.match(/\.(pdf|doc|docx)$/i);
                        
                        if (isDoc) {
                            return <a key={i} href={url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center w-24 h-24 bg-white/5 border border-white/10 rounded-xl hover:border-[#C89B3C] hover:text-[#C89B3C] transition gap-2"><FileText size={24}/><span className="text-[10px]">عرض الملف</span></a>
                        }
                        
                        return (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-24 h-24 relative rounded-xl overflow-hidden border border-white/10 hover:border-[#C89B3C] transition group shrink-0 shadow-lg">
                                {isVideo ? <video src={url} className="w-full h-full object-cover" muted /> : <img src={url} alt={`مرفق ${i}`} className="w-full h-full object-cover"/>}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"><ExternalLink className="text-white" size={20}/></div>
                            </a>
                        );
                    })}
                </div>
            );
        }
        return (
            <div className="flex flex-wrap gap-2">
                {value.map((item, i) => <span key={i} className="bg-white/10 px-3 py-1 rounded-lg text-sm">{item}</span>)}
            </div>
        );
    }
    
    if (typeof value === 'string' && value.length > 50) {
        if (value.startsWith('http')) {
             return <a href={value} target="_blank" className="text-blue-400 hover:underline flex items-center gap-1 text-sm"><LinkIcon size={14}/> {value}</a>;
        }
        return <p className="text-white/80 text-sm whitespace-pre-line leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">{value}</p>;
    }
    
    if (typeof value === 'boolean') {
        return <span className={`px-3 py-1 rounded-lg text-sm font-bold ${value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{value ? 'نعم' : 'لا'}</span>
    }

    if (typeof value === 'string' && value.startsWith('http')) {
         return <a href={value} target="_blank" className="text-blue-400 hover:underline flex items-center gap-1 text-sm"><LinkIcon size={14}/> {value}</a>;
    }
    return <span className="text-white font-bold text-sm bg-black/20 px-4 py-2 rounded-lg inline-block">{String(value)}</span>;
  };

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
                                <p className="text-xs text-[#C89B3C]">{req.service_type || 'خدمة عامة'}</p>
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
                    
                    <div className="space-y-3 mb-6 text-sm text-white/70 bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2"><Mail size={14} className="text-white/40"/> {req.email}</div>
                        <div className="flex items-center gap-2"><Phone size={14} className="text-white/40"/> <span className="dir-ltr">{req.phone}</span></div>
                        <div className="flex items-center gap-2"><Calendar size={14} className="text-white/40"/> {new Date(req.created_at).toLocaleDateString('ar-SA')}</div>
                    </div>

                    <button onClick={() => openModal(req)} className="mt-auto w-full py-3 bg-white/10 hover:bg-[#C89B3C] hover:text-black font-bold rounded-xl transition flex justify-center items-center gap-2 border border-white/5 group-hover:border-[#C89B3C]">
                        <Eye size={18}/> معاينة تفاصيل الطلب
                    </button>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Request Details */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#1e1e1e] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2"><FileText className="text-[#C89B3C]"/> تفاصيل طلب الانضمام</h2>
                        <p className="text-xs text-white/50">المعرف: {selectedRequest.id}</p>
                    </div>
                    <button onClick={() => setSelectedRequest(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    
                    <h3 className="text-[#C89B3C] font-bold text-sm mb-3">البيانات الأساسية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">الاسم التجاري / الشخصي</span>
                            <span className="font-bold text-lg">{selectedRequest.name}</span>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">نوع الخدمة</span>
                            <span className="font-bold text-[#C89B3C]">{selectedRequest.service_type}</span>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">البريد الإلكتروني</span>
                            <span className="font-bold font-mono text-sm">{selectedRequest.email}</span>
                        </div>
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-xs text-white/50 block mb-1">رقم الجوال</span>
                            <span className="font-bold font-mono dir-ltr">{selectedRequest.phone}</span>
                        </div>
                    </div>

                    <h3 className="text-[#C89B3C] font-bold text-sm mb-4 border-t border-white/10 pt-6">تفاصيل الاستمارة والمرفقات</h3>
                    
                    {(!selectedRequest.dynamic_data || Object.keys(selectedRequest.dynamic_data).length === 0) ? (
                        <div className="bg-black/20 p-8 rounded-xl border border-white/5 text-center text-white/40">
                            لا توجد بيانات إضافية مرفقة مع هذا الطلب.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(selectedRequest.dynamic_data).map(([key, value], idx) => {
                                if(value === null || value === undefined || value === '') return null;
                                
                                const label = LABELS_DICT[key] || key.replace(/_/g, ' ').toUpperCase();
                                const isFullWidth = Array.isArray(value) || (typeof value === 'string' && value.length > 50) || (typeof value === 'object' && 'lat' in value);

                                return (
                                    <div key={idx} className={`bg-white/5 border border-white/5 p-4 rounded-xl hover:border-white/10 transition ${isFullWidth ? 'md:col-span-2' : ''}`}>
                                        <p className="text-xs text-white/50 mb-2">{label}</p>
                                        <div>
                                            {renderDynamicValue(value)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ✅ قسم إعدادات العمولة المضاف بنفس تصميم صفحة الخدمات المظلم */}
                    {(selectedRequest.status === 'pending' || selectedRequest.status === 'approved') && (
                        <div className="mt-8 bg-black/40 border border-white/10 p-5 rounded-xl mb-4">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Percent size={18}/> إعدادات عمولة المنصة (لهذا المزود تحديداً)</h3>
                                
                                {/* زر الحفظ يظهر فقط للمزودين المقبولين لتحديث النسبة فقط دون تغيير الحالة */}
                                {selectedRequest.status === 'approved' && (
                                    <button 
                                        onClick={handleUpdateCommission} 
                                        disabled={savingCommission}
                                        className="bg-[#C89B3C] hover:bg-white text-black font-bold text-xs px-4 py-2 rounded-lg transition flex items-center gap-2"
                                    >
                                        {savingCommission ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                                        تحديث النسبة فقط
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="provider_commission" 
                                        checked={!useCustomCommission} 
                                        onChange={() => setUseCustomCommission(false)}
                                        className="accent-[#C89B3C] w-4 h-4"
                                    />
                                    <span className="text-sm text-white/90">اعتماد النسبة العامة (حسب قسم المالية)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="provider_commission" 
                                        checked={useCustomCommission} 
                                        onChange={() => setUseCustomCommission(true)}
                                        className="accent-[#C89B3C] w-4 h-4"
                                    />
                                    <span className="text-sm text-white/90">تحديد نسبة مخصصة لهذا المزود</span>
                                </label>
                            </div>
                            
                            {useCustomCommission && (
                                <div className="mt-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="100"
                                        placeholder="اكتب النسبة (مثال: 15)" 
                                        className="w-48 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#C89B3C] outline-none text-white"
                                        value={customCommission}
                                        onChange={(e) => setCustomCommission(e.target.value)}
                                    />
                                    <span className="text-white/50 text-sm font-bold">% خصم من الإيراد</span>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-[#151515] rounded-b-3xl flex flex-col md:flex-row gap-4 justify-end items-center">
                    {selectedRequest.status === 'pending' ? (
                        <div className="w-full flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input 
                                    type="text" 
                                    placeholder="اكتب سبب الرفض هنا (مطلوب فقط في حالة الرفض)..." 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-red-500 outline-none"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => handleAction('reject')} 
                                disabled={actionLoading}
                                className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-6 py-3.5 rounded-xl font-bold transition disabled:opacity-50 shrink-0"
                            >
                                رفض الطلب
                            </button>
                            <button 
                                onClick={() => handleAction('approve')} 
                                disabled={actionLoading}
                                className="bg-emerald-500 text-black hover:bg-emerald-400 px-8 py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 shrink-0"
                            >
                                {actionLoading ? <Loader2 className="animate-spin text-black"/> : <><CheckCircle size={20}/> قبول وإنشاء حساب</>}
                            </button>
                        </div>
                    ) : (
                        <div className="w-full text-center text-white/50 text-sm py-2 bg-black/40 rounded-xl border border-white/5">
                            تم {selectedRequest.status === 'approved' ? 'قبول' : 'رفض'} هذا الطلب مسبقاً، لا يمكنك تغيير حالته من هنا.
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </main>
  );
}