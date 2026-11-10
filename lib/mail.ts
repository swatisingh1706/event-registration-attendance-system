import { getSettings } from "@/lib/services/settings";

/**
 * Outbound email via Resend (https://resend.com, free tier: 3,000 emails/month).
 * Configure RESEND_API_KEY and MAIL_FROM (e.g. "GreenBridge <noreply@yourdomain.org>", on a domain you verified in Resend).
 * Without those the app still works: messages are logged on the server and email verification is switched off.
 */
export function mailEnabled() {
  return !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;
}

export function appUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Mail = { to: string; subject: string; heading: string; paragraphs: string[]; cta?: { url: string; label: string } };

/** Sends a branded message. Never throws: a failed email must not break signup or registration. */
export async function sendMail(m: Mail): Promise<{ ok: boolean; skipped?: boolean }> {
  const settings = await getSettings();
  const text = [m.heading, "", ...m.paragraphs, ...(m.cta ? ["", `${m.cta.label}: ${m.cta.url}`] : []), "", `— ${settings.name}`].join("\n");
  const brand = settings.primaryColor || "#1F5D45";
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7f5;font-family:Arial,Helvetica,sans-serif;color:#1d2a23">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e9e5">
<tr><td style="background:${esc(brand)};padding:18px 28px;color:#fff;font-size:18px;font-weight:bold">${esc(settings.name)}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">${esc(m.heading)}</h1>
${m.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${esc(p)}</p>`).join("")}
${m.cta ? `<p style="margin:22px 0"><a href="${esc(m.cta.url)}" style="background:${esc(brand)};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">${esc(m.cta.label)}</a></p><p style="margin:0;font-size:12px;color:#5c6a62;word-break:break-all">Or paste this link into your browser: ${esc(m.cta.url)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;background:#f5f7f5;font-size:12px;color:#5c6a62">Sent by ${esc(settings.name)}${settings.contactEmail ? ` · ${esc(settings.contactEmail)}` : ""}</td></tr>
</table></td></tr></table></body></html>`;

  if (!mailEnabled()) {
    console.log(`[mail:not-sent] to=${m.to} subject="${m.subject}"${m.cta ? ` link=${m.cta.url}` : ""}`);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, html, text, reply_to: settings.contactEmail || undefined }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("[mail:failed]", res.status, (await res.text()).slice(0, 300));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[mail:error]", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}
