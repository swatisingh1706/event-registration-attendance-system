"use server";

// No revalidatePath() here on purpose: every route is force-dynamic (see app/layout.tsx), so data is always fresh,
// and revalidating right before redirect() stops the client from following the redirect.

import bcrypt from "bcryptjs";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AuthError, authorizeUser, endSession, startSession } from "@/lib/auth/session";
import { appUrl, mailEnabled, sendMail } from "@/lib/mail";
import { formatDate, formatTimeRange } from "@/lib/datetime";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { changePasswordSchema, registrationSchema, profileSchema, zodState, type ActionState } from "@/lib/validation";
import { cancelRegistration, registerForEvent } from "@/lib/services/registrations";

const REGISTER_MESSAGES = {
  NOT_FOUND: "We couldn't find that event.",
  CLOSED: "This event is no longer accepting registrations.",
  FULL: "This event is full.",
  NOT_OPEN: "Registration for this event hasn't opened yet.",
  ENDED: "This event has already taken place.",
  CANCELLED: "This event has been cancelled.",
} as const;

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let user;
  try {
    user = await authorizeUser();
  } catch (e) {
    if (e instanceof AuthError) return { error: "Please log in to register.", redirectTo: "/login" };
    throw e;
  }

  // When outbound email is configured, a confirmed address is required so tickets and updates reach real people.
  if (mailEnabled() && !user.emailVerifiedAt) {
    return { error: "Please confirm your email address before registering. We sent you a link when you signed up, and you can request a new one from your profile." };
  }

  const parsed = registrationSchema.safeParse({ ...Object.fromEntries(fd), consent: fd.get("consent") ?? "" });
  if (!parsed.success) return zodState(parsed.error);
  const { eventId, consent: _consent, ...input } = parsed.data;

  let result;
  try {
    result = await registerForEvent(user.id, eventId, input);
  } catch (e) {
    console.error("registerForEvent failed", e);
    return { error: "We couldn't complete your registration. Please try again." };
  }

  if (!result.ok) {
    if (result.code === "ALREADY_REGISTERED") redirect(`/portal/tickets/${result.registrationId}`);
    return { error: REGISTER_MESSAGES[result.code] };
  }

  // Remember contact details for next time.
  await prisma.user.update({
    where: { id: user.id },
    data: { phone: input.phone, organization: input.organization ?? undefined, city: input.city ?? undefined },
  });
  // Confirmation email with a link to the ticket (sent after the response so registration stays instant).
  after(async () => {
    const reg = await prisma.registration.findUnique({ where: { id: result.registrationId }, include: { event: true } });
    if (!reg) return;
    await sendMail({
      to: user.email,
      subject: `You're registered: ${reg.event.title}`,
      heading: "You're registered!",
      paragraphs: [
        `${reg.event.title}`,
        `${formatDate(reg.event.date, { weekday: true })}, ${formatTimeRange(reg.event.startTime, reg.event.endTime)} at ${reg.event.location}.`,
        `Your registration ID is ${reg.registrationNumber}. Show the QR code on your ticket to the check-in team when you arrive.`,
      ],
      cta: { url: `${appUrl()}/portal/tickets/${reg.id}`, label: "Open my ticket" },
    });
  });
  redirect(`/portal/registered/${result.registrationId}`);
}

export async function cancelRegistrationAction(fd: FormData) {
  let user;
  try {
    user = await authorizeUser();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  const id = String(fd.get("registrationId") ?? "");
  const result = await cancelRegistration(id, { userId: user.id });
  if (!result.ok) {
    return { redirectTo: `/portal/tickets?error=${result.code === "ATTENDED" ? "err_attended" : "err_cancel_failed"}&t=${Date.now()}` };
  }
  return { redirectTo: `/portal/tickets?notice=cancel_ok&t=${Date.now()}` };
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let user;
  try {
    user = await authorizeUser();
  } catch (e) {
    if (e instanceof AuthError) return { error: "Please log in again.", redirectTo: "/login" };
    throw e;
  }
  const parsed = profileSchema.safeParse({ ...Object.fromEntries(fd), interests: fd.getAll("interests") });
  if (!parsed.success) return zodState(parsed.error);
  const { interests, ...rest } = parsed.data;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { name: rest.name, phone: rest.phone ?? null, organization: rest.organization ?? null, city: rest.city ?? null, image: rest.image ?? null },
    }),
    prisma.volunteerProfile.upsert({ where: { userId: user.id }, update: { interests }, create: { userId: user.id, interests } }),
  ]);
  return { ok: true, message: "Your profile has been saved." };
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let user;
  try {
    user = await authorizeUser();
  } catch (e) {
    if (e instanceof AuthError) return { error: "Please log in again.", redirectTo: "/login" };
    throw e;
  }
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodState(parsed.error);
  if (!(await rateLimit(`pwchange:${user.id}`, 5, 900)).ok) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(parsed.data.currentPassword, row.passwordHash))) {
    return { error: "Please correct the highlighted fields.", fieldErrors: { currentPassword: ["That isn't your current password."] } };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), sessionsValidAfter: new Date(Math.floor(Date.now() / 1000) * 1000) },
  });
  // Every other device is signed out; this one gets a fresh session.
  await startSession(user.id, user.role);
  return { ok: true, message: "Your password has been changed. Other devices have been signed out." };
}

/** Participants can erase their own account and all their registrations. Staff accounts are managed by a super admin. */
export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let user;
  try {
    user = await authorizeUser();
  } catch (e) {
    if (e instanceof AuthError) return { error: "Please log in again.", redirectTo: "/login" };
    throw e;
  }
  if (user.role !== "PARTICIPANT") return { error: "Staff accounts can only be removed by a super admin." };
  if (!(await rateLimit(`delacct:${user.id}`, 5, 900)).ok) return { error: "Too many attempts. Please wait a few minutes and try again." };
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(String(fd.get("password") ?? ""), row.passwordHash))) {
    return { error: "That password isn't right, so your account was not deleted." };
  }
  await prisma.user.delete({ where: { id: user.id } });
  await endSession();
  redirect("/?notice=account_deleted");
}
