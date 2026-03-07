"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { 
  Search, Plus, Edit, Trash2, MapPin, X, Save, Loader2, Image as ImageIcon, UploadCloud,MapIcon, Settings, Clock, 
  Mountain, History, Camera, Trees, PlayCircle, DollarSign, Info, AlertTriangle, UserCheck, Activity, Hourglass, List, CheckCircle, XCircle
} from "lucide-react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
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
  type: 'tourist' | 'heritage' | 'experience' | 'natural';
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

interface MediaPreview {
    url: string;
    type: 'image' | 'video';
    file?: File;
}

export default function AdminLandmarksPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [citiesList, setCitiesList] = useState<any[]>([]); 
  const [categoriesList, setCategoriesList] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    fetchPlaces();
    fetchLookups();
  }, []);

  useEffect(() => {
    if (isModalOpen && mapContainer.current) {
      setTimeout(() => {
        if (!map.current) {
          map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
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
            map.current.flyTo({ center: [formData.lng, formData.lat] });
            marker.current?.setLngLat([formData.lng, formData.lat]);
        }
      }, 200);
    } 
  }, [isModalOpen, formData.lat, formData.lng]);

  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
      let cleanValue = value.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

      if (cleanValue.includes(',')) {
          const parts = cleanValue.split(',');
          const latVal = parseFloat(parts[0].trim());
          const lngVal = parseFloat(parts[1].trim());

          if (!isNaN(latVal) && !isNaN(lngVal)) {
              setFormData(prev => ({ ...prev, lat: latVal, lng: lngVal }));
              if (map.current && marker.current) {
                  map.current.flyTo({ center: [lngVal, latVal] });
                  marker.current.setLngLat([lngVal, latVal]);
              }
              return; 
          }
      }

      const numValue = parseFloat(cleanValue);
      
      if (!isNaN(numValue)) {
          setFormData(prev => {
              const newData = { ...prev, [field]: numValue };
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newPreviews: MediaPreview[] = filesArray.map(file => ({
          url: URL.createObjectURL(file),
          type: file.type.startsWith('video/') ? 'video' : 'image',
          file: file
      }));
      setMediaPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeMedia = (index: number) => {
      setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const existingUrls = mediaPreviews.filter(p => !p.file).map(p => p.url);
    const newFiles = mediaPreviews.filter(p => p.file).map(p => p.file!);

    uploadedUrls.push(...existingUrls);

    for (const file of newFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { data, error } = await supabase.storage.from('landmarks').upload(fileName, file, { contentType: file.type });
      if (error) continue;
      const { data: urlData } = supabase.storage.from('landmarks').getPublicUrl(fileName);
      uploadedUrls.push(urlData.publicUrl);
    }
    return uploadedUrls;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.name) return alert("يرجى كتابة الاسم"); // حماية إضافية
    setSaving(true);

    try {
      const finalMediaUrls = await uploadFiles();
      const placeData = { ...formData, media_urls: finalMediaUrls };

      if (formData.type !== 'experience') {
          delete placeData.duration;
          delete placeData.difficulty;
      }
      if (formData.type !== 'heritage') {
          delete placeData.services;
      }

      let details = formData.id ? `تحديث بيانات: ${formData.name}` : `إضافة ${formData.type === 'natural' ? 'معلم طبيعي' : formData.type} جديد: ${formData.name}`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert("انتهت الجلسة"); return; }

      const response = await fetch('/api/admin/places/action', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ action: 'save', data: placeData, logDetails: details })
      });

      if (!response.ok) {
          const resJson = await response.json();
          throw new Error(resJson.error || "فشل الحفظ في السيرفر");
      }

      alert("✅ تم الحفظ بنجاح");
      setIsModalOpen(false);
      fetchPlaces();

    } catch (error: any) {
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
            body: JSON.stringify({ action: 'delete', id: id, logDetails: `حذف معلم: ${placeToDelete?.name}` })
        });

        if (!response.ok) throw new Error("فشل الحذف");

        setPlaces(prev => prev.filter(p => p.id !== id));
        alert("تم الحذف");

    } catch (error: any) {
        alert("خطأ: " + error.message);
    }
  };

  const filteredPlaces = places.filter(p => p.name && p.name.includes(searchTerm));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
              <MapIcon className="text-[#C89B3C]" /> إدارة المعالم والتجارب
              </h1>
              <p className="text-white/60 text-sm">إضافة وتعديل الأماكن السياحية، المواقع التراثية، والتجارب.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => handleAddNew('tourist')} className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl hover:bg-[#C89B3C] hover:border-[#C89B3C] hover:text-black transition flex items-center gap-2 text-xs font-bold">
                  <Mountain size={16} /> إضافة سياحي
              </button>
              <button onClick={() => handleAddNew('natural')} className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl hover:bg-teal-500 hover:border-teal-500 hover:text-white transition flex items-center gap-2 text-xs font-bold">
                  <Trees size={16} /> إضافة طبيعي
              </button>
              <button onClick={() => handleAddNew('heritage')} className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl hover:bg-amber-500 hover:border-amber-500 hover:text-white transition flex items-center gap-2 text-xs font-bold">
                  <History size={16} /> إضافة تراثي
              </button>
              <button onClick={() => handleAddNew('experience')} className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition flex items-center gap-2 text-xs font-bold">
                  <Camera size={16} /> إضافة تجربة
              </button>
          </div>
      </header>

      {/* Search Bar */}
      <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 text-white/40" size={20} />
          <input type="text" placeholder="بحث باسم المعلم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-[#C89B3C] outline-none text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#C89B3C] w-10 h-10" /></div> : 
          filteredPlaces.length === 0 ? <div className="p-20 text-center text-white/40">لا توجد معالم مسجلة.</div> : (
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right min-w-200">
              <thead className="bg-black/20 text-white/50 text-xs uppercase"><tr><th className="px-6 py-4">الميديا</th><th className="px-6 py-4">الاسم</th><th className="px-6 py-4">المدينة</th><th className="px-6 py-4">النوع</th><th className="px-6 py-4">السعر</th><th className="px-6 py-4">الحالة</th><th className="px-6 py-4">إجراءات</th></tr></thead>
              <tbody className="divide-y divide-white/5 text-sm">{filteredPlaces.map(p => (
                  <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                      <div className="w-16 h-12 bg-black/50 rounded-lg overflow-hidden border border-white/10 relative">
                      {p.media_urls && p.media_urls[0] ? (
                          getMediaType(p.media_urls[0]) === 'video'
                          ? <div className="w-full h-full flex items-center justify-center bg-black"><PlayCircle size={20} className="text-white"/></div>
                          : <Image src={p.media_urls[0]} alt={p.name} fill className="object-cover" />
                      ) : <div className="flex justify-center items-center h-full"><ImageIcon size={16} className="text-white/20"/></div>}
                      </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{p.name || "بدون اسم"}</td>
                  <td className="px-6 py-4 text-white/80">{p.city || '-'}</td>
                  <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 w-max ${
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1a1a1a] w-full max-w-6xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl">
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
              
              <div className="flex flex-wrap bg-black/30 p-1 rounded-xl mb-6 w-max mx-auto border border-white/10">
                  <button type="button" onClick={() => setFormData({...formData, type: 'tourist'})} className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${formData.type === 'tourist' ? 'bg-[#C89B3C] text-[#2B1F17] font-bold' : 'text-white/60 hover:text-white'}`}><Mountain size={16}/> معلم سياحي</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'natural'})} className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${formData.type === 'natural' ? 'bg-teal-600 text-white font-bold' : 'text-white/60 hover:text-white'}`}><Trees size={16}/> معلم طبيعي</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'heritage'})} className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${formData.type === 'heritage' ? 'bg-amber-600 text-white font-bold' : 'text-white/60 hover:text-white'}`}><History size={16}/> موقع تراثي</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'experience'})} className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${formData.type === 'experience' ? 'bg-emerald-600 text-white font-bold' : 'text-white/60 hover:text-white'}`}><Camera size={16}/> تجربة</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column */}
                  <div className="lg:col-span-7 space-y-6">
                        
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                          <h4 className="font-bold text-[#C89B3C] mb-2 flex items-center gap-2"><Settings size={16}/> البيانات الأساسية</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs text-white/60">الاسم</label>
                                  <input required type="text" placeholder="اكتب الاسم هنا..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white" />
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

                        <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                          <h4 className="font-bold text-[#C89B3C] mb-2 flex items-center gap-2"><Info size={16}/> تفاصيل {formData.type === 'experience' ? 'التجربة' : 'المكان'}</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-xs text-white/60 flex items-center gap-1"><DollarSign size={12}/> {formData.type !== 'experience' ? 'رسوم الدخول (0 = مجاني)' : 'السعر للشخص'}</label>
                                  <input type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white font-mono" />
                              </div>

                              {formData.type === 'heritage' && (
                                  <div className="space-y-2 md:col-span-2">
                                          <label className="text-xs text-white/60 flex items-center gap-1"><List size={12}/> الخدمات المتوفرة (اكتبها نصياً)</label>
                                          <textarea rows={2} placeholder="مثال: مرشد سياحي، دورات مياه، مواقف سيارات..." value={formData.services} onChange={e => setFormData({...formData, services: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-[#C89B3C] outline-none text-white" />
                                  </div>
                              )}

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
                                          <button type="button" onClick={addBlockedDate} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition text-sm font-bold shrink-0">حظر التاريخ</button>
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

                  {/* Right Column */}
                  <div className="lg:col-span-5 space-y-6">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col h-auto">
                          <label className="text-xs text-white/60 mb-2 flex items-center gap-1"><MapPin size={14}/> تحديد الموقع الجغرافي (قمر صناعي)</label>
                          <div className="h-75 rounded-xl overflow-hidden border border-white/10 relative mb-4">
                              <div ref={mapContainer} className="w-full h-full absolute inset-0" />
                          </div>
                          
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
                                  <div key={idx} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/30 relative group">
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
              <div className="pt-6 mt-6 flex gap-3 border-t border-white/10 sticky bottom-0 bg-[#1a1a1a] z-10 py-4">
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
  );
}