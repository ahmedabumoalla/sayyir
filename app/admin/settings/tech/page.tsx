"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Save, Loader2, Server, Key, Mail, MessageSquare, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "../../TranslationContext";

export default function TechSettingsPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [techData, setTechData] = useState({
    googleMapKey: "", geminiKey: "", paymentGateway: "Stripe", moyasarKey: "", 
    gmailUser: "", gmailAppPassword: "", resendApiKey: "", 
    twilioSid: "", twilioToken: "", twilioPhone: ""  
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
      if (data) {
        setTechData({
          googleMapKey: data.google_map_key || "", geminiKey: data.gemini_key || "",
          paymentGateway: data.payment_gateway || "Stripe", moyasarKey: data.moyasar_key || "",
          gmailUser: data.gmail_user || "", gmailAppPassword: data.gmail_app_password || "",
          resendApiKey: data.resend_api_key || "", twilioSid: data.twilio_account_sid || "",
          twilioToken: data.twilio_auth_token || "", twilioPhone: data.twilio_phone_number || ""
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToUpdate = {
        google_map_key: techData.googleMapKey, gemini_key: techData.geminiKey,
        payment_gateway: techData.paymentGateway, moyasar_key: techData.moyasarKey,
        gmail_user: techData.gmailUser, gmail_app_password: techData.gmailAppPassword,
        resend_api_key: techData.resendApiKey, twilio_account_sid: techData.twilioSid,
        twilio_auth_token: techData.twilioToken, twilio_phone_number: techData.twilioPhone
      };
      const { error } = await supabase.from('platform_settings').update(dataToUpdate).eq('id', 1);
      if (error) throw error;
      alert(t("success_save"));
    } catch (error: any) { alert(`${t("error_save")} ${error.message}`); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C89B3C] w-8 h-8" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl pb-10">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/admin/settings")} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition">
             {language === 'ar' ? <ArrowRight size={20} /> : <ArrowLeft size={20}/>}
        </button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Server className="text-[#C89B3C]"/> {t("tech_settings_title")}</h1>
      </div>

      <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><Key size={20} /> {t("payment_gateways")}</h2>
        <div className="space-y-4">
            <div>
                <label className="block text-white/60 mb-2 text-sm">{t("preferred_gateway")}</label>
                <select value={techData.paymentGateway} onChange={(e) => setTechData({...techData, paymentGateway: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none appearance-none">
                    <option value="Stripe">Stripe (عالمي)</option>
                    <option value="Moyasar">Moyasar (السعودية - مدى)</option>
                    <option value="Tamara">Tamara (تقسيط)</option>
                </select>
            </div>
            {techData.paymentGateway === 'Moyasar' && (
                <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-black/20 rounded-xl border border-[#C89B3C]/30">
                    <label className="block text-[#C89B3C] mb-2 text-xs font-bold">{t("moyasar_key")}</label>
                    <input type="text" value={techData.moyasarKey} onChange={(e) => setTechData({...techData, moyasarKey: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none font-mono text-sm dir-ltr text-left" placeholder="sk_test_..." />
                    <p className="text-[10px] text-gray-500 mt-2">{t("moyasar_desc")}</p>
                </div>
            )}
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><Mail size={20} /> {t("email_services")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
                <h3 className="text-white font-bold text-sm border-b border-white/10 pb-2">{t("gmail_smtp")}</h3>
                <div><label className="block text-white/60 mb-2 text-xs">{t("sender_email")}</label><input type="email" value={techData.gmailUser} onChange={(e) => setTechData({...techData, gmailUser: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm dir-ltr text-left" placeholder="email@gmail.com"/></div>
                <div><label className="block text-white/60 mb-2 text-xs">{t("app_password")}</label><input type="password" value={techData.gmailAppPassword} onChange={(e) => setTechData({...techData, gmailAppPassword: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm dir-ltr text-left"/></div>
            </div>
            <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
                <h3 className="text-white font-bold text-sm border-b border-white/10 pb-2">{t("resend_api")}</h3>
                <div><label className="block text-white/60 mb-2 text-xs">API Key</label><input type="text" value={techData.resendApiKey} onChange={(e) => setTechData({...techData, resendApiKey: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono dir-ltr text-left" placeholder="re_123..."/></div>
                <p className="text-[10px] text-gray-500">{t("resend_desc")}</p>
            </div>
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <h2 className="text-xl font-bold text-[#C89B3C] mb-6 flex items-center gap-2"><MessageSquare size={20} /> {t("sms_services")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-white/60 mb-2 text-xs">Account SID</label><input type="text" value={techData.twilioSid} onChange={(e) => setTechData({...techData, twilioSid: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono dir-ltr text-left"/></div>
            <div><label className="block text-white/60 mb-2 text-xs">Auth Token</label><input type="password" value={techData.twilioToken} onChange={(e) => setTechData({...techData, twilioToken: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono dir-ltr text-left"/></div>
            <div><label className="block text-white/60 mb-2 text-xs">{t("sender_phone")}</label><input type="text" value={techData.twilioPhone} onChange={(e) => setTechData({...techData, twilioPhone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#C89B3C] outline-none text-sm font-mono dir-ltr text-left" placeholder="+123456789"/></div>
        </div>
      </section>

      <div className="flex justify-end pt-4 sticky bottom-4 z-10">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#C89B3C] hover:bg-[#b88a2c] text-black font-bold py-3 px-12 rounded-xl transition shadow-xl">
          {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} {t("save_changes")}
        </button>
      </div>
    </div>
  );
}