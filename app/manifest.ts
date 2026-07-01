import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "سير | Sayyir",
    short_name: "سير",
    description: "منصة سير لاكتشاف وحجز التجارب والمرافق السياحية في عسير",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8C3F1F",
    orientation: "any",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any maskable" as "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "الرئيسية",
        short_name: "الرئيسية",
        url: "/",
      },
      {
        name: "التجارب",
        short_name: "التجارب",
        url: "/experiences",
      },
      {
        name: "المرافق",
        short_name: "المرافق",
        url: "/facilities",
      },
      {
        name: "الخريطة",
        short_name: "الخريطة",
        url: "/map",
      },
      {
        name: "حجوزاتي",
        short_name: "حجوزاتي",
        url: "/my-bookings",
      },
    ],
  };
}
