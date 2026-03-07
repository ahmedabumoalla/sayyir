"use client";

import Link from "next/link";
import { Globe, Server, Database, MapPin, User, Settings as SettingsIcon, Briefcase } from "lucide-react";
import { useTranslation } from "../TranslationContext"; // استدعاء الترجمة إذا أردت

export default function SettingsIndexPage() {
  const { t, language } = useTranslation(); // جاهزة للاستخدام في المستقبل إذا ترجمتها

  const settingsLinks = [
    { href: "/admin/settings/app", label: "إعدادات التطبيق", desc: "نبذة، تواصل، حالة التطبيق", icon: Globe, color: "text-blue-400", bg: "bg-blue-400/10" },
    { href: "/admin/settings/tech", label: "الربط والتقنية", desc: "بوابات الدفع، الإيميل، الخرائط", icon: Server, color: "text-purple-400", bg: "bg-purple-400/10" },
    { href: "/admin/settings/fields", label: "إدارة الحقول", desc: "حقول التسجيل وإضافة الخدمات", icon: Database, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { href: "/admin/settings/locations", label: "المدن والتصنيفات", desc: "المناطق الجغرافية وأنواع الأماكن", icon: MapPin, color: "text-amber-400", bg: "bg-amber-400/10" },
    { href: "/admin/settings/services", label: "أنواع الخدمات", desc: "تفعيل وإدارة أنواع الخدمات", icon: Briefcase, color: "text-red-400", bg: "bg-red-400/10" },
    { href: "/admin/settings/account", label: "حسابي", desc: "تغيير كلمة المرور وبيانات الدخول", icon: User, color: "text-gray-400", bg: "bg-gray-400/10" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-white">
          <SettingsIcon className="text-[#C89B3C]" /> الإعدادات العامة
        </h1>
        <p className="text-white/60 text-sm">اختر القسم الذي تريد تعديله من الخيارات أدناه.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsLinks.map((link, idx) => {
          const Icon = link.icon;
          return (
            <Link key={idx} href={link.href} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group flex items-start gap-4">
              <div className={`p-4 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${link.bg} ${link.color}`}>
                <Icon size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#C89B3C] transition-colors">{link.label}</h3>
                <p className="text-sm text-white/50">{link.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}