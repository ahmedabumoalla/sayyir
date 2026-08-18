"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Tajawal } from "next/font/google";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, ImageIcon, Landmark, Loader2, MapPin, Mountain, Share2, Trees, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700", "800"] });

type Place = {
  id: string;
  name: string;
  type?: string | null;
  description?: string | null;
  media_urls?: string[] | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  city?: string | null;
  amenities?: string[] | string | null;
  duration?: string | null;
  difficulty?: string | null;
  owner_name?: string | null;
};

function normalizeMedia(value: Place["media_urls"]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    } catch {}
    return value
      .replace(/^\{|\}$/g, "")
      .split(",")
      .map((s) => s.replace(/^['\"]|['\"]$/g, "").trim())
      .filter(Boolean);
  }
  return [];
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes("video") || url.includes("mp4");
}

function typeLabel(type?: string | null) {
  if (type === "heritage") return "تراثي";
  if (type === "natural") return "طبيعي";
  return "سياحي";
}

function typeIcon(type?: string | null) {
  if (type === "heritage") return <Landmark className="h-4 w-4 text-amber-400" />;
  if (type === "natural") return <Trees className="h-4 w-4 text-teal-400" />;
  return <Mountain className="h-4 w-4 text-emerald-400" />;
}

export default function PlaceDetails() {
  const params = useParams();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchPlaceDetails();
  }, []);

  useEffect(() => {
    if (place) checkFavorite();
  }, [place]);

  const media = useMemo(() => normalizeMedia(place?.media_urls ?? null), [place?.media_urls]);
  const mainMedia = media[currentImageIndex] || media[0] || null;

  async function fetchPlaceDetails() {
    if (!params?.id) return;
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) toast.error("تعذر تحميل بيانات المعلم");
    if (data) setPlace(data as Place);
    setLoading(false);
  }

  async function checkFavorite() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !place?.id) {
      setFavLoading(false);
      return;
    }

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("place_id", place.id)
      .maybeSingle();

    setIsFavorite(Boolean(data));
    setFavLoading(false);
  }

  async function toggleFavorite() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !place?.id) {
      toast.error("يجب تسجيل الدخول للإضافة للمفضلة");
      return;
    }

    if (isFavorite) {
      setIsFavorite(false);
      await supabase.from("favorites").delete().eq("user_id", session.user.id).eq("place_id", place.id);
      toast.success("تم الإزالة من المفضلة");
      return;
    }

    setIsFavorite(true);
    await supabase.from("favorites").insert({ user_id: session.user.id, place_id: place.id });
    toast.success("تمت الإضافة للمفضلة");
  }

  function openLocation() {
    if (!place?.lat || !place?.lng) {
      toast.error("الموقع غير متوفر");
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`, "_blank");
  }

  function sharePlace() {
    if (navigator.share && place) {
      navigator.share({ title: place.name, text: place.description || "", url: window.location.href }).catch(() => null);
      return;
    }
    navigator.clipboard.writeText(window.location.href);
    toast.success("تم نسخ رابط المعلم");
  }

  if (loading) {
    return (
      <main className={`min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center ${tajawal.className}`}>
        <Loader2 className="h-10 w-10 animate-spin text-[#C89B3C]" />
      </main>
    );
  }

  if (!place) {
    return (
      <main className={`min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center ${tajawal.className}`}>
        <div className="text-center">
          <p className="mb-4 text-white/60">المعلم غير موجود</p>
          <Link href="/landmarks" className="text-[#C89B3C] hover:underline">العودة للمعالم</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white ${tajawal.className}`} dir="rtl">
      <Toaster position="top-center" richColors />

      <section className="relative min-h-[55vh] overflow-hidden bg-[#111]">
        {mainMedia ? (
          isVideo(mainMedia) ? (
            <video src={`${mainMedia}#t=0.001`} className="absolute inset-0 h-full w-full object-cover opacity-70" autoPlay muted loop playsInline />
          ) : (
            <img src={mainMedia} alt={place.name} className="absolute inset-0 h-full w-full object-cover opacity-75" />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2B1F17] to-[#0f3027]">
            <ImageIcon className="h-20 w-20 text-[#C89B3C]/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-black/40" />

        <div className="relative z-10 container mx-auto px-4 py-8 min-h-[55vh] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Link href="/landmarks" className="rounded-full bg-black/40 border border-white/10 backdrop-blur p-3 hover:bg-black/60 transition">
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex gap-2">
              <button onClick={sharePlace} className="rounded-full bg-black/40 border border-white/10 backdrop-blur p-3 hover:bg-black/60 transition"><Share2 className="h-5 w-5" /></button>
              <button onClick={toggleFavorite} disabled={favLoading} className={`rounded-full border backdrop-blur p-3 transition ${isFavorite ? "bg-rose-500/80 border-rose-300" : "bg-black/40 border-white/10 hover:bg-black/60"}`}><Heart className={`h-5 w-5 ${isFavorite ? "fill-white" : ""}`} /></button>
            </div>
          </div>

          <div className="max-w-3xl pb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-black/45 border border-white/10 backdrop-blur px-4 py-2 text-sm font-bold">
              {typeIcon(place.type)}
              {typeLabel(place.type)}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">{place.name}</h1>
            {place.city && <p className="flex items-center gap-2 text-white/80"><MapPin className="h-5 w-5 text-[#C89B3C]" />{place.city}</p>}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 grid lg:grid-cols-[1.4fr_0.8fr] gap-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-4">نبذة عن المعلم</h2>
            <p className="leading-9 text-white/70 whitespace-pre-line">{place.description || "لا يوجد وصف متاح لهذا المعلم."}</p>
          </div>

          {media.length > 1 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-4">صور المعلم</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {media.map((url, index) => (
                  <button key={`${url}-${index}`} onClick={() => { setCurrentImageIndex(index); setIsImageModalOpen(true); }} className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
                    {isVideo(url) ? <video src={`${url}#t=0.001`} className="h-full w-full object-cover" muted /> : <img src={url} alt={`${place.name} ${index + 1}`} className="h-full w-full object-cover" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#151515] p-6 sticky top-6">
            <h3 className="font-bold text-xl mb-4">معلومات المعلم</h3>
            <div className="space-y-3 text-sm text-white/70">
              {place.city && <div className="flex items-center justify-between gap-4"><span>المدينة</span><span className="text-white font-semibold">{place.city}</span></div>}
              <div className="flex items-center justify-between gap-4"><span>التصنيف</span><span className="text-white font-semibold">{typeLabel(place.type)}</span></div>
              {place.owner_name && <div className="flex items-center justify-between gap-4"><span>المصدر</span><span className="text-white font-semibold">{place.owner_name}</span></div>}
            </div>
            <button onClick={openLocation} className="mt-6 w-full rounded-2xl bg-[#C89B3C] text-[#2B1F17] font-bold py-3 hover:bg-[#d5ac55] transition flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5" /> فتح الموقع على الخريطة
            </button>
          </div>
        </aside>
      </section>

      {isImageModalOpen && mainMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button onClick={() => setIsImageModalOpen(false)} className="absolute top-5 right-5 rounded-full bg-white/10 p-3"><X className="h-6 w-6" /></button>
          <button onClick={() => setCurrentImageIndex((currentImageIndex - 1 + media.length) % media.length)} className="absolute left-5 rounded-full bg-white/10 p-3"><ChevronLeft className="h-7 w-7" /></button>
          <button onClick={() => setCurrentImageIndex((currentImageIndex + 1) % media.length)} className="absolute right-20 rounded-full bg-white/10 p-3"><ChevronRight className="h-7 w-7" /></button>
          {isVideo(mainMedia) ? <video src={mainMedia} className="max-h-[88vh] max-w-[92vw]" controls autoPlay /> : <img src={mainMedia} alt={place.name} className="max-h-[88vh] max-w-[92vw] object-contain" />}
        </div>
      )}
    </main>
  );
}
