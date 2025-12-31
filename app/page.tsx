"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Tajawal } from "next/font/google";
import LandmarksShowcase from "@/components/landmarks/LandmarksShowcase";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

export default function HomePage() {
  const text = "اكتشف جمال الماضي وعِش تجربة سياحية مميزة";
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const speed = deleting ? 45 : 90;

    const timeout = setTimeout(() => {
      if (!deleting && index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        setIndex(index + 1);
      } else if (deleting && index > 0) {
        setDisplayedText(text.slice(0, index - 1));
        setIndex(index - 1);
      } else if (!deleting && index === text.length) {
        setTimeout(() => setDeleting(true), 2200);
      } else if (deleting && index === 0) {
        setDeleting(false);
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [index, deleting]);

  return (
    <main className={`relative min-h-screen ${tajawal.className}`}>
      {/* GLOBAL VIDEO BACKGROUND */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0"
        src="/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* DARK OVERLAY */}
      <div className="fixed inset-0 bg-black/60 z-0" />

      {/* PAGE CONTENT */}
      <div className="relative z-10">
        {/* HERO SECTION */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          {/* LOGO */}
          <div className="mb-6">
            <Image
              src="/logo.png"
              alt="Sayyir AI"
              width={220}
              height={80}
              priority
            />
          </div>

          {/* Animated Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-snug min-h-[3.5rem] tracking-wide">
            {displayedText}
            <span className="animate-pulse">|</span>
          </h1>

          <p className="mt-4 text-lg text-white/90 max-w-2xl">
            تجربة سياحية تفاعلية مدعومة بالذكاء الاصطناعي
          </p>

          {/* Explore Map Button */}
          <div className="mt-10 mb-10">
            <button
              className="
                flex items-center gap-3
                px-10 py-4
                rounded-full
                backdrop-blur-md
                bg-white/15
                border border-white/25
                text-white
                font-semibold
                shadow-lg
                transition transform
                hover:-translate-y-2
                hover:bg-white/25
              "
            >
              <span className="relative w-5 h-5">
                <span className="absolute inset-0 rounded-full border-2 border-current"></span>
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-current"></span>
              </span>
              استكشف الخريطة
            </button>
          </div>

          {/* FEATURE CARDS */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl">
            <GlassCard
              title="المعالم السياحية"
              desc="اكتشف المواقع التاريخية والطبيعية عبر تحليل ذكي"
              icon="/icons/landmark.svg"
            />
            <GlassCard
              title="المرافق والخدمات"
              desc="تعرف على المرافق القريبة مثل السكن والمطاعم"
              icon="/icons/ai.svg"
            />
            <GlassCard
              title="التجارب السياحية"
              desc="عِش تجارب محلية أصيلة مصممة حسب اهتماماتك"
              icon="/icons/guide.svg"
            />
          </div>
        </section>

        {/* LANDMARKS SHOWCASE */}
        <section className="py-32">
          <LandmarksShowcase />
        </section>
      </div>
    </main>
  );
}

function GlassCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="group backdrop-blur-xl bg-white/15 border border-white/20 rounded-3xl p-8 text-white transition transform hover:-translate-y-2 hover:bg-white/20">
      <div className="mb-6 flex justify-center">
        <Image src={icon} alt={title} width={48} height={48} />
      </div>
      <h3 className="text-2xl font-semibold mb-3 text-center">{title}</h3>
      <p className="text-sm text-white/90 text-center leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
