'use client';

import { useState } from 'react';
import { supabase } from "@/lib/supabaseClient"; 
import { useRouter } from 'next/navigation';

// استدعاء المكونات الفرعية
import AccommodationForm from '@/components/forms/AccommodationForm';
import FoodForm from '@/components/forms/FoodForm';
import ExperienceForm from '@/components/forms/ExperienceForm';
import LocationPicker from '@/components/map/LocationPicker';

export default function AddServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [serviceType, setServiceType] = useState('accommodation');
  const [baseData, setBaseData] = useState({
    title: '',
    description: '',
    price: '',
    images: []
  });

  const [location, setLocation] = useState({ lat: 21.543333, lng: 39.172778 });
  const [details, setDetails] = useState({});

  const handleBaseChange = (e) => {
    setBaseData({ ...baseData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
        alert('يجب تسجيل الدخول أولاً');
        setLoading(false);
        return;
    }

    const payload = {
        provider_id: user.id,
        title: baseData.title,
        description: baseData.description,
        price: parseFloat(baseData.price),
        service_type: serviceType,
        location_lat: location.lat,
        location_lng: location.lng,
        details: details,
        status: 'pending',
        images: baseData.images
    };

    try {
        const { error } = await supabase.from('services').insert([payload]);
        if (error) throw error;

        alert('✅ تم رفع الطلب بنجاح! سيتم مراجعته.');
        
        // تعديل المسار ليعيدك للوحة تحكم المزود (تأكد من صحة المسار لديك)
        router.push('/dashboard'); 

    } catch (error) {
        alert('❌ حدث خطأ: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] py-10 px-4 text-right" dir="rtl">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">إضافة خدمة جديدة</h1>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* معلومات أساسية */}
        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
            <h2 className="text-xl font-semibold border-b border-white/10 pb-2 text-white">المعلومات العامة</h2>
            <div>
                <label className="block mb-2 text-white/70">نوع الخدمة</label>
                <select 
                    value={serviceType} 
                    onChange={(e) => { setServiceType(e.target.value); setDetails({}); }}
                    className="w-full p-3 rounded-xl bg-[#252525] border border-white/10 text-white outline-none"
                >
                    <option value="accommodation">سكن (فندق/شقة)</option>
                    <option value="food">أكل (مطعم/أسر منتجة)</option>
                    <option value="experience">تجربة سياحية</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block mb-2 text-white/70">عنوان الخدمة</label>
                    <input name="title" required type="text" className="w-full p-3 rounded-xl bg-[#252525] border border-white/10 text-white outline-none focus:border-[#C89B3C]" onChange={handleBaseChange} />
                </div>
                <div>
                    <label className="block mb-2 text-white/70">السعر الأساسي</label>
                    <input name="price" required type="number" className="w-full p-3 rounded-xl bg-[#252525] border border-white/10 text-white outline-none focus:border-[#C89B3C]" onChange={handleBaseChange} />
                </div>
            </div>
        </div>

        {/* التفاصيل الخاصة */}
        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 shadow-xl">
            {serviceType === 'accommodation' && <AccommodationForm details={details} setDetails={setDetails} />}
            {serviceType === 'food' && <FoodForm details={details} setDetails={setDetails} />}
            {serviceType === 'experience' && <ExperienceForm details={details} setDetails={setDetails} />}
        </div>

        {/* الموقع الجغرافي */}
        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 shadow-xl">
            <h2 className="text-xl font-semibold border-b border-white/10 pb-4 mb-4 text-white">تحديد الموقع</h2>
            <LocationPicker 
                lat={location.lat} 
                lng={location.lng} 
                onLocationChange={(lat, lng) => setLocation({ lat, lng })}
            />
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all shadow-lg
                ${loading ? 'bg-gray-600' : 'bg-[#C89B3C] hover:bg-[#b38a35]'}`}
        >
            {loading ? 'جاري الرفع...' : 'رفع الطلب للمراجعة 🚀'}
        </button>
      </form>
    </div>
  );
}