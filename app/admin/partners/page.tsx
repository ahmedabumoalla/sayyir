"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Plus, Trash2,X, UploadCloud, Handshake, Save, Wand2 } from "lucide-react";
import Image from "next/image";

export default function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // إعدادات قسم الصفحة الرئيسية
  const [sectionSettings, setSectionSettings] = useState({
    partners_title: "",
    partners_subtitle: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // بيانات نموذج الرفع
  const [newName, setNewName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        // 1. جلب الشركاء
        const { data: partnersData, error: partnersError } = await supabase
            .from('partners')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (partnersError && partnersError.code !== '42P01') {
            console.error("Error fetching partners:", partnersError);
        } else if (partnersData) {
            setPartners(partnersData);
        }

        // 2. جلب إعدادات القسم من platform_settings
        const { data: settingsData } = await supabase
            .from('platform_settings')
            .select('partners_title, partners_subtitle')
            .eq('id', 1)
            .single();
        
        if (settingsData) {
            setSectionSettings({
                partners_title: settingsData.partners_title || "شركاء النجاح",
                partners_subtitle: settingsData.partners_subtitle || ""
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  // دالة تفريغ اللون الأبيض من الشعار (Client-Side)
  const processImageTransparency = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject("Canvas error"); return; }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // المرور على كل بكسل وتحويل الأبيض إلى شفاف
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // إذا كان اللون قريباً جداً من الأبيض
          if (r > 230 && g > 230 && b > 230) {
            data[i + 3] = 0; // شفاف
          }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject("Conversion failed");
        }, "image/png");
      };
      img.onerror = () => reject("Image load failed");
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !logoFile) return alert("يرجى إدخال اسم الشريك واختيار الشعار");

    setUploading(true);
    try {
      let fileToUpload: File | Blob = logoFile;

      // تطبيق التفريغ التلقائي
      if (autoRemoveBg) {
        try {
          fileToUpload = await processImageTransparency(logoFile);
        } catch (err) {
          console.warn("فشل التفريغ التلقائي، سيتم رفع الصورة الأصلية", err);
        }
      }

      // 1. رفع الصورة إلى Storage
      const fileName = `partner_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('images') // يجب أن يكون هناك Bucket باسم images
        .upload(`partners/${fileName}`, fileToUpload, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      // 2. الحصول على الرابط العام للصورة
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(`partners/${fileName}`);

      // 3. الحفظ في جدول الشركاء
      const { error: dbError } = await supabase.from('partners').insert([
        { name: newName, logo_url: urlData.publicUrl }
      ]);

      if (dbError) throw dbError;

      alert("تمت إضافة الشريك بنجاح ✅");
      setNewName("");
      setLogoFile(null);
      setPreviewUrl(null);
      setIsModalOpen(false);
      fetchData(); 
      
    } catch (error: any) {
      console.error("Error adding partner:", error);
      alert("حدث خطأ أثناء رفع الشريك: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الشريك؟")) return;
    try {
        const { error } = await supabase.from('partners').delete().eq('id', id);
        if (error) throw error;
        setPartners(partners.filter(p => p.id !== id));
    } catch (error: any) {
        alert("حدث خطأ أثناء الحذف: " + error.message);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
        const { error } = await supabase
            .from('platform_settings')
            .update({ 
                partners_title: sectionSettings.partners_title,
                partners_subtitle: sectionSettings.partners_subtitle
            })
            .eq('id', 1);

        if (error) throw error;
        alert("تم حفظ إعدادات الواجهة بنجاح ✅");
    } catch (error: any) {
        alert("حدث خطأ أثناء الحفظ: " + error.message);
    } finally {
        setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <div className="p-3 bg-[#C89B3C]/10 rounded-xl text-[#C89B3C]">
               <Handshake size={28} />
             </div>
             <h1 className="text-3xl font-bold text-white">شركاء النجاح</h1>
           </div>
           <p className="text-white/60 mr-14 text-sm">تحكم في الشعارات والعناوين التي تظهر في قسم الشركاء في الصفحة الرئيسية.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-[#C89B3C] hover:bg-[#b38a35] text-black rounded-xl transition flex items-center gap-2 font-bold text-sm shadow-lg shadow-[#C89B3C]/20"
        >
            <Plus size={18} /> إضافة شريك
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* القسم 1: إعدادات الواجهة */}
        <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-24">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-[#C89B3C]">
                    <Wand2 size={20} />
                    إعدادات الظهور في الرئيسية
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-white/60 mb-2">عنوان القسم</label>
                        <input 
                            type="text" 
                            value={sectionSettings.partners_title}
                            onChange={(e) => setSectionSettings({...sectionSettings, partners_title: e.target.value})}
                            className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] focus:outline-none transition"
                            placeholder="مثلاً: شركاء النجاح"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/60 mb-2">الوصف المختصر</label>
                        <textarea 
                            value={sectionSettings.partners_subtitle}
                            onChange={(e) => setSectionSettings({...sectionSettings, partners_subtitle: e.target.value})}
                            className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] focus:outline-none transition h-24 resize-none"
                            placeholder="عبارة ترحيبية تظهر تحت العنوان..."
                        />
                    </div>
                    <button 
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="w-full py-3 bg-[#C89B3C] hover:bg-[#b88a2c] text-black rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 mt-4"
                    >
                        {savingSettings ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> حفظ العناوين</>}
                    </button>
                </div>
            </div>
        </div>

        {/* القسم 2: قائمة الشركاء */}
        <div className="lg:col-span-2">
            {loading ? (
                <div className="flex justify-center h-60 items-center"><Loader2 className="animate-spin text-[#C89B3C]" size={40} /></div>
            ) : partners.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed flex flex-col items-center justify-center h-full min-h-[300px]">
                    <Handshake size={48} className="text-white/20 mb-4"/>
                    <p className="text-white/40 font-bold text-lg">لا يوجد شركاء مضافين حالياً</p>
                    <p className="text-white/30 text-sm mt-2">اضغط على "إضافة شريك" للبدء.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {partners.map((partner) => (
                    <div key={partner.id} className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-white/10 transition duration-300">
                        <button 
                            onClick={() => handleDeletePartner(partner.id)}
                            className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition hover:bg-red-500/10 p-2 rounded-lg z-10"
                            title="حذف الشريك"
                        >
                            <Trash2 size={16} />
                        </button>
                        
                        <div className="relative w-full h-20 mb-4 flex items-center justify-center p-2 bg-white/5 rounded-lg border border-white/5">
                            <Image src={partner.logo_url} alt={partner.name} fill className="object-contain p-2" />
                        </div>
                        
                        <h3 className="font-bold text-white text-center text-sm truncate w-full" title={partner.name}>{partner.name}</h3>
                    </div>
                ))}
                </div>
            )}
        </div>

      </div>

      {/* نافذة إضافة شريك */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
           <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Plus className="text-[#C89B3C]" /> إضافة شريك جديد</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleAddPartner} className="space-y-4">
                 <div>
                    <label className="block text-xs text-white/60 mb-2">اسم الشريك / الجهة</label>
                    <input 
                      type="text" 
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] focus:outline-none transition"
                      placeholder="مثلاً: وزارة السياحة"
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs text-white/60 mb-2">شعار الشريك</label>
                    <div className="relative border-2 border-dashed border-white/10 bg-black/20 rounded-xl p-6 text-center hover:border-[#C89B3C]/50 transition group cursor-pointer overflow-hidden">
                        <input 
                           type="file" 
                           accept="image/*"
                           required
                           onChange={handleImageSelect}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        {previewUrl ? (
                            <div className="relative z-10 flex flex-col items-center">
                                <img src={previewUrl} alt="Preview" className="h-20 object-contain mb-2" />
                                <span className="text-xs text-[#C89B3C] bg-[#C89B3C]/10 px-3 py-1 rounded-full">اضغط لتغيير الصورة</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-white/40 group-hover:text-[#C89B3C] transition">
                                <UploadCloud size={32} />
                                <span className="text-xs">اضغط لرفع الشعار (يفضل خلفية بيضاء)</span>
                            </div>
                        )}
                    </div>
                 </div>

                 {/* خيار التفريغ التلقائي */}
                 <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <div 
                        onClick={() => setAutoRemoveBg(!autoRemoveBg)}
                        className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${autoRemoveBg ? 'bg-[#C89B3C]' : 'bg-gray-600'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${autoRemoveBg ? 'translate-x-0' : '-translate-x-4'}`}></div>
                    </div>
                    <span className="text-xs text-white/80 select-none cursor-pointer" onClick={() => setAutoRemoveBg(!autoRemoveBg)}>
                        تفعيل الحذف التلقائي للخلفية البيضاء (مستحسن)
                    </span>
                 </div>

                 <div className="pt-4 flex gap-3 border-t border-white/10 mt-4">
                    <button 
                      type="submit" 
                      disabled={uploading}
                      className="flex-1 py-3 bg-[#C89B3C] hover:bg-[#b38a35] text-black rounded-xl font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploading ? <Loader2 className="animate-spin" size={18}/> : "حفظ الشريك"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {setIsModalOpen(false); setPreviewUrl(null); setLogoFile(null);}}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition"
                    >
                      إلغاء
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}