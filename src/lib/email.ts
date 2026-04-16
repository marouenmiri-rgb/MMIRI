import { env } from "./env";

export type SendEmailArgs = {
  to: string;
  from: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string; provider: "resend" }
  | { ok: false; reason: "not_configured" | "provider_error"; error?: string };

/**
 * Send an email via Resend. Gated on RESEND_API_KEY — returns
 * { ok: false, reason: "not_configured" } instead of throwing when
 * the key is absent, so upstream callers can fall through to DRAFT status.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  if (!env.RESEND_API_KEY) return { ok: false, reason: "not_configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      text: args.text,
      reply_to: args.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      reason: "provider_error",
      error: `${res.status} ${body.slice(0, 200)}`,
    };
  }
  const body = (await res.json()) as { id: string };
  return { ok: true, id: body.id, provider: "resend" };
}
