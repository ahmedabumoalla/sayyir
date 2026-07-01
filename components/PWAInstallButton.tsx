"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosDevice() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;

  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (platform === "macintel" && maxTouchPoints > 1)
  );
}

type PWAInstallButtonProps = {
  variant?: "floating" | "header";
};

export default function PWAInstallButton({
  variant = "floating",
}: PWAInstallButtonProps) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState(false);

  useEffect(() => {
    const standalone = isStandaloneMode();
    setIsStandalone(standalone);

    if (standalone) {
      return;
    }

    setIsIos(isIosDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setFallbackMessage(false);
      setShowIosHint(false);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowIosHint(false);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      if (isIos) {
        setFallbackMessage(false);
        setShowIosHint(true);
      } else {
        setFallbackMessage(true);
        window.setTimeout(() => setFallbackMessage(false), 3500);
      }

      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      console.warn("PWA install prompt failed:", error);
    } finally {
      setInstallPrompt(null);
    }
  };

  const iosInstallHint = (
    <div
      className="w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-[#C9A063]/50 bg-white px-4 py-3 text-right text-xs font-medium leading-6 text-[#5B2A14] shadow-lg shadow-black/10"
      dir="rtl"
      role="dialog"
      aria-modal="false"
      aria-label="طريقة تثبيت سير على الآيفون"
    >
      <p className="mb-2 font-bold">لتثبيت سير على الآيفون:</p>
      <ol className="list-decimal space-y-1 pr-4">
        <li>افتح الموقع من Safari</li>
        <li>اضغط زر المشاركة</li>
        <li>اختر إضافة إلى الشاشة الرئيسية</li>
        <li>اضغط إضافة</li>
      </ol>
      <p className="mt-2 text-[11px] leading-5 text-[#7A5A2A]">
        إذا كنت داخل واتساب أو إنستغرام، افتح الرابط في Safari أولًا
      </p>
      <button
        type="button"
        onClick={() => setShowIosHint(false)}
        className="mt-2 text-[11px] font-bold text-[#8C3F1F] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
      >
        إغلاق
      </button>
    </div>
  );

  if (isStandalone) {
    return null;
  }

  if (variant === "header") {
    return (
      <div className="relative shrink-0" dir="rtl">
        <button
          type="button"
          onClick={installApp}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-[#C89B3C]/40 bg-[#8C3F1F]/90 px-2.5 text-[11px] font-bold text-white shadow-lg shadow-black/15 transition hover:bg-[#5B2A14] focus:outline-none focus:ring-2 focus:ring-[#C9A063] focus:ring-offset-2 focus:ring-offset-black/40 sm:h-10 sm:gap-1.5 sm:px-4 sm:text-sm"
          aria-label="تحميل تطبيق سير"
        >
          <Download size={15} aria-hidden="true" />
          <span className="whitespace-nowrap">تحميل التطبيق</span>
        </button>

        {fallbackMessage && (
          <div
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-[#C9A063]/50 bg-white px-3 py-2 text-xs font-medium leading-5 text-[#5B2A14] shadow-lg shadow-black/10"
            role="status"
          >
            يمكنك تثبيت سير من قائمة المتصفح
          </div>
        )}

        {showIosHint && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50">
            {iosInstallHint}
          </div>
        )}
      </div>
    );
  }

  if (installPrompt || isIos) {
    return (
      <>
        <button
          type="button"
          onClick={installApp}
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 rounded-full bg-[#8C3F1F] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:bg-[#5B2A14] focus:outline-none focus:ring-2 focus:ring-[#C9A063] focus:ring-offset-2"
          dir="rtl"
          aria-label="تثبيت تطبيق سير"
        >
          تثبيت سير
        </button>

        {showIosHint && (
          <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 z-50">
            {iosInstallHint}
          </div>
        )}
      </>
    );
  }

  return null;
}
