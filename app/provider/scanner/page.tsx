"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  QrCode, Camera, Keyboard, CheckCircle2, XCircle, 
  Loader2, ArrowRight, RefreshCcw 
} from "lucide-react";
import { Scanner } from '@yudiel/react-qr-scanner';
import Link from "next/link";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

export default function TicketScannerPage() {
  const [providerId, setProviderId] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState("");
  
  // حالات الفحص
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [serviceTitle, setServiceTitle] = useState("");

  useEffect(() => {
    const getProvider = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setProviderId(session.user.id);
    };
    getProvider();
  }, []);

  const processTicket = async (code: string) => {
    if (!code || !providerId) return;
    
    setStatus('loading');
    setMessage("");
    setServiceTitle("");

    try {
      const response = await fetch('/api/provider/scan-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: code, providerId })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setServiceTitle(data.service);
        // تشغيل صوت نجاح
        new Audio('/success-beep.mp3').play().catch(() => {}); 
      } else {
        setStatus('error');
        setMessage(data.message || data.error);
        // تشغيل صوت خطأ
        new Audio('/error-beep.mp3').play().catch(() => {});
      }
    } catch (err: any) {
      setStatus('error');
      setMessage("حدث خطأ في الاتصال بالخادم. حاول مرة أخرى.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processTicket(manualCode);
  };

  const resetScanner = () => {
    setStatus('idle');
    setManualCode("");
  };

  if (!providerId) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-[#C89B3C]" size={40} /></div>;
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 ${tajawal.className}`} dir="rtl">
      
      {/* الترويسة */}
      <div className="max-w-md mx-auto mb-8 flex items-center justify-between">
         <div>
             <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                 <QrCode className="text-[#C89B3C]" /> ماسح التذاكر
             </h1>
             <p className="text-white/50 text-sm">امسح باركود العميل لتأكيد حضوره.</p>
         </div>
         <Link href="/provider/bookings" className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition">
             <ArrowRight size={20} />
         </Link>
      </div>

      <div className="max-w-md mx-auto bg-[#1a1a1a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        
        {/* أزرار التبديل */}
        <div className="flex border-b border-white/10">
            <button 
                onClick={() => { setMode('camera'); resetScanner(); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition ${mode === 'camera' ? 'bg-[#C89B3C]/10 text-[#C89B3C] border-b-2 border-[#C89B3C]' : 'text-white/50 hover:bg-white/5'}`}
            >
                <Camera size={18} /> استخدام الكاميرا
            </button>
            <button 
                onClick={() => { setMode('manual'); resetScanner(); }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition ${mode === 'manual' ? 'bg-[#C89B3C]/10 text-[#C89B3C] border-b-2 border-[#C89B3C]' : 'text-white/50 hover:bg-white/5'}`}
            >
                <Keyboard size={18} /> إدخال يدوي
            </button>
        </div>

        <div className="p-6">
            
            {status === 'idle' && (
                <div className="animate-in fade-in duration-500">
                    {mode === 'camera' ? (
                        <div className="rounded-2xl overflow-hidden border-2 border-dashed border-[#C89B3C]/50 relative bg-black aspect-square flex items-center justify-center">
                            
                            {/* ✅ تم حل المشكلة هنا باستخدام التحديث الجديد للمكتبة */}
                            <Scanner 
                                onScan={(result) => {
                                    if (result && result.length > 0) {
                                        processTicket(result[0].rawValue);
                                    }
                                }}
                                onError={(error: any) => console.log(error?.message || error)}
                            />

                            <div className="absolute inset-0 border-[4px] border-[#C89B3C] rounded-2xl opacity-50 m-4 pointer-events-none"></div>
                            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_10px_red] animate-pulse pointer-events-none"></div>
                        </div>
                    ) : (
                        <form onSubmit={handleManualSubmit} className="space-y-4 pt-4">
                            <label className="block text-sm text-white/70">أدخل رمز التذكرة المرجعي:</label>
                            <input 
                                type="text" 
                                value={manualCode}
                                onChange={e => setManualCode(e.target.value)}
                                placeholder="مثال: a1b2c3d4..."
                                className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-center text-lg font-mono text-white outline-none focus:border-[#C89B3C] transition"
                                autoFocus
                            />
                            <button 
                                type="submit"
                                disabled={!manualCode}
                                className="w-full py-4 bg-[#C89B3C] hover:bg-[#b38a35] text-black font-bold rounded-xl transition disabled:opacity-50"
                            >
                                تحقق من التذكرة
                            </button>
                        </form>
                    )}
                    <p className="text-center text-xs text-white/40 mt-6">
                        {mode === 'camera' ? 'وجه الكاميرا نحو الباركود في جوال العميل ليتم مسحه تلقائياً.' : 'موجود أسفل الباركود في فاتورة العميل.'}
                    </p>
                </div>
            )}

            {status === 'loading' && (
                <div className="py-20 flex flex-col items-center justify-center text-[#C89B3C] space-y-4">
                    <Loader2 className="animate-spin" size={48} />
                    <p className="font-bold animate-pulse">جاري التحقق من التذكرة...</p>
                </div>
            )}

            {status === 'success' && (
                <div className="py-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 ring-4 ring-emerald-500/30">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-400 mb-2">تذكرة صالحة!</h2>
                    <p className="text-white/80 mb-6 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                        الخدمة: <strong className="text-white">{serviceTitle}</strong>
                    </p>
                    <p className="text-sm text-white/50 mb-8">{message}</p>
                    
                    <button onClick={resetScanner} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition flex justify-center items-center gap-2">
                        <RefreshCcw size={18} /> مسح تذكرة أخرى
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div className="py-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/30">
                        <XCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-red-400 mb-2">عملية مرفوضة</h2>
                    <p className="text-white/80 mb-8 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20 leading-relaxed">
                        {message}
                    </p>
                    
                    <button onClick={resetScanner} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition flex justify-center items-center gap-2">
                        <RefreshCcw size={18} /> حاول مرة أخرى
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}