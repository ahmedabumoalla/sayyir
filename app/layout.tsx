import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    template: '%s | منصة سَيّر',
    default: 'منصة سَيّر - خيارك الأول للخدمات التراثية والسياحية في عسير',
  },
  description: "منصة سَيّر تربطك بأفضل مزودي الخدمات في السعودية. حجز سهل، دفع آمن، وخدمة موثوقة.",
  keywords: ["سياحة", "حجوزات", "مرشد سياحي", "تراث", "السعودية", "سير", "Sayyir"],
  authors: [{ name: "Sayyir Team" }],
  icons: {
   
  },
  openGraph: {
    title: "منصة سَيّر - رحلتك تبدأ هنا",
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
        
      </body>
    </html>
  );
}