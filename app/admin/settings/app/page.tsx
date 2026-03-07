"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Save, Loader2, Phone, Mail, FileText, Globe, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "../../TranslationContext";
export default function AppSettingsPage() {
  const router = useRouter();
  const { t, language } = useTranslation(); // استخدام الترجمة

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    is_app_active: true, about_us: "", vision: "", mission: "",
    whatsapp: "", email: "", twitter: "", instagram: "", linkedin: ""
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
      if (data) {
        setFormData({
          is_app_active: data.is_app_active ?? true,
          about_us: data.about_us || "", vision: data.vision || "", mission: data.mission || "",
          whatsapp: data.whatsapp || "", email: data.email || "",
          twitter: data.twitter || "", instagram: data.instagram || "", linkedin: data.linkedin || ""
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('platform_settings').update(formData).eq('id', 1);
      if (error) throw error;
      alert(t("success_save"));
    } catch (error: any) {
      alert(`${t("error_save")} ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl pb-10">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/admin/settings")} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition">
            {language === 'ar' ? <ArrowRight size={20} /> : <ArrowLeft size={20}/>}
        </button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Globe className="text-[#C89B3C]"/> {t("app_settings_title")}</h1>
      </div>

      <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-[#C89B3C] mb-4 flex items-center gap-2"><Globe size={20}/> {t("app_status")}</h2>
        <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${formData.is_app_active ? "bg-green-500 shadow-[0_0_10px_lime]" : "bg-red-500 shadow-[0_0_10px_red]"}`}></div>
              <span className="text-white font-bold">{formData.is_app_active ? t("app_active") : t("app_maintenance")}</span>
          </div>
          <button onClick={() => setFormData({...formData, is_app_active: !formData.is_app_active})} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${formData.is_app_active ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'}`}>
            {formData.is_app_active ? t("deactivate_app") : t("activate_app")}
          </button>
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><FileText size={20} /> {t("about_content")}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 mb-2 text-sm">{t("about_us")}</label>
            <textarea rows={4} value={formData.about_us} onChange={(e) => setFormData({ ...formData, about_us: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none resize-none leading-relaxed" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/60 mb-2 text-sm">{t("vision")}</label>
              <textarea rows={3} value={formData.vision} onChange={(e) => setFormData({ ...formData, vision: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none resize-none" />
            </div>
            <div>
              <label className="block text-white/60 mb-2 text-sm">{t("mission")}</label>
              <textarea rows={3} value={formData.mission} onChange={(e) => setFormData({ ...formData, mission: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none resize-none" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><Phone size={20} /> {t("contact_info")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-white/60 mb-2 text-sm">{t("whatsapp")}</label>
            <div className="relative">
                <input type="text" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none pl-10 dir-ltr text-left" />
                <Phone className="absolute left-3 top-3.5 text-white/40" size={18} />
            </div>
          </div>
          <div>
            <label className="block text-white/60 mb-2 text-sm">{t("email")}</label>
            <div className="relative">
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none pl-10 dir-ltr text-left" />
                <Mail className="absolute left-3 top-3.5 text-white/40" size={18} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
          <div><label className="block text-white/60 mb-2 text-sm">{t("twitter")}</label><input type="text" value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs dir-ltr text-left focus:border-[#C89B3C] outline-none" /></div>
          <div><label className="block text-white/60 mb-2 text-sm">{t("instagram")}</label><input type="text" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs dir-ltr text-left focus:border-[#C89B3C] outline-none" /></div>
          <div><label className="block text-white/60 mb-2 text-sm">{t("linkedin")}</label><input type="text" value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs dir-ltr text-left focus:border-[#C89B3C] outline-none" /></div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} disabled={saving} className="bg-[#C89B3C] text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:bg-[#b88a2c] transition">
          {saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>} {t("save_changes")}
        </button>
      </div>
    </div>
  );
}