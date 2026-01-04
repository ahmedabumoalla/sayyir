'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function FoodForm({ details, setDetails }) {
  const [newItem, setNewItem] = useState({ name: '', price: '' });

  const addMenuItem = () => {
    if (!newItem.name || !newItem.price) return;
    const updatedMenu = [...(details.menu || []), newItem];
    setDetails({ ...details, menu: updatedMenu });
    setNewItem({ name: '', price: '' });
  };

  const inputStyle = "p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:border-[#C89B3C] outline-none transition placeholder:text-white/20";

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <h3 className="font-bold text-xl text-[#C89B3C] border-b border-white/5 pb-2">قائمة الطعام</h3>
      
      <div className="flex gap-2">
        <input 
          placeholder="اسم الصنف" 
          className={`${inputStyle} flex-1`}
          value={newItem.name}
          onChange={(e) => setNewItem({...newItem, name: e.target.value})}
        />
        <input 
          placeholder="السعر" 
          type="number" 
          className={`${inputStyle} w-24`}
          value={newItem.price}
          onChange={(e) => setNewItem({...newItem, price: e.target.value})}
        />
        <button type="button" onClick={addMenuItem} className="bg-[#C89B3C] text-black p-3 rounded-xl hover:bg-[#b38a35]">
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-2">
        {details.menu?.map((item, index) => (
          <div key={index} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
            <span className="text-white font-bold">{item.name}</span>
            <div className="flex items-center gap-4">
              <span className="text-[#C89B3C]">{item.price} ر.س</span>
              <button type="button" onClick={() => setDetails({...details, menu: details.menu.filter((_, i) => i !== index)})} className="text-red-400">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}