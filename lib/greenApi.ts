import QRCode from "qrcode";
import { normalizePhoneDigits } from "@/lib/phone";
import { recordWhatsAppAudit } from "@/lib/whatsappAudit";

export type GreenApiResult = {
  ok: boolean;
  skipped?: boolean;
  idMessage?: string;
  urlFile?: string;
  error?: string;
};

export type GreenApiRecipientCheck = {
  ok: boolean;
  existsWhatsApp?: boolean;
  chatId?: string;
  fromCache?: boolean;
  error?: string;
};

const DEFAULT_API_URL = "https://api.green-api.com";
const DEFAULT_MEDIA_URL = "https://media.green-api.com";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getConfig() {
  return {
    idInstance: String(process.env.GREEN_API_ID_INSTANCE || "").trim(),
    apiTokenInstance: String(process.env.GREEN_API_TOKEN_INSTANCE || "").trim(),
    apiUrl: trimTrailingSlash(
      String(process.env.GREEN_API_API_URL || DEFAULT_API_URL).trim()
    ),
    mediaUrl: trimTrailingSlash(
      String(process.env.GREEN_API_MEDIA_URL || DEFAULT_MEDIA_URL).trim()
    ),
  };
}

export function isGreenApiConfigured() {
  const config = getConfig();
  return Boolean(config.idInstance && config.apiTokenInstance);
}

export function normalizeWhatsAppChatId(phone: string) {
  const raw = String(phone || "").trim();

  if (raw.endsWith("@c.us") || raw.endsWith("@g.us")) {
    return raw;
  }

  const digits = normalizePhoneDigits(raw);

  if (digits.length < 8 || digits.length > 15) {
    throw new Error("رقم WhatsApp غير صالح");
  }

  return `${digits}@c.us`;
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function skippedResult(): GreenApiResult {
  console.warn(
    "GREEN API notification skipped: GREEN_API_ID_INSTANCE or GREEN_API_TOKEN_INSTANCE is missing."
  );
  return { ok: false, skipped: true, error: "green_api_not_configured" };
}

export async function checkGreenApiRecipient(
  phone: string,
  force = true
): Promise<GreenApiRecipientCheck> {
  const config = getConfig();
  if (!config.idInstance || !config.apiTokenInstance) {
    return { ok: false, error: "green_api_not_configured" };
  }

  try {
    const endpoint = `${config.apiUrl}/waInstance${config.idInstance}/checkWhatsapp/${config.apiTokenInstance}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: normalizeWhatsAppChatId(phone),
        force,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const result = await readResponse(response);

    if (!response.ok) {
      const error = String(
        result.message || result.error || `HTTP ${response.status}`
      );
      console.error("GREEN API checkWhatsapp failed:", response.status, error);
      return { ok: false, error };
    }

    return {
      ok: true,
      existsWhatsApp: result.existsWhatsapp === true,
      chatId: result.chatId ? String(result.chatId) : undefined,
      fromCache: result.fromCache === true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GREEN API checkWhatsapp error:", message);
    return { ok: false, error: message };
  }
}

export async function sendGreenApiMessage({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<GreenApiResult> {
  const config = getConfig();
  if (!config.idInstance || !config.apiTokenInstance) return skippedResult();

  try {
    const chatId = normalizeWhatsAppChatId(to);
    const endpoint = `${config.apiUrl}/waInstance${config.idInstance}/sendMessage/${config.apiTokenInstance}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        message: String(message || "").slice(0, 20_000),
        linkPreview: true,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const result = await readResponse(response);

    if (!response.ok) {
      const error = String(result.message || result.error || `HTTP ${response.status}`);
      console.error("GREEN API sendMessage failed:", response.status, error);
      await recordWhatsAppAudit({ event: "send_failed", recipient: to, error });
      return { ok: false, error };
    }

    const idMessage = String(result.idMessage || "");
    await recordWhatsAppAudit({ event: "accepted", recipient: to, idMessage });
    return { ok: true, idMessage };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GREEN API sendMessage error:", message);
    await recordWhatsAppAudit({ event: "send_failed", recipient: to, error: message });
    return { ok: false, error: message };
  }
}

export async function sendGreenApiFile({
  to,
  file,
  fileName,
  caption,
}: {
  to: string;
  file: Buffer | Uint8Array;
  fileName: string;
  caption?: string;
}): Promise<GreenApiResult> {
  const config = getConfig();
  if (!config.idInstance || !config.apiTokenInstance) return skippedResult();

  try {
    const formData = new FormData();
    formData.set("chatId", normalizeWhatsAppChatId(to));
    formData.set(
      "file",
      new Blob([new Uint8Array(file)], { type: "image/png" }),
      fileName
    );
    formData.set("fileName", fileName);
    if (caption) formData.set("caption", caption.slice(0, 1024));

    const endpoint = `${config.mediaUrl}/waInstance${config.idInstance}/sendFileByUpload/${config.apiTokenInstance}`;
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const result = await readResponse(response);

    if (!response.ok) {
      const error = String(result.message || result.error || `HTTP ${response.status}`);
      console.error("GREEN API sendFileByUpload failed:", response.status, error);
      await recordWhatsAppAudit({ event: "file_failed", recipient: to, error });
      return { ok: false, error };
    }

    const responseResult = {
      ok: true,
      idMessage: String(result.idMessage || ""),
      urlFile: String(result.urlFile || ""),
    };
    await recordWhatsAppAudit({
      event: "file_accepted",
      recipient: to,
      idMessage: responseResult.idMessage,
    });
    return responseResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GREEN API sendFileByUpload error:", message);
    await recordWhatsAppAudit({ event: "file_failed", recipient: to, error: message });
    return { ok: false, error: message };
  }
}

export async function sendGreenApiQrCode({
  to,
  value,
  caption,
  reference,
}: {
  to: string;
  value: string;
  caption?: string;
  reference?: string;
}) {
  try {
    const qrBuffer = await QRCode.toBuffer(value, {
      type: "png",
      width: 640,
      margin: 3,
      errorCorrectionLevel: "H",
      color: { dark: "#121212", light: "#FFFFFF" },
    });

    const safeReference = String(reference || "ticket")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 40);

    return sendGreenApiFile({
      to,
      file: qrBuffer,
      fileName: `sayyir-${safeReference || "ticket"}-qr.png`,
      caption,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("QR generation error:", message);
    return { ok: false, error: message } satisfies GreenApiResult;
  }
}
