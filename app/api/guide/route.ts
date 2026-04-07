import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuideContext = "client" | "provider";

type GuideHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type GuideRequestBody = {
  text?: string;
  image?: string;
  context?: GuideContext;
  history?: GuideHistoryMessage[];
  pageContext?: {
    page?: string;
    suggestions?: string[];
  };
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeContext(value: unknown): GuideContext {
  return value === "provider" ? "provider" : "client";
}

function normalizeHistory(history: unknown): GuideHistoryMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      const role =
        item?.role === "assistant" || item?.role === "user"
          ? item.role
          : null;

      const content = normalizeText(item?.content);

      if (!role || !content) return null;

      return { role, content };
    })
    .filter(Boolean)
    .slice(-8) as GuideHistoryMessage[];
}

function normalizeSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 8);
}

function buildSystemPrompt(
  context: GuideContext,
  pageContext?: { page?: string; suggestions?: string[] }
) {
  const page = normalizeText(pageContext?.page);
  const suggestions = normalizeSuggestions(pageContext?.suggestions);

  const pageInfo = [
    page ? `- الصفحة الحالية: ${page}` : "",
    suggestions.length
      ? `- اقتراحات الواجهة الحالية: ${suggestions.join(" | ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const roleBlock =
    context === "provider"
      ? `
أنت داخل لوحة مزود الخدمة في منصة "سَيّر".
دورك هنا استشاري عملي لمزود الخدمة:
- تحسين وصف الخدمة والعنوان والسعر والعرض والقيمة المقترحة.
- اقتراح أفكار لرفع الحجوزات والتحويل والظهور داخل المنصة.
- كتابة ردود احترافية ورسائل وعروض مختصرة.
- إذا طلب المستخدم شيئًا متعلقًا بالمنصة، فأجب كخبير منتج يفهم تجربة مزود الخدمة.
`
      : `
أنت داخل واجهة العميل في منصة "سَيّر".
دورك هنا مرشد سياحي ومساعد قرار حقيقي:
- تساعد العميل على اكتشاف أماكن عسير وتجاربها وسكنها بشكل عملي.
- تبني خطط رحلات، تقارن الخيارات، وتشرح بأسلوب واضح ومفيد.
- إذا لم تكن معلومة معينة مؤكدة من بيانات المنصة، قل ذلك بوضوح ثم قدّم أفضل اقتراح عملي.
`;

  return `
أنت "مساعد سَيّر الذكي".
أنت مساعد احترافي ذكي لمنصة سياحية سعودية فاخرة متخصصة في منطقة عسير.

أولويتك الأساسية:
1) الفائدة الحقيقية للمستخدم.
2) الدقة والوضوح.
3) تعزيز قيمة منصة "سَيّر" بشكل طبيعي وغير مبتذل.
4) سرعة الرد وصياغة عربية ممتازة.

قواعد إلزامية:
- لا تتصرف كأداة تسويقية فقط.
- لا تكرر في كل رد أن "سَيّر هي الأفضل" إلا إذا كان ذكر المنصة مفيدًا فعلًا.
- ساعد أولًا، ثم وجّه داخل المنصة بذكاء عند الحاجة.
- لا تذكر أسماء الموديلات أو مزودي الذكاء الاصطناعي.
- لا تقل "لا أستطيع" مباشرة إلا إذا كان الأمر مستحيلًا، بل قدّم بديلًا عمليًا.
- إذا كان السؤال عن عسير، قدم معلومات مفيدة عن الأماكن والأجواء والأنشطة والطابع المحلي.
- إذا كان السؤال عامًا، أعطِ جوابًا مباشرًا ثم اقترح ما يمكن للمستخدم فعله داخل "سَيّر".
- إذا كانت هناك صورة، حللها بصريًا بشكل مفيد، واذكر ما يمكن استنتاجه فقط بدون هلوسة.
- لا تبالغ في الادعاءات ولا تخترع بيانات مباشرة عن التوفر أو الأسعار أو الحجوزات الحية ما لم تُذكر لك.
- أسلوبك عربي واضح، أنيق، دافئ، واحترافي.
- اجعل الرد غالبًا من فقرة إلى ثلاث فقرات، إلا إذا طلب المستخدم خطة أو مقارنة مفصلة.
- إذا طلب المستخدم خطة، رتّبها بوضوح.
- إذا طلب المستخدم مقارنة، أنشئ مقارنة مباشرة وسهلة.
- إذا سأل المستخدم عن رحلة أو برنامج، أعطه اقتراحًا أوليًا مباشرًا ثم اطلب ما يلزم لتحسينه.
- إن أمكن، اختم بخطوة عملية واحدة مفيدة داخل المنصة.

${roleBlock}

معلومات سياقية من الواجهة:
${pageInfo || "- لا توجد معلومات واجهة إضافية."}
`.trim();
}

function cleanModelReply(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function scoreReply(text: string) {
  const normalized = cleanModelReply(text);

  if (!normalized) return -1;

  let score = 0;

  if (normalized.length >= 80) score += 2;
  if (normalized.length >= 180) score += 2;
  if (
    normalized.includes("عسير") ||
    normalized.includes("أبها") ||
    normalized.includes("رجال ألمع") ||
    normalized.includes("السودة")
  ) {
    score += 1;
  }
  if (normalized.includes("سَيّر")) score += 1;
  if (
    normalized.includes("•") ||
    normalized.includes("- ") ||
    normalized.includes("1)") ||
    normalized.includes("1-")
  ) {
    score += 1;
  }

  return score;
}

function chooseBestReply(openAiReply?: string, geminiReply?: string) {
  const openaiClean = cleanModelReply(openAiReply);
  const geminiClean = cleanModelReply(geminiReply);

  if (openaiClean && geminiClean) {
    return scoreReply(openaiClean) >= scoreReply(geminiClean)
      ? { reply: openaiClean, provider: "openai+gemini" }
      : { reply: geminiClean, provider: "gemini+openai" };
  }

  if (openaiClean) {
    return { reply: openaiClean, provider: "openai" };
  }

  if (geminiClean) {
    return { reply: geminiClean, provider: "gemini" };
  }

  return { reply: "", provider: "none" };
}

function buildOpenAIMessages(params: {
  systemPrompt: string;
  userText: string;
  image?: string;
  history: GuideHistoryMessage[];
}) {
  const historyMessages = params.history.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text:
        params.userText ||
        "أعطني مساعدة ذكية ومفيدة داخل منصة سَيّر بما يناسب المستخدم.",
    },
  ];

  if (params.image) {
    userContent.push({
      type: "image_url",
      image_url: { url: params.image },
    });
  }

  return [
    { role: "system" as const, content: params.systemPrompt },
    ...historyMessages,
    {
      role: "user" as const,
      content: userContent,
    },
  ];
}

function buildGeminiParts(params: {
  systemPrompt: string;
  userText: string;
  image?: string;
  history: GuideHistoryMessage[];
}) {
  const historyText = params.history.length
    ? params.history
        .map(
          (message, index) =>
            `${index + 1}. [${message.role === "user" ? "المستخدم" : "المساعد"}] ${message.content}`
        )
        .join("\n")
    : "لا يوجد سجل سابق.";

  const textPart = `
${params.systemPrompt}

سجل المحادثة الأخير:
${historyText}

رسالة المستخدم الحالية:
${params.userText || "أعطني مساعدة ذكية داخل منصة سَيّر."}

تعليمات إضافية:
- أجب بجواب نهائي فقط.
- لا تشرح طريقة التفكير.
- لا تذكر أنك نموذج أو مزود خارجي.
`.trim();

  const parts: any[] = [{ text: textPart }];

  if (params.image) {
    const match = params.image.match(/^data:(.+?);base64,(.+)$/);
    if (match?.[1] && match?.[2]) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }

  return parts;
}

function extractGeminiText(data: any): string {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
      : [];

    const text = parts
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();

    if (text) return text;
  }

  return "";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isOpenAIQuotaError(error: any): boolean {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  const type = String(error?.type || "");

  return (
    code === "insufficient_quota" ||
    type === "insufficient_quota" ||
    message.includes("insufficient_quota") ||
    message.includes("You exceeded your current quota") ||
    message.includes("429")
  );
}

async function callOpenAI(params: {
  userText: string;
  image?: string;
  context: GuideContext;
  history: GuideHistoryMessage[];
  pageContext?: { page?: string; suggestions?: string[] };
}) {
  if (!openai) throw new Error("OPENAI key missing");

  const systemPrompt = buildSystemPrompt(params.context, params.pageContext);

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.55,
    max_tokens: 900,
    messages: buildOpenAIMessages({
      systemPrompt,
      userText: params.userText,
      image: params.image,
      history: params.history,
    }) as any,
  });

  return cleanModelReply(response.choices?.[0]?.message?.content || "");
}

async function callGemini(params: {
  userText: string;
  image?: string;
  context: GuideContext;
  history: GuideHistoryMessage[];
  pageContext?: { page?: string; suggestions?: string[] };
}) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI key missing");

  const systemPrompt = buildSystemPrompt(params.context, params.pageContext);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: buildGeminiParts({
              systemPrompt,
              userText: params.userText,
              image: params.image,
              history: params.history,
            }),
          },
        ],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 900,
        },
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini API Error");
  }

  return cleanModelReply(extractGeminiText(data));
}

function buildFallbackReply(context: GuideContext, userText: string) {
  const cleanUserText = normalizeText(userText);

  if (context === "provider") {
    return `
حصل خلل مؤقت في محرك الذكاء الآن، لكن ما زلت أقدر أساعدك داخل لوحة مزود الخدمة.

أرسل لي اسم خدمتك أو وصفها الحالي، وسأعيد صياغته لك فورًا بشكل أقوى وأكثر جاذبية داخل سَيّر.
`.trim();
  }

  if (cleanUserText.includes("رحلة") || cleanUserText.includes("برنامج")) {
    return `
حصل خلل مؤقت في محرك الذكاء الآن.

أرسل لي من جديد:
- عدد الأيام
- نوع الرحلة: طبيعة أو تراث أو مزيج
- عدد الأشخاص

وسأرتب لك اقتراحًا أوليًا مناسبًا داخل عسير.
`.trim();
  }

  return `
حصل خلل مؤقت في محرك الذكاء الآن.

أرسل طلبك مرة أخرى بشكل مختصر مثل:
- خطط لي رحلة يومين في أبها والسودة
- رشح لي أماكن تراثية في عسير
- أبغى سكن هادئ في أبها

وسأكمل معك مباشرة.
`.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GuideRequestBody;

    const text = normalizeText(body?.text);
    const image = normalizeText(body?.image);
    const context = normalizeContext(body?.context);
    const history = normalizeHistory(body?.history);
    const pageContext = {
      page: normalizeText(body?.pageContext?.page),
      suggestions: normalizeSuggestions(body?.pageContext?.suggestions),
    };

    if (!text && !image) {
      return NextResponse.json(
        {
          reply: "أرسل سؤالك أو صورة حتى أقدر أساعدك.",
          provider: "none",
        },
        { status: 400 }
      );
    }

    const sharedParams = {
      userText: text,
      image: image || undefined,
      context,
      history,
      pageContext,
    };

    let openaiReply = "";
    let geminiReply = "";
    let openaiError: string | null = null;
    let geminiError: string | null = null;

    if (OPENAI_API_KEY) {
      try {
        openaiReply = await withTimeout(
          callOpenAI(sharedParams),
          15000,
          "OpenAI"
        );
      } catch (error: any) {
        openaiError = error?.message || String(error);
        console.error("OpenAI failed:", openaiError);
      }
    } else {
      openaiError = "OPENAI key missing";
    }

    if (!openaiReply && GEMINI_API_KEY) {
      try {
        geminiReply = await withTimeout(
          callGemini(sharedParams),
          15000,
          "Gemini"
        );
      } catch (error: any) {
        geminiError = error?.message || String(error);
        console.error("Gemini failed:", geminiError);
      }
    } else if (!GEMINI_API_KEY) {
      geminiError = "GEMINI key missing";
    }

    const selected = chooseBestReply(openaiReply, geminiReply);

    if (selected.reply) {
      return NextResponse.json(selected);
    }

    console.error("Guide route failed:", {
      openaiError,
      geminiError,
      openaiModel: OPENAI_MODEL,
      geminiModel: GEMINI_MODEL,
      context,
      text,
      hasImage: Boolean(image),
      openaiQuotaIssue: isOpenAIQuotaError({ message: openaiError }),
    });

    return NextResponse.json({
      reply: buildFallbackReply(context, text),
      provider: "fallback",
      debug:
        process.env.NODE_ENV !== "production"
          ? {
              openaiError,
              geminiError,
              openaiModel: OPENAI_MODEL,
              geminiModel: GEMINI_MODEL,
            }
          : undefined,
    });
  } catch (error: any) {
    console.error("Guide POST fatal error:", error?.message || error);

    return NextResponse.json(
      {
        reply:
          "حصل خلل مؤقت في المساعد. أرسل سؤالك مرة أخرى وسأكمل معك مباشرة.",
        provider: "error",
        debug:
          process.env.NODE_ENV !== "production"
            ? { fatal: error?.message || String(error) }
            : undefined,
      },
      { status: 500 }
    );
  }
}