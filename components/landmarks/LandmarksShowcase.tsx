"use client";

import { useEffect, useState } from "react";

/* ================= TYPES ================= */

type Landmark = {
  id: number;
  title: string;
  description: string;
  images: string[];
};

/* ================= MOCK DATA ================= */

const landmarks: Landmark[] = [
  {
    id: 1,
    title: "قرية رجال ألمع",
    description:
      "إحدى أشهر القرى التراثية في عسير، تتميز بعمارتها الحجرية الفريدة وتاريخها العريق.",
    images: ["/mock/landmark1-1.jpg", "/mock/landmark1-2.jpg"],
  },
  {
    id: 2,
    title: "قصر شدا",
    description:
      "معلم تاريخي في قلب أبها يعكس أسلوب البناء العسيري القديم وكان مقرًا للحكم.",
    images: ["/mock/landmark2-1.jpg", "/mock/landmark2-2.jpg"],
  },
  {
    id: 3,
    title: "قرية المفتاحة",
    description:
      "مركز ثقافي وفني يجمع بين التراث والفنون والمعارض الثقافية.",
    images: ["/mock/landmark3-1.jpg", "/mock/landmark3-2.jpg"],
  },
  {
    id: 4,
    title: "الحصون الجبلية",
    description:
      "حصون تاريخية بنيت لحماية القرى وتطل على مناظر طبيعية خلابة.",
    images: ["/mock/landmark4-1.jpg", "/mock/landmark4-2.jpg"],
  },
];


/* ================= COMPONENT ================= */

export default function LandmarksShowcase() {
  return (
    <section className="relative z-20 px-6 mt-32">
      <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
        المعالم التراثية
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {landmarks.map((landmark) => (
          <LandmarkCard key={landmark.id} landmark={landmark} />
        ))}
      </div>
    </section>
  );
}

/* ================= CARD ================= */

function LandmarkCard({ landmark }: { landmark: Landmark }) {
  const [currentImage, setCurrentImage] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev: number) =>
        prev === landmark.images.length - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [landmark.images.length]);

  return (
    <div className="group border border-white/20 rounded-3xl overflow-hidden text-white transition transform hover:-translate-y-2">
      
      {/* IMAGE */}
      <div className="relative h-48 w-full bg-black/30">
        <img
          src={landmark.images[currentImage]}
          alt={landmark.title}
          className="w-full h-full object-cover transition-opacity duration-700"
        />
      </div>

      {/* CONTENT */}
      <div className="p-6 flex flex-col h-full backdrop-blur-xl bg-white/15">
        <h3 className="text-xl font-semibold mb-2">{landmark.title}</h3>

        <p className="text-sm text-white/90 leading-relaxed flex-grow">
          {landmark.description}
        </p>

        <button className="mt-4 px-4 py-2 rounded-lg bg-white/20 border border-white/25 text-sm font-medium hover:bg-white/30 transition">
          المزيد من التفاصيل
        </button>
      </div>
    </div>
  );
}
