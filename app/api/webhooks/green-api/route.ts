import { NextResponse } from "next/server";
import { recordWhatsAppAudit } from "@/lib/whatsappAudit";

function isAuthorized(req: Request) {
  const expected = String(
    process.env.GREEN_API_WEBHOOK_TOKEN ||
      process.env.INTERNAL_NOTIFICATION_SECRET ||
      process.env.GREEN_API_TOKEN_INSTANCE ||
      ""
  ).trim();
  if (!expected) return false;
  const authorization = String(req.headers.get("authorization") || "").trim();
  const supplied = authorization.replace(/^Bearer\s+/i, "");
  const queryToken = new URL(req.url).searchParams.get("token") || "";
  return supplied === expected || queryToken === expected;
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "green-api-webhook" });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const type = String(body.typeWebhook || "unknown");

    if (type === "outgoingMessageStatus") {
      await recordWhatsAppAudit({
        event: "delivery_status",
        idMessage: body.idMessage ? String(body.idMessage) : undefined,
        recipient: body.chatId || body.senderData?.chatId,
        status: body.status ? String(body.status) : "unknown",
        timestamp: body.timestamp,
        rawType: type,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
