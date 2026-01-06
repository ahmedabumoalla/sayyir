"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
// حذفنا import Image من next/image لتجنب المشاكل
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, CheckCircle, XCircle, Search, Loader2, Eye, LogOut, 
  MapPin, Phone, Mail, Briefcase, X, ShieldAlert, Map as MapIcon, DollarSign, Settings, UserPlus,
  Download, FileText, LayoutList, Menu, User, Home, Edit3 
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

interface ProviderRequest {
  id: string; 
  name: string; 
  email: string; 
  phone: string; 
  service_type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string; 
  dynamic_data: any; 
}

export default function RequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [requests, setRequests] = useState<ProviderRequest[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ProviderRequest | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [processing, setProcessing] = useState(false); 
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => { fetchData(); checkRole(); }, []);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if(session) {
       const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', session.user.id).single();
       if(data?.is_super_admin) setIsSuperAdmin(true);
    }
  }

  const fetchData = async () => {
    setLoading(true);
    const { data: reqData } = await supabase.from('provider_requests').select('*').order('created_at', { ascending: false });
    if (reqData) {
        setRequests(reqData as any);
        setPendingCount(reqData.filter((r: any) => r.status === 'pending').length);
    }
    const { data: fieldsData } = await supabase.from('registration_fields').select('*').order('sort_order', { ascending: true });
    if (fieldsData) setFieldDefinitions(fieldsData);
    setLoading(false);
  };

  // ✅ دالة استخراج الصور (الجوكر)
  const extractImages = (value: any): string[] => {
    if (!value) return [];
    
    let rawList: any[] = [];

    if (Array.isArray(value)) {
        rawList = value;
    } else if (typeof value === 'string') {
        if (value.trim().startsWith('[') || value.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(value);
                rawList = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                rawList = [value];
            }
        } else {
            rawList = [value];
        }
    }

    // تصفية الروابط الصالحة فقط
    return rawList
        .map(item => typeof item === 'string' ? item : '')
        .filter(item => {
            const lower = item.toLowerCase();
            return (
                lower.includes('http') && 
                (
                    lower.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp|heic|mp4|mov)$/) || 
                    lower.includes('supabase.co') || 
                    lower.includes('/storage/v1/object')
                )
            );
        })
        .map(url => url.replace(/["'[\]]/g, '')); 
  };

  const isLocation = (value: any) => {
      if (typeof value === 'object' && value !== null && 'lat' in value && 'lng' in value) return true;
      if (typeof value === 'string' && value.includes('"lat"') && value.includes('"lng"')) return true;
      return false;
  };

  const getParseLocation = (value: any) => {
      if (typeof value === 'object') return value;
      try { return JSON.parse(value); } catch { return null; }
  };

  const getFieldLabel = (key: string) => {
    const field = fieldDefinitions.find(f => f.id === key);
    return field ? field.label : key.replace(/_/g, ' ');
  };

  // ✅ هنا التعديل المهم: إضافة requesterId للطلب
  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    let reason = "";
    
    if (action === 'approve') {
        if (!confirm("تأكيد قبول الطلب؟ سيتم إنشاء حساب وإرسال كلمة المرور.")) return;
    } else {
        const input = prompt("الرجاء كتابة سبب الرفض (سيتم إرساله للمستخدم):");
        if (input === null) return; 
        if (!input.trim()) { alert("يجب كتابة سبب للرفض."); return; }
        reason = input;
    }

    setProcessing(true);
    try {
      // 1. الحصول على جلسة المستخدم الحالي (الأدمن الذي ينفذ العملية)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
          throw new Error("يجب تسجيل الدخول أولاً");
      }

      // 2. إرسال الطلب مع requesterId
      const response = await fetch(`/api/admin/${action}`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ 
            requestId: id, 
            reason: reason,
            requesterId: session.user.id // ⚠️ هذا السطر ضروري جداً للحارس
        }) 
      });

      const result = await response.json();
      if(!response.ok) throw new Error(result.error);
      
      alert(result.message);
      fetchData();
      setSelectedRequest(null);
    } catch(e: any) { 
        alert("خطأ: " + e.message); 
    } finally { 
        setProcessing(false); 
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };
  const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);
  const getTypeLabel = (type: string) => type === 'housing' ? '🏡 سكن' : type === 'food' ? '🍽️ مطاعم' : '🧗 تجربة';

  const menuItems = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "طلبات الانضمام", icon: UserPlus, href: "/admin/requests", show: true, badge: pendingCount },
    { label: "إدارة المعالم", icon: MapIcon, href: "/admin/landmarks", show: true },
    { label: "المستخدمين", icon: Users, href: "/admin/customers", show: true },
    { label: "المالية والأرباح", icon: DollarSign, href: "/admin/finance", show: true },
    { label: "فريق الإدارة", icon: ShieldAlert, href: "/admin/users", show: isSuperAdmin },
    { label: "الإعدادات", icon: Settings, href: "/admin/settings", show: true },
  ];

  return (
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className} relative`}>
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]">
          <Menu size={24} />
        </button>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
           <img src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" />
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

      {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />}
      
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 right-0 h-screen w-64 bg-[#151515] md:bg-black/40 border-l border-white/10 p-6 backdrop-blur-md z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute top-4 left-4 p-2 text-white/50 hover:text-white"><X size={24} /></button>
        <div className="mb-10 flex justify-center pt-4"><Link href="/"><img src="/logo.png" alt="Admin" width={120} height={50} className="opacity-90 hover:opacity-100 transition" /></Link></div>
        <nav className="space-y-2 flex-1 h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
          {menuItems.map((item, i) => item.show && (
            <Link key={i} href={item.href} onClick={() => setSidebarOpen(false)} className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}>
              <item.icon size={20} /><span>{item.label}</span>
              {item.badge && item.badge > 0 ? <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10 mt-auto"><button onClick={handleLogout} className="flex gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 hover:bg-white/5 rounded-xl transition items-center"><LogOut size={20} /> خروج</button></div>
      </aside>

      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen pt-24 md:pt-10">
        <header className="hidden md:flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><Briefcase className="text-[#C89B3C]" /> طلبات الانضمام</h1>
                <p className="text-white/60">مراجعة واعتماد شركاء النجاح الجدد.</p>
            </div>
            
            <div className="flex gap-3">
                 <Link href="/register/provider" className="flex items-center gap-2 px-4 py-2 bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 rounded-xl hover:bg-[#C89B3C]/20 transition font-bold text-sm" target="_blank">
                    <Eye size={18} /> معاينة النموذج
                 </Link>
                 <Link href="/admin/settings" className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white border border-white/10 rounded-xl hover:bg-white/10 transition font-bold text-sm">
                    <Edit3 size={18} /> تعديل الحقول
                 </Link>
            </div>
        </header>

        {/* Mobile Header */}
        <div className="md:hidden mb-6 flex justify-between items-end">
              <div>
                 <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Briefcase className="text-[#C89B3C]" size={24} /> طلبات الانضمام</h1>
                 <p className="text-white/60 text-sm">مراجعة طلبات الشركاء.</p>
              </div>
              <Link href="/register/provider" className="p-2 bg-[#C89B3C]/10 text-[#C89B3C] rounded-lg border border-[#C89B3C]/20"><Eye size={20} /></Link>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="relative flex-1"><Search className="absolute right-3 top-3 text-white/40" size={20} /><input type="text" placeholder="بحث بالاسم أو البريد..." className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-[#C89B3C] outline-none" /></div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${filter === f ? "bg-[#C89B3C] text-black font-bold" : "bg-black/20 text-white/60"}`}>
                {f === 'all' ? 'الكل' : f === 'pending' ? 'انتظار' : f === 'approved' ? 'مقبول' : 'مرفوض'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#C89B3C]" /></div> :
           filteredRequests.length === 0 ? <div className="p-20 text-center text-white/40">لا توجد طلبات.</div> : (
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right min-w-[900px]">
                <thead className="bg-black/20 text-white/50 text-xs uppercase"><tr><th className="px-6 py-4">الاسم</th><th className="px-6 py-4">الخدمة</th><th className="px-6 py-4">تاريخ الطلب</th><th className="px-6 py-4">الحالة</th><th className="px-6 py-4 text-center">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-white/5 text-sm">{filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-bold">{req.name}<div className="text-xs text-[#C89B3C] font-normal">{req.email}</div></td>
                    <td className="px-6 py-4">{getTypeLabel(req.service_type)}</td>
                    <td className="px-6 py-4 text-white/60 text-xs" dir="ltr">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs border ${req.status==='approved'?'text-emerald-400 border-emerald-400/20 bg-emerald-400/10':req.status==='rejected'?'text-red-400 border-red-400/20 bg-red-400/10':'text-amber-400 border-amber-400/20 bg-amber-400/10'}`}>{req.status === 'approved' ? 'مقبول' : req.status === 'rejected' ? 'مرفوض' : 'بانتظار المراجعة'}</span></td>
                    <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => setSelectedRequest(req)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition"><Eye size={18}/></button>
                    </td>
                    </tr>
                ))}</tbody>
                </table>
            </div>
          )}
        </div>
        
        {/* Modal التفاصيل */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1a1a1a] w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#222]">
                <div>
                    <h3 className="font-bold text-xl flex items-center gap-2 text-white"><Briefcase size={22} className="text-[#C89B3C]" /> تفاصيل طلب الانضمام</h3>
                    <p className="text-xs text-white/50 mt-1">تاريخ التقديم: {new Date(selectedRequest.created_at).toLocaleDateString('ar-SA')}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 rounded-full hover:bg-white/10 transition"><X className="text-white/50 hover:text-white" /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit">
                        <h4 className="text-[#C89B3C] font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-3"><Briefcase size={18}/> البيانات الأساسية</h4>
                        <div className="space-y-4">
                            <InfoRow label="الاسم" value={selectedRequest.name} icon={<Briefcase size={16}/>} />
                            <InfoRow label="البريد الإلكتروني" value={selectedRequest.email} icon={<Mail size={16}/>} />
                            <InfoRow label="رقم الجوال" value={selectedRequest.phone} icon={<Phone size={16}/>} />
                            <InfoRow label="نوع الخدمة" value={getTypeLabel(selectedRequest.service_type)} icon={<LayoutList size={16}/>} />
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit">
                        <h4 className="text-[#C89B3C] font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-3"><FileText size={18}/> تفاصيل إضافية</h4>
                        <div className="space-y-4">
                            {Object.entries(selectedRequest.dynamic_data || {}).map(([key, value]: any) => {
                                const images = extractImages(value);
                                const loc = getParseLocation(value);
                                const isLoc = isLocation(loc);
                                
                                if (!isLoc && images.length === 0 && typeof value !== 'boolean' && typeof value !== 'object') 
                                    return (
                                        <div key={key}>
                                            <p className="text-white/40 text-xs mb-1">{getFieldLabel(key)}</p>
                                            <p className="text-white bg-black/20 p-2 rounded border border-white/5 text-sm">{String(value)}</p>
                                        </div>
                                    ); 
                                return null; 
                            })}
                        </div>
                    </div>
                </div>

                {/* عرض الخرائط */}
                {Object.entries(selectedRequest.dynamic_data || {}).map(([key, value]: any) => {
                    const loc = getParseLocation(value);
                    if (isLocation(loc)) return (
                        <div key={key} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                            <div className="p-4 bg-white/5 flex justify-between items-center">
                                <h4 className="font-bold text-white flex items-center gap-2"><MapPin className="text-[#C89B3C]" size={18}/> {getFieldLabel(key)}</h4>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`} target="_blank" className="text-xs bg-[#C89B3C]/10 text-[#C89B3C] px-3 py-1 rounded hover:bg-[#C89B3C]/20 transition">Google Maps ↗</a>
                            </div>
                            <div className="h-64 w-full relative">
                                <Map initialViewState={{ latitude: loc.lat, longitude: loc.lng, zoom: 14 }} mapStyle="mapbox://styles/mapbox/streets-v12" mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}>
                                    <Marker latitude={loc.lat} longitude={loc.lng} color="#C89B3C" />
                                    <NavigationControl position="top-left" />
                                </Map>
                            </div>
                        </div>
                    );
                    return null;
                })}

                {/* الصور والمرفقات */}
                {Object.entries(selectedRequest.dynamic_data || {}).map(([key, value]: any) => {
                    const images = extractImages(value); 
                    
                    if (images.length > 0) return (
                        <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h4 className="text-[#C89B3C] font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-3"><Download size={18}/> {getFieldLabel(key)}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {images.map((url: string, idx: number) => (
                                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-[#C89B3C] transition bg-black/20 block">
                                        <img 
                                            src={url} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                                            alt={`attachment-${idx}`} 
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-sm"><span className="text-white font-bold text-sm">عرض</span></div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    );
                    return null;
                })}

                {/* الإقرارات */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-[#C89B3C] font-bold mb-4 border-b border-white/5 pb-3">الإقرارات</h4>
                    <div className="space-y-3">
                        {Object.entries(selectedRequest.dynamic_data || {}).map(([key, value]: any) => {
                            if (typeof value === 'boolean') {
                                return (
                                    <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${value ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                        {value ? <CheckCircle className="text-emerald-500" size={18}/> : <XCircle className="text-red-500" size={18}/>}
                                        <p className="text-sm font-bold text-white">{getFieldLabel(key)}</p>
                                    </div>
                                )
                            }
                            return null;
                        })}
                    </div>
                </div>

              </div>
              
              {selectedRequest.status === 'pending' && (
                  <div className="p-6 border-t border-white/10 bg-[#222] flex gap-4">
                    <button onClick={() => handleAction(selectedRequest.id, 'approve')} disabled={processing} className="flex-1 bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition flex justify-center gap-2 items-center">{processing ? <Loader2 className="animate-spin"/> : <><CheckCircle size={18}/> قبول</>}</button>
                    <button onClick={() => handleAction(selectedRequest.id, 'reject')} disabled={processing} className="flex-1 bg-red-500/10 text-red-400 font-bold py-3 rounded-xl hover:bg-red-500 hover:text-white transition flex justify-center gap-2 items-center border border-red-500/20">{processing ? <Loader2 className="animate-spin"/> : <><XCircle size={18}/> رفض</>}</button>
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoRow({ label, value, icon }: any) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
            <div className="text-[#C89B3C] opacity-80 bg-[#C89B3C]/10 p-2 rounded-lg">{icon}</div>
            <div>
                <p className="text-white/40 text-[10px]">{label}</p>
                <p className="text-white font-bold text-sm">{value || '-'}</p>
            </div>
        </div>
    )
}