"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Plus, Edit, Trash2, Loader2, X, MapPin, 
  Clock, User, CheckCircle, List, 
  Home, Utensils, Camera, Eye, AlertCircle,
  Wifi, Car, Waves, Sparkles, Box, 
  Tv, Wind, ShieldCheck, Coffee, Flame, HeartPulse,
  Mountain, Footprints, Compass, Map as MapIcon, Calendar,
  UploadCloud, Image as ImageIcon, FileText, CheckSquare, PauseCircle, AlertTriangle, Info, Video
} from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// --- أنواع البيانات ---
interface Shift { from: string; to: string; }
interface WorkDay { day: string; active: boolean; shifts: Shift[]; }
interface Item { id: string; name: string; price: number; image: string | null; qty?: number; file?: File | null; type: 'image' | 'video' } 
interface Session { date: string; time: string; }

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const AMENITIES_OPTIONS = [
    { id: 'wifi', label: 'واي فاي (Wi-Fi)', icon: Wifi },
    { id: 'parking', label: 'مواقف خاصة', icon: Car },
    { id: 'pool', label: 'مسبح خاص', icon: Waves },
    { id: 'cleaning', label: 'خدمة تنظيف', icon: Sparkles },
    { id: 'ac', label: 'تكييف', icon: Wind },
    { id: 'tv', label: 'تلفزيون / ستالايت', icon: Tv },
    { id: 'kitchen', label: 'مطبخ مجهز', icon: Utensils },
    { id: 'bbq', label: 'منطقة شواء', icon: Flame },
    { id: 'breakfast', label: 'إفطار مشمول', icon: Coffee },
    { id: 'security', label: 'حراسة / أمان', icon: ShieldCheck },
    { id: 'firstaid', label: 'إسعافات أولية', icon: HeartPulse  },
    { id: 'view', label: 'إطلالة مميزة', icon: Mountain },
];

export default function ProviderServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [viewService, setViewService] = useState<any>(null);
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [step, setStep] = useState(1); 
  const [selectedCategory, setSelectedCategory] = useState<'facility' | 'experience' | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<'food' | 'craft' | 'lodging' | null>(null);

  const [formData, setFormData] = useState({
    title: "", description: "", price: "", commercial_license: null as File | null,
    capacity_type: "unlimited", max_capacity: 0, // ✅ تأكدنا أن القيمة الافتراضية رقم
    room_count: 1, amenities: [] as string[], 
    activity_type: "", difficulty_level: "easy", duration: "", meeting_point: "", included_items: "", requirements: "",
    lat: 18.2164, lng: 42.5053,
    place_images: [] as File[],
    policies: "",
  });

  const [durationVal, setDurationVal] = useState("");
  const [durationUnit, setDurationUnit] = useState("ساعة");
  const [experienceSessions, setExperienceSessions] = useState<Session[]>([]);
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionTime, setNewSessionTime] = useState("");

  const [placeImagePreviews, setPlaceImagePreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);

  const [schedule, setSchedule] = useState<WorkDay[]>(
    DAYS.map(d => ({ day: d, active: true, shifts: [{ from: "09:00", to: "22:00" }] }))
  );
  
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<Item>({ id: "", name: "", price: 0, image: null, qty: 1, type: 'image' });
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProviderInfo(profile);
    const { data: srvs, error } = await supabase.from('services').select('*').eq('provider_id', session.user.id).order('created_at', { ascending: false });
    if (error) console.error("Error fetching services:", error);
    if (srvs) setServices(srvs);
    setLoading(false);
  };

  const uploadSingleFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const { error } = await supabase.storage.from('provider-files').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('provider-files').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleRequestStop = async (service: any) => {
    const reason = prompt("فضلاً، اكتب سبب إيقاف الخدمة (سيظهر للإدارة):");
    if (!reason) return;

    try {
        const { error } = await supabase
            .from('services')
            .update({
                status: 'stop_requested',
                details: {
                    ...service.details, 
                    stop_reason: reason 
                }
            })
            .eq('id', service.id);

        if (error) throw error;

        await fetch('/api/emails/send', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ 
                type: 'new_service_notification', 
                providerName: providerInfo?.full_name, 
                serviceTitle: `${service.title} (طلب إيقاف: ${reason})` 
            }) 
        });

        alert("تم رفع طلب الإيقاف بنجاح.");
        setViewService(null);
        fetchInitialData();
    } catch (e: any) {
        alert("حدث خطأ: " + e.message);
    }
  };

  const handlePlaceImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, place_images: [...prev.place_images, ...newFiles] }));
      
      const newPreviews = newFiles.map(file => ({
          url: URL.createObjectURL(file),
          type: file.type.startsWith('video') ? 'video' : 'image' as 'image' | 'video'
      }));
      setPlaceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removePlaceImage = (index: number) => {
    setFormData(prev => ({ ...prev, place_images: prev.place_images.filter((_, i) => i !== index) }));
    setPlaceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return alert("أدخل البيانات المطلوبة");
    
    setItemsList([...itemsList, { 
        ...newItem, 
        id: Date.now().toString(), 
        image: itemImageFile ? URL.createObjectURL(itemImageFile) : null,
        file: itemImageFile,
        type: itemImageFile?.type.startsWith('video') ? 'video' : 'image'
    }]);
    
    setNewItem({ id: "", name: "", price: 0, image: null, qty: 1, type: 'image' });
    setItemImageFile(null);
  };

  const handleAddSession = () => {
      if (!newSessionDate || !newSessionTime) return alert("الرجاء تحديد التاريخ والوقت");
      setExperienceSessions([...experienceSessions, { date: newSessionDate, time: newSessionTime }]);
      setNewSessionDate("");
      setNewSessionTime("");
  };

  const removeSession = (index: number) => {
      setExperienceSessions(experienceSessions.filter((_, i) => i !== index));
  };

  const toggleAmenity = (id: string) => {
      if (formData.amenities.includes(id)) setFormData({...formData, amenities: formData.amenities.filter(a => a !== id)});
      else setFormData({...formData, amenities: [...formData.amenities, id]});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("يجب تسجيل الدخول");
        
        let licenseUrl = null;
        if (formData.commercial_license) licenseUrl = await uploadSingleFile(formData.commercial_license, 'licenses');

        const uploadedPlaceImages: string[] = [];
        for (const file of formData.place_images) {
            const url = await uploadSingleFile(file, 'places');
            uploadedPlaceImages.push(url);
        }

        const processedItems = await Promise.all(itemsList.map(async (item) => {
            let publicUrl = item.image;
            if (item.file) {
                publicUrl = await uploadSingleFile(item.file, 'menu-items');
            }
            return { 
                id: item.id, name: item.name, price: item.price, qty: item.qty, image: publicUrl, type: item.type 
            };
        }));

        const finalDuration = selectedCategory === 'experience' ? `${durationVal} ${durationUnit}` : formData.duration;

        // ✅ إصلاح مشكلة السعة: التأكد من إرسال قيمة رقمية صحيحة
        const finalCapacity = Number(formData.max_capacity) || 0;

        const { error } = await supabase.from('services').insert([{
            provider_id: session.user.id,
            service_category: selectedCategory, sub_category: selectedSubCategory,
            title: formData.title, description: formData.description, price: Number(formData.price),
            commercial_license: licenseUrl, work_schedule: schedule, blocked_dates: blockedDates,
            capacity_type: finalCapacity > 0 ? 'limited' : 'unlimited', // تحديد النوع تلقائياً
            max_capacity: finalCapacity, // ✅ إرسال السعة الصحيحة
            room_count: selectedSubCategory === 'lodging' ? Number(formData.room_count) : null,
            amenities: selectedSubCategory === 'lodging' ? formData.amenities : null,
            activity_type: selectedCategory === 'experience' ? formData.activity_type : null,
            difficulty_level: selectedCategory === 'experience' ? formData.difficulty_level : null,
            duration: finalDuration, 
            meeting_point: selectedCategory === 'experience' ? formData.meeting_point : null,
            included_items: selectedCategory === 'experience' ? formData.included_items : null,
            requirements: selectedCategory === 'experience' ? formData.requirements : null,
            menu_items: processedItems, 
            location_lat: formData.lat, location_lng: formData.lng,
            status: 'pending', service_type: selectedCategory === 'experience' ? 'experience' : 'general',
            
            image_url: uploadedPlaceImages[0] || null, 
            details: {
                images: uploadedPlaceImages, 
                features: formData.amenities,
                policies: formData.policies,
                sessions: experienceSessions 
            }
        }]);

        if (error) throw error;
        await fetch('/api/emails/send', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ type: 'new_service_notification', providerName: providerInfo?.full_name, serviceTitle: formData.title }) });
        alert("✅ تم رفع الخدمة بنجاح وهي بانتظار المراجعة");
        setIsModalOpen(false); resetForm(); fetchInitialData();
    } catch (err: any) { alert("خطأ: " + err.message); } finally { setSubmitting(false); }
  };

  const resetForm = () => {
      setStep(1); setSelectedCategory(null); setSelectedSubCategory(null);
      setFormData({ title: "", description: "", price: "", commercial_license: null, capacity_type: "unlimited", max_capacity: 0, room_count: 1, amenities: [], activity_type: "", difficulty_level: "easy", duration: "", meeting_point: "", included_items: "", requirements: "", lat: 18.2164, lng: 42.5053, place_images: [], policies: "" });
      setItemsList([]);
      setPlaceImagePreviews([]);
      setExperienceSessions([]);
      setDurationVal("");
  };

  const renderStepContent = () => {
      if (step === 1) { return ( <div className="space-y-6 text-center py-10"> <h3 className="text-xl font-bold text-white mb-8">ما نوع الخدمة التي تود إضافتها؟</h3> <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto"> <button type="button" onClick={() => { setSelectedCategory('facility'); setStep(2); }} className="flex flex-col items-center gap-4 p-8 bg-black/30 border border-white/10 rounded-2xl hover:bg-[#C89B3C] hover:text-black transition group"> <Home size={40} className="text-[#C89B3C] group-hover:text-black"/> <span className="text-lg font-bold">مرفق / مكان</span> </button> <button type="button" onClick={() => { setSelectedCategory('experience'); setStep(3); }} className="flex flex-col items-center gap-4 p-8 bg-black/30 border border-white/10 rounded-2xl hover:bg-[#C89B3C] hover:text-black transition group"> <Compass size={40} className="text-[#C89B3C] group-hover:text-black"/> <span className="text-lg font-bold">تجربة سياحية</span> </button> </div> </div> ); }
      if (step === 2 && selectedCategory === 'facility') { return ( <div className="space-y-6 text-center py-10"> <h3 className="text-xl font-bold text-white mb-8">حدد نوع المرفق</h3> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <button type="button" onClick={() => { setSelectedSubCategory('food'); setStep(3); }} className="p-6 bg-black/30 border border-white/10 rounded-2xl hover:border-[#C89B3C] transition"> <Utensils size={32} className="mx-auto mb-3 text-[#C89B3C]"/> <span className="font-bold">أكل ومشروبات</span> </button> <button type="button" onClick={() => { setSelectedSubCategory('craft'); setStep(3); }} className="p-6 bg-black/30 border border-white/10 rounded-2xl hover:border-[#C89B3C] transition"> <Box size={32} className="mx-auto mb-3 text-[#C89B3C]"/> <span className="font-bold">حرف ومنتجات</span> </button> <button type="button" onClick={() => { setSelectedSubCategory('lodging'); setStep(3); }} className="p-6 bg-black/30 border border-white/10 rounded-2xl hover:border-[#C89B3C] transition"> <Home size={32} className="mx-auto mb-3 text-[#C89B3C]"/> <span className="font-bold">نزل وتأجير</span> </button> </div> <button type="button" onClick={() => setStep(1)} className="text-sm text-white/50 underline">رجوع</button> </div> ); }
      return ( <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in"> 
        <div className="flex items-center gap-2 text-sm text-[#C89B3C] bg-[#C89B3C]/10 p-3 rounded-xl w-fit"> <span className="font-bold">{selectedCategory === 'experience' ? 'تجربة سياحية' : selectedSubCategory === 'food' ? 'مرفق: أكل ومشروبات' : selectedSubCategory === 'craft' ? 'مرفق: حرف ومنتجات' : 'مرفق: نزل وتأجير'}</span> <button type="button" onClick={resetForm} className="text-white hover:underline text-xs ml-2">(تغيير)</button> </div> 
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
            <div className="space-y-4"> 
                <div> <label className="block text-sm text-white/70 mb-1"> {selectedCategory === 'experience' ? 'عنوان التجربة' : 'اسم المكان/المتجر'} <span className="text-red-500">*</span> </label> <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"/> </div> 
                <div> <label className="block text-sm text-white/70 mb-1"> {selectedSubCategory === 'lodging' ? 'سعر الليلة (يبدأ من)' : selectedCategory === 'experience' ? 'سعر الشخص الواحد' : 'رسوم الدخول / الحد الأدنى'} <span className="text-red-500">*</span> </label> <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]" placeholder="0 = دخول مجاني"/> </div> 
                
                {selectedSubCategory === 'lodging' && ( <> <div> <label className="block text-sm text-white/70 mb-1">عدد الوحدات/الغرف المتاحة</label> <input type="number" min="1" value={formData.room_count} onChange={e => setFormData({...formData, room_count: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"/> </div> <div> <label className="block text-sm text-white/70 mb-1">الطاقة الاستيعابية (أشخاص)</label> <input type="number" min="1" value={formData.max_capacity} onChange={e => setFormData({...formData, max_capacity: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"/> </div> </> )} 
                {selectedCategory === 'experience' && ( 
                    <> 
                        <div> <label className="block text-sm text-white/70 mb-1">نوع النشاط</label> <input placeholder="مثال: هايكنج، ركوب خيل، جولة..." value={formData.activity_type} onChange={e => setFormData({...formData, activity_type: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"/> </div> 
                        
                        <div className="grid grid-cols-2 gap-2"> 
                            <div> 
                                <label className="block text-sm text-white/70 mb-1">مدة التجربة</label> 
                                <input type="number" placeholder="مثلاً: 2" value={durationVal} onChange={e => setDurationVal(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"/> 
                            </div> 
                            <div> 
                                <label className="block text-sm text-white/70 mb-1">الوحدة</label> 
                                <select value={durationUnit} onChange={e => setDurationUnit(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]">
                                    <option value="ساعة">ساعة</option>
                                    <option value="دقيقة">دقيقة</option>
                                    <option value="يوم">يوم</option>
                                </select>
                            </div> 
                        </div> 

                        <div> <label className="block text-sm text-white/70 mb-1">الصعوبة</label> <select value={formData.difficulty_level} onChange={e => setFormData({...formData, difficulty_level: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"> <option value="easy">سهل 🟢</option> <option value="medium">متوسط 🟡</option> <option value="hard">صعب 🔴</option> <option value="extreme">محترف 💀</option> </select> </div> 
                    </> 
                )} 
                
                <div> <label className="block text-sm text-white/70 mb-1">الترخيص التجاري (مطلوب من الإدارة)</label> <div className="relative border border-dashed border-white/20 rounded-xl p-3 text-center cursor-pointer hover:border-[#C89B3C] transition"> <input type="file" accept=".pdf,image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setFormData({...formData, commercial_license: e.target.files?.[0] || null})} /> <span className="text-xs text-white/50">{formData.commercial_license ? formData.commercial_license.name : "رفع ملف الترخيص (PDF/Image)"}</span> </div> </div> 
            </div> 
            <div className="space-y-4"> 
                <div> <label className="block text-sm text-white/70 mb-1">الوصف التفصيلي <span className="text-red-500">*</span></label> <textarea required rows={selectedCategory === 'experience' ? 3 : 5} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C] resize-none"/> </div> 
                
                <div> 
                    <label className="block text-sm text-white/70 mb-1">سياسات المكان / شروط تقديم الخدمة <span className="text-[#C89B3C] text-xs">(مهم جداً)</span></label> 
                    <textarea rows={4} placeholder="اكتب هنا الشروط الخاصة بك (مثال: ممنوع التدخين، الحضور قبل الموعد بـ 15 دقيقة، سياسة الإلغاء...)" value={formData.policies} onChange={e => setFormData({...formData, policies: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C] resize-none"/> 
                </div>

                {selectedCategory === 'experience' && ( <> <div> <label className="block text-sm text-white/70 mb-1">ماذا تشمل التجربة؟ (العدة، الوجبات)</label> <textarea rows={2} placeholder="مثال: خوذة، ماء، وجبة غداء..." value={formData.included_items} onChange={e => setFormData({...formData, included_items: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C] resize-none"/> </div> <div> <label className="block text-sm text-white/70 mb-1">المتطلبات من العميل</label> <textarea rows={2} placeholder="مثال: لبس رياضي، لياقة متوسطة..." value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C] resize-none"/> </div> <div> <label className="block text-sm text-white/70 mb-1">نقطة التجمع</label> <input placeholder="وصف مكان اللقاء..." value={formData.meeting_point} onChange={e => setFormData({...formData, meeting_point: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"/> </div> </> )} 
            </div> 
        </div> 

        <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5">
            <h4 className="text-[#C89B3C] font-bold mb-4 flex items-center gap-2">
                <ImageIcon size={18}/> صور / فيديو المكان
            </h4>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[#C89B3C]/50 transition bg-black/20 relative group">
                <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*"
                    onChange={handlePlaceImagesSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="text-white/50 group-hover:text-[#C89B3C] transition"/>
                    <span className="text-sm text-white/70">اضغط لرفع صور أو فيديو تعريفي</span>
                </div>
            </div>
            {placeImagePreviews.length > 0 && (
                <div className="flex gap-3 overflow-x-auto mt-4 pb-2">
                    {placeImagePreviews.map((file, i) => (
                        <div key={i} className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-white/10 group">
                            {file.type === 'video' ? (
                                <video src={file.url} className="w-full h-full object-cover" muted autoPlay loop />
                            ) : (
                                <Image src={file.url} fill className="object-cover" alt="Place Preview"/>
                            )}
                            <button type="button" onClick={() => removePlaceImage(i)} className="absolute top-1 right-1 bg-red-500/80 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition"><X size={12}/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {selectedSubCategory === 'lodging' && ( <div className="bg-black/20 p-5 rounded-2xl border border-white/5"> <h4 className="text-[#C89B3C] font-bold mb-4 flex items-center gap-2"><Sparkles size={18}/> الخدمات والمميزات المتوفرة</h4> <div className="grid grid-cols-2 md:grid-cols-4 gap-3"> {AMENITIES_OPTIONS.map((am) => ( <label key={am.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${formData.amenities.includes(am.id) ? 'bg-[#C89B3C]/10 border-[#C89B3C] text-white' : 'bg-black/20 border-white/5 text-white/50'}`}> <input type="checkbox" checked={formData.amenities.includes(am.id)} onChange={() => toggleAmenity(am.id)} className="hidden"/> <am.icon size={18} className={formData.amenities.includes(am.id) ? "text-[#C89B3C]" : ""}/> <span className="text-sm font-bold">{am.label}</span> </label> ))} </div> </div> )} 
        
        {(selectedSubCategory === 'food' || selectedSubCategory === 'craft') && ( <div className="bg-black/20 p-5 rounded-2xl border border-white/5"> <h4 className="text-[#C89B3C] font-bold mb-4 flex items-center gap-2"> {selectedSubCategory === 'food' ? <Utensils size={18}/> : <Box size={18}/>} {selectedSubCategory === 'food' ? 'قائمة الطعام (المنيو)' : 'المنتجات المعروضة (الحرف)'} </h4> <div className="flex flex-wrap gap-2 mb-4 items-end bg-white/5 p-3 rounded-xl"> <div className="flex-1 min-w-[150px]"> <label className="text-xs text-white/50 block mb-1">اسم المنتج</label> <input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/> </div> <div className="w-24"> <label className="text-xs text-white/50 block mb-1">السعر</label> <input type="number" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/> </div> {selectedSubCategory === 'craft' && ( <div className="w-24"> <label className="text-xs text-white/50 block mb-1">المخزون</label> <input type="number" value={newItem.qty || 1} onChange={e => setNewItem({...newItem, qty: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/> </div> )} <div className="w-10"> <label className="block w-full h-[38px] bg-white/5 border border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10"> <Camera size={16} className="text-white/50"/> <input type="file" accept="image/*,video/*" className="hidden" onChange={e => setItemImageFile(e.target.files?.[0] || null)}/> </label> </div> <button type="button" onClick={handleAddItem} className="bg-[#C89B3C] text-black px-4 h-[38px] rounded-lg text-sm font-bold">إضافة</button> </div> <div className="space-y-2"> {itemsList.map((item, i) => ( <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"> <div className="flex items-center gap-3"> {item.image ? (item.type === 'video' ? <video src={item.image} className="w-10 h-10 rounded-lg object-cover" muted /> : <img src={item.image} className="w-10 h-10 rounded-lg object-cover"/>) : <div className="w-10 h-10 bg-white/10 rounded-lg"/>} <div> <p className="font-bold text-sm">{item.name}</p> {selectedSubCategory === 'craft' && <p className="text-xs text-white/40">متبقي: {item.qty} قطعة</p>} </div> </div> <div className="flex items-center gap-3"> <span className="text-[#C89B3C] font-mono">{item.price} ﷼</span> <button type="button" onClick={() => setItemsList(itemsList.filter(m => m.id !== item.id))} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button> </div> </div> ))} </div> </div> )} 
        
        {selectedCategory === 'experience' ? (
            <div className="space-y-4">
                <h4 className="text-[#C89B3C] font-bold flex items-center gap-2"><Calendar size={18}/> مواعيد التجربة المتاحة</h4>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-white/60 mb-4">أضف التواريخ والأوقات التي ستقام فيها التجربة بالتحديد.</p>
                    <div className="flex flex-wrap gap-2 items-end mb-4">
                        <div className="flex-1">
                            <label className="text-xs text-white/50 block mb-1">التاريخ</label>
                            <input type="date" value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white outline-none [color-scheme:dark]"/>
                        </div>
                        <div className="w-32">
                            <label className="text-xs text-white/50 block mb-1">وقت البدء</label>
                            <input type="time" value={newSessionTime} onChange={e => setNewSessionTime(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white outline-none [color-scheme:dark]"/>
                        </div>
                        <button type="button" onClick={handleAddSession} className="bg-[#C89B3C] text-black px-4 h-[42px] rounded-lg text-sm font-bold hover:bg-[#b38a35]">إضافة موعد</button>
                    </div>
                    
                    {experienceSessions.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {experienceSessions.map((session, i) => (
                                <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-[#C89B3C]"/>
                                        <span className="text-sm dir-ltr">{session.date} | {session.time}</span>
                                    </div>
                                    <button type="button" onClick={() => removeSession(i)} className="text-red-400 hover:text-white"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-xs text-white/30 py-4 border border-dashed border-white/10 rounded-lg">لم تتم إضافة أي مواعيد بعد.</p>
                    )}
                </div>
                
                {/* ✅ حقل العدد الأقصى للتجربة (مرتبط بنفس المتغير) */}
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <label className="block text-sm text-white/70 mb-2">العدد الأقصى للمشتركين (لكل جلسة)</label>
                    <input type="number" min="1" value={formData.max_capacity} onChange={e => setFormData({...formData, max_capacity: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#C89B3C]"/>
                </div>
            </div>
        ) : (
            <div className="space-y-4"> 
                <h4 className="text-[#C89B3C] font-bold flex items-center gap-2"><Clock size={18}/> {selectedSubCategory === 'lodging' ? 'أيام استقبال النزلاء' : 'أوقات العمل والدوام'} </h4> 
                <div className="grid grid-cols-1 gap-2 bg-black/20 p-4 rounded-xl border border-white/5"> {schedule.map((day, dIdx) => ( <div key={dIdx} className={`flex flex-wrap items-center gap-3 p-2 rounded-lg border ${day.active ? 'border-white/10' : 'border-red-500/10 bg-red-500/5'}`}> <div className="flex items-center gap-2 w-24"> <input type="checkbox" checked={day.active} onChange={() => { const newSched = [...schedule]; newSched[dIdx].active = !newSched[dIdx].active; setSchedule(newSched); }} className="accent-[#C89B3C] w-4 h-4"/> <span className="text-sm font-bold">{day.day}</span> </div> {day.active ? ( <div className="flex flex-wrap gap-2 flex-1"> {day.shifts.map((shift, sIdx) => ( <div key={sIdx} className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/10"> <input type="time" value={shift.from} onChange={e => { const newSched = [...schedule]; newSched[dIdx].shifts[sIdx].from = e.target.value; setSchedule(newSched); }} className="bg-transparent text-white text-xs outline-none"/> <span>-</span> <input type="time" value={shift.to} onChange={e => { const newSched = [...schedule]; newSched[dIdx].shifts[sIdx].to = e.target.value; setSchedule(newSched); }} className="bg-transparent text-white text-xs outline-none"/> </div> ))} </div> ) : <span className="text-xs text-red-400/50">مغلق</span>} </div> ))} </div> 
                <div className="flex gap-4 items-center pt-2"> <label className="text-sm text-white/70">حجب تاريخ معين:</label> <input type="date" value={newBlockedDate} onChange={e => setNewBlockedDate(e.target.value)} className="bg-black/30 border border-white/10 rounded-lg p-2 text-white text-xs outline-none [color-scheme:dark]"/> <button type="button" onClick={() => {if(newBlockedDate) { setBlockedDates([...blockedDates, newBlockedDate]); setNewBlockedDate(""); }}} className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-xs font-bold">حجب</button> </div> <div className="flex flex-wrap gap-2"> {blockedDates.map((date, i) => ( <span key={i} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1"> {date} <button type="button" onClick={() => setBlockedDates(blockedDates.filter(d => d !== date))}><X size={10}/></button> </span> ))} </div> 
            </div> 
        )}

        <div className="h-72 rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl group"> <div className="absolute inset-0 z-0 bg-black/40 pointer-events-none" /> <Map initialViewState={{ latitude: 18.2164, longitude: 42.5053, zoom: 11 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN} onClick={(e) => setFormData({...formData, lat: e.lngLat.lat, lng: e.lngLat.lng})} cursor="crosshair"> <NavigationControl position="top-left" showCompass={false} /> <Marker latitude={formData.lat} longitude={formData.lng} anchor="bottom"> <div className="relative flex flex-col items-center animate-bounce-slow"> <div className="w-12 h-12 rounded-full bg-[#C89B3C] border-4 border-white/20 text-black flex items-center justify-center shadow-[0_0_20px_rgba(200,155,60,0.6)] z-20"> <MapPin size={24} fill="currentColor" /> </div> <div className="w-4 h-4 bg-[#C89B3C] rotate-45 -mt-2 z-10 border-r border-b border-white/20"></div> </div> </Marker> </Map> <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none"> <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white shadow-xl"> <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">الإحداثيات الحالية</p> <p className="text-xs font-mono text-[#C89B3C] dir-ltr"> {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)} </p> </div> <div className="bg-[#C89B3C] text-black px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 animate-pulse"> <MapPin size={14}/> اضغط لتحديد الموقع </div> </div> </div> <div className="flex gap-4 pt-4 border-t border-white/10"> <button disabled={submitting} type="submit" className="flex-1 bg-[#C89B3C] hover:bg-[#b38a35] text-black font-bold py-3 rounded-xl transition flex justify-center items-center gap-2"> {submitting ? <Loader2 className="animate-spin"/> : <><CheckCircle size={20}/> إرسال للمراجعة</>} </button> <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition">إلغاء</button> </div> </form> );
  };

  return (
    <div className="space-y-8 animate-in fade-in p-6">
       <div className="flex justify-between items-center mb-8">
          <div>
             <h1 className="text-2xl font-bold text-white">إدارة خدماتي</h1>
             <p className="text-white/50 text-sm">أضف خدماتك (أكل، حرف، نزل) أو تجاربك السياحية.</p>
          </div>
          <button onClick={() => { setIsModalOpen(true); setStep(1); }} className="bg-[#C89B3C] text-black px-4 py-2 rounded-xl font-bold hover:bg-[#b38a35] flex items-center gap-2"><Plus size={18}/> خدمة جديدة</button>
       </div>

       {/* قائمة الخدمات - لم يتم لمسها */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {services.length === 0 && !loading && (
               <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-white/5 text-white/30">
                   لا توجد خدمات مضافة بعد. ابدأ بإضافة خدمتك الأولى!
               </div>
           )}
           {services.map(s => (
               <div key={s.id} onClick={() => setViewService(s)} className="bg-[#252525] border border-white/5 rounded-2xl overflow-hidden p-5 shadow-lg relative group hover:border-[#C89B3C]/50 transition cursor-pointer">
                   
                   <div className="absolute top-4 left-4">
                       <span className={`px-2 py-1 rounded text-[10px] font-bold shadow-lg ${
                           s.status === 'approved' ? 'bg-emerald-500 text-black' : 
                           s.status === 'rejected' ? 'bg-red-500 text-white' : 
                           s.status === 'stop_requested' ? 'bg-orange-500 text-black' :
                           s.status === 'stopped' ? 'bg-gray-500 text-white' :
                           'bg-yellow-500 text-black'
                       }`}>
                           {s.status === 'approved' ? 'مفعلة' : 
                            s.status === 'rejected' ? 'مرفوضة' : 
                            s.status === 'stop_requested' ? 'جاري إيقافها' :
                            s.status === 'stopped' ? 'متوقفة' :
                            'بانتظار المراجعة'}
                       </span>
                   </div>

                   <h3 className="font-bold mb-1 text-lg group-hover:text-[#C89B3C] transition">{s.title}</h3>
                   <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded mb-3 inline-block">
                       {s.service_category === 'experience' ? 'تجربة' : `مرفق: ${s.sub_category}`}
                   </span>
                   <p className="text-sm text-white/70 line-clamp-2 mb-4">{s.description}</p>

                   <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-auto">
                        <span className="font-bold text-[#C89B3C]">
                            {s.price === 0 ? "دخول مجاني" : `${s.price} ﷼`}
                        </span>
                        <span className="text-xs text-white/40 flex items-center gap-1 group-hover:text-white transition">عرض التفاصيل <Eye size={12}/></span>
                   </div>
               </div>
           ))}
       </div>

       {/* ✅✅ نافذة عرض التفاصيل الكاملة للمزود */}
       {viewService && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1e1e1e] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
               <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
                  <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-white">تفاصيل الخدمة</h2>
                  </div>
                  <button onClick={() => setViewService(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                  
                  {/* صور المكان */}
                  {viewService.details?.images && viewService.details.images.length > 0 && (
                      <div className="mb-8">
                          <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><ImageIcon size={16}/> صور / فيديو المكان</h3>
                          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                              {viewService.details.images.map((url: string, i: number) => (
                                  <div key={i} onClick={() => setZoomedImage(url)} className="relative w-40 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 group cursor-pointer hover:border-[#C89B3C]/50 transition">
                                      {/* ✅ دعم عرض الفيديو في المعرض */}
                                      {url.match(/mp4|webm|ogg/) ? (
                                          <video src={url} className="w-full h-full object-cover" muted />
                                      ) : (
                                          <Image src={url} fill className="object-cover group-hover:scale-110 transition duration-500" alt={`Place Image ${i}`}/>
                                      )}
                                      {/* أيقونة تشغيل للفيديو */}
                                      {url.match(/mp4|webm|ogg/) && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center pl-1"><div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-black border-b-[6px] border-b-transparent"></div></div></div>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                              <h3 className="text-[#C89B3C] font-bold text-sm mb-2">البيانات الأساسية</h3>
                              <div><p className="text-xs text-white/50">العنوان</p><p className="font-bold text-lg">{viewService.title}</p></div>
                              <div>
                                  <p className="text-xs text-white/50">السعر</p>
                                  <p className="font-bold text-[#C89B3C] text-xl font-mono">
                                      {viewService.price === 0 ? "دخول مجاني" : `${viewService.price} ﷼`}
                                  </p>
                              </div>
                              <div><p className="text-xs text-white/50">الوصف</p><p className="text-white/80 text-sm leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 whitespace-pre-line">{viewService.description}</p></div>
                              
                              {/* عرض المدة للتجارب */}
                              {viewService.service_category === 'experience' && (
                                  <div>
                                      <p className="text-xs text-white/50">المدة</p>
                                      <p className="font-bold text-white">{viewService.duration}</p>
                                  </div>
                              )}
                          </div>

                          {/* السياسات */}
                          {viewService.details?.policies && (
                              <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 space-y-3">
                                  <h3 className="text-red-400 font-bold text-sm flex items-center gap-2"><FileText size={16}/> سياسات المكان</h3>
                                  <div className="text-white/80 text-xs leading-relaxed whitespace-pre-line pl-2 border-r-2 border-red-500/20 pr-3">
                                      {viewService.details.policies}
                                  </div>
                              </div>
                          )}

                          {viewService.location_lat && viewService.location_lng && (
                              <div className="h-64 rounded-xl overflow-hidden border border-white/10 relative shadow-lg">
                                  <Map initialViewState={{ latitude: viewService.location_lat, longitude: viewService.location_lng, zoom: 12 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN}>
                                      <NavigationControl showCompass={false}/>
                                      <Marker latitude={viewService.location_lat} longitude={viewService.location_lng} color="#C89B3C"/>
                                  </Map>
                              </div>
                          )}
                      </div>
                      
                      <div className="space-y-6">
                          {/* المميزات (للسكن) */}
                          {viewService.amenities && viewService.amenities.length > 0 && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                  <h3 className="text-[#C89B3C] font-bold text-sm mb-3">المميزات</h3>
                                  <div className="flex flex-wrap gap-2">
                                      {viewService.amenities.map((am: any, i: number) => (
                                          <span key={i} className="text-xs bg-[#C89B3C]/10 text-[#C89B3C] px-2 py-1 rounded border border-[#C89B3C]/20">{am}</span>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* جلسات التجربة (للتجارب) */}
                          {viewService.details?.sessions && viewService.details.sessions.length > 0 && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                  <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2"><Calendar size={16}/> المواعيد المتاحة</h3>
                                  <div className="grid grid-cols-2 gap-2">
                                      {viewService.details.sessions.map((session: any, i: number) => (
                                          <div key={i} className="bg-white/5 p-2 rounded-lg text-xs flex items-center gap-2">
                                              <Clock size={12} className="text-[#C89B3C]"/>
                                              <span className="dir-ltr">{session.date} | {session.time}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* ✅ المنيو / المنتجات (فقط للمرافق) */}
                          {viewService.service_category === 'facility' && viewService.menu_items && viewService.menu_items.length > 0 && (
                              <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                  <h3 className="text-[#C89B3C] font-bold text-sm mb-3 flex items-center gap-2">المنتجات / المنيو</h3>
                                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                      {viewService.menu_items.map((item: any, i: number) => (
                                          <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm">
                                              <div className="flex items-center gap-3">
                                                  {item.image && (item.type === 'video' ? 
                                                      <video src={item.image} className="w-10 h-10 rounded-lg object-cover" /> : 
                                                      <Image src={item.image} width={40} height={40} className="rounded object-cover" alt={item.name}/>
                                                  )}
                                                  <span>{item.name}</span>
                                              </div>
                                              <div className="text-left">
                                                  <span className="block font-bold text-[#C89B3C]">{item.price} ﷼</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* زر طلب الإيقاف */}
                          {viewService.status === 'approved' && (
                              <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                  <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2"><PauseCircle size={20}/> إيقاف الخدمة</h3>
                                  <p className="text-xs text-white/60 mb-4">يمكنك طلب إيقاف هذه الخدمة مؤقتاً أو نهائياً. سيتم مراجعة الطلب من قبل الإدارة.</p>
                                  <button 
                                    onClick={() => handleRequestStop(viewService)}
                                    className="w-full bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/50 font-bold py-2 rounded-lg transition text-sm flex items-center justify-center gap-2"
                                  >
                                    <AlertTriangle size={16}/> تقديم طلب إيقاف
                                  </button>
                              </div>
                          )}
                          
                          {viewService.status === 'stop_requested' && (
                              <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 text-center">
                                  <p className="text-orange-400 font-bold text-sm flex items-center justify-center gap-2"><Clock size={16}/> طلب الإيقاف قيد المراجعة</p>
                              </div>
                          )}
                      </div>
                  </div>
               </div>
            </div>
         </div>
       )}

       {/* Lightbox مع دعم الفيديو */}
       {zoomedImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition"><X size={32} /></button>
            <div className="relative w-full max-w-5xl h-[85vh] flex items-center justify-center">
                {zoomedImage.match(/mp4|webm|ogg/) ? (
                    <video src={zoomedImage} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl" />
                ) : (
                    <Image src={zoomedImage} alt="Zoomed View" fill className="object-contain"/>
                )}
            </div>
        </div>
       )}

       {/* MODAL الإضافة */}
       {isModalOpen && (
         <div className="fixed inset-0 z-50 flex justify-center items-start pt-10 sm:items-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#1a1a1a] w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col relative my-auto max-h-[90vh]">
               <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl shrink-0 sticky top-0 z-10 backdrop-blur-md">
                  <div>
                      <h3 className="text-xl font-bold text-white">إضافة خدمة جديدة</h3>
                      <span className="text-xs text-white/40">خطوة {step} من 3</span>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X className="text-white"/></button>
               </div>
               <div className="p-8 overflow-y-auto custom-scrollbar">
                   {renderStepContent()}
               </div>
            </div>
         </div>
       )}
    </div>
  );
}