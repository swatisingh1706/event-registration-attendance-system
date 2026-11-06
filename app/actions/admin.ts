"use server";

// No revalidatePath() here on purpose: every route is force-dynamic (see app/layout.tsx), so data is always fresh,
// and revalidating right before redirect() stops the client from following the redirect.

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import type { FlashKey } from "@/lib/flash";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthError, authorize } from "@/lib/auth/session";
import type { Permission } from "@/lib/permissions";
import { eventSchema, partnerSchema, settingsSchema, zodState, type ActionState } from "@/lib/validation";
import { syncCapacityStatus, uniqueSlug } from "@/lib/services/events";
import { performCheckIn } from "@/lib/services/checkin";

/** Every admin mutation starts here: authenticated + role has the permission, re-read from the DB. */
async function guard(permission: Permission) {
  try {
    return await authorize(permission);
  } catch (e) {
    if (e instanceof AuthError) redirect(e.kind === "UNAUTHENTICATED" ? "/login" : "/portal");
    throw e;
  }
}

async function guardState(permission: Permission) {
  try {
    return { user: await authorize(permission) };
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: e.kind === "UNAUTHENTICATED" ? "Your session has expired. Please log in again." : "You don't have permission to do that." };
    }
    throw e;
  }
}

/** Where the client should go next. Returned (not redirect()-ed) so the browser navigates reliably; `t` makes repeat results re-render. */
export type Nav = { redirectTo: string };
const back = (path: string, kind: "notice" | "error", key: FlashKey): Nav => ({ redirectTo: `${path}?${kind}=${key}&t=${Date.now()}` });

// ---------------------------------------------------------------- events
function parseEventForm(fd: FormData) {
  let agenda: unknown = [];
  try {
    agenda = JSON.parse(String(fd.get("agenda") || "[]"));
  } catch {
    agenda = [];
  }
  return eventSchema.safeParse({
    ...Object.fromEntries(fd),
    agenda,
    partnerIds: fd.getAll("partnerIds"),
    sdgIds: fd.getAll("sdgIds"),
  });
}

function eventData(d: NonNullable<ReturnType<typeof parseEventForm>["data"]>) {
  return {
    title: d.title,
    description: d.description,
    coverImage: d.coverImage || null,
    category: d.category,
    date: new Date(`${d.date}T00:00:00Z`),
    startTime: d.startTime,
    endTime: d.endTime,
    location: d.location,
    address: d.address ?? null,
    capacity: d.capacity,
    registrationDeadline: d.registrationDeadline ? new Date(`${d.registrationDeadline}:00Z`) : null,
    organizer: d.organizer,
    contactEmail: d.contactEmail ?? null,
    contactPhone: d.contactPhone ?? null,
    volunteerRequirements: d.volunteerRequirements ?? null,
    agenda: d.agenda as Prisma.InputJsonValue,
  };
}

export async function createEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const auth = await guardState("events.manage");
  if (!auth.user) return { error: auth.error };
  const parsed = parseEventForm(fd);
  if (!parsed.success) return zodState(parsed.error);
  const d = parsed.data;

  const event = await prisma.event.create({
    data: {
      ...eventData(d),
      slug: await uniqueSlug(d.title),
      status: d.intent === "publish" ? "REGISTRATION_OPEN" : "DRAFT",
      createdById: auth.user.id,
      partners: { create: d.partnerIds.map((partnerId) => ({ partnerId })) },
      sdgs: { create: d.sdgIds.map((sdgId) => ({ sdgId })) },
    },
  });
  return { ok: true, redirectTo: `/admin/events?notice=${d.intent === "publish" ? "event_published" : "event_draft_saved"}` };
}

export async function updateEventAction(eventId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const auth = await guardState("events.manage");
  if (!auth.user) return { error: auth.error };
  const parsed = parseEventForm(fd);
  if (!parsed.success) return zodState(parsed.error);
  const d = parsed.data;

  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) return { error: "That event no longer exists." };

  const registered = await prisma.registration.count({ where: { eventId, status: "REGISTERED" } });
  if (d.capacity < registered) {
    return { error: "Please correct the highlighted fields.", fieldErrors: { capacity: [`${registered} people are already registered, so capacity can't be lower than that.`] } };
  }

  const status = d.intent === "publish" ? "REGISTRATION_OPEN" : d.intent === "draft" ? "DRAFT" : (d.status ?? existing.status);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
    await tx.event.update({
      where: { id: eventId },
      data: {
        ...eventData(d),
        status,
        partners: { deleteMany: {}, create: d.partnerIds.map((partnerId) => ({ partnerId })) },
        sdgs: { deleteMany: {}, create: d.sdgIds.map((sdgId) => ({ sdgId })) },
      },
    });
    await syncCapacityStatus(tx, eventId);
  });

  return { ok: true, redirectTo: `/admin/events/${eventId}/edit?notice=event_saved&t=${Date.now()}` };
}

async function setStatus(fd: FormData, status: "REGISTRATION_CLOSED" | "COMPLETED" | "CANCELLED" | "REGISTRATION_OPEN", msg: FlashKey) {
  await guard("events.manage");
  const id = String(fd.get("eventId") ?? "");
  const event = await prisma.event.findUnique({ where: { id }, select: { slug: true, status: true } });
  if (!event) return back("/admin/events", "error", "err_event_missing");
  await prisma.event.update({ where: { id }, data: { status } });
  if (status === "REGISTRATION_OPEN") await prisma.$transaction((tx) => syncCapacityStatus(tx, id));
  return back("/admin/events", "notice", msg);
}

export async function closeRegistrationAction(fd: FormData) {
  return setStatus(fd, "REGISTRATION_CLOSED", "reg_closed");
}
export async function reopenRegistrationAction(fd: FormData) {
  return setStatus(fd, "REGISTRATION_OPEN", "reg_reopened");
}
export async function completeEventAction(fd: FormData) {
  return setStatus(fd, "COMPLETED", "event_completed");
}
export async function cancelEventAction(fd: FormData) {
  return setStatus(fd, "CANCELLED", "event_cancelled");
}

export async function duplicateEventAction(fd: FormData) {
  const user = await guard("events.manage");
  const src = await prisma.event.findUnique({
    where: { id: String(fd.get("eventId") ?? "") },
    include: { partners: true, sdgs: true },
  });
  if (!src) return back("/admin/events", "error", "err_event_missing");
  const s = src;
  const copy = await prisma.event.create({
    data: {
      title: `${s.title} (copy)`,
      slug: await uniqueSlug(`${s.title} copy`),
      description: s.description,
      coverImage: s.coverImage,
      category: s.category,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      address: s.address,
      capacity: s.capacity,
      organizer: s.organizer,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      agenda: s.agenda as Prisma.InputJsonValue,
      volunteerRequirements: s.volunteerRequirements,
      status: "DRAFT",
      createdById: user.id,
      partners: { create: s.partners.map((p) => ({ partnerId: p.partnerId })) },
      sdgs: { create: s.sdgs.map((g) => ({ sdgId: g.sdgId })) },
    },
  });
  return { redirectTo: `/admin/events/${copy.id}/edit?notice=event_duplicated` };
}

export async function deleteEventAction(fd: FormData) {
  await guard("events.delete");
  const id = String(fd.get("eventId") ?? "");
  const event = await prisma.event.findUnique({ where: { id }, select: { title: true, slug: true, _count: { select: { registrations: true } } } });
  if (!event) return back("/admin/events", "error", "err_event_missing");
  if (event._count.registrations > 0) return back("/admin/events", "error", "err_event_has_regs");
  await prisma.event.delete({ where: { id } });
  return back("/admin/events", "notice", "event_deleted");
}

// ---------------------------------------------------------------- check-in (manual, from the attendance page)
export async function manualCheckInAction(fd: FormData) {
  const user = await guard("checkin");
  const registrationId = String(fd.get("registrationId") ?? "");
  const eventId = String(fd.get("eventId") ?? "");
  const reg = await prisma.registration.findUnique({ where: { id: registrationId }, select: { registrationNumber: true } });
  const path = `/admin/events/${eventId}/attendance`;
  if (!reg) return back(path, "error", "err_reg_missing");

  // Same server-side validation as the scanner; only the recorded method differs.
  const result = await performCheckIn({ actor: user, eventId, code: reg.registrationNumber, method: "ADMIN_OVERRIDE" });
  if (result.status === "SUCCESS") return back(path, "notice", "checkin_ok");
  if (result.status === "ALREADY_CHECKED_IN") return back(path, "error", "err_already_checked_in");
  if (result.status === "NOT_ACTIVE") return back(path, "error", "err_not_active");
  return back(path, "error", "err_checkin_failed");
}

// ---------------------------------------------------------------- partners
export async function savePartnerAction(partnerId: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const auth = await guardState("partners.manage");
  if (!auth.user) return { error: auth.error };
  const parsed = partnerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodState(parsed.error);
  const d = parsed.data;
  const data = {
    name: d.name,
    type: d.type,
    logo: d.logo || null,
    description: d.description ?? null,
    website: d.website ?? null,
    contactPerson: d.contactPerson ?? null,
    contactEmail: d.contactEmail ?? null,
  };
  if (partnerId) await prisma.partner.update({ where: { id: partnerId }, data });
  else await prisma.partner.create({ data });
  return { ok: true, redirectTo: `/admin/partners?notice=${partnerId ? "partner_saved" : "partner_added"}&t=${Date.now()}` };
}

export async function deletePartnerAction(fd: FormData) {
  await guard("partners.manage");
  await prisma.partner.delete({ where: { id: String(fd.get("partnerId") ?? "") } }).catch(() => null);
  return back("/admin/partners", "notice", "partner_removed");
}

// ---------------------------------------------------------------- settings & team
export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const auth = await guardState("settings.manage");
  if (!auth.user) return { error: auth.error };
  const parsed = settingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodState(parsed.error);
  const d = parsed.data;
  const data = {
    ...d,
    logoUrl: d.logoUrl ?? null,
    heroImageUrl: d.heroImageUrl ?? null,
    contactEmail: d.contactEmail ?? null,
    contactPhone: d.contactPhone ?? null,
    address: d.address ?? null,
    website: d.website ?? null,
    facebookUrl: d.facebookUrl ?? null,
    instagramUrl: d.instagramUrl ?? null,
    linkedinUrl: d.linkedinUrl ?? null,
    twitterUrl: d.twitterUrl ?? null,
  };
  await prisma.orgSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  return { ok: true, message: "Settings saved. Your branding is live across the site." };
}

const ROLES: Role[] = ["PARTICIPANT", "CHECKIN_STAFF", "ADMIN", "SUPER_ADMIN"];

export async function changeRoleAction(fd: FormData) {
  const actor = await guard("users.manage");
  const userId = String(fd.get("userId") ?? "");
  const role = String(fd.get("role") ?? "") as Role;
  if (!ROLES.includes(role)) return back("/admin/settings/team", "error", "err_invalid_role");
  if (userId === actor.id) return back("/admin/settings/team", "error", "err_own_role");
  await prisma.user.update({ where: { id: userId }, data: { role } });
  return back("/admin/settings/team", "notice", "role_updated");
}

/** Issues a one-time temporary password. Shown once to the super admin; the user is signed out everywhere. */
export async function resetUserPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const auth = await guardState("users.manage");
  if (!auth.user) return { error: auth.error };
  const userId = String(fd.get("userId") ?? "");
  if (userId === auth.user.id) return { error: "Change your own password from your profile instead." };
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { error: "That user no longer exists." };

  // 12 characters, no look-alikes, with a letter and a digit guaranteed.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let temp = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  temp = temp.slice(0, 10) + "k" + "7";
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(temp, 12), sessionsValidAfter: new Date(Math.floor(Date.now() / 1000) * 1000), emailVerifiedAt: new Date() },
  });
  return { ok: true, message: temp };
}
