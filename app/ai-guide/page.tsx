"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { 
  ArrowRight, Send, Camera, Image as ImageIcon, X, Sparkles, 
  Loader2, User, Bot
} from "lucide-react";

const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "500", "700"] });

// أنواع الرسائل
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string; // في حال رفع المستخدم صورة
  timestamp: Date;
}

export default function AiGuidePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'أهلاً بك في "سيّر"! 🏔️\nأنا مرشدك الذكي الخبير في منطقة عسير.\n\nتقدر تسألني عن أي معلم، تطلب تخطيط رحلة، أو حتى ترسل لي صورة لأي مكان وسأخبرك بقصته وتاريخه! 📸✨',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // التمرير التلقائي لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // دالة تحويل الصورة لـ Base64
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // إرسال الرسالة (تم تفعيل الـ API الحقيقي هنا)
  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      timestamp: new Date()
    };

    // 1. إضافة رسالة المستخدم فوراً
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setLoading(true);

    try {
      // 2. الاتصال بالـ API الحقيقي (gemini)
      const response = await fetch('/api/guide', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage.content, image: userMessage.image }) 
      });

      if (!response.ok) throw new Error("فشل الاتصال");

      const data = await response.json();

      // 3. عرض رد الذكاء الاصطناعي
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply, // الرد القادم من Gemini
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error(error);
      // رسالة خطأ في الواجهة
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "عذراً، واجهت مشكلة في الاتصال. تأكد من الإنترنت وحاول مرة أخرى! 🔌",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className={`min-h-screen bg-[#0a0a0a] text-white flex flex-col ${tajawal.className}`}>
      
      {/* --- Header --- */}
      <header className="sticky top-0 z-10 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
            <ArrowRight size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="font-bold text-lg flex items-center gap-2">
              المرشد الذكي <Sparkles size={16} className="text-[#C89B3C]" />
            </h1>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              متصل الآن
            </span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#C89B3C] to-[#b38a35] flex items-center justify-center shadow-lg shadow-[#C89B3C]/20">
          <Bot size={24} className="text-[#2B1F17]" />
        </div>
      </header>

      {/* --- Chat Area --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
          >
            <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${msg.role === 'user' ? 'bg-white/10' : 'bg-[#C89B3C]/20'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-[#C89B3C]" />}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col gap-2 p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-[#C89B3C] text-[#2B1F17] rounded-tl-none' 
                  : 'bg-white/5 border border-white/10 rounded-tr-none'
              }`}>
                {/* Image if exists */}
                {msg.image && (
                  <div className="relative w-full aspect-square md:aspect-video rounded-xl overflow-hidden mb-2 border border-black/10">
                    <Image src={msg.image} alt="User upload" fill className="object-cover" />
                  </div>
                )}
                
                {/* Text */}
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {msg.content}
                </p>
                
                {/* Timestamp */}
                <span className={`text-[10px] self-end opacity-60 ${msg.role === 'user' ? 'text-[#2B1F17]' : 'text-white'}`}>
                  {msg.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="flex max-w-[80%] gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C89B3C]/20 flex-shrink-0 flex items-center justify-center mt-1">
                <Bot size={16} className="text-[#C89B3C]" />
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tr-none flex items-center gap-2">
                <span className="w-2 h-2 bg-[#C89B3C] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[#C89B3C] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-[#C89B3C] rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- Input Area --- */}
      <div className="p-4 bg-[#1a1a1a] border-t border-white/10 sticky bottom-0">
        
        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="mb-3 relative inline-block animate-in fade-in slide-in-from-bottom-2">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#C89B3C]/50 relative">
              <Image src={selectedImage} alt="Preview" fill className="object-cover" />
            </div>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition shadow-lg"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-[#C89B3C]/50 transition-colors">
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-white/50 hover:text-[#C89B3C] hover:bg-white/5 rounded-xl transition"
            title="إرفاق صورة"
          >
            <ImageIcon size={22} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleImageSelect}
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اسألني عن عسير أو ارفع صورة..."
            className="flex-1 bg-transparent border-none outline-none text-white p-3 min-h-[48px] max-h-[120px] resize-none custom-scrollbar"
            rows={1}
          />

          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || loading}
            className={`p-3 rounded-xl transition flex-shrink-0 ${
              (input.trim() || selectedImage) && !loading
                ? 'bg-[#C89B3C] text-[#2B1F17] hover:bg-[#b38a35] shadow-lg shadow-[#C89B3C]/20' 
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} className="rtl:-rotate-90" />}
          </button>
        </div>
        
        <p className="text-center text-[10px] text-white/30 mt-3">
          المرشد الذكي مدعوم بالذكاء الاصطناعي وقد يرتكب أخطاءً بسيطة. تأكد دائماً من المعلومات.
        </p>
      </div>

    </main>
  );
}