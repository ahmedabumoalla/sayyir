"use client";

import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { ArrowRight, Sparkles, Bot } from "lucide-react";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
});

export default function ClientAiGuidePage() {
  const router = useRouter();

  return (
    <div
      className={`flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto ${tajawal.className}`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
          >
            <ArrowRight size={20} />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-[#C89B3C] to-[#E2B354] flex items-center justify-center shadow-lg shadow-[#C89B3C]/20">
            <Bot size={28} className="text-[#2B1F17]" />
          </div>

          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              مرشد سَيّر الذكي
              <Sparkles size={18} className="text-[#C89B3C]" />
            </h1>
            <p className="text-xs text-white/50">قريبًا</p>
          </div>
        </div>
      </div>

      {/* Message Only */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-xl w-full text-center bg-[#1A1A1A] border border-white/10 rounded-[2rem] p-8 shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-linear-to-tr from-[#C89B3C] to-[#E2B354] flex items-center justify-center shadow-lg shadow-[#C89B3C]/20">
            <Sparkles className="text-[#2B1F17]" size={28} />
          </div>

          <h2 className="text-lg md:text-xl font-bold mb-4 text-white">
            المرشد السياحي الذكي قادم قريبًا
          </h2>

          <p className="text-white/70 leading-relaxed text-sm md:text-base whitespace-pre-line">
            سيكون المرشد السياحي الذكي رفيقًا لدربك عن قريب ✨

            يتم تدريبه حاليًا للتعرّف على كافة المعالم التراثية في منطقة عسير،
            ليقدم لك تجربة سياحية فريدة وغنية بالمعلومات 🏔️
          </p>

          <p className="text-[11px] text-white/30 mt-6">
            يتم العمل على تطويره حالياً — ترقب الإطلاق 🚀
          </p>
        </div>
      </div>
    </div>
  );
}