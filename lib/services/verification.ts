import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/mail";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Creates a single-use verification link (valid 48 h) and emails it. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string }) {
  const token = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 48 * 3600 * 1000) },
  });
  return sendMail({
    to: user.email,
    subject: "Confirm your email address",
    heading: `Welcome, ${user.name.split(" ")[0]}`,
    paragraphs: ["Please confirm your email address so you can register for events. The link works for 48 hours."],
    cta: { url: `${appUrl()}/verify-email?token=${token}`, label: "Confirm my email" },
  });
}

export type VerifyResult = { ok: true } | { ok: false; reason: "invalid" | "expired" };

export async function consumeVerificationToken(token: string): Promise<VerifyResult> {
  if (!/^[a-f0-9]{64}$/.test(token)) return { ok: false, reason: "invalid" };
  const rec = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.usedAt) return { ok: false, reason: "invalid" };
  if (rec.expiresAt < new Date()) return { ok: false, reason: "expired" };
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.updateMany({ where: { userId: rec.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true };
}
