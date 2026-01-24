"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { ArrowLeft, Loader2, Plus, Trash2, UploadCloud, Handshake, Save, Wand2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

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
  const [autoRemoveBg, setAutoRemoveBg] = useState(true); // تفعيل التفريغ تلقائياً

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // 1. جلب الشركاء
    const { data: partnersData } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
    if (partnersData) setPartners(partnersData);

    // 2. جلب إعدادات القسم
    const { data: settingsData } = await supabase.from('platform_settings').select('partners_title, partners_subtitle').single();
    if (settingsData) {
      setSectionSettings({
        partners_title: settingsData.partners_title || "شركاء النجاح",
        partners_subtitle: settingsData.partners_subtitle || ""
      });
    }
    setLoading(false);
  };

  // --- دالة ذكية لتفريغ اللون الأبيض من الشعار (Client-Side) ---
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
          
          // إذا كان اللون قريباً من الأبيض (فوق 230)
          if (r > 230 && g > 230 && b > 230) {
            data[i + 3] = 0; // Alpha = 0 (Transparent)
          }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject("Conversion failed");
        }, "image/png");
      };
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
    if (!newName || !logoFile) return;

    try {
      setUploading(true);
      let fileToUpload: File | Blob = logoFile;

      // تطبيق التفريغ التلقائي إذا تم تفعيله
      if (autoRemoveBg) {
        try {
          fileToUpload = await processImageTransparency(logoFile);
        } catch (err) {
          console.warn("فشل التفريغ التلقائي، سيتم رفع الصورة الأصلية", err);
        }
      }

      // الرفع إلى Supabase
      const fileExt = "png"; // دائماً PNG لدعم الشفافية
      const fileName = `partner_${Date.now()}.${fileExt}`;
      const filePath = `partners/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, fileToUpload, { contentType: 'image/png' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);

      // الحفظ في قاعدة البيانات
      const { error: dbError } = await supabase.from('partners').insert([
        { name: newName, logo_url: urlData.publicUrl }
      ]);

      if (dbError) throw dbError;

      // إعادة تعيين النموذج
      setNewName("");
      setLogoFile(null);
      setPreviewUrl(null);
      setIsModalOpen(false);
      fetchData(); // تحديث القائمة
      
    } catch (error) {
      console.error("Error adding partner:", error);
      alert("حدث خطأ أثناء رفع الشعار");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الشريك؟")) return;
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (!error) {
      setPartners(partners.filter(p => p.id !== id));
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    // نفترض أن هناك صفاً واحداً للإعدادات، سنقوم بتحديثه
    // تأكد من أنك تملك طريقة لمعرفة ID الصف، أو استخدم منطق (تحديث أول صف موجود)
    // هنا سنستخدم تحديث يعتمد على وجود عمود فريد أو سنحدث الجميع (بما أنه نظام منصة واحدة)
    const { error } = await supabase
        .from('platform_settings')
        .update({ 
            partners_title: sectionSettings.partners_title,
            partners_subtitle: sectionSettings.partners_subtitle
        })
        .neq('id', 0); // شرط وهمي لتحديث كل الصفوف (عادة يوجد صف واحد فقط للإعدادات)

    setSavingSettings(false);
    if (!error) alert("تم حفظ إعدادات الواجهة بنجاح");
  };

  return (
    <main dir="rtl" className={`min-h-screen bg-[#1a1a1a] text-white ${tajawal.className} p-6 lg:p-10`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <div className="p-3 bg-[#C89B3C]/10 rounded-xl text-[#C89B3C]">
               <Handshake size={28} />
             </div>
             <h1 className="text-3xl font-bold">شركاء النجاح</h1>
           </div>
           <p className="text-white/60 mr-14">تحكم في الشعارات والعناوين التي تظهر في قسم الشركاء.</p>
        </div>
        <div className="flex gap-3">
            <Link href="/admin/dashboard" className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition flex items-center gap-2 font-bold text-sm">
                <ArrowLeft size={18} /> رجوع للوحة
            </Link>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-[#C89B3C] hover:bg-[#b38a35] text-black rounded-xl transition flex items-center gap-2 font-bold text-sm shadow-lg shadow-[#C89B3C]/20"
            >
                <Plus size={18} /> إضافة شريك
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* القسم 1: إعدادات الواجهة */}
        <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-10">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Wand2 size={20} className="text-[#C89B3C]"/>
                    إعدادات الظهور
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-white/60 mb-2">عنوان القسم (في الرئيسية)</label>
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
                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                    >
                        {savingSettings ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> حفظ التعديلات</>}
                    </button>
                </div>
            </div>
        </div>

        {/* القسم 2: قائمة الشركاء */}
        <div className="lg:col-span-2">
            {loading ? (
                <div className="flex justify-center h-60 items-center"><Loader2 className="animate-spin text-[#C89B3C]" size={40} /></div>
            ) : partners.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed flex flex-col items-center justify-center h-full">
                    <Handshake size={48} className="text-white/20 mb-4"/>
                    <p className="text-white/40 font-bold text-lg">لا يوجد شركاء مضافين حالياً</p>
                    <p className="text-white/30 text-sm mt-2">اضغط على "إضافة شريك" للبدء.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {partners.map((partner) => (
                    <div key={partner.id} className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-white/10 transition duration-300">
                        <button 
                            onClick={() => handleDeletePartner(partner.id)}
                            className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition hover:bg-red-500/10 p-2 rounded-lg z-10"
                            title="حذف"
                        >
                            <Trash2 size={16} />
                        </button>
                        
                        <div className="relative w-full h-24 mb-4 flex items-center justify-center p-2 bg-white/5 rounded-lg">
                            {/* عرض الشعار */}
                            <Image src={partner.logo_url} alt={partner.name} width={100} height={100} className="object-contain max-h-full" />
                        </div>
                        
                        <h3 className="font-bold text-white text-center text-sm truncate w-full">{partner.name}</h3>
                    </div>
                ))}
                </div>
            )}
        </div>

      </div>

      {/* نافذة إضافة شريك */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
           <div className="bg-[#252525] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus className="text-[#C89B3C]" /> إضافة شريك جديد</h2>
              
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
                    <div className="relative border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:bg-white/5 transition group cursor-pointer overflow-hidden">
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
                                <span className="text-xs text-[#C89B3C]">اضغط للتغيير</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-white/40 group-hover:text-white/70">
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
                        تفعيل الحذف التلقائي للخلفية البيضاء
                    </span>
                 </div>

                 <div className="pt-4 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => {setIsModalOpen(false); setPreviewUrl(null); setLogoFile(null);}}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition"
                    >
                      إلغاء
                    </button>
                    <button 
                      type="submit" 
                      disabled={uploading}
                      className="flex-1 py-3 bg-[#C89B3C] hover:bg-[#b38a35] text-black rounded-xl font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploading ? <Loader2 className="animate-spin" size={18}/> : "حفظ الشريك"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </main>
  );
}