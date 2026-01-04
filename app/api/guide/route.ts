import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// إعداد عميل Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

// إعداد عملاء الذكاء الاصطناعي
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(req: Request) {
  const { text, image } = await req.json();

  // 1. جلب البيانات الحقيقية (للتسويق)
  const { data: places } = await supabase
    .from('places')
    .select('name, type, description, city')
    .eq('is_active', true)
    .limit(10); 

  const { data: services } = await supabase
    .from('services')
    .select('title, service_type, price, description')
    .eq('status', 'approved')
    .limit(10);

  const platformData = `
    [قائمة المعالم السياحية المتاحة]:
    ${places?.map(p => `- ${p.name} (${p.type}) في ${p.city}: ${p.description}`).join('\n')}

    [قائمة الخدمات والتجارب المدفوعة]:
    ${services?.map(s => `- ${s.title} (نوع: ${s.service_type}, السعر: ${s.price} ريال): ${s.description}`).join('\n')}
  `;

  // 2. التعليمات (تم التعديل لمنع الرموز)
  const SYSTEM_INSTRUCTION = `
    أنت "مرشد سيّر"، خوي السائح في عسير وأفضل مرشد محلي.
    
    شخصيتك:
    - تتكلم بلهجة سعودية بيضاء محببة (استخدم: "يا هلا"، "أبشر"، "تضبطك"، "لا تفوتك").
    - لست روبوت، أنت مثل الصديق اللي ينصح خويه.
    - مرح وذكي.

    قواعدك الصارمة (Business Logic):
    1. هدفك الأول: اقتراح خطط تعتمد **حصراً** على البيانات المزودة في الأسفل.
    2. ممنوع تقترح أماكن غير موجودة في القائمة، ركز على اللي عندنا عشان المستخدم يحجز.
    3. حاول دائماً تذكر الأسعار وتقول له "تقدر تحجزها الحين من التطبيق".
    4. إذا طلب "جدول"، ادمج له معلم سياحي مع تجربة مدفوعة أو مطعم.
    
    🛑 قاعدة هامة جداً (التنسيق):
    5. ممنوع منعاً باتاً استخدام علامات النجمة (**) أو الرموز الغريبة لتنسيق النص. 
    - اكتب النص كرسالة دردشة طبيعية صافية (Plain Text) تماماً كما يكتب البشر في واتساب.
    - لا تستخدم قوائم نقطية معقدة، اجعل الكلام انسيابياً.

    البيانات المتاحة في التطبيق (استخدمها في ردك):
    ${platformData}
  `;

  // 3. التنفيذ (Gemini First -> OpenAI Backup)
  try {
    const model = geminiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let result;
    if (image) {
        const base64Data = image.split(',')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
        const userPrompt = text || "وش تشوف في الصورة؟ واقترح لي فعاليات قريبة من عندنا.";
        result = await model.generateContent([SYSTEM_INSTRUCTION + "\nسؤال المستخدم: " + userPrompt, imagePart]);
    } else {
        result = await model.generateContent(SYSTEM_INSTRUCTION + "\nسؤال المستخدم: " + text);
    }

    const response = await result.response;
    const answer = response.text();

    return NextResponse.json({ reply: answer });

  } catch (geminiError) {
    console.error("⚠️ Gemini Failed, Switching to OpenAI...", geminiError);

    try {
        const messages: any[] = [{ role: "system", content: SYSTEM_INSTRUCTION }];

        if (image) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: text || "حلل الصورة واقترح فعاليات." },
                    { type: "image_url", image_url: { url: image } }
                ],
            });
        } else {
            messages.push({ role: "user", content: text });
        }

        const completion = await openaiClient.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            max_tokens: 400,
        });

        return NextResponse.json({ reply: completion.choices[0].message.content });

    } catch (openaiError) {
        console.error("🔥 All AI Failed:", openaiError);
        return NextResponse.json(
            { reply: "يا ساتر! السيرفرات عليها ضغط، بس لا تشيل هم.. جرب بعد شوي وأبشر بالسعد! 😅" }, 
            { status: 500 }
        );
    }
  }
}