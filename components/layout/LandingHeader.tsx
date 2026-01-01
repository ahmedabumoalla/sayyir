"use client";

import Image from "next/image";
import Link from "next/link";

export default function LandingHeader() {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2">
      <div
        className="
          flex items-center justify-between
          w-full max-w-[720px]
          h-12
          px-5
          rounded-full
          backdrop-blur-xl
          bg-white/15
          border border-white/20
          shadow-lg
        "
      >
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Sayyir AI"
          width={90}
          height={28}
          priority
        />

        {/* Actions */}
        <div className="flex items-center gap-4 text-sm font-medium text-white">
          <Link href="/login">
            <button className="opacity-90 hover:opacity-100 transition">
              تسجيل الدخول
            </button>
          </Link>

          <Link href="/register">
            <button className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition">
              إنشاء حساب
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
