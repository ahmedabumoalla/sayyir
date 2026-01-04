"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowRight, User, Mail, Phone, MapPin, Calendar, 
  CheckCircle, XCircle, Loader2, FileText, Download, LayoutList, AlertCircle
} from "lucide-react";
import { Tajawal } from "next/font/google";
import dynamic from "next/dynamic";

// تحميل الخريطة ديناميكياً لمنع تعليق الصفحة
const MapGL = dynamic(() => import("react-map-gl/mapbox").then(mod => mod.default), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-white/5 animate-pulse flex items-center justify-center text-xs">جاري تحميل الخريطة...</div>
});

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function RequestDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [request, setRequest] = useState<any>(null);
  const [fieldDefinitions, setFieldDefinitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Starting to fetch request with ID:", id);
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. جلب بيانات الطلب
        const { data: reqData, error: reqError } = await supabase
          .from('provider_requests').select('*').eq('id', id).single();
        
        if (reqError) {
            console.error("Supabase Request Error:", reqError);
            throw new Error("لم يتم العثور على الطلب");
        }

        // 2. جلب تعريفات الحقول (اختياري)
        const { data: fieldsData, error: fieldsError } = await supabase
          .from('registration_fields').select('*');

        if (fieldsError) console.warn("Fields Load Warning:", fieldsError);

        setRequest(reqData);
        if (fieldsData) setFieldDefinitions(fieldsData);
        console.log("Data loaded successfully");

      } catch (err: any) {
        console.error("Main Fetch Catch:", err);
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!confirm("هل أنت متأكد؟")) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      alert(result.message);
      router.push('/admin/requests');
    } catch (error: any) {
      alert("خطأ: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getFieldLabel = (key: string) => {
    const field = fieldDefinitions.find(f => f.id === key);
    return field ? field.label : "معلومة إضافية";
  };

  const extractImages = () => {
    if (!request?.dynamic_data) return [];
    let allImages: string[] = [];
    Object.values(request.dynamic_data).forEach((val: any) => {
      if (Array.isArray(val)) {
        val.forEach(item => { if (typeof item === 'string' && item.startsWith('http')) allImages.push(item); });
      } else if (typeof val === 'string' && val.startsWith('http')) {
         if (val.match(/\.(jpeg|jpg|gif|png|webp|jfif)/i)) allImages.push(val);
      }
    });
    return allImages;
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#1a1a1a] text-[#C89B3C]">
      <Loader2 className="animate-spin w-10 h-10 mb-4"/>
      <p className={tajawal.className}>جاري جلب تفاصيل الطلب...</p>
    </div>
  );

  if (fetchError) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#1a1a1a] text-red-400 p-6 text-center">
      <AlertCircle size={48} className="mb-4" />
      <h2 className="text-xl font-bold mb-2">تعذر تحميل الصفحة</h2>
      <p className="opacity-70 mb-6">{fetchError}</p>
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white/10 rounded-xl text-white">إعادة محاولة</button>
    </div>
  );

  const images = extractImages();

  return (
    <main dir="rtl" className={`min-h-screen bg-[#1a1a1a] text-white p-6 md:p-10 ${tajawal.className}`}>
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push('/admin/requests')} className="flex items-center gap-2 text-white/60 hover:text-[#C89B3C] mb-6 transition">
          <ArrowRight size={18} /> العودة للقائمة
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold">{request?.name || "طلب جديد"}</h1>
            <p className="text-white/50 mt-1 text-sm flex items-center gap-2">
              <Calendar size={14}/> تاريخ التقديم: {new Date(request.created_at).toLocaleDateString('ar-SA')}
            </p>
          </div>
          {request.status === 'pending' && (
            <div className="flex gap-3">
              <button onClick={() => handleAction('reject')} disabled={processing} className="px-6 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition flex items-center gap-2">
                {processing ? <Loader2 className="animate-spin" size={18}/> : <XCircle size={18}/>} رفض
              </button>
              <button onClick={() => handleAction('approve')} disabled={processing} className="px-6 py-3 rounded-xl bg-[#C89B3C] text-[#2B1F17] font-bold hover:bg-[#b38a35] transition flex items-center gap-2 shadow-lg shadow-[#C89B3C]/20">
                {processing ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>} قبول واعتماد
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            {/* البيانات الثابتة */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-[#C89B3C] font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-3"><User size={20}/> البيانات الأساسية</h3>
              <div className="space-y-4">
                <InfoRow label="الاسم" value={request.name} icon={<User size={16}/>} />
                <InfoRow label="البريد" value={request.email} icon={<Mail size={16}/>} />
                <InfoRow label="الجوال" value={request.phone} icon={<Phone size={16}/>} />
              </div>
            </div>

            {/* تفاصيل الأسئلة */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-[#C89B3C] font-bold mb-4 border-b border-white/5 pb-3">تفاصيل إضافية</h3>
              <div className="space-y-4">
                {Object.entries(request.dynamic_data || {}).map(([key, value]: any) => {
                   // عرض النصوص فقط هنا
                   if (typeof value !== 'object' && typeof value !== 'boolean' && key.length > 5) {
                      return (
                         <div key={key} className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <p className="text-white/40 text-[10px] mb-1">{getFieldLabel(key)}</p>
                            <p className="text-white text-sm">{String(value)}</p>
                         </div>
                      );
                   }
                   return null;
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* قسم المرفقات */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
                <h3 className="text-[#C89B3C] font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
                    <Download size={20}/> الصور والمرفقات ({images.length})
                </h3>
                {images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/20 block shadow-lg">
                                <img src={url} className="w-full h-full object-contain group-hover:scale-105 transition duration-500" alt="attach" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <span className="text-white text-[10px] font-bold bg-[#C89B3C] px-3 py-1 rounded-full">معاينة</span>
                                </div>
                            </a>
                        ))}
                    </div>
                ) : <p className="text-white/20 italic text-center py-4 text-sm">لا توجد صور.</p>}
            </div>

            {/* قسم الخريطة */}
            {Object.entries(request.dynamic_data || {}).map(([key, value]: any) => {
               if (value && typeof value === 'object' && value.lat && value.lng) {
                 return (
                   <div key={key} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                      <div className="p-4 bg-white/5 flex justify-between items-center border-b border-white/5">
                         <h3 className="font-bold text-white flex items-center gap-2 text-sm"><MapPin className="text-[#C89B3C]" size={18}/> {getFieldLabel(key)}</h3>
                         <a href={`https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`} target="_blank" className="text-[10px] bg-white/10 text-white px-3 py-1 rounded-full hover:bg-[#C89B3C] hover:text-black transition">Google Maps ↗</a>
                      </div>
                      <div className="h-72 w-full relative">
                         <MapGL
                           initialViewState={{ latitude: value.lat, longitude: value.lng, zoom: 14 }}
                           mapStyle="mapbox://styles/mapbox/streets-v12"
                           mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                         >
                           {/* @ts-ignore */}
                           <Marker latitude={value.lat} longitude={value.lng} color="#C89B3C" />
                         </MapGL>
                      </div>
                   </div>
                 )
               }
               return null;
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value, icon }: any) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
            <div className="text-[#C89B3C] opacity-80">{icon}</div>
            <div>
                <p className="text-white/40 text-[10px]">{label}</p>
                <p className="text-white font-bold text-sm">{value || '-'}</p>
            </div>
        </div>
    )
}