"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import {
  ArrowRight,
  Send,
  Image as ImageIcon,
  X,
  Sparkles,
  Loader2,
  User,
  Bot,
  Compass,
  Map as MapIcon,
  Tent,
} from "lucide-react";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: Date;
}

export default function ClientAiGuidePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "أهلاً بك في سَيّر 👋\nأنا مساعدك السياحي الذكي.\n\nأقدر أساعدك في اكتشاف أماكن عسير، تخطيط رحلة مناسبة، اقتراح سكن وتجارب، أو تحليل صورة لمكان وإعطائك فكرة مفيدة عنه.",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickSuggestions = [
    { label: "خطط لي رحلة ليوم واحد", icon: Compass },
    { label: "أفضل أماكن السكن في أبها", icon: Tent },
    { label: "أماكن تراثية تستحق الزيارة", icon: MapIcon },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const buildHistoryPayload = () => {
    return messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride ?? input;

    if ((!messageText.trim() && !selectedImage) || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      image: selectedImage || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: userMessage.content,
          image: userMessage.image,
          context: "client",
          history: buildHistoryPayload(),
          pageContext: {
            page: "client_ai_guide",
            suggestions: quickSuggestions.map((item) => item.label),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("فشل الاتصال");
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.reply || "حصل خلل مؤقت، جرّب مرة أخرى.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "عذرًا، حصلت مشكلة مؤقتة في الاتصال بالمساعد. أعد المحاولة الآن أو أرسل سؤالك بصياغة أقصر.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto ${tajawal.className}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-[#C89B3C] to-[#E2B354] flex items-center justify-center shadow-lg shadow-[#C89B3C]/20">
            <Bot size={28} className="text-[#2B1F17]" />
          </div>

          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              مرشد سَيّر الذكي
              <Sparkles size={18} className="text-[#C89B3C] animate-pulse" />
            </h1>
            <p className="text-xs text-white/50">خبيرك المحلي في منطقة عسير</p>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
            Status
          </span>
          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            متصل وبانتظارك
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6 custom-scrollbar pb-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } animate-in fade-in slide-in-from-bottom-3 duration-500`}
          >
            <div
              className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border shadow-sm ${
                  msg.role === "user"
                    ? "bg-white/10 border-white/10"
                    : "bg-[#C89B3C]/10 border-[#C89B3C]/20"
                }`}
              >
                {msg.role === "user" ? (
                  <User size={20} className="text-white/70" />
                ) : (
                  <Bot size={20} className="text-[#C89B3C]" />
                )}
              </div>

              <div
                className={`flex flex-col gap-2 p-5 rounded-[1.5rem] shadow-xl ${
                  msg.role === "user"
                    ? "bg-[#C89B3C] text-[#2B1F17] rounded-tr-none font-bold"
                    : "bg-[#1A1A1A] border border-white/10 rounded-tl-none text-white/90"
                }`}
              >
                {msg.image && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3 border border-black/20">
                    <Image
                      src={msg.image}
                      alt="User upload"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <p className="text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {msg.content}
                </p>

                <span
                  className={`text-[10px] self-end mt-2 opacity-40 ${
                    msg.role === "user" ? "text-black" : "text-white"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString("ar-SA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-3 justify-center pt-4 animate-in fade-in zoom-in duration-700">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSend(suggestion.label)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white/70 hover:bg-[#C89B3C] hover:text-black hover:border-[#C89B3C] transition-all duration-300"
              >
                <suggestion.icon size={14} />
                {suggestion.label}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="flex max-w-[80%] gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#C89B3C]/10 flex items-center justify-center border border-[#C89B3C]/20">
                <Bot size={20} className="text-[#C89B3C]" />
              </div>
              <div className="bg-[#1A1A1A] border border-white/10 p-5 rounded-[1.5rem] rounded-tl-none flex items-center gap-2">
                <span className="w-2 h-2 bg-[#C89B3C] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[#C89B3C] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-[#C89B3C] rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-3 shadow-2xl relative z-30">
        {selectedImage && (
          <div className="mb-3 absolute -top-24 right-4 animate-in slide-in-from-bottom-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#C89B3C] shadow-2xl relative group">
              <Image
                src={selectedImage}
                alt="Preview"
                fill
                className="object-cover"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-[#C89B3C] hover:bg-white/5 rounded-2xl transition-all"
            title="إرفاق صورة للمكان"
          >
            <ImageIcon size={24} />
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
            placeholder="اسألني عن أي مكان في عسير أو اطلب خطة لرحلتك..."
            className="flex-1 bg-transparent border-none outline-none text-white py-3 min-h-[50px] max-h-[150px] resize-none text-sm md:text-base placeholder-white/20"
            rows={1}
          />

          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !selectedImage) || loading}
            className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center shrink-0 ${
              (input.trim() || selectedImage) && !loading
                ? "bg-[#C89B3C] text-[#2B1F17] shadow-lg shadow-[#C89B3C]/20 hover:scale-105 active:scale-95"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Send size={24} className="rtl:-rotate-90 ml-1" />
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-white/20 mt-4 font-medium tracking-tight">
        تم تطوير هذا المساعد الذكي خصيصاً لمنصة سَيّر لدعم السياحة في منطقة عسير.
      </p>
    </div>
  );
}