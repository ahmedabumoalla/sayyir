'use client';

export default function AccommodationForm({ details, setDetails }) {
  const handleChange = (e) => {
    setDetails({ ...details, [e.target.name]: e.target.value });
  };

  const handleAmenityChange = (e) => {
    const amenity = e.target.value;
    const currentAmenities = details.amenities || [];
    let newAmenities = e.target.checked 
      ? [...currentAmenities, amenity] 
      : currentAmenities.filter((item) => item !== amenity);
    setDetails({ ...details, amenities: newAmenities });
  };

  const inputStyle = "w-full p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:border-[#C89B3C] focus:ring-1 focus:ring-[#C89B3C] outline-none transition";

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <h3 className="font-bold text-xl text-[#C89B3C] border-b border-white/5 pb-2">تفاصيل السكن</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-2">نوع الوحدة</label>
          <select name="unit_type" className={inputStyle} onChange={handleChange} value={details.unit_type || ''}>
            <option value="">اختر النوع...</option>
            <option value="room">غرفة فندقية</option>
            <option value="suite">جناح</option>
            <option value="apartment">شقة</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">نظام الإيجار</label>
          <select name="rent_period" className={inputStyle} onChange={handleChange} value={details.rent_period || ''}>
            <option value="daily">يومي</option>
            <option value="weekly">أسبوعي</option>
            <option value="monthly">شهري</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-white/10 rounded-xl cursor-pointer hover:bg-white/5">
          <input type="checkbox" value="wifi" onChange={handleAmenityChange} className="accent-[#C89B3C] w-4 h-4" />
          <span className="text-white text-sm">إنترنت مجاني</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-white/10 rounded-xl cursor-pointer hover:bg-white/5">
          <input type="checkbox" value="cleaning" onChange={handleAmenityChange} className="accent-[#C89B3C] w-4 h-4" />
          <span className="text-white text-sm">تنظيف يومي</span>
        </label>
      </div>
    </div>
  );
}