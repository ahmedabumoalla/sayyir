"use client";
import { useState } from "react";

export default function TestEmailPage() {
  const [status, setStatus] = useState("");

  const sendTest = async () => {
    setStatus("جاري الإرسال...");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // سنرسل إيميل تجريبي لنفسك (أدمن) للتأكد من أن السيرفر شغال
          type: "new_service_notification", 
          email: "ضع_ايميلك_هنا_للتجربة@gmail.com", // <--- غير هذا بإيميلك
          providerName: "Test Provider",
          serviceTitle: "Test Service",
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setStatus("✅ تم الإرسال بنجاح! تفقد بريدك.");
      } else {
        setStatus("❌ فشل: " + JSON.stringify(data));
      }
    } catch (e: any) {
      setStatus("🔥 خطأ في الشبكة: " + e.message);
    }
  };

  return (
    <div className="p-10 text-white bg-black h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">اختبار إرسال الإيميل</h1>
      <button onClick={sendTest} className="bg-blue-600 px-6 py-3 rounded-xl font-bold">
        إرسال إيميل تجريبي
      </button>
      <p className="mt-4 p-4 bg-gray-800 rounded text-yellow-400 font-mono" dir="ltr">{status}</p>
    </div>
  );
}