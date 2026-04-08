"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Tajawal } from "next/font/google";
import { 
    Loader2, ArrowRight, Edit, Send, Info, FileText, Clock, Compass, Home, Ticket, ShieldAlert, UploadCloud, CheckCircle, Eye, ImageIcon, X, Trash2, Plus
} from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

const CompareRow = ({ label, originalValue, originalDisplay, children }: { label: string, originalValue?: any, originalDisplay?: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition">
        <div className="w-full md:w-1/3 opacity-60 pointer-events-none border-b md:border-b-0 md:border-l border-white/10 pb-4 md:pb-0 md:pl-4">
            <span className="text-xs text-white/50 block mb-1.5">{label} (الحالي)</span>
            <div className="bg-black/30 p-3 rounded-xl text-sm whitespace-pre-line text-white/80 min-h-[44px]">
                {originalDisplay ? originalDisplay : (originalValue !== undefined && originalValue !== null && originalValue !== '' ? String(originalValue) : 'غير محدد / فارغ')}
            </div>
        </div>
        <div className="w-full md:w-2/3">
            <span className="text-xs text-[#C89B3C] block mb-1.5">{label} (الجديد)</span>
            {children}
        </div>
    </div>
);

// دالة مساعدة لاستخراج الصور
const safeArray = (data: any) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [data];
    }
  }
  return [];
};

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  
  const [originalService, setOriginalService] = useState<any>(null);

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  
  // حالة الصور والفيديوهات
  const [existingMedia, setExistingMedia] = useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState<any>({
      title: '',
      description: '',
      price: '',
      commercial_license: '',
      work_schedule: [],
      details: {}
  });

  useEffect(() => {
      if (serviceId) {
          fetchServiceData();
      }
  }, [serviceId]);

  const fetchServiceData = async () => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
              router.replace('/login');
              return;
          }

          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
          setProviderInfo(profile);

          const { data: service, error } = await supabase
              .from('services')
              .select('*')
              .eq('id', serviceId)
              .eq('provider_id', session.user.id)
              .single();

          if (error || !service) {
              alert("لم يتم العثور على الخدمة أو لا تملك صلاحية الوصول لها.");
              router.push('/provider/services');
              return;
          }

          setOriginalService(service);
          
          const initialData = service.pending_updates || service;
          
          // استخراج الصور الحالية
          const currentImages = safeArray(initialData.details?.images || initialData.image_url);
          setExistingMedia(currentImages);
          
          setEditForm({
              title: initialData.title || '',
              description: initialData.description || '',
              price: initialData.price !== undefined ? initialData.price.toString() : '0',
              commercial_license: initialData.commercial_license || '',
              work_schedule: initialData.work_schedule || [],
              details: JSON.parse(JSON.stringify(initialData.details || {}))
          });

      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const handleDetailChange = (key: string, value: any, nestedKey?: string, deepNestedKey?: string) => {
      setEditForm((prev: any) => {
          const newDetails = { ...prev.details };
          
          if (deepNestedKey && nestedKey) {
              if (!newDetails[key]) newDetails[key] = {};
              if (!newDetails[key][nestedKey]) newDetails[key][nestedKey] = {};
              newDetails[key][nestedKey][deepNestedKey] = value;
          } else if (nestedKey) {
              if (!newDetails[key]) newDetails[key] = {};
              newDetails[key][nestedKey] = value;
          } else {
              newDetails[key] = value;
          }
          
          return { ...prev, details: newDetails };
      });
  };

  const handleScheduleChange = (index: number, field: string, value: any, shiftIndex?: number, shiftField?: string) => {
      setEditForm((prev: any) => {
          const newSchedule = [...prev.work_schedule];
          if (shiftIndex !== undefined && shiftField) {
              newSchedule[index].shifts[shiftIndex][shiftField] = value;
          } else {
              newSchedule[index][field] = value;
          }
          return { ...prev, work_schedule: newSchedule };
      });
  };

  // دوال إدارة الوسائط
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewMediaFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeExistingMedia = (indexToRemove: number) => {
    setExistingMedia(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const removeNewMedia = (indexToRemove: number) => {
    setNewMediaFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const submitEditRequest = async () => {
      if (!editForm.title.trim() || !editForm.description.trim()) {
          return alert("يرجى تعبئة العنوان والوصف بشكل صحيح.");
      }

      if (existingMedia.length === 0 && newMediaFiles.length === 0) {
          return alert("يجب أن تحتوي الخدمة على صورة أو فيديو واحد على الأقل.");
      }

      setActionLoading(true);
      try {
          let finalLicenseUrl = editForm.commercial_license;

          if (licenseFile) {
              const fileExt = licenseFile.name.split('.').pop();
              const fileName = `license_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from('provider-files').upload(fileName, licenseFile);
              if (uploadError) throw uploadError;
              const { data } = supabase.storage.from('provider-files').getPublicUrl(fileName);
              finalLicenseUrl = data.publicUrl;
          }

          // رفع الصور والفيديوهات الجديدة
          const uploadedMediaUrls: string[] = [];
          if (newMediaFiles.length > 0) {
              for (const file of newMediaFiles) {
                  const fileExt = file.name.split('.').pop();
                  const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                  const { error: uploadError } = await supabase.storage.from('provider-files').upload(fileName, file);
                  if (uploadError) throw uploadError;
                  const { data } = supabase.storage.from('provider-files').getPublicUrl(fileName);
                  uploadedMediaUrls.push(data.publicUrl);
              }
          }

          // دمج الصور المتبقية القديمة مع الجديدة المرفوعة
          const finalMediaList = [...existingMedia, ...uploadedMediaUrls];

          // تحديث الميديا في डिटेल्स
          const updatedDetails = { ...editForm.details, images: finalMediaList };

          const pendingUpdates = { 
              title: editForm.title, 
              description: editForm.description, 
              price: Number(editForm.price),
              commercial_license: finalLicenseUrl, 
              image_url: finalMediaList[0] || '', // نعتمد أول صورة أو فيديو كغلاف
              work_schedule: editForm.work_schedule,
              details: updatedDetails
          };

          const { error } = await supabase
              .from('services')
              .update({ 
                  status: 'update_requested', 
                  pending_updates: pendingUpdates 
              })
              .eq('id', serviceId);

          if (error) throw error;

          await fetch('/api/emails/send', { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify({ 
                  type: 'new_service_notification', 
                  providerName: providerInfo?.full_name, 
                  serviceTitle: `طلب تعديل شامل لبيانات خدمة: ${originalService.title}` 
              }) 
          }).catch(e => console.error(e));

          alert("تم إرسال طلب التعديل الشامل للإدارة بنجاح ✅\n(الخدمة الحالية ستبقى معروضة ببياناتها القديمة حتى توافق الإدارة)");
          router.push('/provider/services');
          
      } catch (e: any) { 
          alert("حدث خطأ أثناء إرسال الطلب: " + e.message); 
      } finally { 
          setActionLoading(false); 
      }
  };

  if (loading) {
      return (
          <div className="h-screen flex items-center justify-center bg-[#121212]">
              <Loader2 className="animate-spin text-[#C89B3C] w-12 h-12" />
          </div>
      );
  }

  const isVideo = (url: string) => !!url.match(/\.(mp4|webm|ogg|mov)$/i);

  return (
    <div className={`min-h-screen bg-[#121212] p-4 md:p-8 animate-in fade-in duration-500 pb-20 ${tajawal.className}`} dir="rtl">
        
        <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
            <button 
                onClick={() => router.push('/provider/services')} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition border border-white/10 text-white"
            >
                <ArrowRight size={20} />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Edit className="text-blue-400" /> طلب تعديل شامل للخدمة
                </h1>
                <p className="text-sm text-white/50 mt-1">تحديث بيانات خدمة: <span className="text-[#C89B3C]">{originalService?.title}</span></p>
            </div>
        </div>

        <div className="max-w-6xl mx-auto bg-[#1E1E1E] rounded-3xl border border-blue-500/20 shadow-2xl overflow-hidden">
            
            <div className="bg-blue-500/10 p-5 md:p-6 border-b border-white/5 flex items-start gap-3">
                <Info className="text-blue-400 shrink-0 mt-0.5" size={20} />
                <p className="text-sm md:text-base text-blue-100/80 leading-relaxed">
                    قم بتعديل أي حقل ترغب بتحديثه في الحقول الملونة أدناه. يمكنك تعديل العناوين، الوصف، والصور والمقاطع. سيتم إرسال كافة التعديلات كطلب واحد للإدارة للمراجعة. <strong className="text-white">ولن تتأثر الخدمة الحالية المعروضة للعملاء حتى يتم الاعتماد.</strong>
                </p>
            </div>

            <div className="p-6 md:p-8 space-y-10">
                
                {/* 0. معرض الصور والفيديو (تعديل كامل) */}
                <section className="space-y-4">
                    <h3 className="text-[#C89B3C] font-bold text-lg flex items-center gap-2 border-b border-[#C89B3C]/20 pb-2"><ImageIcon size={18}/> الصور والفيديوهات</h3>
                    
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-6">
                        <p className="text-sm text-white/60 mb-4">أضف أو احذف الصور ومقاطع الفيديو الخاصة بالخدمة. أول ملف سيكون هو الغلاف الرئيسي.</p>
                        
                        <div className="flex flex-wrap gap-4 mb-4">
                            {/* الوسائط الحالية المتبقية */}
                            {existingMedia.map((url, idx) => (
                                <div key={`ex-${idx}`} className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/10 group">
                                    {isVideo(url) ? (
                                        <video src={url} className="w-full h-full object-cover opacity-70" muted playsInline />
                                    ) : (
                                        <img src={url} alt={`Media ${idx}`} className="w-full h-full object-cover opacity-70" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <button onClick={() => removeExistingMedia(idx)} className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition shadow-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <span className="absolute bottom-1 right-1 bg-black/60 text-[10px] px-1.5 rounded text-white/50">سابق</span>
                                </div>
                            ))}

                            {/* الوسائط الجديدة المرفوعة */}
                            {newMediaFiles.map((file, idx) => {
                                const tempUrl = URL.createObjectURL(file);
                                const isVid = file.type.startsWith('video/');
                                return (
                                    <div key={`new-${idx}`} className="relative w-32 h-32 rounded-xl overflow-hidden border border-[#C89B3C]/50 group">
                                        {isVid ? (
                                            <video src={tempUrl} className="w-full h-full object-cover" muted playsInline />
                                        ) : (
                                            <img src={tempUrl} alt={`New Media ${idx}`} className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <button onClick={() => removeNewMedia(idx)} className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition shadow-lg">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <span className="absolute bottom-1 right-1 bg-[#C89B3C] text-[10px] px-1.5 rounded text-black font-bold">جديد</span>
                                    </div>
                                );
                            })}

                            {/* زر الإضافة */}
                            <button onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-xl border-2 border-dashed border-white/20 hover:border-[#C89B3C] flex flex-col items-center justify-center gap-2 text-white/50 hover:text-[#C89B3C] transition bg-white/5 hover:bg-[#C89B3C]/5">
                                <Plus size={24} />
                                <span className="text-xs font-bold">إضافة ملف</span>
                            </button>
                            <input type="file" multiple accept="image/*,video/*" ref={fileInputRef} onChange={handleMediaSelect} className="hidden" />
                        </div>
                    </div>
                </section>

                {/* 1. البيانات الأساسية */}
                <section className="space-y-4">
                    <h3 className="text-[#C89B3C] font-bold text-lg flex items-center gap-2 border-b border-[#C89B3C]/20 pb-2"><FileText size={18}/> البيانات الأساسية</h3>
                    <CompareRow label="عنوان الخدمة" originalValue={originalService.title}>
                        <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition" />
                    </CompareRow>
                    
                    {originalService.sub_category !== 'event' && (
                        <CompareRow label="السعر (ريال)" originalValue={originalService.price}>
                            <input type="number" min="0" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition" />
                        </CompareRow>
                    )}

                    <CompareRow label="وصف الخدمة" originalValue={originalService.description}>
                        <textarea rows={4} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition resize-none leading-relaxed" />
                    </CompareRow>

                    <CompareRow 
                        label="الترخيص التجاري (مرفق)" 
                        originalDisplay={originalService.commercial_license ? (
                            <a href={originalService.commercial_license} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 w-fit pointer-events-auto">
                                <Eye size={16}/> عرض المرفق الحالي
                            </a>
                        ) : "لا يوجد مرفق"}
                    >
                        <div className="relative group/upload w-full">
                            <input 
                                type="file" 
                                accept="image/*,.pdf" 
                                id="license-upload" 
                                className="hidden" 
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setLicenseFile(e.target.files[0]);
                                    }
                                }} 
                            />
                            <label htmlFor="license-upload" className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-white/20 bg-black/40 rounded-xl cursor-pointer hover:border-[#C89B3C] hover:bg-[#C89B3C]/5 transition-all">
                                {licenseFile ? (
                                    <div className="flex items-center gap-2 text-[#C89B3C]">
                                        <CheckCircle size={20} />
                                        <span className="text-sm font-bold line-clamp-1 px-2">{licenseFile.name}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-white/50 group-hover/upload:text-[#C89B3C]">
                                        <UploadCloud size={24} />
                                        <span className="text-xs">اضغط لرفع ملف ترخيص جديد (صورة أو PDF)</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </CompareRow>

                    <CompareRow label="سياسات وشروط المكان" originalValue={originalService.details?.policies}>
                        <textarea rows={4} value={editForm.details?.policies || ''} onChange={e => handleDetailChange('policies', e.target.value)} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition resize-none leading-relaxed" placeholder="أدخل الشروط والسياسات..." />
                    </CompareRow>
                </section>

                {/* 2. تفاصيل مخصصة (بناءً على نوع الخدمة) */}
                
                {/* --- أ. النزل (Lodging) --- */}
                {originalService.sub_category === 'lodging' && (
                    <section className="space-y-4">
                        <h3 className="text-[#C89B3C] font-bold text-lg flex items-center gap-2 border-b border-[#C89B3C]/20 pb-2"><Home size={18}/> تفاصيل النزل السياحي</h3>
                        
                        <CompareRow label="مساحة المكان (متر مربع)" originalValue={originalService.details?.area}>
                            <input type="number" value={editForm.details?.area || ''} onChange={e => handleDetailChange('area', e.target.value)} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition" />
                        </CompareRow>
                        
                        <CompareRow label="السعة الاستيعابية (أشخاص)" originalValue={originalService.max_capacity}>
                            <input type="number" value={editForm.details?.max_capacity || originalService.max_capacity} onChange={e => handleDetailChange('max_capacity', e.target.value)} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition" />
                        </CompareRow>

                        {originalService.details?.apartment_details && (
                            <CompareRow label="تفاصيل الشقة (غرف، أسرة، حمامات)" originalValue={`غرف: ${originalService.details.apartment_details.rooms} | أسرة: ${originalService.details.apartment_details.beds} | حمامات: ${originalService.details.apartment_details.bathrooms}`}>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="غرف" value={editForm.details?.apartment_details?.rooms || ''} onChange={e => handleDetailChange('apartment_details', e.target.value, 'rooms')} className="w-1/3 bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white" />
                                    <input type="number" placeholder="أسرة" value={editForm.details?.apartment_details?.beds || ''} onChange={e => handleDetailChange('apartment_details', e.target.value, 'beds')} className="w-1/3 bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white" />
                                    <input type="number" placeholder="حمامات" value={editForm.details?.apartment_details?.bathrooms || ''} onChange={e => handleDetailChange('apartment_details', e.target.value, 'bathrooms')} className="w-1/3 bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white" />
                                </div>
                            </CompareRow>
                        )}
                    </section>
                )}

                {/* --- ب. التجربة السياحية (Experience) --- */}
                {originalService.sub_category === 'experience' && (
                    <section className="space-y-4">
                        <h3 className="text-[#C89B3C] font-bold text-lg flex items-center gap-2 border-b border-[#C89B3C]/20 pb-2"><Compass size={18}/> تفاصيل التجربة</h3>
                        
                        <CompareRow label="مدة التجربة" originalValue={originalService.details?.experience_info?.duration}>
                            <input value={editForm.details?.experience_info?.duration || ''} onChange={e => handleDetailChange('experience_info', e.target.value, 'duration')} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition" placeholder="مثال: 3 ساعات" />
                        </CompareRow>

                        <CompareRow label="مستوى الصعوبة" originalValue={originalService.details?.experience_info?.difficulty}>
                            <select value={editForm.details?.experience_info?.difficulty || 'سهل'} onChange={e => handleDetailChange('experience_info', e.target.value, 'difficulty')} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition appearance-none text-center">
                                <option value="سهل" className="bg-[#1a1a1a]">سهل</option>
                                <option value="متوسط" className="bg-[#1a1a1a]">متوسط</option>
                                <option value="صعب" className="bg-[#1a1a1a]">صعب</option>
                            </select>
                        </CompareRow>
                        
                        <CompareRow label="ماذا يجب أن يحضر العميل؟" originalValue={originalService.details?.experience_info?.what_to_bring}>
                            <textarea rows={3} value={editForm.details?.experience_info?.what_to_bring || ''} onChange={e => handleDetailChange('experience_info', e.target.value, 'what_to_bring')} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition resize-none" />
                        </CompareRow>

                        <CompareRow label="سياسة إلغاء التجربة" originalValue={originalService.details?.experience_info?.cancellation_policy}>
                            <textarea rows={3} value={editForm.details?.experience_info?.cancellation_policy || ''} onChange={e => handleDetailChange('experience_info', e.target.value, 'cancellation_policy')} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white transition resize-none" />
                        </CompareRow>
                    </section>
                )}

                {/* --- ج. الفعاليات (Events) --- */}
                {originalService.sub_category === 'event' && (
                    <section className="space-y-4">
                        <h3 className="text-[#C89B3C] font-bold text-lg flex items-center gap-2 border-b border-[#C89B3C]/20 pb-2"><Ticket size={18}/> تفاصيل الفعالية</h3>
                        
                        <CompareRow label="تواريخ الفعالية" originalValue={`من: ${originalService.details?.event_info?.dates?.startDate} | إلى: ${originalService.details?.event_info?.dates?.endDate}`}>
                            <div className="flex gap-2">
                                <input type="date" value={editForm.details?.event_info?.dates?.startDate || ''} onChange={e => handleDetailChange('event_info', e.target.value, 'dates', 'startDate')} className="w-1/2 bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white/80 dir-ltr text-right" style={{ colorScheme: 'dark' }} />
                                <input type="date" value={editForm.details?.event_info?.dates?.endDate || ''} onChange={e => handleDetailChange('event_info', e.target.value, 'dates', 'endDate')} className="w-1/2 bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white/80 dir-ltr text-right" style={{ colorScheme: 'dark' }} />
                            </div>
                        </CompareRow>

                        <CompareRow label="ساعات العمل" originalValue={`من: ${originalService.details?.event_info?.dates?.startTime} | إلى: ${originalService.details?.event_info?.dates?.endTime}`}>
                            <div className="flex gap-2">
                                <input type="time" value={editForm.details?.event_info?.dates?.startTime || ''} onChange={e => handleDetailChange('event_info', e.target.value, 'dates', 'startTime')} className="w-1/2 bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white/80 dir-ltr text-right" style={{ colorScheme: 'dark' }} />
                                <input type="time" value={editForm.details?.event_info?.dates?.endTime || ''} onChange={e => handleDetailChange('event_info', e.target.value, 'dates', 'endTime')} className="w-1/2 bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white/80 dir-ltr text-right" style={{ colorScheme: 'dark' }} />
                            </div>
                        </CompareRow>

                        <CompareRow label="سعر تذكرة البالغين" originalValue={originalService.price}>
                            <input type="number" min="0" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white" />
                        </CompareRow>

                        <CompareRow label="سعر تذكرة الأطفال" originalValue={originalService.details?.event_info?.child_price}>
                            <input type="number" min="0" value={editForm.details?.event_info?.child_price !== undefined ? editForm.details.event_info.child_price : ''} onChange={e => handleDetailChange('event_info', Number(e.target.value), 'child_price')} className="w-full bg-black/40 border border-white/10 focus:border-[#C89B3C] outline-none rounded-xl p-3 text-white" />
                        </CompareRow>
                    </section>
                )}

                {/* 3. أوقات الدوام (Work Schedule) - إن وجدت */}
                {originalService.work_schedule && originalService.work_schedule.length > 0 && (
                    <section className="space-y-4">
                        <h3 className="text-[#C89B3C] font-bold text-lg flex items-center gap-2 border-b border-[#C89B3C]/20 pb-2"><Clock size={18}/> أوقات الدوام والعمل</h3>
                        
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-6 space-y-4">
                            {editForm.work_schedule.map((day: any, i: number) => (
                                <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                                    
                                    <div className="flex items-center gap-4 w-full md:w-1/4">
                                        <input 
                                            type="checkbox" 
                                            checked={day.active} 
                                            onChange={e => handleScheduleChange(i, 'active', e.target.checked)}
                                            className="w-5 h-5 accent-[#C89B3C] cursor-pointer"
                                        />
                                        <span className={`font-bold ${day.active ? 'text-white' : 'text-white/40 line-through'}`}>{day.day}</span>
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col gap-2">
                                        {day.active ? day.shifts.map((shift: any, shiftIdx: number) => (
                                            <div key={shiftIdx} className="flex items-center gap-2 justify-end">
                                                <span className="text-xs text-white/50">من</span>
                                                <input type="time" value={shift.from} onChange={e => handleScheduleChange(i, 'shifts', e.target.value, shiftIdx, 'from')} className="bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white/80 focus:border-[#C89B3C] outline-none dir-ltr" style={{ colorScheme: 'dark' }} />
                                                <span className="text-xs text-white/50">إلى</span>
                                                <input type="time" value={shift.to} onChange={e => handleScheduleChange(i, 'shifts', e.target.value, shiftIdx, 'to')} className="bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white/80 focus:border-[#C89B3C] outline-none dir-ltr" style={{ colorScheme: 'dark' }} />
                                            </div>
                                        )) : (
                                            <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg w-fit md:ml-auto">مغلق في هذا اليوم</span>
                                        )}
                                    </div>

                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </div>

            {/* Footer Actions */}
            <div className="p-6 md:p-8 border-t border-white/10 bg-black/20 flex flex-col md:flex-row justify-end gap-4 mt-8">
                <button 
                    onClick={() => router.push('/provider/services')} 
                    className="px-8 py-3.5 rounded-xl hover:bg-white/10 transition text-white font-bold border border-transparent hover:border-white/10"
                >
                    إلغاء وتراجع
                </button>
                <button 
                    onClick={submitEditRequest} 
                    disabled={actionLoading} 
                    className="bg-[#C89B3C] hover:bg-[#b38a35] text-black font-bold px-10 py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#C89B3C]/20 disabled:opacity-70"
                >
                    {actionLoading ? <Loader2 className="animate-spin text-black"/> : <><Send size={18}/> إرسال الطلب الشامل للإدارة</>}
                </button>
            </div>

        </div>
    </div>
  );
}