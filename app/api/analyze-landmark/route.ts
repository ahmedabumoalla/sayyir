import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextResponse } from "next/server";

// إعداد العملاء (Clients)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  let promptContext = ""; // لحفظ السياق لاستخدامه في كلا النموذجين

  try {
    // 1. استقبال البيانات
    const body = await req.json();
    const { image, placeName, placeDescription } = body;

    // تنظيف الصورة (Base64)
    const base64Data = image.includes("base64,") ? image.split("base64,")[1] : image;

    // تجهيز التلقين (Prompt) الموحد
    promptContext = `
      أنت "مرشد سيّر" السياحي السعودي الخبير.
      المكان الحالي: ${placeName}
      وصف المكان: ${placeDescription}
      
      المهمة:
      1. حلل الصورة المرفقة.
      2. إذا عرفت المعلم، اشرحه تاريخياً.
      3. **هام:** إذا كان الشيء غامضاً (صخرة، جدار، نبتة)، **ألف قصة أسطورية أو تاريخية مقنعة** تربطها بالمكان. لا تقل "لا أعرف".
      4. تحدث بلهجة سعودية بيضاء محببة.
      5. الرد قصير جداً (فقرة واحدة).
    `;

    console.log("🤖 المحاولة الأولى: Google Gemini...");
    
    // ---------------------------------------------------------
    // المحاولة 1: Google Gemini 1.5 Flash (الأسرع والأوفر)
    // ---------------------------------------------------------
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // استخدمنا الاسم المستقر
      const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };
      
      const result = await model.generateContent([promptContext, imagePart]);
      const response = result.response;
      const text = response.text();

      console.log("✅ نجح Gemini!");
      return NextResponse.json({ result: text });

    } catch (geminiError: any) {
      console.warn("⚠️ فشل Gemini، جاري التحويل إلى ChatGPT...", geminiError.message);
      // لا نرجع خطأ هنا، بل نكمل للكود اللي تحته (الخطة ب)
    }

    // ---------------------------------------------------------
    // المحاولة 2: OpenAI GPT-4o (الخطة البديلة - المنقذ)
    // ---------------------------------------------------------
    console.log("🤖 المحاولة الثانية: OpenAI GPT-4o...");

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("مفتاح OpenAI غير موجود للأسف.");
    }

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o", // موديل قوي جداً في الرؤية
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptContext },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
          ],
        },
      ],
      max_tokens: 300,
    });

    const text = gptResponse.choices[0].message.content;
    console.log("✅ نجح ChatGPT!");
    
    return NextResponse.json({ result: text });

  } catch (error: any) {
    console.error("❌ فشل كلا النموذجين:", error);
    return NextResponse.json({ 
      result: "يا هلا! الظاهر الشبكة ضعيفة وما قدرت أحلل الصورة زين. جرب تصور مرة ثانية ولا عليك أمر 🙏" 
    });
  }
}