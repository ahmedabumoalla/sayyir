"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map as MapIcon, DollarSign, Settings, ShieldAlert,
  Search, Plus, Edit, Trash2, MapPin, X, Save, Loader2, Image as ImageIcon, Briefcase, LogOut, UploadCloud, Video,
  Menu, User, Home, Camera, Mountain, History, Clock, CheckCircle, XCircle,
  Calendar, Info, AlertTriangle, UserCheck, Activity, Hourglass, List, PlayCircle, Trees // 👈 1. تمت إضافة أيقونة Trees
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// مفتاح الماب بوكس
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiYWJkYWxsYWhtdWFsYSIsImEiOiJjbTV4b3I0aGgwM3FkMmFyMXF3ZDN3Y3IyIn0.DrD4wJ-M5a-RjC8tPXyQ4g"; 

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

// تعريف هيكلة ساعات العمل
interface WorkHour {
  day: string;
  from: string;
  to: string;
  is_active: boolean;
}

const DAYS_ARABIC = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const defaultWorkHours: WorkHour[] = DAYS_ARABIC.map(day => ({
  day,
  from: "08:00",
  to: "22:00",
  is_active: true
}));

interface Place {
  id?: string;
  name: string;
  type: 'tourist' | 'heritage' | 'experience' | 'natural'; // 👈 2. تمت إضافة النوع natural
  category?: string; 
  city?: string;    
  description: string;
  media_urls: string[];
  lat: number;
  lng: number;
  is_active: boolean;
  work_hours?: WorkHour[];
  price: number;           
  services?: string;       
  duration?: string;       
  difficulty?: string;     
  max_capacity?: number;   
  blocked_dates?: string[];
}

// واجهة مساعدة للمعاينة
interface MediaPreview {
    url: string;
    type: 'image' | 'video';
    file?: File; // الملف الأصلي في حال كان جديداً
}

export default function AdminLandmarksPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [citiesList, setCitiesList] = useState<any[]>([]); 
  const [categoriesList, setCategoriesList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newBlockedDate, setNewBlockedDate] = useState("");

  const [formData, setFormData] = useState<Place>({
    name: "", 
    type: "tourist", 
    category: "", 
    city: "", 
    description: "", 
    media_urls: [], 
    lat: 18.2164, 
    lng: 42.5053, 
    is_active: true,
    work_hours: defaultWorkHours,
    price: 0,
    services: "",
    duration: "",
    difficulty: "سهل",
    max_capacity: 0,
    blocked_dates: []
  });

  // تم تغيير طريقة المعاينة لتكون أدق
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    fetchPlaces();
    fetchLookups();
    checkRole();
  }, []);

  // Mapbox Initialization
  useEffect(() => {
    if (isModalOpen && mapContainer.current) {
      setTimeout(() => {
        if (!map.current) {
          map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/satellite-streets-v12', // ✅ قمر صناعي
            center: [formData.lng, formData.lat],
            zoom: 14,
          });

          marker.current = new mapboxgl.Marker({ color: "#C89B3C", draggable: true })
            .setLngLat([formData.lng, formData.lat])
            .addTo(map.current);

          marker.current.on('dragend', () => {
            const lngLat = marker.current!.getLngLat();
            setFormData(prev => ({ ...prev, lat: lngLat.lat, lng: lngLat.lng }));
          });

          map.current.on('click', (e) => {
            marker.current!.setLngLat(e.lngLat);
            setFormData(prev => ({ ...prev, lat: e.lngLat.lat, lng: e.lngLat.lng }));
          });
        } else {
            // تحديث الموقع إذا كانت الخريطة موجودة مسبقاً
            map.current.flyTo({ center: [formData.lng, formData.lat] });
            marker.current?.setLngLat([formData.lng, formData.lat]);
        }
      }, 200);
    } 
  }, [isModalOpen]);

  // ✅ دالة جديدة لمعالجة تغيير الإحداثيات (تقبل العربي واللصق)
  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
      // 1. تحويل الأرقام العربية إلى إنجليزية
      let cleanValue = value.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

      // 2. التحقق: هل قام الأدمن بلصق إحداثيات كاملة (مثلاً: "18.216, 42.505")؟
      if (cleanValue.includes(',')) {
          const parts = cleanValue.split(',');
          // تنظيف واستخراج الأرقام
          const latVal = parseFloat(parts[0].trim());
          const lngVal = parseFloat(parts[1].trim());

          if (!isNaN(latVal) && !isNaN(lngVal)) {
              setFormData(prev => ({ ...prev, lat: latVal, lng: lngVal }));
              
              // تحديث الخريطة فوراً
              if (map.current && marker.current) {
                  map.current.flyTo({ center: [lngVal, latVal] });
                  marker.current.setLngLat([lngVal, latVal]);
              }
              return; 
          }
      }

      // 3. التعامل مع الإدخال العادي (حقل واحد)
      const numValue = parseFloat(cleanValue);
      
      if (!isNaN(numValue)) {
          setFormData(prev => {
              const newData = { ...prev, [field]: numValue };
              // تحديث الخريطة عند الكتابة اليدوية الصحيحة
              if (map.current && marker.current) {
                  const newLat = field === 'lat' ? numValue : prev.lat;
                  const newLng = field === 'lng' ? numValue : prev.lng;
                  map.current.flyTo({ center: [newLng, newLat] });
                  marker.current.setLngLat([newLng, newLat]);
              }
              return newData;
          });
      }
  };

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if(session) {
       const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', session.user.id).single();
       if(data?.is_super_admin) setIsSuperAdmin(true);
    } else {
      router.replace("/login");
    }
  }

  const fetchPlaces = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('places').select('*').order('created_at', { ascending: false });
    if (!error && data) setPlaces(data);
    setLoading(false);
  };

  const fetchLookups = async () => {
    const { data: cities } = await supabase.from('cities').select('*').order('name');
    if (cities) setCitiesList(cities);
    const { data: cats } = await supabase.from('categories').select('*').eq('type', 'place').order('name');
    if (cats) setCategoriesList(cats);
  };

  const handleAddNew = (type: 'tourist' | 'heritage' | 'experience' | 'natural') => {
    setFormData({ 
        name: "", type: type, category: "", city: "", description: "", media_urls: [], 
        lat: 18.2164, lng: 42.5053, is_active: true, work_hours: defaultWorkHours,
        price: 0, services: "", duration: "", difficulty: "سهل", max_capacity: type === 'experience' ? 10 : 0, blocked_dates: []
    });
    setMediaPreviews([]);
    setNewBlockedDate("");
    setIsModalOpen(true);
  };

  // دالة مساعدة لتحديد نوع الوسائط من الرابط
  const getMediaType = (url: string): 'image' | 'video' => {
      const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('video');
      return isVideo ? 'video' : 'image';
  };

  const handleEdit = (place: Place) => {
    setFormData({
        ...place,
        work_hours: place.work_hours || defaultWorkHours,
        blocked_dates: place.blocked_dates || []
    });
    
    // تحويل الروابط الموجودة إلى هيكل المعاينة
    const existingPreviews: MediaPreview[] = (place.media_urls || []).map(url => ({
        url,
        type: getMediaType(url)
    }));
    setMediaPreviews(existingPreviews);
    
    setNewBlockedDate("");
    setIsModalOpen(true);
  };

  const updateWorkHour = (index: number, field: keyof WorkHour, value: any) => {
    const updatedHours = [...(formData.work_hours || defaultWorkHours)];
    updatedHours[index] = { ...updatedHours[index], [field]: value };
    setFormData({ ...formData, work_hours: updatedHours });
  };

  const addBlockedDate = () => {
      if (newBlockedDate && !formData.blocked_dates?.includes(newBlockedDate)) {
          setFormData(prev => ({
              ...prev,
              blocked_dates: [...(prev.blocked_dates || []), newBlockedDate]
          }));
          setNewBlockedDate("");
      }
  };

  const removeBlockedDate = (dateToRemove: string) => {
      setFormData(prev => ({
          ...prev,
          blocked_dates: prev.blocked_dates?.filter(d => d !== dateToRemove)
      }));
  };

  // ✅ تصحيح منطق اختيار الملفات والمعاينة
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      const newPreviews: MediaPreview[] = filesArray.map(file => ({
          url: URL.createObjectURL(file),
          type: file.type.startsWith('video/') ? 'video' : 'image', // تحديد النوع من الملف مباشرة
          file: file
      }));

      setMediaPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // حذف وسائط من المعاينة
  const removeMedia = (index: number) => {
      setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    // نقسم الوسائط إلى: موجودة مسبقاً (روابط) وجديدة (ملفات)
    const existingUrls = mediaPreviews.filter(p => !p.file).map(p => p.url);
    const newFiles = mediaPreviews.filter(p => p.file).map(p => p.file!);

    uploadedUrls.push(...existingUrls);

    for (const file of newFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // ✅ إضافة خيارات الرفع لتحديد نوع المحتوى (يساعد في تشغيل الفيديو)
      const { data, error } = await supabase.storage.from('landmarks').upload(fileName, file, {
          contentType: file.type
      });
      
      if (error) { console.error("Upload error:", error); continue; }
      
      const { data: urlData } = supabase.storage.from('landmarks').getPublicUrl(fileName);
      uploadedUrls.push(urlData.publicUrl);
    }
    return uploadedUrls;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const finalMediaUrls = await uploadFiles();

      const placeData = {
          ...formData,
          media_urls: finalMediaUrls
      };

      if (formData.type !== 'experience') {
          delete placeData.duration;
          delete placeData.difficulty;
      }
      if (formData.type !== 'heritage') {
          delete placeData.services;
      }

      let details = "";
      if (!formData.id) {
          details = `إضافة ${formData.type === 'natural' ? 'معلم طبيعي' : formData.type} جديد: ${formData.name}`;
      } else {
          details = `تحديث بيانات: ${formData.name}`;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
          alert("انتهت الجلسة، سجل دخول مرة أخرى");
          return;
      }

      const response = await fetch('/api/admin/places/action', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ 
              action: 'save', 
              data: placeData, 
              logDetails: details 
          })
      });

      if (!response.ok) {
          const resJson = await response.json();
          throw new Error(resJson.error || "فشل الحفظ في السيرفر");
      }

      alert("✅ تم الحفظ بنجاح");
      setIsModalOpen(false);
      fetchPlaces();

    } catch (error: any) {
      console.error(error);
      alert("❌ خطأ: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const placeToDelete = places.find(p => p.id === id);
    if (!confirm(`حذف "${placeToDelete?.name}"؟`)) return;
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/admin/places/action', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ 
                action: 'delete', 
                id: id, 
                logDetails: `حذف معلم: ${placeToDelete?.name}` 
            })
        });

        if (!response.ok) throw new Error("فشل الحذف");

        setPlaces(prev => prev.filter(p => p.id !== id));
        alert("تم الحذف");

    } catch (error: any) {
        alert("خطأ: " + error.message);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace("/login"); };
  const filteredPlaces = places.filter(p => p.name.includes(searchTerm));

  const menuItems = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/admin/dashboard", show: true },
    { label: "طلبات الانضمام", icon: Briefcase, href: "/admin/requests", show: true },
    { label: "إدارة المعالم", icon: MapIcon, href: "/admin/landmarks", show: true },
    { label: "المستخدمين", icon: Users, href: "/admin/customers", show: true },
    { label: "المالية والأرباح", icon: DollarSign, href: "/admin/finance", show: true },
    { label: "فريق الإدارة", icon: ShieldAlert, href: "/admin/users", show: isSuperAdmin },
    { label: "الإعدادات", icon: Settings, href: "/admin/settings", show: true },
  ];

  return (
    <main dir="rtl" className={`flex min-h-screen bg-[#1a1a1a] text-white ${tajawal.className} relative`}>
      
      {/* Sidebar & Header */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg text-[#C89B3C]"><Menu size={24} /></button>
        <Link href="/" className="absolute left-1/2 -translate-x-1/2"><Image src="/logo.png" alt="Sayyir" width={80} height={30} className="opacity-90" /></Link>
        <div className="relative">
          <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="p-2 bg-white/5 rounded-full border border-white/10"><User size={20} /></button>
          {isProfileMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
              <Link href="/admin/profile" className="block px-4 py-3 hover:bg-white/5 text-sm transition">الحساب الشخصي</Link>
              <button onClick={handleLogout} className="w-full text-right px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm transition">تسجيل الخروج</button>
            </div>
          )}
        </div>
      </div>
      {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />}
      <aside className={`fixed md:sticky top-0 right-0 h-screen w-64 bg-[#151515] md:bg-black/40 border-l border-white/10 p-6 backdrop-blur-md z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute top-4 left-4 p-2 text-white/50 hover:text-white"><X size={24} /></button>
        <div className="mb-10 flex justify-center pt-4"><Link href="/"><Image src="/logo.png" alt="Admin" width={120} height={50} priority className="opacity-90 hover:opacity-100 transition" /></Link></div>
        <nav className="space-y-2 flex-1 h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
          {menuItems.map((item, i) => item.show && (
            <Link key={i} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${pathname === item.href ? "bg-[#C89B3C]/10 text-[#C89B3C] border border-[#C89B3C]/20 font-bold" : "text-white/60 hover:bg-white/5"}`}>
              <item.icon size={20} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10 mt-auto"><button onClick={handleLogout} className="flex gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 hover:bg-white/5 rounded-xl transition items-center"><LogOut size={20} /> خروج</button></div>
      </aside>

      <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-screen pt-24 md:pt-10">
        <header className="hidden md:flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <MapIcon className="text-[#C89B3C]" /> إدارة المعالم والتجارب
                </h1>
                <p className="text-white/60">إدارة الأماكن السياحية، المواقع التراثية، والتجارب.</p>
            </div>
            
            <div className="flex items-center gap-3">
               <button onClick={() => handleAddNew('tourist')} className="bg-[#1a1a1a] border border-[#C89B3C]/50 text-white px-4 py-2.5 rounded-xl hover:bg-[#C89B3C] hover:text-[#2B1F17] transition flex items-center gap-2 text-sm font-bold">
                  <Mountain size={18} /> إضافة معلم سياحي
               </button>
               <button onClick={() => handleAddNew('natural')} className="bg-[#1a1a1a] border border-teal-500/50 text-white px-4 py-2.5 rounded-xl hover:bg-teal-600 transition flex items-center gap-2 text-sm font-bold">
                  <Trees size={18} /> إضافة معلم طبيعي
               </button>
               <button onClick={() => handleAddNew('heritage')} className="bg-[#1a1a1a] border border-amber-500/50 text-white px-4 py-2.5 rounded-xl hover:bg-amber-600 transition flex items-center gap-2 text-sm font-bold">
                  <History size={18} /> إضافة موقع تراثي
               </button>
               <button onClick={() => handleAddNew('experience')} className="bg-[#1a1a1a] border border-emerald-500/50 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition flex items-center gap-2 text-sm font-bold">
                  <Camera size={18} /> إضافة تجربة
               </button>
            </div>
        </header>

        {/* Mobile Buttons */}
        <div className="md:hidden grid grid-cols-2 gap-2 mb-6">
           <button onClick={() => handleAddNew('tourist')} className="bg-[#C89B3C]/10 border border-[#C89B3C]/30 text-[#C89B3C] p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold">
              <Mountain size={20} /> معلم سياحي
           </button>
           <button onClick={() => handleAddNew('natural')} className="bg-teal-500/10 border border-teal-500/30 text-teal-500 p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold">
              <Trees size={20} /> معلم طبيعي
           </button>
           <button onClick={() => handleAddNew('heritage')} className="bg-amber-500/10 border border-amber-500/30 text-amber-500 p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold">
              <History size={20} /> تراث
           </button>
           <button onClick={() => handleAddNew('experience')} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 p-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold">
              <Camera size={20} /> تجربة
           </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 text-white/40" size={20} />
            <input type="text" placeholder="بحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-[#C89B3C] outline-none" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div> : 
           filteredPlaces.length === 0 ? <div className="p-20 text-center text-white/40">لا توجد بيانات.</div> : (
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right min-w-[800px]">
                <thead className="bg-black/20 text-white/50 text-xs uppercase"><tr><th className="px-6 py-4">الميديا</th><th className="px-6 py-4">الاسم</th><th className="px-6 py-4">المدينة</th><th className="px-6 py-4">النوع</th><th className="px-6 py-4">السعر</th><th className="px-6 py-4">الحالة</th><th className="px-6 py-4">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-white/5 text-sm">{filteredPlaces.map(p => (
                    <tr key={p.id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                        <div className="w-16 h-12 bg-white/10 rounded-lg overflow-hidden border border-white/10 relative">
                        {p.media_urls && p.media_urls[0] ? (
                            getMediaType(p.media_urls[0]) === 'video'
                            ? <div className="w-full h-full flex items-center justify-center bg-black"><PlayCircle size={20} className="text-white"/></div>
                            : <Image src={p.media_urls[0]} alt={p.name} fill className="object-cover" />
                        ) : <div className="flex justify-center items-center h-full"><ImageIcon size={16}/></div>}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{p.name}</td>
                    <td className="px-6 py-4">{p.city || '-'}</td>
                    <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded w-fit flex items-center gap-1 w-fit ${
                            p.type === 'experience' ? 'bg-emerald-500/20 text-emerald-400' : 
                            p.type === 'heritage' ? 'bg-amber-500/20 text-amber-400' : 
                            p.type === 'natural' ? 'bg-teal-500/20 text-teal-400' : 
                            'bg-blue-500/20 text-blue-400'
                        }`}>
                            {p.type === 'tourist' ? <Mountain size={12}/> : p.type === 'heritage' ? <History size={12}/> : p.type === 'natural' ? <Trees size={12}/> : <Camera size={12}/>}
                            {p.type === 'tourist' ? 'سياحي' : p.type === 'heritage' ? 'تراثي' : p.type === 'natural' ? 'طبيعي' : 'تجربة'}
                        </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[#C89B3C]">{p.price > 0 ? `${p.price} ريال` : 'مجاني'}</td>
                    <td className="px-6 py-4"><span className={`w-2 h-2 rounded-full inline-block mr-2 ${p.is_active ? 'bg-emerald-400' : 'bg-red-400'}`}></span>{p.is_active ? "نشط" : "مخفي"}</td>
                    <td className="px-6 py-4 flex gap-2"><button onClick={() => handleEdit(p)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white"><Edit size={16}/></button><button onClick={() => handleDelete(p.id!)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white"><Trash2 size={16}/></button></td>
                    </tr>
                ))}</tbody>
                </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#2B2B2B] w-full max-w-6xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                        formData.type === 'experience' ? 'bg-emerald-500/20 text-emerald-500' : 
                        formData.type === 'heritage' ? 'bg-amber-500/20 text-amber-500' : 
                        formData.type === 'natural' ? 'bg-teal-500/20 text-teal-500' :
                        'bg-[#C89B3C]/20 text-[#C89B3C]'
                    }`}>
                        {formData.type === 'tourist' ? <Mountain size={20}/> : formData.type === 'heritage' ? <History size={20}/> : formData.type === 'natural' ? <Trees size={20}/> : <Camera size={20}/>}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">{formData.id ? "تعديل البيانات" : 
                            formData.type === 'tourist' ? "إضافة معلم سياحي جديد" : 
                            formData.type === 'heritage' ? "إضافة موقع تراثي جديد" : 
                            formData.type === 'natural' ? "إضافة معلم طبيعي جديد" : 
                            "إضافة تجربة سياحية جديدة"}
                        </h3>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(false)}><X className="text-white/50 hover:text-white" /></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar p-6">
                
                {/* Visual Type Indicator */}
                <div className="flex bg-black/30 p-1 rounded-xl mb-6 w-fit mx-auto border border-white/10">
                    <button type="button" onClick={() => setFormData({...formData, type: 'tourist'})} className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${formData.type === 'tourist' ? 'bg-[#C89B3C] text-[#2B1F17] font-bold' : 'text-white/60 hover:text-white'}`}><Mountain size={16}/> معلم سياحي</button>
                    <button type="button" onClick={() => setFormData({...formData, type: 'natural'})} className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${formData.type === 'natural' ? 'bg-teal-600 text-white font-bold' : 'text-white/60 hover:text-white'}`}><Trees size={16}/> معلم طبيعي</button>
                    <button type="button" onClick={() => setFormData({...formData, type: 'heritage'})} className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${formData.type === 'heritage' ? 'bg-amber-600 text-white font-bold' : 'text-white/60 hover:text-white'}`}><History size={16}/> موقع تراثي</button>
                    <button type="button" onClick={() => setFormData({...formData, type: 'experience'})} className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${formData.type === 'experience' ? 'bg-emerald-600 text-white font-bold' : 'text-white/60 hover:text-white'}`}><Camera size={16}/> تجربة</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Column 1: Basic Info (Left) - Span 7 */}
                    <div className="lg:col-span-7 space-y-6">
                          
                          {/* Basic Info */}
                          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                            <h4 className="font-bold text-[#C89B3C] mb-2 flex items-center gap-2"><Settings size={16}/> البيانات الأساسية</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs text-white/60">الاسم</label>
                                    <input required type="text" placeholder="الاسم..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/60">التصنيف</label>
                                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white appearance-none">
                                    <option value="">اختر...</option>
                                    {categoriesList.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/60">المدينة</label>
                                    <select required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white appearance-none">
                                            <option value="">اختر...</option>
                                            {citiesList.map(city => <option key={city.id} value={city.name}>{city.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/60">الوصف</label>
                                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white resize-none" />
                            </div>
                          </div>

                          {/* Dynamic Details Block */}
                          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                            <h4 className="font-bold text-[#C89B3C] mb-2 flex items-center gap-2"><Info size={16}/> تفاصيل {formData.type === 'experience' ? 'التجربة' : 'المكان'}</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Price (All Types) */}
                                <div className="space-y-2">
                                    <label className="text-xs text-white/60 flex items-center gap-1"><DollarSign size={12}/> {formData.type !== 'experience' ? 'رسوم الدخول (0 = مجاني)' : 'السعر للشخص'}</label>
                                    <input type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white font-mono" />
                                </div>

                                {/* Heritage Specific */}
                                {formData.type === 'heritage' && (
                                    <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs text-white/60 flex items-center gap-1"><List size={12}/> الخدمات المتوفرة (اكتبها نصياً)</label>
                                            <textarea rows={2} placeholder="مثال: مرشد سياحي، دورات مياه، مواقف سيارات..." value={formData.services} onChange={e => setFormData({...formData, services: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white" />
                                    </div>
                                )}

                                {/* Experience Specific */}
                                {formData.type === 'experience' && (
                                    <>
                                            <div className="space-y-2">
                                                <label className="text-xs text-white/60 flex items-center gap-1"><UserCheck size={12}/> السعة القصوى</label>
                                                <input type="number" min="1" value={formData.max_capacity} onChange={e => setFormData({...formData, max_capacity: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white font-mono" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-white/60 flex items-center gap-1"><Activity size={12}/> مستوى الصعوبة</label>
                                                <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white appearance-none">
                                                    <option value="سهل">سهل 🟢</option>
                                                    <option value="متوسط">متوسط 🟡</option>
                                                    <option value="صعب">صعب 🔴</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-white/60 flex items-center gap-1"><Hourglass size={12}/> المدة (مثال: ساعتين)</label>
                                                <input type="text" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white" />
                                            </div>
                                    </>
                                )}
                            </div>
                          </div>

                          {/* Work Hours & Blocked Dates (Same as before) */}
                          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                            <h4 className="font-bold text-[#C89B3C] mb-2 flex items-center gap-2"><Clock size={16}/> التوفر والجدول الزمني</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-white/40 block mb-2">1. الجدول الأسبوعي العام</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {formData.work_hours?.map((wh, idx) => (
                                                <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border ${wh.is_active ? 'bg-black/20 border-white/10' : 'bg-red-500/5 border-red-500/10'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" onClick={() => updateWorkHour(idx, 'is_active', !wh.is_active)} className={`p-1 rounded-full ${wh.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {wh.is_active ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                                                        </button>
                                                        <span className="text-sm font-bold w-12">{wh.day}</span>
                                                    </div>
                                                    {wh.is_active ? (
                                                        <div className="flex gap-1 items-center dir-ltr">
                                                            <input type="time" value={wh.from} onChange={(e) => updateWorkHour(idx, 'from', e.target.value)} className="bg-transparent text-xs text-center w-16 outline-none"/>
                                                            <span>-</span>
                                                            <input type="time" value={wh.to} onChange={(e) => updateWorkHour(idx, 'to', e.target.value)} className="bg-transparent text-xs text-center w-16 outline-none"/>
                                                        </div>
                                                    ) : <span className="text-xs text-red-500/50">مغلق</span>}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <label className="text-xs text-white/60 block mb-2 flex items-center gap-2"><AlertTriangle size={12} className="text-amber-500"/> 2. استثناءات / أيام محجوزة</label>
                                    <div className="flex gap-2 mb-3">
                                            <input type="date" value={newBlockedDate} onChange={e => setNewBlockedDate(e.target.value)} className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-red-500 flex-1" />
                                            <button type="button" onClick={addBlockedDate} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition text-sm font-bold">حظر التاريخ</button>
                                    </div>
                                    {formData.blocked_dates && formData.blocked_dates.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.blocked_dates.map((date, idx) => (
                                                <div key={idx} className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                                                    {date}
                                                    <button type="button" onClick={() => removeBlockedDate(date)}><X size={12} className="hover:text-red-200"/></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                          </div>
                    </div>

                    {/* Column 2: Media & Map (Right) - Span 5 */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Map */}
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col h-auto">
                            <label className="text-xs text-white/60 mb-2 flex items-center gap-1"><MapPin size={14}/> تحديد الموقع الجغرافي (قمر صناعي)</label>
                            <div className="h-[300px] rounded-xl overflow-hidden border border-white/10 relative mb-4">
                                <div ref={mapContainer} className="w-full h-full absolute inset-0" />
                            </div>
                            
                            {/* ✅ حقول الإحداثيات المعدلة */}
                            <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                <div>
                                    <label className="text-[10px] text-white/40 block mb-1">خط العرض (Latitude)</label>
                                    <input 
                                        type="text" 
                                        value={formData.lat} 
                                        onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#C89B3C] outline-none font-mono dir-ltr"
                                        placeholder="مثال: 18.2164"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-white/40 block mb-1">خط الطول (Longitude)</label>
                                    <input 
                                        type="text" 
                                        value={formData.lng} 
                                        onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#C89B3C] outline-none font-mono dir-ltr"
                                        placeholder="مثال: 42.5053"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Attachments (Video & Images) */}
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                            <label className="text-xs text-white/60 flex items-center gap-1"><UploadCloud size={14}/> المرفقات (صور / فيديو)</label>
                            <div className="relative border-2 border-dashed border-white/10 bg-black/20 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-[#C89B3C]/50 transition cursor-pointer group">
                                <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <UploadCloud size={30} className="text-[#C89B3C] mb-2 group-hover:scale-110 transition" />
                                <p className="text-sm text-white/60">اضغط لرفع صور أو فيديو</p>
                            </div>
                            {mediaPreviews.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto py-2 custom-scrollbar">
                                    {mediaPreviews.map((media, idx) => (
                                    <div key={idx} className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/30 relative group">
                                            {media.type === 'video' ? ( 
                                                <div className="w-full h-full bg-black flex items-center justify-center">
                                                    <PlayCircle size={20} className="text-white/80" />
                                                </div>
                                            ) : (
                                                <img src={media.url} alt="Preview" className="w-full h-full object-cover" />
                                            )}
                                            <button 
                                                type="button" 
                                                onClick={() => removeMedia(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <X size={12}/>
                                            </button>
                                    </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-black/20 rounded-xl border border-white/5">
                            <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 accent-[#C89B3C]" />
                            <label htmlFor="isActive" className="text-sm cursor-pointer select-none">تفعيل العرض للزوار</label>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 mt-6 flex gap-3 border-t border-white/10 sticky bottom-0 bg-[#2B2B2B] z-10">
                  <button type="submit" disabled={saving} className="flex-1 bg-[#C89B3C] text-[#2B1F17] font-bold py-3 rounded-xl hover:bg-[#b38a35] transition flex justify-center items-center gap-2">
                    {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> حفظ البيانات</>}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}