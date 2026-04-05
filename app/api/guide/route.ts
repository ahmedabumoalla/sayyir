import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

type GuideRequestBody = {
  text?: string;
  image?: string; // data URL base64
};

function buildSystemPrompt() {
  return `
أنت مساعد ذكي داخل منصة "سيّر" ومتخصص في السياحة والتراث والخدمات في منطقة عسير.
اكتب بالعربية الفصيحة السهلة.
كن عمليًا ومختصرًا وواضحًا.
إذا سأل المستخدم عن تخطيط رحلة، اقترح برنامجًا منظمًا.
إذا أرسل صورة، حللها بصريًا وقدّم وصفًا ذكيًا وتاريخيًا أو سياحيًا قدر الإمكان.
لا تذكر أنك تستخدم أكثر من نموذج.
لا تذكر تفاصيل تقنية أو APIs.
إذا تعذر فهم الصورة، قل ذلك بلطف واقترح على المستخدم إرسال صورة أوضح.
`.trim();
}

function extractBase64Parts(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

async function callOpenAI({
  text,
  image,
  timeoutMs = 9000,
}: {
  text: string;
  image?: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const input: any[] = [
      {
        role: "system",
        content: [{ type: "input_text", text: buildSystemPrompt() }],
      },
    ];

    const userContent: any[] = [];
    if (text?.trim()) {
      userContent.push({ type: "input_text", text });
    }

    if (image) {
      userContent.push({
        type: "input_image",
        image_url: image,
      });
    }

    input.push({
      role: "user",
      content: userContent.length ? userContent : [{ type: "input_text", text: "حلل هذه الصورة." }],
    });

    const response = await openai.responses.create(
      {
        model: OPENAI_MODEL,
        input,
      },
      {
        signal: controller.signal,
      }
    );

    const reply =
      response.output_text?.trim() ||
      "عذرًا، لم أتمكن من تجهيز الرد الآن.";

    return {
      provider: "openai",
      reply,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini({
  text,
  image,
  timeoutMs = 12000,
}: {
  text: string;
  image?: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const parts: any[] = [];

    parts.push({
      text: `${buildSystemPrompt()}\n\n${text?.trim() || "حلل هذه الصورة."}`,
    });

    if (image) {
      const parsed = extractBase64Parts(image);
      if (parsed) {
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
      }
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message || "Gemini request failed");
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || "")
        .join("")
        .trim() || "عذرًا، لم أتمكن من تجهيز الرد الآن.";

    return {
      provider: "gemini",
      reply,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GuideRequestBody;
    const text = body?.text?.trim() || "";
    const image = body?.image;

    if (!text && !image) {
      return NextResponse.json(
        { error: "النص أو الصورة مطلوبان." },
        { status: 400 }
      );
    }

    // الاستراتيجية:
    // 1) OpenAI أولاً
    // 2) إذا فشل أو تأخر -> Gemini
    try {
      const openaiResult = await callOpenAI({ text, image, timeoutMs: 9000 });
      return NextResponse.json({
        reply: openaiResult.reply,
        provider: openaiResult.provider,
      });
    } catch (openaiError) {
      console.error("OpenAI failed, falling back to Gemini:", openaiError);
    }

    const geminiResult = await callGemini({ text, image, timeoutMs: 12000 });

    return NextResponse.json({
      reply: geminiResult.reply,
      provider: geminiResult.provider,
    });
  } catch (error: any) {
    console.error("Guide route error:", error);
    return NextResponse.json(
      {
        error: "تعذر الاتصال بمزودي الذكاء الاصطناعي حاليًا.",
      },
      { status: 500 }
    );
  }
}