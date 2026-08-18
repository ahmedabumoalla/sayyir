import { supabaseServer } from "@/lib/supabaseServer";

type WhatsAppAuditEvent = {
  event: string;
  idMessage?: string;
  recipient?: string;
  status?: string;
  error?: string;
  timestamp?: number | string;
  rawType?: string;
};

function maskedRecipient(recipient?: string) {
  const digits = String(recipient || "").replace(/\D/g, "");
  return digits ? `***${digits.slice(-4)}` : undefined;
}

export async function recordWhatsAppAudit(event: WhatsAppAuditEvent) {
  try {
    const details = {
      ...event,
      recipient: maskedRecipient(event.recipient),
    };
    const { error } = await supabaseServer.from("admin_logs").insert({
      admin_id: null,
      action_type: `whatsapp_${event.event}`.slice(0, 120),
      details: JSON.stringify(details),
    });
    if (error) console.error("WHATSAPP AUDIT INSERT ERROR:", error.message);
  } catch (error) {
    console.error(
      "WHATSAPP AUDIT ERROR:",
      error instanceof Error ? error.message : String(error)
    );
  }
}
