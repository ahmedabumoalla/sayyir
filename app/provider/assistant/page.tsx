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
} from "lucide-react";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: Date;
}

export default function AiGuidePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "أهلاً بك 👋\nأنا مساعدك الذكي داخل لوحة مزود الخدمة.\n\nأقدر أساعدك في تحسين وصف الخدمات، كتابة أفكار للعروض، صياغة ردود احترافية، وتطوير ظهورك داخل المنصة بشكل عملي ومباشر.",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userMessage.content,
          image: userMessage.image,
          context: "provider",
          history: buildHistoryPayload(),
          pageContext: {
            page: "provider_ai_guide",
            suggestions: [
              "حسن وصف خدمتي",
              "اكتب لي عرضًا تسويقيًا",
              "اقترح عنوانًا أقوى للخدمة",
              "كيف أرفع التحويل والحجوزات",
            ],
          },
        }),
      });

      if (!response.ok) throw new Error("فشل الاتصال");

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.reply || "حصل خلل مؤقت، حاول مرة أخرى.",
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
            "عذرًا، واجهت مشكلة مؤقتة في الاتصال. أعد المحاولة الآن أو أرسل طلبك بصياغة مختصرة.",
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
    <main
      className={`min-h-screen bg-[#0a0a0a] text-white flex flex-col ${tajawal.className}`}
      dir="rtl"
    >
      <header className="sticky top-0 z-10 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"
          >
            <ArrowRight size={20} />
          </button>

          <div className="flex flex-col">
            <h1 className="font-bold text-lg flex items-center gap-2">
              المساعد الذكي
              <Sparkles size={16} className="text-[#C89B3C]" />
            </h1>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              متصل الآن
            </span>
          </div>
        </div>

        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-[#C89B3C] to-[#b38a35] flex items-center justify-center shadow-lg shadow-[#C89B3C]/20">
          <Bot size={24} className="text-[#2B1F17]" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } animate-in fade-in slide-in-from-bottom-2`}
          >
            <div
              className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-1 ${
                  msg.role === "user" ? "bg-white/10" : "bg-[#C89B3C]/20"
                }`}
              >
                {msg.role === "user" ? (
                  <User size={16} />
                ) : (
                  <Bot size={16} className="text-[#C89B3C]" />
                )}
              </div>

              <div
                className={`flex flex-col gap-2 p-4 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-[#C89B3C] text-[#2B1F17] rounded-tl-none"
                    : "bg-white/5 border border-white/10 rounded-tr-none"
                }`}
              >
                {msg.image && (
                  <div className="relative w-full aspect-square md:aspect-video rounded-xl overflow-hidden mb-2 border border-black/10">
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
                  className={`text-[10px] self-end opacity-60 ${
                    msg.role === "user" ? "text-[#2B1F17]" : "text-white"
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

        {loading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="flex max-w-[80%] gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C89B3C]/20 shrink-0 flex items-center justify-center mt-1">
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

      <div className="p-4 bg-[#1a1a1a] border-t border-white/10 sticky bottom-0">
        {selectedImage && (
          <div className="mb-3 relative inline-block animate-in fade-in slide-in-from-bottom-2">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#C89B3C]/50 relative">
              <Image
                src={selectedImage}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition shadow-lg"
            >
              <X size={12} />
            </button>
          </div>
        )}

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
            placeholder="اكتب سؤالك أو اطلب تحسين خدمة أو عرض..."
            className="flex-1 bg-transparent border-none outline-none text-white p-3 min-h-[48px] max-h-[120px] resize-none custom-scrollbar"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || loading}
            className={`p-3 rounded-xl transition shrink-0 ${
              (input.trim() || selectedImage) && !loading
                ? "bg-[#C89B3C] text-[#2B1F17] hover:bg-[#b38a35] shadow-lg shadow-[#C89B3C]/20"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <Send size={22} className="rtl:-rotate-90" />
            )}
          </button>
        </div>

        <p className="text-center text-[10px] text-white/30 mt-3">
          المساعد الذكي يساعدك في تحسين المحتوى والظهور داخل المنصة، مع بقاء قرارك النهائي عليك.
        </p>
      </div>
    </main>
  );
}