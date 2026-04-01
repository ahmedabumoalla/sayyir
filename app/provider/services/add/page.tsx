"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  ChevronRight, Save, Loader2, MapPin, Image as ImageIcon, 
  Home, Compass, Building, Tent, Info, Plus, Trash2, 
  ShieldCheck, UploadCloud, Clock, CheckSquare, X,
  Activity, Ticket, FileText, Utensils, PlayCircle, Video
} from "lucide-react";
import { Tajawal } from "next/font/google";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// --- خيارات ثابتة ---
const TRADITIONAL_HOUSE_FEATURES = [
    { id: 'yard', label: 'يوجد حوش' }, { id: 'view', label: 'يوجد مطل' },
    { id: 'farm', label: 'يقع داخل مزرعة' }, { id: 'main_road', label: 'على الطريق العام' },
    { id: 'services_nearby', label: 'بالقرب من خدمات' }, { id: 'wifi', label: 'يتوفر واي فاي' },
    { id: 'parking', label: 'مواقف سيارات' }, { id: 'bbq', label: 'أماكن للشواء' },
];

const LODGING_FEATURES = [
    { id: 'wifi', label: 'واي فاي مجاني' }, { id: 'parking', label: 'مواقف سيارات' },
    { id: 'kitchen', label: 'مطبخ صغير' }, { id: 'tv', label: 'تلفزيون سمارت' },
    { id: 'ac', label: 'تكييف' }, { id: 'cleaning', label: 'خدمة تنظيف' },
    { id: 'view', label: 'إطلالة' }
];

const RESORT_FEATURES = [
    { id: 'pool', label: 'مسبح خاص' }, { id: 'volleyball', label: 'ملعب طائرة' },
    { id: 'football', label: 'ملعب كرة قدم' }, { id: 'men_majlis', label: 'مجلس رجال' },
    { id: 'women_majlis', label: 'مجلس نساء' }, { id: 'bbq', label: 'مكان للشواء' },
    { id: 'kids_area', label: 'ألعاب أطفال' }, { id: 'green_area', label: 'مسطحات خضراء' }
];

const EXPERIENCE_SERVICES = [
    { id: 'transport', label: 'مركبة للنقل' }, { id: 'tent', label: 'خيمة للاستراحة' },
    { id: 'floor_seating', label: 'جلسات أرضية' }, { id: 'chairs', label: 'كراسي متنقلة' },
    { id: 'water', label: 'مياه شرب' }, { id: 'food', label: 'وجبات طعام' }
];

const EVENT_ACTIVITIES = [
    { id: 'kiosks', label: 'أكشاك بيع' }, { id: 'rides', label: 'ألعاب وملاهي' },
    { id: 'seating', label: 'جلسات عامة' }, { id: 'cable_car', label: 'تلفريك' },
    { id: 'live_shows', label: 'عروض حية ومسرح' }
];

const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image() as HTMLImageElement;
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200; 
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height = height * (MAX_WIDTH / width); width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    else resolve(file); 
                }, 'image/jpeg', 0.7);
            };
        };
    });
};

const convertTo24Hour = (hour: string, minute: string, period: 'AM' | 'PM') => {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

const TimePicker12H = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    let initialHour = "12"; let initialMinute = "00"; let initialPeriod: 'AM' | 'PM' = "AM";
    if (value) {
        const [hStr, mStr] = value.split(':');
        let h = parseInt(hStr, 10);
        initialPeriod = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12; if (h === 0) h = 12;
        initialHour = h.toString().padStart(2, '0'); initialMinute = mStr;
    }
    const [hour, setHour] = useState(initialHour);
    const [minute, setMinute] = useState(initialMinute);
    const [period, setPeriod] = useState<'AM' | 'PM'>(initialPeriod);

    const updateValue = (h: string, m: string, p: 'AM' | 'PM') => onChange(convertTo24Hour(h, m, p));

    return (
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-1 w-fit" dir="ltr">
            <select value={hour} onChange={(e) => { setHour(e.target.value); updateValue(e.target.value, minute, period); }} className="bg-black text-white text-xs outline-none cursor-pointer appearance-none text-center">
                {Array.from({length: 12}, (_, i) => i + 1).map(h => <option key={h} value={h.toString().padStart(2, '0')} className="bg-[#1a1a1a] text-white">{h.toString().padStart(2, '0')}</option>)}
            </select>
            <span className="text-white/50">:</span>
            <select value={minute} onChange={(e) => { setMinute(e.target.value); updateValue(hour, e.target.value, period); }} className="bg-black text-white text-xs outline-none cursor-pointer appearance-none text-center">
                {["00", "15", "30", "45", "59"].map(m => <option key={m} value={m} className="bg-[#1a1a1a] text-white">{m}</option>)}
            </select>
            <select value={period} onChange={(e) => { const p = e.target.value as 'AM' | 'PM'; setPeriod(p); updateValue(hour, minute, p); }} className="bg-white/10 text-white text-xs outline-none cursor-pointer rounded px-1 ml-1">
                <option value="AM" className="bg-[#1a1a1a] text-white">صباحاً</option>
                <option value="PM" className="bg-[#1a1a1a] text-white">مساءً</option>
            </select>
        </div>
    );
};

// ✅ مساعدة لمعرفة إذا الرابط فيديو لكي يعرضه بشكل صحيح في الـ Preview
const isVideoLink = (url: string | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.ogg') || lower.includes('.mov') || lower.includes('video');
};

export default function AddServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const facilityServiceFileRef = useRef<HTMLInputElement>(null);
  const todayDate = new Date().toISOString().split('T')[0];

  // 1. التصنيفات
  const [mainCategory, setMainCategory] = useState<'facility_lodging' | 'experience_event' | null>(null);
  const [subCategory, setSubCategory] = useState<'facility' | 'lodging' | 'experience' | 'event' | null>(null);

  // 2. الأساسيات
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); 
  const [childPrice, setChildPrice] = useState("");

  // 3. النزل (Lodging)
  const [lodgingType, setLodgingType] = useState<'room' | 'apartment' | 'house' | 'cottage' | 'resort' | 'other' | null>(null);
  const [customLodgingType, setCustomLodgingType] = useState("");
  const [numberOfUnitsText, setNumberOfUnitsText] = useState("");
  const [lodgingArea, setLodgingArea] = useState("");
  const [apartmentDetails, setApartmentDetails] = useState({ rooms: "", beds: "", bathrooms: "" });
  const [houseDetails, setHouseDetails] = useState({ floors: "", bedrooms: "", livingRooms: "", bathrooms: "" });
  const [houseFeatures, setHouseFeatures] = useState<string[]>([]);
  const [customLodgingFeatures, setCustomLodgingFeatures] = useState<string[]>([]);
  const [newLodgingFeature, setNewLodgingFeature] = useState("");
  const [targetAudience, setTargetAudience] = useState<'singles' | 'families' | 'both'>('both');
  const [capacity, setCapacity] = useState("");
  const [depositConfig, setDepositConfig] = useState({ required: false, isRefundable: true, paymentTime: 'with_booking' });

  // 4. المرفق (Facility)
  const [facilityServices, setFacilityServices] = useState<any[]>([]);
  const [facServName, setFacServName] = useState("");
  const [facServDesc, setFacServDesc] = useState("");
  const [facServImg, setFacServImg] = useState<File | null>(null);

  // 5. التجربة (Experience)
  const [expDates, setExpDates] = useState<string[]>([]);
  const [newExpDate, setNewExpDate] = useState("");
  const [expStartTime, setExpStartTime] = useState("09:00"); 
  const [expDurationVal, setExpDurationVal] = useState(""); 
  const [expDurationUnit, setExpDurationUnit] = useState("ساعة"); 
  const [expDifficulty, setExpDifficulty] = useState("easy");
  const [expIncludedServices, setExpIncludedServices] = useState<string[]>([]);
  const [expFoodDetails, setExpFoodDetails] = useState({ mealType: "", ingredients: "", calories: "", drinks: "", contents: "" });
  const [customExpServices, setCustomExpServices] = useState<string[]>([]);
  const [newCustomExpService, setNewCustomExpService] = useState("");
  const [expWhatToBring, setExpWhatToBring] = useState("");
  const [expChildrenAllowed, setExpChildrenAllowed] = useState(true);
  const [expCancellation, setExpCancellation] = useState("");

  // 6. الفعالية (Event)
  const [eventDates, setEventDates] = useState({ startDate: "", endDate: "", startTime: "16:00", endTime: "23:00" });
  const [eventActivities, setEventActivities] = useState<string[]>([]);
  const [customEventActivity, setCustomEventActivity] = useState("");
  const [customEventActivitiesList, setCustomEventActivitiesList] = useState<string[]>([]);

  // 7. مشتركة
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [commercialLicense, setCommercialLicense] = useState<File | null>(null);
  const [policies, setPolicies] = useState("");
  const [workDays, setWorkDays] = useState(["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map(d => ({ day: d, active: true, shifts: [{ from: "08:00", to: "23:59" }] })));

  // 8. الموقع
  const [location, setLocation] = useState({ lat: 18.2164, lng: 42.5053 });
  const [exactLat, setExactLat] = useState("");
  const [exactLng, setExactLng] = useState("");

  useEffect(() => {
      const lat = parseFloat(exactLat);
      const lng = parseFloat(exactLng);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== location.lat || lng !== location.lng)) {
          setLocation({ lat, lng });
      }
  }, [exactLat, exactLng]);

  const removeImage = (index: number) => setImages(images.filter((_, i) => i !== index));
  const handleHouseFeatureToggle = (id: string) => setHouseFeatures(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    try {
      const originalFile = e.target.files[0];
      const isVideoFile = originalFile.type.startsWith('video/');
      
      const finalFile = isVideoFile ? originalFile : await compressImage(originalFile);
      
      const fileExt = finalFile.name.split('.').pop();
      const fileName = `places/${Date.now()}_${Math.random()}.${fileExt}`;
      
      const { error } = await supabase.storage.from('provider-files').upload(fileName, finalFile, {
          contentType: originalFile.type 
      });
      
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('provider-files').getPublicUrl(fileName);
      setImages([...images, publicUrl]);
    } catch (error) { 
      alert("حدث خطأ أثناء رفع المرفق."); 
    } 
    finally { setUploadingImage(false); }
  };

  const uploadSingleFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage.from('provider-files').upload(fileName, file, {
        contentType: file.type
    });
    if (error) throw error;
    return supabase.storage.from('provider-files').getPublicUrl(fileName).data.publicUrl;
  };

  const addFacilityService = () => {
      if(!facServName) return alert("الرجاء كتابة اسم الخدمة");
      setFacilityServices([...facilityServices, { id: Date.now(), name: facServName, description: facServDesc, imageFile: facServImg, imagePreview: facServImg ? URL.createObjectURL(facServImg) : null }]);
      setFacServName(""); setFacServDesc(""); setFacServImg(null);
  };

  const handleSubmit = async () => {
      // ✅ تعديل التحقق لضمان أن الفعاليات تتطلب سعراً، ولو كان 0 يكتبه المزود
      if (!title || !description || price === "" || !mainCategory || !subCategory) {
          return alert("الرجاء تعبئة جميع الحقول الأساسية المطلوبة.");
      }

      if (subCategory === 'lodging' && !lodgingType) return alert("الرجاء تحديد نوع النزل.");

      setLoading(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("غير مصرح");

          let licenseUrl = null;
          if (commercialLicense) licenseUrl = await uploadSingleFile(commercialLicense, 'licenses');

          const processedFacServices = await Promise.all(facilityServices.map(async (fs) => {
              let url = null;
              if (fs.imageFile) url = await uploadSingleFile(await compressImage(fs.imageFile), 'facility-services');
              return { name: fs.name, description: fs.description, image_url: url };
          }));

          const finalLat = exactLat ? parseFloat(exactLat) : location.lat;
          const finalLng = exactLng ? parseFloat(exactLng) : location.lng;

          const details: any = { images };

          if (subCategory === 'facility') {
              details.facility_services = processedFacServices;
          } 
          else if (subCategory === 'lodging') {
              details.lodging_type = lodgingType;
              details.custom_lodging_type = lodgingType === 'other' ? customLodgingType : null;
              details.number_of_units = numberOfUnitsText;
              details.deposit_config = depositConfig;
              details.area = lodgingArea;
              details.features = houseFeatures;
              details.custom_features = customLodgingFeatures;
              details.target_audience = lodgingType !== 'house' ? targetAudience : null;
              details.policies = policies; 
              
              if (lodgingType === 'house') details.house_details = houseDetails;
              if (lodgingType === 'apartment') details.apartment_details = apartmentDetails;
          }
          else if (subCategory === 'experience') {
              details.experience_info = {
                  dates: expDates,
                  start_time: expStartTime,
                  duration: `${expDurationVal} ${expDurationUnit}`,
                  difficulty: expDifficulty,
                  target_audience: targetAudience,
                  included_services: expIncludedServices,
                  food_details: expIncludedServices.includes('food') ? expFoodDetails : null,
                  custom_services: customExpServices,
                  what_to_bring: expWhatToBring,
                  children_allowed: expChildrenAllowed,
                  cancellation_policy: expCancellation
              };
          }
          else if (subCategory === 'event') {
              // ✅ حفظ سعر الأطفال بشكل صحيح أو تركه فارغاً إذا لم يحدده
              details.event_info = {
                  child_price: childPrice === "" ? null : Number(childPrice),
                  dates: eventDates,
                  activities: eventActivities,
                  custom_activities: customEventActivitiesList
              };
          }

          const payload = {
              provider_id: session.user.id,
              service_category: mainCategory === 'facility_lodging' ? (subCategory === 'facility' ? 'facility' : 'lodging') : 'experience',
              sub_category: subCategory,
              service_type: mainCategory === 'experience_event' ? 'experience' : 'general',
              title,
              description,
              // ✅ حفظ السعر الأساسي للجميع كـ Number
              price: Number(price),
              commercial_license: licenseUrl,
              location_lat: finalLat,
              location_lng: finalLng,
              status: 'pending',
              image_url: images[0] || null,
              max_capacity: capacity ? Number(capacity) : null,
              work_schedule: subCategory === 'lodging' ? workDays : null,
              details: details
          };

          const { error } = await supabase.from('services').insert([payload]);
          if (error) throw error;

          alert("✅ تم إرسال الخدمة للمراجعة بنجاح!");
          router.push('/provider/services');

      } catch (error: any) {
          console.error(error);
          alert("خطأ: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  const mapTitle = subCategory === 'facility' ? 'موقع المرفق' : subCategory === 'lodging' ? 'موقع النزل' : subCategory === 'experience' ? 'موقع التجربة' : 'موقع الفعالية';
  const priceLabel = subCategory === 'lodging' ? 'سعر الليلة (يبدأ من)' : subCategory === 'experience' ? 'سعر الشخص الواحد' : subCategory === 'event' ? 'رسوم الدخول (للشخص البالغ)' : 'سعر الخدمة';
  const currentLodgingFeatures = lodgingType === 'house' ? TRADITIONAL_HOUSE_FEATURES : lodgingType === 'resort' ? RESORT_FEATURES : LODGING_FEATURES;

  return (
    <div className={`min-h-screen bg-[#121212] text-white p-4 lg:p-10 ${tajawal.className}`} dir="rtl">
        
        <div className="flex justify-between items-center mb-6 bg-[#1a1a1a] p-4 lg:p-6 rounded-2xl border border-white/5 shadow-lg">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Plus className="text-[#C89B3C]"/> إضافة خدمة جديدة</h1>
                <p className="text-white/50 text-xs mt-1">أكمل التفاصيل أدناه لنشر خدمتك على منصة سيّر</p>
            </div>
            <button onClick={() => router.back()} className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition flex items-center gap-2">
                <span className="hidden sm:inline text-sm font-bold">إلغاء وتراجع</span>
                <ChevronRight size={18}/>
            </button>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            
            <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><Compass className="text-[#C89B3C]"/> 1. حدد القسم الرئيسي</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div onClick={() => {setMainCategory('facility_lodging'); setSubCategory(null);}} className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-center gap-4 ${mainCategory === 'facility_lodging' ? 'border-[#C89B3C] bg-[#C89B3C]/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}>
                        <Building size={32} className={mainCategory === 'facility_lodging' ? 'text-[#C89B3C]' : 'text-white/40'}/>
                        <span className="font-bold text-lg">مرفق أو نزل</span>
                    </div>
                    <div onClick={() => {setMainCategory('experience_event'); setSubCategory(null);}} className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-center gap-4 ${mainCategory === 'experience_event' ? 'border-[#C89B3C] bg-[#C89B3C]/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}>
                        <Tent size={32} className={mainCategory === 'experience_event' ? 'text-[#C89B3C]' : 'text-white/40'}/>
                        <span className="font-bold text-lg">التجارب والفعاليات</span>
                    </div>
                </div>

                {mainCategory && (
                    <div className="mt-6 pt-5 border-t border-white/10 animate-in fade-in">
                        <h3 className="text-xs text-white/50 mb-3">حدد التصنيف الفرعي الدقيق:</h3>
                        <div className="flex flex-wrap gap-3">
                            {mainCategory === 'facility_lodging' ? (
                                <>
                                    <button onClick={() => setSubCategory('facility')} className={`px-6 py-3 rounded-xl border transition font-bold text-sm ${subCategory === 'facility' ? 'bg-[#C89B3C] text-black border-[#C89B3C]' : 'bg-black/40 border-white/10 text-white/70 hover:bg-white/5'}`}>مرفق</button>
                                    <button onClick={() => setSubCategory('lodging')} className={`px-6 py-3 rounded-xl border transition font-bold text-sm ${subCategory === 'lodging' ? 'bg-[#C89B3C] text-black border-[#C89B3C]' : 'bg-black/40 border-white/10 text-white/70 hover:bg-white/5'}`}>نزل وتأجير</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setSubCategory('experience')} className={`px-6 py-3 rounded-xl border transition font-bold text-sm ${subCategory === 'experience' ? 'bg-[#C89B3C] text-black border-[#C89B3C]' : 'bg-black/40 border-white/10 text-white/70 hover:bg-white/5'}`}>تجربة سياحية</button>
                                    <button onClick={() => setSubCategory('event')} className={`px-6 py-3 rounded-xl border transition font-bold text-sm ${subCategory === 'event' ? 'bg-[#C89B3C] text-black border-[#C89B3C]' : 'bg-black/40 border-white/10 text-white/70 hover:bg-white/5'}`}>فعالية</button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {subCategory && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    
                    <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5">
                        <h2 className="text-lg font-bold flex items-center gap-2"><Info className="text-[#C89B3C]"/> 2. البيانات الأساسية</h2>
                        
                        <div className="space-y-2">
                            <label className="text-sm text-white/70 font-bold">اسم {subCategory === 'facility' ? 'المرفق' : subCategory === 'lodging' ? 'النزل' : subCategory === 'event' ? 'الفعالية' : 'التجربة'} *</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="اكتب الاسم هنا..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none"/>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-white/70 font-bold">الوصف التفصيلي *</label>
                            <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="اكتب وصفاً جذاباً يوضح التفاصيل للعملاء..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#C89B3C] outline-none resize-none"/>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-white/70 font-bold">{priceLabel} *</label>
                                <div className="relative">
                                    <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0 = مجاني" className="w-full bg-black/40 border border-white/10 rounded-xl pl-16 pr-4 py-3 text-white focus:border-[#C89B3C] outline-none dir-ltr text-right"/>
                                    <span className="absolute left-4 top-3 text-white/40">SAR</span>
                                </div>
                            </div>
                            {subCategory === 'event' && (
                                <div className="space-y-2">
                                    <label className="text-sm text-white/70 font-bold">رسوم الدخول للأطفال (اختياري)</label>
                                    <div className="relative">
                                        {/* ✅ تأكيد حفظ سعر الطفل */}
                                        <input type="number" min="0" value={childPrice} onChange={e => setChildPrice(e.target.value)} placeholder="0 = مجاني" className="w-full bg-black/40 border border-white/10 rounded-xl pl-16 pr-4 py-3 text-white focus:border-[#C89B3C] outline-none dir-ltr text-right"/>
                                        <span className="absolute left-4 top-3 text-white/40">SAR</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <label className="text-sm text-white/70 font-bold block mb-1">ترخيص أو هوية وطنية (اختياري)</label>
                            <div className="relative border border-dashed border-white/20 rounded-xl p-3 text-center cursor-pointer hover:border-[#C89B3C] transition bg-black/20">
                                <input type="file" accept=".pdf,image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setCommercialLicense(e.target.files?.[0] || null)} />
                                <span className="text-xs text-white/50">{commercialLicense ? commercialLicense.name : "اضغط لرفع ملف الترخيص (PDF/Image)"}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. الإعدادات الخاصة بكل قسم */}

                    {/* أ. المرفق (Facility) */}
                    {subCategory === 'facility' && (
                        <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Activity className="text-[#C89B3C]"/> الخدمات المتوفرة في المرفق</h2>
                            <p className="text-xs text-white/50">أضف الخدمات والمميزات المتاحة (مثال: مقهى، جلسات، ألعاب أطفال) مع إمكانية إرفاق صورة ووصف لكل خدمة.</p>
                            
                            <div className="bg-black/20 p-4 rounded-xl border border-white/10 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input type="text" placeholder="اسم الخدمة (مثال: ركن القهوة)" value={facServName} onChange={e=>setFacServName(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/>
                                    <input type="text" placeholder="وصف الخدمة (اختياري)" value={facServDesc} onChange={e=>setFacServDesc(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition text-xs">
                                        <ImageIcon size={14}/> {facServImg ? 'تم اختيار صورة' : 'صورة الخدمة (اختياري)'}
                                        <input type="file" accept="image/*" hidden ref={facilityServiceFileRef} onChange={e => setFacServImg(e.target.files?.[0] || null)}/>
                                    </label>
                                    <button type="button" onClick={addFacilityService} className="bg-[#C89B3C] text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#b38a35]">إضافة الخدمة ✅</button>
                                </div>
                            </div>

                            {facilityServices.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    {facilityServices.map((fs, idx) => (
                                        <div key={idx} className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/10 items-center">
                                            {fs.imagePreview ? <Image src={fs.imagePreview} width={40} height={40} className="rounded-lg object-cover" alt="img"/> : <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center"><ImageIcon size={16} className="text-white/20"/></div>}
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-white">{fs.name}</p>
                                                {fs.description && <p className="text-xs text-white/50 truncate">{fs.description}</p>}
                                            </div>
                                            <button type="button" onClick={() => setFacilityServices(facilityServices.filter(item => item.id !== fs.id))} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ب. النزل (Lodging) */}
                    {subCategory === 'lodging' && (
                        <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-[#C89B3C]/30 shadow-[0_0_30px_rgba(200,155,60,0.05)] space-y-6">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Home className="text-[#C89B3C]"/> تفاصيل النزل السياحي</h2>
                            
                            <div className="space-y-3">
                                <label className="text-sm text-white/70 font-bold">نوع النزل *</label>
                                <div className="flex flex-wrap gap-2">
                                    {[{ id: 'room', label: 'غرفة' }, { id: 'apartment', label: 'شقة' }, { id: 'house', label: 'بيت شعبي' }, { id: 'cottage', label: 'كوخ' }, { id: 'resort', label: 'استراحة' }, { id: 'other', label: 'أخرى' }].map(type => (
                                        <button key={type.id} onClick={() => setLodgingType(type.id as any)} className={`px-4 py-2 rounded-lg border transition text-sm ${lodgingType === type.id ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'bg-black/40 border-white/10 hover:border-white/30'}`}>
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                                {lodgingType === 'other' && <input type="text" placeholder="اكتب نوع النزل هنا..." value={customLodgingType} onChange={e => setCustomLodgingType(e.target.value)} className="w-full bg-black/40 border border-[#C89B3C]/50 rounded-xl px-4 py-3 text-white mt-2 outline-none"/>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-white/70 font-bold">عدد الوحدات المتوفرة (اختياري)</label>
                                    <input type="text" placeholder="مثال: 5 غرف، 3 شقق متطابقة..." value={numberOfUnitsText} onChange={e => setNumberOfUnitsText(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"/>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-white/70 font-bold">المساحة التقريبية (متر مربع)</label>
                                    <input type="text" placeholder="مثال: 150" value={lodgingArea} onChange={e => setLodgingArea(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"/>
                                </div>
                            </div>

                            {/* مشتركات النزل */}
                            {lodgingType && (
                                <div className="space-y-6 pt-4 border-t border-white/10 animate-in fade-in">
                                    
                                    {lodgingType !== 'house' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-sm text-white/70 font-bold">الفئة المستهدفة</label>
                                                <div className="flex gap-2">
                                                    {[{id:'singles', l:'عزاب'}, {id:'families', l:'عوايل'}, {id:'both', l:'الكل'}].map(aud => (
                                                        <button key={aud.id} onClick={() => setTargetAudience(aud.id as any)} className={`flex-1 py-2 rounded-lg border text-sm ${targetAudience === aud.id ? 'bg-[#C89B3C] text-black border-[#C89B3C] font-bold' : 'bg-black/40 border-white/10'}`}>{aud.l}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-sm text-white/70 font-bold">الطاقة الاستيعابية (أشخاص) *</label>
                                                <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="مثال: 4" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none"/>
                                            </div>
                                        </div>
                                    )}

                                    {/* تفاصيل إضافية للشقق */}
                                    {lodgingType === 'apartment' && (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1"><label className="text-xs text-white/50">عدد الغرف</label><input type="number" value={apartmentDetails.rooms} onChange={e=>setApartmentDetails({...apartmentDetails, rooms:e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none"/></div>
                                            <div className="space-y-1"><label className="text-xs text-white/50">عدد الأسرة</label><input type="number" value={apartmentDetails.beds} onChange={e=>setApartmentDetails({...apartmentDetails, beds:e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none"/></div>
                                            <div className="space-y-1"><label className="text-xs text-white/50">دورات المياه</label><input type="number" value={apartmentDetails.bathrooms} onChange={e=>setApartmentDetails({...apartmentDetails, bathrooms:e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none"/></div>
                                        </div>
                                    )}

                                    {/* تفاصيل البيت الشعبي */}
                                    {lodgingType === 'house' && (
                                        <div className="space-y-5">
                                            <h3 className="font-bold text-[#C89B3C]">مواصفات البيت الشعبي التفصيلية</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {[{ label: "عدد الأدوار", key: "floors" }, { label: "غرف النوم", key: "bedrooms" }, { label: "المجالس", key: "livingRooms" }, { label: "دورات المياه", key: "bathrooms" }].map(f => (
                                                    <div key={f.key} className="space-y-1">
                                                        <label className="text-xs text-white/50">{f.label}</label>
                                                        <input type="number" value={(houseDetails as any)[f.key]} onChange={e => setHouseDetails({...houseDetails, [f.key]: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none"/>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* المميزات المتوفرة (ديناميكية حسب النوع) */}
                                    <div className="space-y-3 pt-2">
                                        <label className="text-sm text-white/70 font-bold">الخدمات والمميزات المتوفرة:</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {currentLodgingFeatures.map(f => (
                                                <label key={f.id} className="flex items-center gap-3 cursor-pointer bg-black/20 p-3 rounded-lg border border-white/5 hover:border-[#C89B3C]/50 transition">
                                                    <input type="checkbox" checked={houseFeatures.includes(f.id)} onChange={() => handleHouseFeatureToggle(f.id)} className="w-4 h-4 accent-[#C89B3C]"/>
                                                    <span className="text-xs">{f.label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        <div className="mt-3">
                                            <label className="text-xs text-white/50 block mb-2">مميزات أخرى غير موجودة أعلاه (أضفها يدوياً)</label>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="مثال: قريب من المطار، ديكور تراثي..." value={newLodgingFeature} onChange={e=>setNewLodgingFeature(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/>
                                                <button onClick={()=>{if(newLodgingFeature){setCustomLodgingFeatures([...customLodgingFeatures, newLodgingFeature]); setNewLodgingFeature("");}}} className="bg-[#C89B3C] text-black px-4 rounded-lg text-sm font-bold">إضافة</button>
                                            </div>
                                            {customLodgingFeatures.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {customLodgingFeatures.map((a, i) => <span key={i} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">{a} <X size={12} className="cursor-pointer text-red-400" onClick={()=>setCustomLodgingFeatures(customLodgingFeatures.filter((_,idx)=>idx!==i))}/></span>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* التأمين (يظهر للجميع) */}
                                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                        <h3 className="font-bold text-[#C89B3C] mb-1 flex items-center gap-2"><ShieldCheck size={16}/> سياسة التأمين</h3>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={depositConfig.required} onChange={e => setDepositConfig({...depositConfig, required: e.target.checked})} className="w-5 h-5 accent-[#C89B3C]"/>
                                            <span className="text-sm">يوجد مبلغ تأمين قبل السكن على المحتويات</span>
                                        </label>
                                        
                                        {depositConfig.required && (
                                            <div className="pl-8 space-y-4 mt-2 animate-in fade-in">
                                                <label className="flex items-center gap-3 cursor-pointer text-sm text-white/80">
                                                    <input type="checkbox" checked={depositConfig.isRefundable} onChange={e => setDepositConfig({...depositConfig, isRefundable: e.target.checked})} className="w-4 h-4 accent-[#C89B3C]"/>
                                                    التأمين مسترد (في حال عدم وجود تلفيات)
                                                </label>
                                                <div className="space-y-2">
                                                    <span className="text-xs text-white/50 block">متى يتم دفع التأمين؟</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setDepositConfig({...depositConfig, paymentTime: 'with_booking'})} className={`px-4 py-2 rounded-lg border text-xs ${depositConfig.paymentTime === 'with_booking' ? 'bg-white/20 border-white/40 text-white' : 'bg-black/40 border-white/10 text-white/50'}`}>مع الحجز بالمنصة</button>
                                                        <button onClick={() => setDepositConfig({...depositConfig, paymentTime: 'on_arrival'})} className={`px-4 py-2 rounded-lg border text-xs ${depositConfig.paymentTime === 'on_arrival' ? 'bg-white/20 border-white/40 text-white' : 'bg-black/40 border-white/10 text-white/50'}`}>نقداً عند الوصول</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* سياسات النزل العامة */}
                            <div className="space-y-2 pt-4 border-t border-white/10">
                                <label className="text-sm text-white/70 font-bold block mb-2">سياسات المكان (اختياري)</label>
                                <textarea rows={3} value={policies} onChange={e => setPolicies(e.target.value)} placeholder="شروط الإلغاء، سياسة التدخين..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none resize-none text-sm"/>
                            </div>
                            <div className="space-y-3 pt-2">
                                <label className="text-sm text-white/70 font-bold block">أوقات العمل (أيام الاستقبال)</label>
                                <div className="grid grid-cols-1 gap-2 bg-black/20 p-4 rounded-xl border border-white/5"> 
                                    {workDays.map((day, dIdx) => ( 
                                        <div key={dIdx} className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${day.active ? 'border-white/10 bg-white/5' : 'border-red-500/10 bg-red-500/5'}`}> 
                                            <div className="flex items-center gap-2 w-24"> 
                                                <input type="checkbox" checked={day.active} onChange={() => { const newSched = [...workDays]; newSched[dIdx].active = !newSched[dIdx].active; setWorkDays(newSched); }} className="accent-[#C89B3C] w-4 h-4"/> 
                                                <span className="text-sm font-bold">{day.day}</span> 
                                            </div> 
                                            {day.active ? ( 
                                                <div className="flex flex-wrap gap-2 flex-1"> 
                                                    {day.shifts.map((shift, sIdx) => ( 
                                                        <div key={sIdx} className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/10"> 
                                                            <TimePicker12H value={shift.from} onChange={(val) => { const newSched = [...workDays]; newSched[dIdx].shifts[sIdx].from = val; setWorkDays(newSched); }} />
                                                            <span className="text-white/50 text-xs">إلى</span> 
                                                            <TimePicker12H value={shift.to} onChange={(val) => { const newSched = [...workDays]; newSched[dIdx].shifts[sIdx].to = val; setWorkDays(newSched); }} />
                                                        </div> 
                                                    ))} 
                                                </div> 
                                            ) : <span className="text-xs text-red-400/50">مغلق</span>} 
                                        </div> 
                                    ))} 
                                </div> 
                            </div>
                        </div>
                    )}

                    {/* ج. التجربة السياحية (Experience) */}
                    {subCategory === 'experience' && (
                        <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-[#C89B3C]/30 shadow-[0_0_30px_rgba(200,155,60,0.05)] space-y-6">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Compass className="text-[#C89B3C]"/> تفاصيل التجربة السياحية</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm text-white/70 font-bold block mb-1">تواريخ إقامة التجربة (يمكن تحديد عدة تواريخ)</label>
                                    <div className="flex gap-2">
                                        <input type="date" min={todayDate} value={newExpDate} onChange={e=>setNewExpDate(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none scheme-dark"/>
                                        <button onClick={() => {if(newExpDate && !expDates.includes(newExpDate)) setExpDates([...expDates, newExpDate]); setNewExpDate("");}} className="bg-[#C89B3C] text-black px-4 rounded-lg font-bold text-sm">إضافة</button>
                                    </div>
                                    {expDates.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {expDates.map((d, i) => <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded flex items-center gap-1">{d} <X size={12} className="cursor-pointer text-red-400" onClick={()=>setExpDates(expDates.filter(x=>x!==d))}/></span>)}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-white/70 font-bold block mb-1">وقت البدء للتجربة</label>
                                    <TimePicker12H value={expStartTime} onChange={setExpStartTime} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-white/70 font-bold block mb-1">المدة (طول التجربة)</label>
                                    <div className="flex gap-1">
                                        <input type="number" placeholder="مثلاً: 2" value={expDurationVal} onChange={e=>setExpDurationVal(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none text-center"/>
                                        <select value={expDurationUnit} onChange={e=>setExpDurationUnit(e.target.value)} className="w-24 bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none">
                                            <option value="ساعة" className="bg-[#1a1a1a] text-white">ساعة</option><option value="دقيقة" className="bg-[#1a1a1a] text-white">دقيقة</option><option value="يوم" className="bg-[#1a1a1a] text-white">يوم</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-white/70 font-bold block mb-1">مستوى الصعوبة</label>
                                    <select value={expDifficulty} onChange={e=>setExpDifficulty(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white outline-none">
                                        <option value="easy" className="bg-[#1a1a1a] text-white">سهل 🟢</option> <option value="medium" className="bg-[#1a1a1a] text-white">متوسط 🟡</option> <option value="hard" className="bg-[#1a1a1a] text-white">صعب 🔴</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-white/70 font-bold block mb-1">مخصصة لـ</label>
                                    <select value={targetAudience} onChange={e=>setTargetAudience(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white outline-none">
                                        <option value="both" className="bg-[#1a1a1a] text-white">عوايل وعزاب</option> <option value="families" className="bg-[#1a1a1a] text-white">عوايل فقط</option> <option value="singles" className="bg-[#1a1a1a] text-white">عزاب فقط</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-white/10">
                                <label className="text-sm text-white/70 font-bold block mb-1">الخدمات المتوفرة والمشمولة في التجربة</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {EXPERIENCE_SERVICES.map(srv => (
                                        <label key={srv.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${expIncludedServices.includes(srv.id) ? 'bg-[#C89B3C]/10 border-[#C89B3C] text-white' : 'bg-black/20 border-white/5 text-white/50'}`}>
                                            <input type="checkbox" checked={expIncludedServices.includes(srv.id)} onChange={() => {
                                                if(expIncludedServices.includes(srv.id)) setExpIncludedServices(expIncludedServices.filter(id=>id!==srv.id));
                                                else setExpIncludedServices([...expIncludedServices, srv.id]);
                                            }} className="hidden"/>
                                            <CheckSquare size={16} className={expIncludedServices.includes(srv.id) ? 'text-[#C89B3C]' : 'opacity-30'}/>
                                            <span className="text-sm font-bold">{srv.label}</span>
                                        </label>
                                    ))}
                                </div>
                                
                                {expIncludedServices.includes('food') && (
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-3 space-y-3 animate-in fade-in">
                                        <h4 className="text-[#C89B3C] font-bold text-sm"><Utensils size={14} className="inline mr-1"/> تفاصيل وجبة الطعام المشمولة</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input type="text" placeholder="نوع الوجبة (مثال: عشاء شعبي، مشاوي)" value={expFoodDetails.mealType} onChange={e=>setExpFoodDetails({...expFoodDetails, mealType: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/>
                                            <input type="text" placeholder="السعرات الحرارية تقريباً (اختياري)" value={expFoodDetails.calories} onChange={e=>setExpFoodDetails({...expFoodDetails, calories: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/>
                                        </div>
                                        <input type="text" placeholder="المشروبات المرفقة (مثال: ماء، عصيرات طبيعية، غازيات)" value={expFoodDetails.drinks} onChange={e=>setExpFoodDetails({...expFoodDetails, drinks: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/>
                                        <textarea rows={2} placeholder="المكونات والمحتويات بالتفصيل (ماذا تحتوي الوجبة بالضبط؟)" value={expFoodDetails.contents} onChange={e=>setExpFoodDetails({...expFoodDetails, contents: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none resize-none"/>
                                    </div>
                                )}

                                <div className="mt-4">
                                    <label className="text-xs text-white/50 block mb-2">خدمات أخرى مشمولة (أضفها يدوياً)</label>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="مثال: تصوير فوتوغرافي، مرشد سياحي..." value={newCustomExpService} onChange={e=>setNewCustomExpService(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/>
                                        <button onClick={()=>{if(newCustomExpService){setCustomExpServices([...customExpServices, newCustomExpService]); setNewCustomExpService("");}}} className="bg-[#C89B3C] text-black px-4 rounded-lg text-sm font-bold">إضافة</button>
                                    </div>
                                    {customExpServices.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {customExpServices.map((a, i) => <span key={i} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">{a} <X size={12} className="cursor-pointer text-red-400" onClick={()=>setCustomExpServices(customExpServices.filter((_,idx)=>idx!==i))}/></span>)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div>
                                    <label className="text-sm text-white/70 font-bold block mb-1">المطلوب إحضاره من العميل</label>
                                    <textarea rows={2} placeholder="مثال: حذاء رياضي، ملابس ثقيلة، إثبات شخصية..." value={expWhatToBring} onChange={e=>setExpWhatToBring(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white outline-none resize-none"/>
                                </div>
                                <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                                    <span className="text-sm font-bold text-white/80">هل يُسمح بإحضار الأطفال؟</span>
                                    <select value={expChildrenAllowed ? 'yes' : 'no'} onChange={e=>setExpChildrenAllowed(e.target.value === 'yes')} className="bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none text-sm">
                                        <option value="yes" className="bg-[#1a1a1a] text-white">نعم، مسموح</option> <option value="no" className="bg-[#1a1a1a] text-white">لا، غير مسموح</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-white/70 font-bold block mb-1">سياسة الإلغاء والاسترجاع</label>
                                    <textarea rows={2} placeholder="مثال: يمكن الإلغاء واسترداد المبلغ كاملاً قبل 24 ساعة..." value={expCancellation} onChange={e=>setExpCancellation(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white outline-none resize-none"/>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* د. الفعالية (Event) */}
                    {subCategory === 'event' && (
                        <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-[#C89B3C]/30 shadow-[0_0_30px_rgba(200,155,60,0.05)] space-y-6">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Ticket className="text-[#C89B3C]"/> تفاصيل وتواريخ الفعالية</h2>
                            
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-4">
                                <h3 className="text-sm font-bold text-white/80 border-b border-white/10 pb-2">فترة إقامة الفعالية وساعات العمل</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-white/50">تاريخ بدء الفعالية</label>
                                        <input type="date" value={eventDates.startDate} onChange={e => setEventDates({...eventDates, startDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none scheme-dark"/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-white/50">تاريخ انتهاء الفعالية</label>
                                        <input type="date" value={eventDates.endDate} onChange={e => setEventDates({...eventDates, endDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none scheme-dark"/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-white/50">من الساعة (يومياً)</label>
                                        <TimePicker12H value={eventDates.startTime} onChange={(val) => setEventDates({...eventDates, startTime: val})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-white/50">إلى الساعة (يومياً)</label>
                                        <TimePicker12H value={eventDates.endTime} onChange={(val) => setEventDates({...eventDates, endTime: val})} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-sm text-white/70 font-bold block mb-1">الفعاليات والخدمات المتوفرة بالداخل</label>
                                <div className="flex flex-wrap gap-2">
                                    {EVENT_ACTIVITIES.map(act => (
                                        <button key={act.id} onClick={() => {
                                            if(eventActivities.includes(act.id)) setEventActivities(eventActivities.filter(a=>a!==act.id));
                                            else setEventActivities([...eventActivities, act.id]);
                                        }} className={`px-4 py-2 rounded-xl border text-sm transition ${eventActivities.includes(act.id) ? 'bg-[#C89B3C]/20 border-[#C89B3C] text-white font-bold' : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/5'}`}>
                                            {act.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <label className="text-xs text-white/50 block mb-2">أنشطة وخيارات إضافية (أضفها يدوياً)</label>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="مثال: رسم على الوجه، مطاعم فود ترك..." value={customEventActivity} onChange={e=>setCustomEventActivity(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"/>
                                        <button onClick={()=>{if(customEventActivity){setCustomEventActivitiesList([...customEventActivitiesList, customEventActivity]); setCustomEventActivity("");}}} className="bg-[#C89B3C] text-black px-4 rounded-lg text-sm font-bold">إضافة</button>
                                    </div>
                                    {customEventActivitiesList.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {customEventActivitiesList.map((a, i) => <span key={i} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">{a} <X size={12} className="cursor-pointer text-red-400" onClick={()=>setCustomEventActivitiesList(customEventActivitiesList.filter((_,idx)=>idx!==i))}/></span>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. الصور المجمعة (لكل الأنواع) */}
                    <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                        <label className="text-sm text-white/70 font-bold flex items-center gap-2"><ImageIcon size={18} className="text-[#C89B3C]"/> صور وفيديو العرض الأساسية *</label>
                        <div className="flex flex-wrap gap-4">
                            {images.map((url, i) => (
                                <div key={i} className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/10 group bg-black/40 flex items-center justify-center">
                                    {/* ✅ الحل النهائي لعرض الفيديو في الـ Preview دون أن يكون مكسوراً */}
                                    {isVideoLink(url) ? (
                                        <>
                                            <video src={`${url}#t=0.001`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Video className="text-white/80" size={24}/></div>
                                        </>
                                    ) : (
                                        <Image src={url} fill className="object-cover" alt="Preview"/>
                                    )}
                                    <button onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-red-500/80 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} className="text-white"/></button>
                                </div>
                            ))}
                            <button onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-[#C89B3C]/50 transition text-white/50">
                                {uploadingImage ? <Loader2 className="animate-spin" /> : <><UploadCloud size={24} /> <span className="text-xs">رفع مرفق</span></>}
                            </button>
                            <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={handleImageUpload} />
                        </div>
                    </div>

                    {/* 5. الموقع المشترك */}
                    <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5">
                        <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="text-[#C89B3C]"/> {mapTitle}</h2>
                        <p className="text-sm text-white/50">اسحب الدبوس لتحديد الموقع بدقة على الخريطة.</p>
                        
                        <div className="h-64 rounded-2xl overflow-hidden border border-white/10 relative shadow-lg">
                            <Map initialViewState={{ latitude: location.lat, longitude: location.lng, zoom: 12 }} mapStyle="mapbox://styles/mapbox/satellite-streets-v12" mapboxAccessToken={MAPBOX_TOKEN} onClick={(e) => setLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })}>
                                <NavigationControl showCompass={false}/>
                                <Marker latitude={location.lat} longitude={location.lng} draggable onDragEnd={(e) => setLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })} color="#C89B3C" />
                            </Map>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1">
                                <label className="text-xs text-white/50">خط العرض (Latitude) - اختياري</label>
                                <input type="number" value={exactLat || location.lat.toFixed(6)} onChange={e => setExactLat(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none text-xs dir-ltr text-right focus:border-[#C89B3C]"/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/50">خط الطول (Longitude) - اختياري</label>
                                <input type="number" value={exactLng || location.lng.toFixed(6)} onChange={e => setExactLng(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none text-xs dir-ltr text-right focus:border-[#C89B3C]"/>
                            </div>
                        </div>
                    </div>

                    {/* زر الحفظ النهائي */}
                    <div className="flex justify-end pt-4">
                        <button onClick={handleSubmit} disabled={loading} className="bg-[#C89B3C] hover:bg-[#b38a35] text-[#2B1F17] font-bold text-lg px-10 py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#C89B3C]/20 w-full md:w-auto">
                            {loading ? <Loader2 className="animate-spin w-6 h-6"/> : <><Save size={20}/> إرسال الخدمة للمراجعة</>}
                        </button>
                    </div>

                </div>
            )}
        </div>
    </div>
  );
}