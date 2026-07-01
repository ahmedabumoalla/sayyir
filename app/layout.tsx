import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import { GoogleAnalytics } from '@next/third-parties/google'; // 👈 1. تم الاستيراد
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "سير",
    statusBarStyle: "default",
  },
  title: {
    template: '%s | سير - استكشف تراث عسير',
    default: 'سير - استكشف تراث عسير',
  },
  description: "منصة سير تربطك بأفضل مزودي الخدمات في السعودية. حجز سهل، دفع آمن، وخدمة موثوقة.",
  keywords: ["سياحة", "حجوزات", "مرشد سياحي", "تراث", "السعودية", "سير", "Sayyir"],
  authors: [{ name: "Sayyir Team" }],
  
  openGraph: {
    title: "سير - استكشف تراث عسير",
    description: "اكتشف واحجز أفضل الخدمات السياحية والتراثية في عسير بكل سهولة.",
    url: "https://sayyir.sa",
    siteName: "Sayyir",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sayyir Platform Preview",
      },
    ],
    locale: "ar_SA",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#8C3F1F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 👇 2. تم تغيير اللغة للعربية والاتجاه لليمين
    <html lang="ar" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        
        
<GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""} />
        <PWARegister />
        
      </body>
    </html>
  );
}
