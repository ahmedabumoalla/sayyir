"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  LayoutDashboard, Users, Map as MapIcon, DollarSign, Settings, ShieldAlert,
  Search, Plus, Edit, Trash2, MapPin, X, Save, Loader2, Image as ImageIcon, Briefcase, LogOut, UploadCloud, Video,
  Menu, User, Home, Camera, Mountain, History // أيقونات إضافية
} from "lucide-react";
import { Tajawal } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// مفتاح الماب بوكس
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiYWJkYWxsYWhtdWFsYSIsImEiOiJjbTV4b3I0aGgwM3FkMmFyMXF3ZDN3Y3IyIn0.DrD4wJ-M5a-RjC8tPXyQ4g"; 

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

interface Place {
  id?: string;
  name: string;
  type: string;     // tourist / heritage / experience
  category?: string; 
  city?: string;    
  description: string;
  media_urls: string[];
  lat: number;
  lng: number;
  is_active: boolean;
}

export default function LandmarksPage() {
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
  
  const [formData, setFormData] = useState<Place>({
    name: "", 
    type: "tourist", 
    category: "", 
    city: "", 
    description: "", 
    media_urls: [], 
    lat: 18.2164, 
    lng: 42.5053, 
    is_active: true
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    fetchPlaces();
    fetchLookups();
    checkRole();
  }, []);

  useEffect(() => {
    if (isModalOpen && mapContainer.current) {
      setTimeout(() => {
        if (!map.current) {
          map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/streets-v12', 
            center: [formData.lng, formData.lat],
            zoom: 12,
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
        }
      }, 200);
    } else {
      map.current?.remove();
      map.current = null;
    }
  }, [isModalOpen]);

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

  const handleAddNew = () => {
    setFormData({ 
        name: "", type: "tourist", category: "", city: "", 
        description: "", media_urls: [], 
        lat: 18.2164, lng: 42.5053, is_active: true 
    });
    setSelectedFiles([]);
    setPreviews([]);
    setIsModalOpen(true);
  };

  const handleEdit = (place: Place) => {
    setFormData(place);
    setSelectedFiles([]);
    setPreviews(place.media_urls || []);
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const file of selectedFiles) {
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
      const { data, error } = await supabase.storage.from('landmarks').upload(fileName, file);
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
      const newUrls = await uploadFiles();
      const finalMediaUrls = [...(formData.media_urls || []), ...newUrls];

      const placeData = {
          ...formData,
          media_urls: finalMediaUrls
      };

      let details = "";
      if (!formData.id) {
          details = `إضافة ${formData.type === 'experience' ? 'تجربة' : 'معلم'} جديد: ${formData.name}`;
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
                <p className="text-white/60">إدارة الأماكن السياحية والتراثية والتجارب.</p>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={handleAddNew} className="bg-[#C89B3C] text-[#2B1F17] font-bold px-6 py-3 rounded-xl hover:bg-[#b38a35] transition flex items-center gap-2 shadow-lg shadow-[#C89B3C]/20"><Plus size={20} /> إضافة جديد</button>
               <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition" title="الموقع الرئيسي"><Home size={20} className="text-white/70" /></Link>
            </div>
        </header>

        {/* Mobile Header */}
        <div className="md:hidden mb-6 flex justify-between items-center">
             <div>
                 <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                    <MapIcon className="text-[#C89B3C]" size={24} /> المعالم
                 </h1>
             </div>
             <button onClick={handleAddNew} className="bg-[#C89B3C] text-[#2B1F17] p-2.5 rounded-xl font-bold hover:bg-[#b38a35] transition shadow-lg shadow-[#C89B3C]/20"><Plus size={20} /></button>
        </div>

        <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 text-white/40" size={20} />
            <input type="text" placeholder="بحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-[#C89B3C] outline-none" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div> : 
           filteredPlaces.length === 0 ? <div className="p-20 text-center text-white/40">لا توجد بيانات.</div> : (
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right min-w-[800px]">
                <thead className="bg-black/20 text-white/50 text-xs uppercase"><tr><th className="px-6 py-4">الميديا</th><th className="px-6 py-4">الاسم</th><th className="px-6 py-4">المدينة</th><th className="px-6 py-4">التصنيف</th><th className="px-6 py-4">الحالة</th><th className="px-6 py-4">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-white/5 text-sm">{filteredPlaces.map(p => (
                    <tr key={p.id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                        <div className="w-16 h-12 bg-white/10 rounded-lg overflow-hidden border border-white/10">
                        {p.media_urls && p.media_urls[0] ? (
                            p.media_urls[0].includes('mp4') || p.media_urls[0].includes('webm') 
                            ? <video src={p.media_urls[0]} className="w-full h-full object-cover" />
                            : <img src={p.media_urls[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : <div className="flex justify-center items-center h-full"><ImageIcon size={16}/></div>}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{p.name}</td>
                    <td className="px-6 py-4">{p.city || '-'}</td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded w-fit ${p.type === 'experience' ? 'bg-emerald-500/20 text-emerald-400' : p.type === 'heritage' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {p.type === 'tourist' ? 'سياحي' : p.type === 'heritage' ? 'تراثي' : 'تجربة'}
                            </span>
                            <span className="text-xs text-white/50">{p.category || '-'}</span>
                        </div>
                    </td>
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
            <div className="bg-[#2B2B2B] w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-bold text-white">{formData.id ? "تعديل" : "إضافة جديدة"}</h3>
                <button onClick={() => setIsModalOpen(false)}><X className="text-white/50 hover:text-white" /></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* القسم الأيمن: البيانات والملفات */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">الاسم</label>
                    <input required type="text" placeholder="اسم المعلم أو التجربة" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white" />
                  </div>
                  
                  {/* ✅ تعديل نوع الإضافة (3 أزرار واضحة) */}
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">نوع الإضافة (اختر التصنيف)</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => setFormData({...formData, type: 'tourist'})} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${formData.type === 'tourist' ? 'bg-[#C89B3C] text-[#2B1F17] border-[#C89B3C]' : 'bg-black/30 text-white/60 border-white/10 hover:bg-white/5'}`}>
                            <Mountain size={18} /> <span className="text-xs font-bold">معلم سياحي</span>
                        </button>
                        <button type="button" onClick={() => setFormData({...formData, type: 'heritage'})} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${formData.type === 'heritage' ? 'bg-amber-600 text-white border-amber-600' : 'bg-black/30 text-white/60 border-white/10 hover:bg-white/5'}`}>
                            <History size={18} /> <span className="text-xs font-bold">موقع تراثي</span>
                        </button>
                        <button type="button" onClick={() => setFormData({...formData, type: 'experience'})} className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${formData.type === 'experience' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-black/30 text-white/60 border-white/10 hover:bg-white/5'}`}>
                            <Camera size={18} /> <span className="text-xs font-bold">تجربة سياحية</span>
                        </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">التصنيف الفرعي</label>
                        <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white appearance-none">
                          <option value="">اختر...</option>
                          {categoriesList.map(cat => (
                             <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/60">المدينة</label>
                        <select required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white appearance-none">
                            <option value="">اختر المدينة...</option>
                            {citiesList.map(city => (
                                <option key={city.id} value={city.name}>{city.name}</option>
                            ))}
                        </select>
                      </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/60">الوصف</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white resize-none" />
                  </div>

                  {/* ✅ قسم المرفقات */}
                  <div className="space-y-2">
                    <label className="text-xs text-white/60 flex items-center gap-1"><UploadCloud size={14}/> المرفقات (صور / فيديو)</label>
                    <div className="relative border-2 border-dashed border-white/10 bg-black/20 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-[#C89B3C]/50 transition cursor-pointer">
                      <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <UploadCloud size={30} className="text-[#C89B3C] mb-2" />
                      <p className="text-sm text-white/60">اضغط لإضافة مرفق جديد</p>
                    </div>
                    {previews.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto py-2 custom-scrollbar">
                        {previews.map((src, idx) => (
                          <div key={idx} className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/30 relative group">
                             {src.includes('blob:http') && src.match(/mp4|webm/) ? ( 
                               <Video size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80" />
                             ) : (
                               <img src={src} alt="Preview" className="w-full h-full object-cover" />
                             )}
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

                {/* القسم الأيسر: الخريطة */}
                <div className="flex flex-col h-full">
                  <label className="text-xs text-white/60 mb-2">تحديد الموقع</label>
                  <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative min-h-[300px]">
                    <div ref={mapContainer} className="w-full h-full absolute inset-0" />
                    <div className="absolute bottom-2 left-2 bg-white/90 text-black text-[10px] px-2 py-1 rounded shadow font-mono">
                      {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="md:col-span-2 pt-4 flex gap-3 border-t border-white/10">
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