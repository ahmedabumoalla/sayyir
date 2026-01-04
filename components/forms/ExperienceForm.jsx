'use client';

export default function ExperienceForm({ details, setDetails }) {
  const handleChange = (e) => {
    setDetails({ ...details, [e.target.name]: e.target.value });
  };

  const inputStyle = "w-full p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:border-[#C89B3C] focus:ring-1 focus:ring-[#C89B3C] outline-none transition placeholder:text-white/20";

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <h3 className="font-bold text-xl text-[#C89B3C] border-b border-white/5 pb-2">تفاصيل التجربة السياحية</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-2">مستوى الصعوبة</label>
          <select name="difficulty" className={inputStyle} onChange={handleChange} value={details.difficulty || ''}>
            <option value="easy">سهل (للجميع)</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">المدة (بالساعات)</label>
          <input name="duration" type="number" placeholder="مثلاً: 4" className={inputStyle} onChange={handleChange} />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-2">الجدول الزمني (ماذا سنفعل؟)</label>
        <textarea 
          name="itinerary" 
          rows="4" 
          placeholder="مثال: 4:00 التجمع، 5:00 بداية الهايكنج..." 
          className={inputStyle} 
          onChange={handleChange}
        ></textarea>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-2">ماذا تشمل التجربة؟</label>
        <input name="included" placeholder="مثال: مواصلات، وجبات، معدات..." className={inputStyle} onChange={handleChange} />
      </div>
    </div>
  );
}