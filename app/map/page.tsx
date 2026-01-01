"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker } from "react-map-gl/mapbox";
import { Tajawal } from "next/font/google";
import LandingHeader from "@/components/layout/LandingHeader";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

const landmarks = [
  {
    id: 1,
    name: "قرية تراثية",
    type: "معلم تراثي",
    lat: 18.216,
    lng: 42.505,
  },
  {
    id: 2,
    name: "نُزل جبلي",
    type: "سكن",
    lat: 18.22,
    lng: 42.51,
  },
];

export default function MapPage() {
  return (
    <main className={`relative min-h-screen ${tajawal.className}`}>
      {/* VIDEO BACKGROUND */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        src="/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* OVERLAY (أخف) */}
      <div className="fixed inset-0 bg-black/40 z-0 pointer-events-none" />

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <LandingHeader />

        {/* TITLE */}
        <div className="text-center text-white mt-24 mb-6 px-6">
          <h1 className="text-3xl md:text-4xl font-bold">
            الخريطة التفاعلية
          </h1>
          <p className="mt-3 text-white/90">
            استكشف المعالم التراثية والمرافق السكنية حولك
          </p>
        </div>

        {/* MAP CONTAINER */}
        <div className="flex-1 px-6 pb-10">
          <div className="relative h-[70vh] w-full rounded-3xl overflow-hidden border border-white/20 backdrop-blur-xl bg-white/10 shadow-2xl">

            <Map
              mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              initialViewState={{
                latitude: 18.218,
                longitude: 42.507,
                zoom: 12,
              }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              style={{ width: "100%", height: "100%" }}
            >
              {landmarks.map((item) => (
                <Marker
                  key={item.id}
                  latitude={item.lat}
                  longitude={item.lng}
                >
                  <div className="group relative cursor-pointer">
                    <div className="w-4 h-4 rounded-full bg-white shadow-lg ring-4 ring-white/40" />
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition">
                      <div className="px-4 py-2 rounded-xl backdrop-blur-md bg-black/70 text-white text-xs whitespace-nowrap border border-white/20">
                        <strong className="block text-center">
                          {item.name}
                        </strong>
                        <div className="text-white/70 text-center">
                          {item.type}
                        </div>
                      </div>
                    </div>
                  </div>
                </Marker>
              ))}
            </Map>

            {/* GRADIENT OVERLAY لدمج الخريطة مع الهوية */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

          </div>
        </div>
      </div>
    </main>
  );
}
