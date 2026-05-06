"use client";

import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { ArrowRight, Sparkles, Bot } from "lucide-react";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

export default function AiGuidePage() {
  const router = useRouter();

  return (
    <main
      className={`min-h-screen bg-[#0a0a0a] text-white flex flex-col ${tajawal.className}`}
      dir="rtl"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
          >
            <ArrowRight size={20} />
          </button>

          <div className="flex flex-col">
            <h1 className="font-bold text-lg flex items-center gap-2">
              المساعد الذكي
              <Sparkles size={16} className="text-[#C89B3C]" />
            </h1>
            <span className="text-xs text-white/40">
              قريبًا
            </span>
          </div>
        </div>

        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-[#C89B3C] to-[#b38a35] flex items-center justify-center shadow-lg shadow-[#C89B3C]/20">
          <Bot size={24} className="text-[#2B1F17]" />
        </div>
      </header>

      {/* Message Only */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl text-center bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 shadow-xl">

          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-linear-to-tr from-[#C89B3C] to-[#E2B354] flex items-center justify-center">
            <Sparkles className="text-[#2B1F17]" size={28} />
          </div>

          <h2 className="text-lg font-bold mb-4">
            المساعد الذكي لمزودي الخدمات قادم قريبًا
          </h2>

          <p className="text-white/70 leading-relaxed text-sm md:text-base whitespace-pre-line">
            نعمل حاليًا على تطوير المساعد الذكي لمزودي الخدمات ✨

            سيساعدك على فهم الفرص المتاحة داخل المنصة،
            تطوير محتوى خدماتك، تحسين ظهورك،
            وزيادة الحجوزات من خلال توصيات ذكية مبنية على البيانات 📈
          </p>

          <p className="text-[11px] text-white/30 mt-6">
            جاري التطوير — سيتم إطلاقه قريبًا 🚀
          </p>

        </div>
      </div>
    </main>
  );
}