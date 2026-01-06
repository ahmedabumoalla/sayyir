"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image"; // للشعار فقط
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { 
  ArrowRight, Loader2, UploadCloud, X, FileText, Check, 
  MapPin, User, Mail, Phone, ChevronDown, AlignLeft, Camera, LayoutList
} from "lucide-react";
import Map, { Marker, NavigationControl, GeolocateControl, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

export default function DynamicProviderRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  
  // حالة البيانات
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [previews, setPreviews] = useState<Record<string, string[]>>({});

  // حالة القوائم والسياسات
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [currentPolicyText, setCurrentPolicyText] = useState("");
  const [currentPolicyTitle, setCurrentPolicyTitle] = useState("");

  // الخريطة
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({ latitude: 18.216, longitude: 42.505, zoom: 11 });

  // 1. جلب الحقول + تحديد الموقع التلقائي
  useEffect(() => {
    const initPage = async () => {
      const { data } = await supabase.from('registration_fields').select('*').order('sort_order', { ascending: true });
      if (data) {
        setFields(data);
        const initialAnswers: any = {};
        
        let userLocation = { lat: 18.216, lng: 42.505 };
        
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                userLocation = { lat: latitude, lng: longitude };
                
                setViewState(prev => ({ ...prev, latitude, longitude, zoom: 15 }));
                mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15 });

                const updatedAnswers = { ...initialAnswers };
                data.forEach(f => {
                    if (f.field_type === 'map') updatedAnswers[f.id] = userLocation;
                });
                setAnswers(updatedAnswers);
            }, (err) => console.warn(err));
        }

        data.forEach(f => {
            if (f.field_type === 'map') initialAnswers[f.id] = userLocation; 
            else if (f.field_type === 'policy') initialAnswers[f.id] = false;
            else initialAnswers[f.id] = "";
        });
        setAnswers(initialAnswers);
      }
      setLoading(false);
    };

    initPage();
  }, []);

  const handleChange = (id: string, value: any) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => ({ ...prev, [id]: [...(prev[id] || []), ...newFiles] }));
      
      // إنشاء روابط معاينة محلية
      const newPreviews = newFiles.map(f => URL.createObjectURL(f));
      setPreviews(prev => ({ ...prev, [id]: [...(prev[id] || []), ...newPreviews] }));
    }
  };

  const openPolicyModal = (title: string, text: string) => {
    setCurrentPolicyTitle(title);
    setCurrentPolicyText(text);
    setPolicyModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من السياسات
    const pendingPolicies = fields.filter(f => f.field_type === 'policy' && answers[f.id] !== true);
    if (pendingPolicies.length > 0) {
        alert("⚠️ يجب الموافقة على جميع السياسات والشروط قبل المتابعة.");
        return;
    }

    setSubmitting(true);
    try {
      // 1. رفع الملفات (كما هي)
      const uploadedData: Record<string, string[]> = {};
      for (const [fieldId, fileList] of Object.entries(files)) {
        if (fileList.length > 0) {
            const uploadPromises = fileList.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('provider-files').upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('provider-files').getPublicUrl(fileName);
                return data.publicUrl;
            });
            uploadedData[fieldId] = await Promise.all(uploadPromises);
        }
      }

      // 2. تجهيز البيانات
      const finalData = { ...answers };
      Object.keys(uploadedData).forEach(key => { finalData[key] = uploadedData[key]; });

      let nameVal = "مزود جديد", emailVal = "", phoneVal = "", serviceTypeVal = "";
      fields.forEach(f => {
          const val = answers[f.id];
          if (f.label.includes("اسم") || f.field_type === 'text') { if(!nameVal || nameVal === "مزود جديد") nameVal = val; }
          if (f.field_type === 'email') emailVal = val;
          if (f.field_type === 'tel') phoneVal = val;
          if (f.field_type === 'select') serviceTypeVal = val;
      });

      // 3. الإرسال للـ API الجديد بدلاً من Supabase مباشرة
      const response = await fetch('/api/provider/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              name: nameVal,
              email: emailVal,
              phone: phoneVal,
              service_type: serviceTypeVal,
              dynamic_data: finalData
          })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "فشل إرسال الطلب");
      
      alert(`✅ ${result.message}`);
      router.push("/");
      
    } catch (error: any) {
      console.error(error);
      alert("❌ " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
        case 'text': return <User size={18} />;
        case 'email': return <Mail size={18} />;
        case 'tel': return <Phone size={18} />;
        case 'map': return <MapPin size={18} />;
        case 'file': return <Camera size={18} />;
        case 'select': return <LayoutList size={18} />;
        default: return <AlignLeft size={18} />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-[#C89B3C]"><Loader2 className="animate-spin w-10 h-10"/></div>;

  return (
    <div className={`relative min-h-screen w-full bg-[#121212] text-white ${tajawal.className}`} dir="rtl">
      <div className="fixed inset-0 z-0 bg-[url('/grain.png')] opacity-5 pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center">
        
        <Link href="/" className="mb-8 hover:scale-105 transition duration-300 drop-shadow-lg">
            {/* الشعار */}
            <img src="/logo.png" alt="Sayyir" width={160} height={70} />
        </Link>

        <div className="w-full max-w-2xl animate-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">
                    كن شريكاً في النجاح
                </h1>
                <p className="text-white/60">سجل بياناتك وانضم لنخبة مزودي الخدمات في عسير</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {fields.map((field, idx) => (
                <div key={field.id} className="relative group" style={{animationDelay: `${idx * 100}ms`}}>
                    
                    {field.field_type !== 'policy' && (
                        <label className="text-sm text-[#C89B3C] font-bold mb-2 block flex items-center gap-2">
                            {getFieldIcon(field.field_type)}
                            {field.label} {field.is_required && <span className="text-red-500">*</span>}
                        </label>
                    )}

                    {/* Input Fields */}
                    {['text', 'email', 'tel'].includes(field.field_type) && (
                    <div className="relative">
                        <input 
                            type={field.field_type} required={field.is_required} 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-[#C89B3C] focus:bg-white/10 outline-none transition-all shadow-lg shadow-black/20"
                            placeholder={`أدخل ${field.label}...`}
                            onChange={(e) => handleChange(field.id, e.target.value)} 
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition duration-500 text-[#C89B3C]"><Check size={18} /></div>
                    </div>
                    )}

                    {/* Textarea */}
                    {field.field_type === 'textarea' && (
                    <textarea 
                        rows={4} required={field.is_required} 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-[#C89B3C] focus:bg-white/10 outline-none resize-none transition-all shadow-lg"
                        placeholder="اكتب التفاصيل هنا..."
                        onChange={(e) => handleChange(field.id, e.target.value)} 
                    />
                    )}

                    {/* Custom Select */}
                    {field.field_type === 'select' && (
                        <div className="relative">
                            <button type="button" onClick={() => setOpenSelectId(openSelectId === field.id ? null : field.id)} className={`w-full bg-white/5 border rounded-2xl px-5 py-4 text-right flex justify-between items-center transition-all ${openSelectId === field.id ? 'border-[#C89B3C] bg-white/10' : 'border-white/10'}`}>
                                <span className={answers[field.id] ? "text-white" : "text-white/40"}>{answers[field.id] || "اختر من القائمة..."}</span>
                                <ChevronDown size={20} className={`text-white/50 transition-transform ${openSelectId === field.id ? 'rotate-180 text-[#C89B3C]' : ''}`} />
                            </button>
                            {openSelectId === field.id && (
                                <div className="absolute top-full mt-2 w-full bg-[#1F1F1F] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {field.options?.map((opt: string) => (
                                        <div key={opt} onClick={() => { handleChange(field.id, opt); setOpenSelectId(null); }} className="px-5 py-3 hover:bg-[#C89B3C]/20 hover:text-[#C89B3C] cursor-pointer transition border-b border-white/5 last:border-0 text-sm">{opt}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Map */}
                    {field.field_type === 'map' && (
                    <div className="h-80 rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl group-hover:border-[#C89B3C]/50 transition">
                        <Map 
                            ref={mapRef} 
                            initialViewState={viewState} 
                            onMove={evt => setViewState(evt.viewState)}
                            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN} 
                            mapStyle="mapbox://styles/mapbox/streets-v12" 
                            style={{ width: "100%", height: "100%" }} 
                            onClick={(e) => handleChange(field.id, { lat: e.lngLat.lat, lng: e.lngLat.lng })}
                        >
                            <NavigationControl position="top-left" />
                            <GeolocateControl position="top-left" />
                            <Marker 
                                latitude={answers[field.id]?.lat || viewState.latitude} 
                                longitude={answers[field.id]?.lng || viewState.longitude} 
                                anchor="bottom"
                                draggable 
                                onDragEnd={(e) => handleChange(field.id, { lat: e.lngLat.lat, lng: e.lngLat.lng })}
                            >
                                <div className="group cursor-grab active:cursor-grabbing">
                                    <MapPin size={48} className="text-[#C89B3C] drop-shadow-2xl -mt-10 transition-transform hover:scale-110" fill="#2B1F17"/>
                                </div>
                            </Marker>
                        </Map>
                        <div className="absolute top-4 right-4 bg-white/90 text-black text-xs px-3 py-1.5 rounded-lg shadow-lg font-bold pointer-events-none border border-black/10">
                            قم بسحب الدبوس لتحديد الموقع بدقة
                        </div>
                    </div>
                    )}

                    {/* File Upload (معاينة الصور محسنة) */}
                    {field.field_type === 'file' && (
                    <div className="relative group/upload">
                        <input type="file" multiple accept="image/*,video/*" id={`file-${field.id}`} className="hidden" onChange={(e) => handleFileChange(field.id, e)} />
                        <label htmlFor={`file-${field.id}`} className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/10 bg-white/5 rounded-3xl cursor-pointer hover:border-[#C89B3C] hover:bg-[#C89B3C]/5 transition-all duration-300">
                            <div className="p-4 rounded-full bg-white/5 mb-3 group-hover/upload:scale-110 transition"><UploadCloud size={30} className="text-[#C89B3C]" /></div>
                            <span className="text-sm text-white/60">اضغط لرفع الصور أو الفيديو</span>
                        </label>
                        {previews[field.id]?.length > 0 && (
                        <div className="flex gap-3 mt-4 overflow-x-auto pb-2 custom-scrollbar">
                            {previews[field.id].map((src, idx) => (
                            <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden relative shrink-0 border border-white/20 shadow-lg group-hover:border-[#C89B3C]/50 transition">
                                {/* استخدام img عادي للمعاينة لتجنب المشاكل */}
                                <img src={src} className="w-full h-full object-cover" alt="preview" />
                            </div>
                            ))}
                        </div>
                        )}
                    </div>
                    )}

                    {/* Policy Checkbox */}
                    {field.field_type === 'policy' && (
                    <div className="bg-gradient-to-r from-[#C89B3C]/10 to-transparent border border-[#C89B3C]/20 rounded-2xl p-5 flex items-start gap-4 transition hover:bg-[#C89B3C]/15">
                        <div className="relative pt-1">
                            <input 
                                type="checkbox" id={`policy-${field.id}`}
                                className="peer appearance-none w-6 h-6 border-2 border-[#C89B3C] rounded-lg bg-transparent checked:bg-[#C89B3C] cursor-pointer transition-all"
                                checked={answers[field.id] === true}
                                onChange={(e) => handleChange(field.id, e.target.checked)}
                            />
                            <Check size={16} className="absolute top-[6px] left-[4px] text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity font-bold" />
                        </div>
                        <div className="flex-1">
                            <label htmlFor={`policy-${field.id}`} className="text-sm font-bold text-white cursor-pointer select-none">{field.label}</label>
                            {field.options && field.options[0] && (
                                <button type="button" onClick={() => openPolicyModal(field.label, field.options[0])} className="mt-2 text-xs text-[#C89B3C] hover:text-white flex items-center gap-1 transition-colors font-medium border-b border-dashed border-[#C89B3C]/50 w-fit pb-0.5"><FileText size={14}/> اقرأ الشروط والأحكام الكاملة</button>
                            )}
                        </div>
                    </div>
                    )}

                </div>
                ))}

                <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-[#C89B3C] to-[#b38a35] text-[#2B1F17] py-5 rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(200,155,60,0.4)] transition transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 mt-8">
                {submitting ? <Loader2 className="animate-spin" /> : <>إرسال الطلب <ArrowRight size={20} className="rotate-180" /></>}
                </button>

            </form>
        </div>
      </div>

      {policyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-300">
            <div className="bg-[#1a1a1a] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-[#C89B3C]/20 to-transparent">
                    <h3 className="font-bold text-xl text-white flex gap-2 items-center"><FileText size={24} className="text-[#C89B3C]"/> الشروط والأحكام</h3>
                    <button onClick={() => setPolicyModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition"><X/></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar text-white/80 leading-loose text-justify whitespace-pre-line text-sm">{currentPolicyText}</div>
                <div className="p-6 border-t border-white/10 bg-[#121212] flex justify-end">
                    <button onClick={() => setPolicyModalOpen(false)} className="bg-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/20 transition">إغلاق</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}