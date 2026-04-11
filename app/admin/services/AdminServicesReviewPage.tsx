"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  CheckCircle, XCircle, Eye, Edit, Trash2, PlayCircle,
  MapPin, Clock, FileText, Save, Loader2, Filter, User, 
  Sparkles, Utensils, Mountain, Compass, Info, PauseCircle, AlertTriangle, CheckSquare, Image as ImageIcon, Video,
  Calendar, Map as MapIcon, ShieldAlert, Home, Send, HeartPulse, Waves, Car, Wind, Tv, Flame, Coffee, ShieldCheck, Ticket, Wifi, Percent,
  Activity, Briefcase, CalendarDays, CalendarOff, Users, Tent, Building, Phone, Mail, MessageCircle, Star, Navigation
} from "lucide-react";
import { Tajawal } from "next/font/google";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast, Toaster } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const ADMIN_CONTACT_INFO = `للاستفسار يرجى التواصل مع الإدارة:
Email: admin@sayyir.com
Phone: +966 50 000 0000`;

const ALL_FEATURES_DICT: Record<string, any> = {
    'yard': { label: 'يوجد حوش', icon: MapPin },
    'view': { label: 'إطلالة مميزة', icon: Mountain },
    'farm': { label: 'مزرعة', icon: MapPin },
    'main_road': { label: 'على الطريق العام', icon: MapPin },
    'services_nearby': { label: 'بالقرب من خدمات', icon: MapPin },
    'wifi': { label: 'واي فاي', icon: Wifi },
    'parking': { label: 'مواقف خاصة', icon: Car },
    'bbq': { label: 'منطقة شواء', icon: Flame },
    'pool': { label: 'مسبح خاص', icon: Waves },
    'cleaning': { label: 'خدمة تنظيف', icon: Sparkles },
    'ac': { label: 'تكييف', icon: Wind },
    'tv': { label: 'تلفزيون', icon: Tv },
    'kitchen': { label: 'مطبخ مجهز', icon: Utensils },
    'volleyball': { label: 'ملعب طائرة', icon: Activity },
    'football': { label: 'ملعب كرة قدم', icon: Activity },
    'men_majlis': { label: 'مجلس رجال', icon: Users },
    'women_majlis': { label: 'مجلس نساء', icon: Users },
    'kids_area': { label: 'ألعاب أطفال', icon: Activity },
    'green_area': { label: 'مسطحات خضراء', icon: MapPin },
    'transport': { label: 'مركبة للنقل', icon: Car },
    'tent': { label: 'خيمة', icon: Tent },
    'floor_seating': { label: 'جلسات أرضية', icon: Users },
    'chairs': { label: 'كراسي', icon: Users },
    'water': { label: 'مياه شرب', icon: Coffee },
    'food': { label: 'وجبات طعام', icon: Utensils },
    'kiosks': { label: 'أكشاك بيع', icon: Building },
    'rides': { label: 'ملاهي وألعاب', icon: Activity },
    'seating': { label: 'جلسات عامة', icon: Users },
    'cable_car': { label: 'تلفريك', icon: MapPin },
    'live_shows': { label: 'عروض حية', icon: Tv }
};

const safeArray = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') { try { return JSON.parse(data); } catch { return []; } }
    if (typeof data === 'object') return Object.values(data);
    return [];
};

const formatCompareValue = (val: any) => {
    if (val === undefined || val === null || val === '') return 'غير محدد / فارغ';
    
    if (typeof val === 'string' && val.startsWith('http')) {
        return <a href={val} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline font-bold flex items-center gap-1 w-fit"><Eye size={14}/> عرض المرفق / الرابط</a>;
    }

    if (Array.isArray(val)) {
        if (val.length === 0) return 'غير محدد / فارغ';
        if (val[0] && typeof val[0] === 'object' && 'day' in val[0]) {
            const activeDays = val.filter((d: any) => d.active);
            if (activeDays.length === 0) return 'لا يوجد أيام عمل (مغلق دائماً)';
            return activeDays.map((d: any) => {
                const shifts = d.shifts?.map((s: any) => `${s.from} - ${s.to}`).join(' و ') || '';
                return `${d.day}: ${shifts}`;
            }).join('\n');
        }
        return val.join(' ، ');
    }
    
    if (typeof val === 'object') {
        if (Object.keys(val).length === 0) return 'غير محدد / فارغ';
        if (val.startDate !== undefined || val.startTime !== undefined) {
            let res = '';
            if(val.startDate) res += `من تاريخ: ${val.startDate} `;
            if(val.endDate) res += `إلى: ${val.endDate}\n`;
            if(val.startTime) res += `من الساعة: ${val.startTime} `;
            if(val.endTime) res += `إلى: ${val.endTime}`;
            return res || JSON.stringify(val);
        }
        if (val.rooms !== undefined) {
            return `غرف: ${val.rooms} | أسرة: ${val.beds} | حمامات: ${val.bathrooms}`;
        }
        if (val.floors !== undefined) {
            return `أدوار: ${val.floors} | غرف نوم: ${val.bedrooms} | مجالس: ${val.livingRooms} | حمامات: ${val.bathrooms}`;
        }
        return JSON.stringify(val, null, 2).replace(/["{}\[\]]/g, '').replace(/,/g, '\n').trim();
    }
    
    return String(val);
};

const hasChanged = (oldVal: any, newVal: any) => {
    const normalize = (v: any) => {
        if (v === null || v === undefined) return '';
        if (Array.isArray(v) && v.length === 0) return '';
        if (typeof v === 'object' && Object.keys(v).length === 0) return '';
        return JSON.stringify(v);
    };
    return normalize(oldVal) !== normalize(newVal);
};

const AdminCompareRow = ({ label, originalValue, newValue }: { label: string, originalValue: any, newValue: any }) => (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-black/40 border border-white/5 rounded-2xl mb-3 hover:border-white/10 transition">
        <div className="w-full md:w-1/2 opacity-60 pointer-events-none border-b md:border-b-0 md:border-l border-white/10 pb-4 md:pb-0 md:pl-4">
            <span className="text-xs text-white/50 block mb-1.5">{label} (البيانات الأصلية)</span>
            <div className="bg-white/5 p-3 rounded-xl text-sm whitespace-pre-line text-white/80 leading-relaxed dir-rtl text-right min-h-[44px]">
                {formatCompareValue(originalValue)}
            </div>
        </div>
        <div className="w-full md:w-1/2">
            <span className="text-xs text-blue-400 block mb-1.5">{label} (التعديل المطلوب)</span>
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-sm text-blue-100 whitespace-pre-line leading-relaxed dir-rtl text-right min-h-[44px]">
                {formatCompareValue(newValue)}
            </div>
        </div>
    </div>
);

const getProviderName = (service: any) => {
    if (!service || !service.profiles) return 'غير معروف';
    if (Array.isArray(service.profiles)) return service.profiles[0]?.full_name || 'غير معروف';
    return service.profiles.full_name || 'غير معروف';
};

const getProviderEmail = (service: any) => {
    if (!service || !service.profiles) return '';
    if (Array.isArray(service.profiles)) return service.profiles[0]?.email || '';
    return service.profiles.email || '';
};

const getProviderPhone = (service: any) => {
    if (!service || !service.profiles) return '';
    if (Array.isArray(service.profiles)) return service.profiles[0]?.phone || '';
    return service.profiles.phone || '';
};

const getProviderCreatedAt = (service: any) => {
    if (!service || !service.profiles) return null;
    if (Array.isArray(service.profiles)) return service.profiles[0]?.created_at || null;
    return service.profiles.created_at || null;
};

const calculateTimeSince = (dateString: string | null) => {
    if (!dateString) return 'غير معروف';
    const joinDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} يوم`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} شهر`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} سنة`;
};

const isVideo = (url: string | null) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.ogg') || lowerUrl.includes('.mov') || lowerUrl.includes('video');
};

export default function ReviewServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedService, setSelectedService] = useState<any | null>(null);
  
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionToConfirm, setActionToConfirm] = useState<'reject' | 'reject_update' | 'reject_stop' | 'reject_delete' | 'admin_stop' | null>(null);

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [useCustomCommission, setUseCustomCommission] = useState(false);
  const [customCommission, setCustomCommission] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

  const [stopType, setStopType] = useState<'temporary' | 'permanent'>('temporary');
  const [stopUntil, setStopUntil] = useState("");
  const [stopReason, setStopReason] = useState("");

  const [providerStats, setProviderStats] = useState({
      approved_services: 0,
      stopped_services: 0,
      updated_services: 0,
      total_bookings: 0,
      total_earned: 0,
      paid_amount: 0,
      pending_amount: 0,
      rating: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [providerLocation, setProviderLocation] = useState<{lat: number | null, lng: number | null}>({ lat: null, lng: null });

  useEffect(() => { 
      fetchServices(); 
      fetchCounts();
  }, [filter]);

  const fetchCounts = async () => {
      try {
          const { data, error } = await supabase.from('services').select('status');
          if (error) {
              console.error("Fetch Counts Error:", error);
              return;
          }
          if (data) {
              const counts = data.reduce((acc: any, curr: any) => {
                  acc[curr.status] = (acc[curr.status] || 0) + 1;
                  return acc;
              }, {});
              setStatusCounts(counts);
          }
      } catch (err) {
          console.error("Fetch Counts Exception:", err);
      }
  };

  const fetchServices = async () => {
    try {
        setLoading(true);
        let query = supabase.from('services').select(`*, profiles (id, full_name, email, phone, created_at)`).order('created_at', { ascending: false });
        
        if (filter !== 'all') query = query.eq('status', filter);
        else query = query.neq('status', 'deleted');
        
        const { data, error } = await query;
        
        if (error) {
            console.error("Supabase Error:", error);
            alert("خطأ في جلب البيانات: " + error.message);
        } else {
            setServices(data as any[]);
        }
    } catch (err: any) {
        console.error("Unexpected Error:", err);
        alert("حدث خطأ غير متوقع أثناء جلب بيانات الخدمات.");
    } finally {
        setLoading(false); 
    }
  };

  const fetchProviderStats = async (providerId: string) => {
      if (!providerId) return;
      setStatsLoading(true);
      try {
          const { data: srvData } = await supabase.from('services').select('status').eq('provider_id', providerId);
          let approved = 0, stopped = 0, updated = 0;
          if (srvData) {
              srvData.forEach(s => {
                  if (s.status === 'approved') approved++;
                  if (s.status === 'stopped') stopped++;
                  if (s.status === 'update_requested') updated++;
              });
          }

          const { data: bkData } = await supabase.from('bookings').select('status, provider_earnings, payment_status').eq('provider_id', providerId);
          let totalBookings = 0, totalEarned = 0, paidAmount = 0, pendingAmount = 0;
          if (bkData) {
              totalBookings = bkData.length;
              bkData.forEach(b => {
                  if (b.status === 'completed' || b.status === 'confirmed') {
                      const earn = Number(b.provider_earnings) || 0;
                      totalEarned += earn;
                      if (b.payment_status === 'paid_to_provider') paidAmount += earn;
                      else pendingAmount += earn;
                  }
              });
          }

          const { data: revData } = await supabase.from('reviews').select('rating').eq('provider_id', providerId); 
          let avgRating = 0;
          if (revData && revData.length > 0) {
              const sum = revData.reduce((acc, curr) => acc + (curr.rating || 0), 0);
              avgRating = Number((sum / revData.length).toFixed(1));
          }

          const { data: reqData } = await supabase.from('provider_requests').select('dynamic_data').eq('user_id', providerId).limit(1);
          let lat = null, lng = null;
          if (reqData && reqData[0]?.dynamic_data?.location) {
              lat = reqData[0].dynamic_data.location.lat;
              lng = reqData[0].dynamic_data.location.lng;
          }

          setProviderStats({
              approved_services: approved,
              stopped_services: stopped,
              updated_services: updated,
              total_bookings: totalBookings,
              total_earned: totalEarned,
              paid_amount: paidAmount,
              pending_amount: pendingAmount,
              rating: avgRating
          });
          setProviderLocation({ lat, lng });

      } catch (err) {
          console.error("Error fetching provider stats:", err);
      } finally {
          setStatsLoading(false);
      }
  };

  const openModal = (service: any) => {
    setSelectedService(service);
    setRejectionReason(""); 
    setActionToConfirm(null);
    setStopReason("");
    setStopUntil("");
    setStopType('temporary');
    setUseCustomCommission(service.platform_commission !== null && service.platform_commission !== undefined);
    setCustomCommission(service.platform_commission ? service.platform_commission.toString() : "");
    
    const providerId = Array.isArray(service.profiles) ? service.profiles[0]?.id : service.profiles?.id;
    if (providerId) {
        fetchProviderStats(providerId);
    }
  };

  const handleUpdateCommission = async () => {
      if (!selectedService) return;
      if (useCustomCommission && !customCommission) return alert("الرجاء إدخال النسبة.");
      setSavingCommission(true);
      try {
          const newCommissionValue = useCustomCommission ? Number(customCommission) : null;
          const { error } = await supabase.from('services').update({ platform_commission: newCommissionValue }).eq('id', selectedService.id);
          if (error) throw error;
          toast.success("تم تحديث نسبة العمولة بنجاح ✅");
          fetchServices(); 
          setSelectedService({ ...selectedService, platform_commission: newCommissionValue });
      } catch (err: any) { toast.error("خطأ: " + err.message); } finally { setSavingCommission(false); }
  };

  // ✅ التعديل الرئيسي لربط الإيميلات
  const handleAction = async (action: 'approve' | 'reject' | 'approve_update' | 'reject_update' | 'approve_stop' | 'reject_stop' | 'approve_delete' | 'reject_delete' | 'admin_stop' | 'admin_reactivate') => {
    if (!selectedService) return;
    
    if (action.startsWith('reject') && action !== 'reject_stop' && action !== 'reject_delete' && !rejectionReason.trim()) return toast.error("الرجاء كتابة سبب الرفض.");
    if ((action === 'reject_stop' || action === 'reject_delete') && !rejectionReason.trim()) return toast.error("الرجاء كتابة سبب الرفض.");
    if (action === 'approve' && useCustomCommission && !customCommission) return toast.error("الرجاء إدخال نسبة العمولة المخصصة.");

    if (action === 'admin_stop') {
        if (!stopReason.trim()) return toast.error("يجب توضيح سبب الإيقاف.");
        if (stopType === 'temporary' && !stopUntil) return toast.error("يجب تحديد تاريخ الانتهاء.");
    }

    setActionLoading(true);
    try {
      let updates: any = {};
      let emailType = ''; // لتحديد نوع الإيميل الذي سيرسل

      if (action === 'approve') {
          updates = { status: 'approved', rejection_reason: null, platform_commission: useCustomCommission ? Number(customCommission) : null }; 
          emailType = 'service_approved';
      }
      if (action === 'reject') {
          updates = { status: 'rejected', rejection_reason: `${rejectionReason}\n\n${ADMIN_CONTACT_INFO}` }; 
          emailType = 'service_rejected';
      }
      if (action === 'approve_update') {
          updates = { ...selectedService.pending_updates, status: 'approved', pending_updates: null };
          emailType = 'update_approved';
      }
      if (action === 'reject_update') {
          updates = { status: 'approved', pending_updates: null };
          // يمكن إضافة emailType = 'update_rejected' لاحقاً إذا احتجت
      }
      if (action === 'approve_stop') {
          updates = { status: 'stopped' };
          emailType = 'stop_approved';
      }
      if (action === 'reject_stop') {
          updates = { status: 'approved' };
      }
      if (action === 'approve_delete') {
          updates = { status: 'deleted' };
          emailType = 'delete_approved';
      }
      if (action === 'reject_delete') {
          updates = { status: 'approved', delete_reason: null };
      }
      
      if (action === 'admin_stop') {
          updates = { 
              status: 'stopped', 
              stop_dates: { type: stopType, reason: stopReason, until: stopType === 'temporary' ? stopUntil : null, stopped_at: new Date().toISOString() } 
          };
      }

      if (action === 'admin_reactivate') updates = { status: 'approved', stop_dates: null };

      // 1. تحديث حالة الخدمة في قاعدة البيانات
      const { error: updateError } = await supabase.from('services').update(updates).eq('id', selectedService.id);
      if (updateError) throw updateError;

      // 2. إرسال الإشعار للمزود (إذا كان الإجراء يتطلب إشعاراً)
      if (emailType) {
          const providerEmail = getProviderEmail(selectedService);
          const providerName = getProviderName(selectedService);
          const providerPhone = getProviderPhone(selectedService);

          if (providerEmail) {
              await fetch('/api/emails/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      type: emailType,
                      providerEmail: providerEmail,
                      providerName: providerName,
                      serviceTitle: selectedService.title,
                      providerPhone: providerPhone,
                      reason: rejectionReason // في حالة الرفض
                  })
              }).catch(e => console.error("فشل إرسال إشعار للمزود:", e));
          }
      }

      toast.success("تم تنفيذ الإجراء وتحديث الخدمة بنجاح ✅");
      setSelectedService(null);
      fetchServices(); 
      fetchCounts(); 

    } catch (error: any) { 
      toast.error("حدث خطأ: " + error.message); 
    } finally { 
      setActionLoading(false); 
      setActionToConfirm(null); 
    }
  };

  const getTranslatedFeature = (id: string) => {
      const feat = ALL_FEATURES_DICT[id];
      if(feat) return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><feat.icon size={14} className="text-[#C89B3C]" /> {feat.label}</span>;
      return <span key={id} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {id}</span>;
  };

  return (
    <div className={`animate-in fade-in duration-500 pb-10 ${tajawal.className}`} dir="rtl">
      <Toaster position="top-center" richColors />
      <header className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
               <CheckCircle className="text-[#C89B3C]" /> مراجعة الخدمات
            </h1>
            <p className="text-white/60 text-sm">إدارة الطلبات، التعديلات، والحذوفات المقدمة من الشركاء.</p>
        </div>
      </header>

      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        {[
            { key: 'pending', label: 'خدمات جديدة', icon: Clock }, 
            { key: 'update_requested', label: 'طلبات تعديل', icon: Edit }, 
            { key: 'stop_requested', label: 'طلبات إيقاف', icon: PauseCircle }, 
            { key: 'delete_requested', label: 'طلبات حذف نهائي', icon: Trash2 }, 
            { key: 'approved', label: 'الخدمات المفعلة', icon: CheckCircle }, 
            { key: 'stopped', label: 'المتوقفة', icon: PauseCircle }, 
            { key: 'rejected', label: 'المرفوضة', icon: XCircle }, 
            { key: 'deleted', label: 'المحذوفة', icon: Trash2 }, 
            { key: 'all', label: 'الكل', icon: Filter }
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl border transition whitespace-nowrap ${filter === f.key ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'bg-black/20 text-white/60 border-white/10 hover:bg-white/5'}`}>
            <f.icon size={16} /> 
            {f.label}
            {['pending', 'update_requested', 'stop_requested', 'delete_requested'].includes(f.key) && statusCounts[f.key] > 0 && (
                <span className="bg-red-500 text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                    {statusCounts[f.key]}
                </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#C89B3C]" size={40}/></div> : services.length === 0 ? <div className="text-center p-20 bg-white/5 rounded-2xl border border-white/5 text-white/40">لا توجد خدمات في هذا القسم حالياً.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const mainMedia = service.images && service.images.length > 0 ? service.images[0] : (service.image_url || null);
            const mediaIsVideo = isVideo(mainMedia);

            const currentPrice = service.status === 'update_requested' && service.pending_updates?.price !== undefined 
                ? service.pending_updates.price 
                : service.price;

            return (
                <div key={service.id} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden p-5 shadow-lg flex flex-col hover:border-[#C89B3C]/30 transition group relative">
                    
                    {['pending', 'update_requested', 'stop_requested', 'delete_requested'].includes(service.status) && (
                        <span className="absolute top-4 left-4 flex h-3 w-3 z-20">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}

                    <div className="relative w-full h-40 mb-4 rounded-xl overflow-hidden bg-black flex items-center justify-center shrink-0">
                        {mainMedia ? (
                            mediaIsVideo ? (
                                <>
                                    <video src={`${mainMedia}#t=0.001`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500" autoPlay muted loop playsInline preload="metadata"/>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none"><PlayCircle className="text-white/80" size={32}/></div>
                                </>
                            ) : (
                                <Image src={mainMedia} alt={service.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                            )
                        ) : (
                            <ImageIcon className="text-white/20" size={40}/>
                        )}
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-[#C89B3C]/10 flex items-center justify-center text-[#C89B3C] font-bold text-lg">{service.title.charAt(0)}</div>
                        <div className="pl-4"><h3 className="font-bold text-white line-clamp-1 text-lg">{service.title}</h3><p className="text-xs text-white/50 flex items-center gap-1"><User size={10}/> {getProviderName(service)}</p></div>
                    </div>
                    
                    <div className="bg-black/20 p-3 rounded-xl mb-4 space-y-2 text-sm border border-white/5">
                    <div className="flex justify-between"><span className="text-white/50">السعر:</span><span className="text-[#C89B3C] font-bold">{Number(currentPrice) > 0 ? `${currentPrice} ﷼` : 'مجاني'}</span></div>
                    <div className="flex justify-between">
                        <span className="text-white/50">النوع:</span>
                        <span className="text-white bg-white/5 px-2 py-0.5 rounded text-[10px]">
                            {service.sub_category === 'facility' ? 'مرفق' : service.sub_category === 'lodging' ? 'نزل' : service.sub_category === 'experience' ? 'تجربة' : 'فعالية'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white/50">الحالة:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            service.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            service.status === 'update_requested' ? 'bg-blue-500/20 text-blue-400' :
                            service.status === 'stop_requested' ? 'bg-orange-500/20 text-orange-400' :
                            service.status === 'delete_requested' ? 'bg-red-600/20 text-red-500' :
                            service.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                            service.status === 'stopped' ? 'bg-gray-500/20 text-gray-400' : 
                            service.status === 'deleted' ? 'bg-red-900/20 text-red-500' : 
                            'bg-red-500/20 text-red-400'
                        }`}>
                            {
                                service.status === 'pending' ? 'بانتظار المراجعة' :
                                service.status === 'update_requested' ? 'طلب تعديل' :
                                service.status === 'stop_requested' ? 'طلب إيقاف' :
                                service.status === 'delete_requested' ? 'طلب حذف' :
                                service.status === 'approved' ? 'نشط' : 
                                service.status === 'stopped' ? 'متوقفة' : 
                                service.status === 'deleted' ? 'محذوفة' : 
                                'مرفوضة'
                            }
                        </span>
                    </div>
                    </div>
                    <div className="mt-auto flex gap-2 w-full">
                        <button onClick={() => openModal(service)} className="flex-1 py-2.5 bg-white/5 hover:bg-[#C89B3C] hover:text-black font-bold rounded-xl transition flex justify-center items-center gap-2 border border-white/5 group-hover:border-[#C89B3C] text-sm"><Eye size={16}/> مراجعة الطلب</button>
                    </div>
                </div>
            );
          })}
        </div>
      )}

      {selectedService && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#1e1e1e] w-full max-w-6xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
              <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                      {selectedService.status === 'update_requested' ? <Edit className="text-blue-400"/> : <FileText className="text-[#C89B3C]" />} 
                      {selectedService.status === 'update_requested' ? 'مراجعة طلب التعديل' : 'تفاصيل الخدمة'}
                  </h2>
                  <p className="text-xs text-white/50 mt-1 font-mono">ID: {selectedService.id}</p>
              </div>
              <button onClick={() => setSelectedService(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><XCircle size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                
                {selectedService.status === 'stop_requested' && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-xl mb-6">
                        <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2"><PauseCircle size={20}/> طلب إيقاف الخدمة من المزود</h3>
                        <p className="text-white text-sm">سبب المزود للإيقاف: <span className="font-bold text-white bg-black/40 px-3 py-1.5 rounded-lg mr-2 inline-block">{selectedService.details?.stop_reason || 'غير محدد'}</span></p>
                    </div>
                )}

                {selectedService.status === 'delete_requested' && (
                    <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl mb-6">
                        <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2"><Trash2 size={20}/> طلب حذف نهائي من المزود</h3>
                        <p className="text-white text-sm">سبب المزود للحذف: <span className="font-bold text-white bg-black/40 px-3 py-1.5 rounded-lg mr-2 inline-block">{selectedService.delete_reason || 'غير محدد'}</span></p>
                    </div>
                )}

                {selectedService.status === 'stopped' && selectedService.stop_dates && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-xl mb-6">
                        <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2"><PauseCircle size={20}/> هذه الخدمة موقوفة حالياً من الإدارة</h3>
                        <p className="text-white text-sm mb-1">نوع الإيقاف: <span className="font-bold text-white">{selectedService.stop_dates.type === 'temporary' ? `مؤقت حتى تاريخ ${selectedService.stop_dates.until}` : 'إيقاف نهائي (مؤرشفة)'}</span></p>
                        <p className="text-white text-sm">السبب: <span className="font-bold text-white">{selectedService.stop_dates.reason}</span></p>
                    </div>
                )}

                {selectedService.status === 'update_requested' && selectedService.pending_updates && (
                    <div className="mb-8">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl mb-6 flex items-start gap-3">
                            <Info className="text-blue-400 shrink-0" size={24}/>
                            <div>
                                <h3 className="text-blue-400 font-bold mb-2">طلب تعديل بيانات شامل</h3>
                                <p className="text-blue-100/80 text-sm leading-relaxed">قام المزود بطلب تعديل البيانات الموضحة أدناه. في حال الموافقة سيتم استبدال البيانات القديمة بالجديدة. في حال الرفض ستستمر الخدمة بالظهور بالبيانات الأصلية.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">مقارنة التعديلات المطلوبة</h3>
                            
                            {(() => {
                                const oldDet = selectedService.details || {};
                                const newDet = selectedService.pending_updates.details || {};
                                const pending = selectedService.pending_updates;

                                return (
                                    <>
                                        {hasChanged(selectedService.title, pending.title) && <AdminCompareRow label="عنوان الخدمة" originalValue={selectedService.title} newValue={pending.title}/>}
                                        {hasChanged(selectedService.price, pending.price) && <AdminCompareRow label="السعر (ريال)" originalValue={selectedService.price} newValue={pending.price}/>}
                                        {hasChanged(selectedService.description, pending.description) && <AdminCompareRow label="الوصف" originalValue={selectedService.description} newValue={pending.description}/>}
                                        {hasChanged(selectedService.commercial_license, pending.commercial_license) && <AdminCompareRow label="رابط/ملف الترخيص" originalValue={selectedService.commercial_license} newValue={pending.commercial_license}/>}
                                        {hasChanged(oldDet.policies, newDet.policies) && <AdminCompareRow label="سياسات المكان" originalValue={oldDet.policies} newValue={newDet.policies}/>}
                                        {hasChanged(oldDet.area, newDet.area) && <AdminCompareRow label="المساحة" originalValue={oldDet.area} newValue={newDet.area}/>}
                                        {hasChanged(oldDet.max_capacity, newDet.max_capacity) && <AdminCompareRow label="السعة (أشخاص)" originalValue={oldDet.max_capacity} newValue={newDet.max_capacity}/>}
                                        {hasChanged(oldDet.apartment_details, newDet.apartment_details) && <AdminCompareRow label="تفاصيل الشقة" originalValue={oldDet.apartment_details} newValue={newDet.apartment_details}/>}
                                        {hasChanged(oldDet.experience_info?.duration, newDet.experience_info?.duration) && <AdminCompareRow label="مدة التجربة" originalValue={oldDet.experience_info?.duration} newValue={newDet.experience_info?.duration}/>}
                                        {hasChanged(oldDet.experience_info?.difficulty, newDet.experience_info?.difficulty) && <AdminCompareRow label="مستوى الصعوبة" originalValue={oldDet.experience_info?.difficulty} newValue={newDet.experience_info?.difficulty}/>}
                                        {hasChanged(oldDet.experience_info?.what_to_bring, newDet.experience_info?.what_to_bring) && <AdminCompareRow label="المطلوب إحضاره" originalValue={oldDet.experience_info?.what_to_bring} newValue={newDet.experience_info?.what_to_bring}/>}
                                        {hasChanged(oldDet.experience_info?.cancellation_policy, newDet.experience_info?.cancellation_policy) && <AdminCompareRow label="سياسة الإلغاء" originalValue={oldDet.experience_info?.cancellation_policy} newValue={newDet.experience_info?.cancellation_policy}/>}
                                        {hasChanged(oldDet.event_info?.dates, newDet.event_info?.dates) && <AdminCompareRow label="تواريخ وأوقات الفعالية" originalValue={oldDet.event_info?.dates} newValue={newDet.event_info?.dates}/>}
                                        {hasChanged(oldDet.event_info?.child_price, newDet.event_info?.child_price) && <AdminCompareRow label="سعر الأطفال" originalValue={oldDet.event_info?.child_price} newValue={newDet.event_info?.child_price}/>}
                                        {hasChanged(selectedService.work_schedule, pending.work_schedule) && <AdminCompareRow label="أوقات الدوام الأسبوعية" originalValue={selectedService.work_schedule} newValue={pending.work_schedule}/>}
                                    </>
                                );
                            })()}
                        </div>
                        <div className="h-px bg-white/10 my-8"></div>
                    </div>
                )}

                {(() => {
                    const displayImages = selectedService.images?.length > 0 
                        ? selectedService.images 
                        : (selectedService.details?.images?.length > 0 
                            ? selectedService.details.images 
                            : (selectedService.image_url ? [selectedService.image_url] : []));

                    if (displayImages.length === 0) return null;

                    return (
                        <div className="mb-8">
                            <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><ImageIcon size={16}/> صور / فيديو العرض (الحالية)</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                {displayImages.map((url: string, i: number) => (
                                    <div key={i} onClick={() => setZoomedImage(url)} className="relative w-40 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 group cursor-pointer hover:border-[#C89B3C]/50 transition bg-black/40">
                                        {isVideo(url) ? ( 
                                            <>
                                                <video src={`${url}#t=0.001`} className="w-full h-full object-cover" autoPlay muted loop playsInline preload="metadata" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition">
                                                    <PlayCircle className="text-white/80" size={32}/>
                                                </div>
                                            </> 
                                        ) : ( 
                                            <Image src={url} fill className="object-cover group-hover:scale-110 transition duration-500" alt={`Image ${i}`}/> 
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        
                        <div className="bg-black/20 p-5 rounded-xl border border-white/5 space-y-5">
                            <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2 border-b border-white/10 pb-3"><User size={18}/> بيانات المزود والتصنيف</h3>
                            
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                    <span className="text-white/50">اسم المزود:</span> 
                                    <span className="font-bold">{getProviderName(selectedService)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                    <span className="text-white/50">القسم الرئيسي:</span> 
                                    <span className="font-bold">{selectedService.service_category === 'facility' ? 'مرفق أو فعالية' : 'تجربة سياحية'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                    <span className="text-white/50">النوع الفرعي:</span> 
                                    <span className="bg-[#C89B3C]/20 text-[#C89B3C] px-2 py-1 rounded font-bold">{selectedService.sub_category}</span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/10">
                                <h4 className="text-xs text-white/50 mb-2">معلومات التواصل:</h4>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <a href={`mailto:${getProviderEmail(selectedService)}`} className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 p-3 rounded-lg flex items-center justify-center gap-2 transition text-xs font-mono font-bold">
                                        <Mail size={14}/> إرسال إيميل
                                    </a>
                                    <a href={`https://wa.me/${getProviderPhone(selectedService).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-3 rounded-lg flex items-center justify-center gap-2 transition text-xs font-mono font-bold">
                                        <MessageCircle size={14}/> مراسلة واتساب
                                    </a>
                                </div>
                                <div className="text-center mt-2 text-xs font-mono text-white/40">{getProviderPhone(selectedService)} | {getProviderEmail(selectedService)}</div>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <h4 className="text-xs text-white/50 mb-3 flex items-center justify-between">
                                    <span>إحصائيات ونشاط المزود</span>
                                    {statsLoading && <Loader2 size={12} className="animate-spin" />}
                                </h4>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-4">
                                    <div className="bg-white/5 p-2 rounded-lg">
                                        <span className="block text-[10px] text-white/40 mb-1">التقييم</span>
                                        <span className="font-bold flex items-center justify-center gap-1 text-yellow-400">{providerStats.rating} <Star size={10} className="fill-yellow-400"/></span>
                                    </div>
                                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                                        <span className="block text-[10px] text-emerald-400/70 mb-1">خدمات مفعلة</span>
                                        <span className="font-bold text-emerald-400">{providerStats.approved_services}</span>
                                    </div>
                                    <div className="bg-orange-500/10 p-2 rounded-lg">
                                        <span className="block text-[10px] text-orange-400/70 mb-1">خدمات معدلة</span>
                                        <span className="font-bold text-orange-400">{providerStats.updated_services}</span>
                                    </div>
                                    <div className="bg-red-500/10 p-2 rounded-lg">
                                        <span className="block text-[10px] text-red-400/70 mb-1">خدمات متوقفة</span>
                                        <span className="font-bold text-red-400">{providerStats.stopped_services}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-sm">
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <span className="block text-xs text-white/50 mb-1">إجمالي الحجوزات</span>
                                        <span className="font-bold text-white">{providerStats.total_bookings}</span>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <span className="block text-xs text-white/50 mb-1">إجمالي الرصيد</span>
                                        <span className="font-bold text-[#C89B3C] font-mono">{providerStats.total_earned} ﷼</span>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                        <span className="block text-xs text-emerald-400/70 mb-1">المستلم</span>
                                        <span className="font-bold text-emerald-400 font-mono">{providerStats.paid_amount} ﷼</span>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 sm:col-span-3 flex justify-between items-center px-4">
                                        <span className="text-xs text-orange-400/70">المتبقي (لم يستلم):</span>
                                        <span className="font-bold text-orange-400 font-mono text-lg">{providerStats.pending_amount} ﷼</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-4 text-[10px] text-white/40">
                                    <span>تاريخ الانضمام: {new Date(getProviderCreatedAt(selectedService)).toLocaleDateString('ar-SA')}</span>
                                    <span>المدة بالمنصة: {calculateTimeSince(getProviderCreatedAt(selectedService))}</span>
                                </div>
                            </div>
                            
                            {providerLocation.lat && providerLocation.lng && (
                                <a href={`http://googleusercontent.com/maps.google.com/maps?q=${providerLocation.lat},${providerLocation.lng}`} target="_blank" rel="noreferrer" className="w-full mt-2 bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl flex items-center justify-center gap-2 transition text-sm font-bold border border-white/10">                                    <MapPin size={16} className="text-[#C89B3C]"/> عرض المقر/الموقع الرسمي للمزود
                                </a>
                            )}
                        </div>

                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                            <h3 className="text-[#C89B3C] font-bold text-sm mb-2">البيانات الأساسية الحالية</h3>
                            <div><p className="text-xs text-white/50 mb-1">العنوان</p><p className="font-bold text-lg">{selectedService.title}</p></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-white/50 mb-1">
                                        {selectedService.sub_category === 'lodging' ? 'سعر الليلة' : selectedService.sub_category === 'event' ? 'تذكرة البالغين' : 'السعر'}
                                    </p>
                                    <p className="font-bold text-[#C89B3C] text-xl font-mono">
                                        {Number(selectedService.status === 'update_requested' && selectedService.pending_updates?.price !== undefined ? selectedService.pending_updates.price : selectedService.price) > 0 
                                            ? `${selectedService.status === 'update_requested' && selectedService.pending_updates?.price !== undefined ? selectedService.pending_updates.price : selectedService.price} ﷼` 
                                            : 'مجاني'
                                        }
                                    </p>
                                </div>
                                
                                {selectedService.sub_category === 'event' && (selectedService.status === 'update_requested' ? selectedService.pending_updates?.details?.event_info?.child_price : selectedService.details?.event_info?.child_price) !== undefined && (
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">تذكرة الأطفال</p>
                                        <p className="font-bold text-[#C89B3C] text-xl font-mono">
                                            {Number(selectedService.status === 'update_requested' ? selectedService.pending_updates?.details?.event_info?.child_price : selectedService.details?.event_info?.child_price) > 0 
                                                ? `${selectedService.status === 'update_requested' ? selectedService.pending_updates?.details?.event_info?.child_price : selectedService.details?.event_info?.child_price} ﷼` 
                                                : 'مجاني'
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div><p className="text-xs text-white/50 mb-1">الوصف</p><p className="text-white/80 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 whitespace-pre-line">{selectedService.description}</p></div>
                        </div>

                        {(selectedService.status === 'pending' || selectedService.status === 'approved' || selectedService.status === 'update_requested') && (
                            <div className="bg-black/40 border border-white/10 p-5 rounded-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Percent size={18}/> إعدادات عمولة المنصة</h3>
                                    <button onClick={handleUpdateCommission} disabled={savingCommission} className="bg-[#C89B3C] hover:bg-white text-black font-bold text-xs px-4 py-2 rounded-lg transition flex items-center gap-2">
                                        {savingCommission ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} حفظ النسبة
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="radio" name="service_commission" checked={!useCustomCommission} onChange={() => setUseCustomCommission(false)} className="accent-[#C89B3C] w-4 h-4" />
                                        <span className="text-sm text-white/90">اعتماد النسبة العامة للقسم</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="radio" name="service_commission" checked={useCustomCommission} onChange={() => setUseCustomCommission(true)} className="accent-[#C89B3C] w-4 h-4" />
                                        <span className="text-sm text-white/90">تحديد نسبة مخصصة</span>
                                    </label>
                                </div>
                                {useCustomCommission && (
                                    <div className="mt-4 flex items-center gap-3 animate-in fade-in">
                                        <input type="number" min="0" max="100" placeholder="النسبة (مثال: 15)" className="w-48 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#C89B3C] outline-none text-white" value={customCommission} onChange={(e) => setCustomCommission(e.target.value)} />
                                        <span className="text-white/50 text-sm font-bold">% من الإيراد</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ========= العمود الثاني (اليسار) ========= */}
                    <div className="space-y-6">
                        
                        {selectedService.location_lat && selectedService.location_lng && (
                            <div className="bg-black/20 rounded-xl border border-white/5 p-4 flex flex-col gap-3">
                                <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><MapPin size={16}/> موقع الخدمة الفعلي</h3>
                                <div className="h-48 rounded-lg overflow-hidden border border-white/10 relative shadow-lg">
                                    <Map initialViewState={{ latitude: selectedService.location_lat, longitude: selectedService.location_lng, zoom: 12 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN}>
                                        <NavigationControl showCompass={false}/>
                                        <Marker latitude={selectedService.location_lat} longitude={selectedService.location_lng} color="#C89B3C"/>
                                    </Map>
                                    <a href={`http://googleusercontent.com/maps.google.com/maps?q=${selectedService.location_lat},${selectedService.location_lng}`} target="_blank" rel="noreferrer" className="w-full bg-[#C89B3C]/10 hover:bg-[#C89B3C]/20 text-[#C89B3C] p-2.5 rounded-lg flex items-center justify-center gap-2 transition text-xs font-bold border border-[#C89B3C]/20">    <Navigation size={14}/> التوجه إلى موقع الخدمة بخرائط جوجل
</a>
                                </div>
                            </div>
                        )}

                        {selectedService.sub_category === 'facility' && safeArray(selectedService.details?.facility_services).length > 0 && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Activity size={16}/> الخدمات المتوفرة في المرفق</h3>
                                <div className="space-y-2">
                                    {safeArray(selectedService.details.facility_services).map((srv: any, i: number) => (
                                        <div key={i} className="flex gap-3 bg-white/5 p-3 rounded-lg items-center border border-white/5">
                                            {srv.image_url ? <Image src={srv.image_url} width={40} height={40} className="rounded object-cover" alt="img"/> : <div className="w-10 h-10 bg-black/40 rounded flex items-center justify-center shrink-0"><ImageIcon size={14} className="text-white/20"/></div>}
                                            <div><p className="text-sm font-bold text-white">{srv.name}</p>{srv.description && <p className="text-xs text-white/50">{srv.description}</p>}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedService.sub_category === 'lodging' && (safeArray(selectedService.details?.features).length > 0 || safeArray(selectedService.details?.custom_features).length > 0) && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Sparkles size={16}/> مميزات النزل</h3>
                                <div className="flex flex-wrap gap-2">
                                    {safeArray(selectedService.details.features).map((feat: string, i: number) => getTranslatedFeature(feat))}
                                    {safeArray(selectedService.details.custom_features).map((feat: string, i: number) => <span key={`c-${i}`} className="text-xs bg-white/5 text-white/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><CheckSquare size={14} className="text-[#C89B3C]" /> {feat}</span>)}
                                </div>
                            </div>
                        )}

                        {selectedService.details?.policies && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                                <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><ShieldAlert size={16}/> سياسات وشروط المكان</h3>
                                <p className="text-sm text-white/80 whitespace-pre-line bg-white/5 p-3 rounded-lg border border-white/5">{selectedService.details.policies}</p>
                            </div>
                        )}

                        {safeArray(selectedService.work_schedule).length > 0 && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Clock size={16}/> أوقات العمل والدوام</h3>
                                <div className="space-y-2">
                                    {safeArray(selectedService.work_schedule).map((day: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                            <span className="text-white/70 font-bold">{day.day}</span>
                                            {day.active ? (
                                                <div className="flex flex-wrap justify-end gap-1.5">
                                                    {safeArray(day.shifts).map((s:any, idx:number) => <span key={idx} className="bg-white/10 px-2 py-0.5 rounded text-xs dir-ltr">{s.from} - {s.to}</span>)}
                                                </div>
                                            ) : <span className="text-[10px] text-red-400 bg-red-400/5 px-2 py-1 rounded">مغلق</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* 🌟 تفاصيل النزل السياحي (المساحة، السعة، الغرف) */}
                        {selectedService.sub_category === 'lodging' && selectedService.details?.lodging_type && (
                             <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                                <h3 className="text-[#C89B3C] font-bold text-sm mb-2 flex items-center gap-2"><Home size={16}/> تفاصيل النزل السياحي</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><p className="text-xs text-white/50">نوع النزل</p><p className="font-bold">{selectedService.details.lodging_type === 'other' ? selectedService.details.custom_lodging_type : selectedService.details.lodging_type}</p></div>
                                    <div><p className="text-xs text-white/50">عدد الوحدات/الغرف</p><p>{selectedService.details.number_of_units || 'غير محدد'}</p></div>
                                    {selectedService.details.area && <div><p className="text-xs text-white/50">المساحة</p><p dir="ltr" className="text-right">{selectedService.details.area} m²</p></div>}
                                    {selectedService.max_capacity && <div><p className="text-xs text-white/50">السعة (أشخاص)</p><p>{selectedService.max_capacity}</p></div>}
                                    {selectedService.details.target_audience && <div><p className="text-xs text-white/50">مخصص لـ</p><p>{selectedService.details.target_audience === 'singles' ? 'عزاب' : selectedService.details.target_audience === 'families' ? 'عوايل' : 'الكل'}</p></div>}
                                </div>
                                
                                {selectedService.details.apartment_details && (
                                    <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-sm text-center">
                                        <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">غرف</span>{selectedService.details.apartment_details.rooms}</div>
                                        <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">أسرة</span>{selectedService.details.apartment_details.beds}</div>
                                        <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">حمامات</span>{selectedService.details.apartment_details.bathrooms}</div>
                                    </div>
                                )}
                                {selectedService.details.house_details && (
                                    <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-4 gap-2 text-sm text-center">
                                        <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">أدوار</span>{selectedService.details.house_details.floors}</div>
                                        <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">غرف نوم</span>{selectedService.details.house_details.bedrooms}</div>
                                        <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">مجالس</span>{selectedService.details.house_details.livingRooms}</div>
                                        <div className="bg-white/5 rounded p-1"><span className="block text-[10px] text-white/50">حمامات</span>{selectedService.details.house_details.bathrooms}</div>
                                    </div>
                                )}

                                {selectedService.details.deposit_config?.required && (
                                    <div className="mt-3 bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg text-xs">
                                        <p className="text-orange-400 font-bold mb-1"><ShieldCheck size={12} className="inline mr-1"/> تأمين مطلوب</p>
                                        <p className="text-white/80">الدفع: {selectedService.details.deposit_config.paymentTime === 'with_booking' ? 'مع الحجز بالمنصة' : 'نقداً عند الوصول'}</p>
                                        <p className="text-white/80">الحالة: {selectedService.details.deposit_config.isRefundable ? 'مسترد' : 'غير مسترد'}</p>
                                    </div>
                                )}
                             </div>
                        )}

                        {/* 🌟 تفاصيل التجربة السياحية (Experience) */}
                        {selectedService.sub_category === 'experience' && selectedService.details?.experience_info && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Compass size={16}/> تفاصيل التجربة السياحية</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-xs text-white/50">مستوى الصعوبة</p><p className="font-bold text-sm">{selectedService.details.experience_info.difficulty}</p></div>
                                    <div><p className="text-xs text-white/50">مدة التجربة</p><p className="font-bold text-sm">{selectedService.details.experience_info.duration}</p></div>
                                    <div><p className="text-xs text-white/50">الفئة المستهدفة</p><p className="font-bold text-sm">{selectedService.details.experience_info.target_audience === 'both' ? 'الكل' : selectedService.details.experience_info.target_audience === 'families' ? 'عوايل' : 'عزاب'}</p></div>
                                    <div><p className="text-xs text-white/50">دخول الأطفال</p><p className="font-bold text-sm">{selectedService.details.experience_info.children_allowed ? 'مسموح' : 'ممنوع'}</p></div>
                                </div>
                                
                                {safeArray(selectedService.details.experience_info.dates).length > 0 && (
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">تواريخ الانعقاد والوقت</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="text-xs bg-[#C89B3C] text-black px-2 py-1 rounded font-bold">{selectedService.details.experience_info.start_time}</span>
                                            {safeArray(selectedService.details.experience_info.dates).map((d: string, i: number) => <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded dir-ltr">{d}</span>)}
                                        </div>
                                    </div>
                                )}

                                {(safeArray(selectedService.details.experience_info.included_services).length > 0 || safeArray(selectedService.details.experience_info.custom_services).length > 0) && (
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">الخدمات المشمولة</p>
                                        <div className="flex flex-wrap gap-1">
                                            {safeArray(selectedService.details.experience_info.included_services).map((srv: string, i: number) => (
                                                <span key={i} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">{ALL_FEATURES_DICT[srv]?.label || srv}</span>
                                            ))}
                                            {safeArray(selectedService.details.experience_info.custom_services).map((srv: string, i: number) => (
                                                <span key={`cust-${i}`} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">{srv}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedService.details.experience_info.food_details && (
                                    <div className="bg-white/5 p-3 rounded-lg text-xs space-y-1">
                                        <p className="text-[#C89B3C] font-bold mb-1">تفاصيل الطعام</p>
                                        <p><span className="text-white/50">النوع:</span> {selectedService.details.experience_info.food_details.mealType}</p>
                                        <p><span className="text-white/50">المشروبات:</span> {selectedService.details.experience_info.food_details.drinks}</p>
                                        <p><span className="text-white/50">المكونات:</span> {selectedService.details.experience_info.food_details.contents}</p>
                                        {selectedService.details.experience_info.food_details.calories && <p><span className="text-white/50">السعرات:</span> {selectedService.details.experience_info.food_details.calories}</p>}
                                    </div>
                                )}

                                {selectedService.details.experience_info.what_to_bring && <div><p className="text-xs text-white/50">المطلوب إحضاره</p><p className="text-sm bg-white/5 p-2 rounded-lg mt-1">{selectedService.details.experience_info.what_to_bring}</p></div>}
                                {selectedService.details.experience_info.cancellation_policy && <div><p className="text-xs text-white/50">سياسة الإلغاء</p><p className="text-sm bg-white/5 p-2 rounded-lg mt-1">{selectedService.details.experience_info.cancellation_policy}</p></div>}
                            </div>
                        )}

                        {/* 🌟 تفاصيل الفعالية (Event) */}
                        {selectedService.sub_category === 'event' && selectedService.details?.event_info && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                <h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><Ticket size={16}/> تفاصيل وتواريخ الفعالية</h3>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm bg-white/5 p-3 rounded-lg">
                                    <div><p className="text-xs text-white/50">من تاريخ</p><p className="font-bold dir-ltr text-left">{selectedService.details.event_info.dates?.startDate}</p></div>
                                    <div><p className="text-xs text-white/50">إلى تاريخ</p><p className="font-bold dir-ltr text-left">{selectedService.details.event_info.dates?.endDate}</p></div>
                                    <div><p className="text-xs text-white/50">من الساعة</p><p className="font-bold dir-ltr text-left">{selectedService.details.event_info.dates?.startTime}</p></div>
                                    <div><p className="text-xs text-white/50">إلى الساعة</p><p className="font-bold dir-ltr text-left">{selectedService.details.event_info.dates?.endTime}</p></div>
                                </div>

                                {(safeArray(selectedService.details.event_info.activities).length > 0 || safeArray(selectedService.details.event_info.custom_activities).length > 0) && (
                                    <div>
                                        <p className="text-xs text-white/50 mb-2">الفعاليات الداخلية المتاحة</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {safeArray(selectedService.details.event_info.activities).map((act: string, i: number) => (
                                                <span key={i} className="text-xs bg-[#C89B3C]/10 text-[#C89B3C] px-2 py-1 rounded">{ALL_FEATURES_DICT[act]?.label || act}</span>
                                            ))}
                                            {safeArray(selectedService.details.event_info.custom_activities).map((act: string, i: number) => (
                                                <span key={`cust-${i}`} className="text-xs bg-[#C89B3C]/10 text-[#C89B3C] px-2 py-1 rounded">{act}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedService.commercial_license && (
                            <div className="bg-[#C89B3C]/10 p-4 rounded-xl border border-[#C89B3C]/20 flex justify-between items-center">
                                <div><h3 className="text-[#C89B3C] font-bold text-sm flex items-center gap-2"><FileText size={16}/> الترخيص التجاري</h3><p className="text-xs text-white/50 mt-1">مرفق من قبل المزود</p></div>
                                <a href={selectedService.commercial_license} target="_blank" rel="noreferrer" className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-white transition flex items-center gap-2"><Eye size={14}/> عرض المرفق</a>
                            </div>
                        )}

                    </div>
                </div>

            </div>

            {/* Footer Actions - أزرار الأدمن الديناميكية حسب حالة الطلب */}
            <div className="p-6 border-t border-white/10 bg-[#151515] rounded-b-3xl mt-auto">
                <div className="flex flex-col gap-4">
                    
                    {!actionToConfirm && (
                        <div className="flex flex-wrap gap-4">
                            
                            {/* 1. خدمة جديدة */}
                            {selectedService.status === 'pending' && (
                                <>
                                  <button disabled={actionLoading} onClick={() => handleAction('approve')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><CheckCircle size={20}/> الموافقة على نشر الخدمة</button>
                                  <button onClick={() => setActionToConfirm('reject')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><XCircle size={20}/> رفض الخدمة</button>
                                </>
                            )}
                            
                            {/* 2. طلب تعديل */}
                            {selectedService.status === 'update_requested' && (
                                <>
                                  <button disabled={actionLoading} onClick={() => handleAction('approve_update')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><CheckCircle size={20}/> اعتماد التعديلات ونشرها</button>
                                  <button onClick={() => setActionToConfirm('reject_update')} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><XCircle size={20}/> رفض التعديل وإبقاء القديم</button>
                                </>
                            )}

                            {/* 3. طلب إيقاف مؤقت */}
                            {selectedService.status === 'stop_requested' && (
                                <>
                                  <button disabled={actionLoading} onClick={() => handleAction('approve_stop')} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><PauseCircle size={20}/> الموافقة وتأكيد الإيقاف</button>
                                  <button onClick={() => setActionToConfirm('reject_stop')} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><XCircle size={20}/> رفض الإيقاف وإعادة التفعيل</button>
                                </>
                            )}

                            {/* 4. طلب حذف نهائي */}
                            {selectedService.status === 'delete_requested' && (
                                <>
                                  <button disabled={actionLoading} onClick={() => handleAction('approve_delete')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><Trash2 size={20}/> الموافقة وحذف الخدمة نهائياً</button>
                                  <button onClick={() => setActionToConfirm('reject_delete')} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"><XCircle size={20}/> رفض الحذف</button>
                                </>
                            )}

                            {/* 5. إيقاف الخدمة من قبل الإدارة (للخدمات المفعلة) */}
                            {selectedService.status === 'approved' && (
                                <button onClick={() => setActionToConfirm('admin_stop')} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                                    <PauseCircle size={20}/> إيقاف الخدمة (مؤقت / نهائي)
                                </button>
                            )}

                            {/* 6. إعادة التفعيل (للخدمات المتوقفة) */}
                            {selectedService.status === 'stopped' && (
                                <button disabled={actionLoading} onClick={() => handleAction('admin_reactivate')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                                    <PlayCircle size={20}/> إعادة تفعيل الخدمة للعامة
                                </button>
                            )}
                        </div>
                    )}

                    {/* حقل تأكيد الرفض مع ذكر السبب */}
                    {actionToConfirm && actionToConfirm !== 'admin_stop' && (
                        <div className="animate-in slide-in-from-bottom-2 fade-in space-y-3 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                            <h4 className="text-white text-sm font-bold flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-400"/>
                                يرجى توضيح سبب الرفض (سيتم إرساله للمزود عبر الإيميل)
                            </h4>
                            <textarea rows={3} placeholder="اكتب الأسباب بوضوح للمزود..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-red-500 outline-none" />
                            <div className="flex gap-3 pt-2">
                                <button disabled={actionLoading} onClick={() => handleAction(actionToConfirm)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-lg transition flex justify-center items-center gap-2">
                                    {actionLoading ? <Loader2 className="animate-spin" size={18}/> : <><Send size={16}/> إرسال الرفض</>}
                                </button>
                                <button onClick={() => {setActionToConfirm(null); setRejectionReason("");}} className="px-6 bg-white/10 text-white font-bold py-2.5 rounded-lg hover:bg-white/20 transition">تراجع</button>
                            </div>
                        </div>
                    )}

                    {/* نموذج إيقاف الخدمة من قِبل الإدارة */}
                    {actionToConfirm === 'admin_stop' && (
                        <div className="animate-in slide-in-from-bottom-2 fade-in space-y-4 bg-orange-500/10 p-5 rounded-xl border border-orange-500/20">
                            <h4 className="text-orange-400 text-sm font-bold flex items-center gap-2">
                                <PauseCircle size={18}/> خيارات إيقاف الخدمة
                            </h4>
                            
                            <div className="flex gap-6 mb-2">
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input type="radio" value="temporary" checked={stopType === 'temporary'} onChange={() => setStopType('temporary')} className="accent-orange-500 w-4 h-4"/> إيقاف مؤقت
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input type="radio" value="permanent" checked={stopType === 'permanent'} onChange={() => setStopType('permanent')} className="accent-orange-500 w-4 h-4"/> إيقاف نهائي (أرشفة)
                                </label>
                            </div>

                            {stopType === 'temporary' && (
                                <div className="space-y-1">
                                    <label className="text-xs text-white/50 block">حتى تاريخ:</label>
                                    <input type="date" min={new Date().toISOString().split('T')[0]} value={stopUntil} onChange={e => setStopUntil(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none" />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs text-white/50 block">سبب الإيقاف (سيتم إشعار المزود به):</label>
                                <textarea rows={3} placeholder="اكتب سبب الإيقاف بوضوح للمزود..." value={stopReason} onChange={e => setStopReason(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none resize-none" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button disabled={actionLoading} onClick={() => handleAction('admin_stop')} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-lg transition flex justify-center items-center gap-2">
                                    {actionLoading ? <Loader2 className="animate-spin" size={18}/> : <><PauseCircle size={16}/> تأكيد الإيقاف</>}
                                </button>
                                <button onClick={() => {setActionToConfirm(null); setStopReason("");}} className="px-6 bg-white/10 text-white font-bold py-2.5 rounded-lg hover:bg-white/20 transition">تراجع</button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

          </div>
        </div>
      )}

      {/* تكبير الصور وفيديو */}
      {zoomedImage && (
        <div className="fixed inset-0 z-80 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 p-3 rounded-full"><XCircle size={32} /></button>
            <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-center">
                {isVideo(zoomedImage) ? ( 
                    <video src={zoomedImage} controls autoPlay playsInline className="max-w-full max-h-full rounded-xl shadow-2xl outline-none" onClick={(e) => e.stopPropagation()} /> 
                ) : ( 
                    <img src={zoomedImage} className="max-w-full max-h-full object-contain drop-shadow-2xl" alt="Zoomed" onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}/> 
                )}
            </div>
        </div>
      )}

    </div>
  );
}