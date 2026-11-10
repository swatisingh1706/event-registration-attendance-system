import { z } from "zod";
import { ATTENDEE_ONLY, VOLUNTEER_INTERESTS } from "@/lib/event-state";

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  redirectTo?: string;
};

export function zodState(err: z.ZodError): ActionState {
  return { error: "Please correct the highlighted fields.", fieldErrors: z.flattenError(err).fieldErrors };
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const phone = z
  .string()
  .trim()
  .regex(/^[+()\-\s\d]{7,20}$/, "Enter a valid phone number.");

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: phone.optional().or(z.literal("").transform(() => undefined)),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") });

export const resetSchema = z.object({ token: z.string().min(20).max(200), password });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: phone.optional().or(z.literal("").transform(() => undefined)),
  organization: optionalText(120),
  city: optionalText(80),
  image: z
    .string()
    .trim()
    .url("Enter a valid image URL.")
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  interests: z.array(z.enum(VOLUNTEER_INTERESTS)).default([]),
});

export const registrationSchema = z.object({
  eventId: z.string().min(1).max(40),
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone,
  organization: optionalText(120),
  city: optionalText(80),
  volunteerInterest: z
    .string()
    .refine((v) => v === ATTENDEE_ONLY || (VOLUNTEER_INTERESTS as readonly string[]).includes(v), "Choose an option.")
    .default(ATTENDEE_ONLY),
  consent: z.literal("on", { error: "Please confirm your consent to continue." }),
});

export const checkInSchema = z.object({
  eventId: z.string().min(1).max(40),
  code: z.string().trim().min(3).max(120),
  method: z.enum(["QR_SCAN", "MANUAL_ID"]),
});

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const agendaItem = z.object({
  time: z.string().trim().max(20).default(""),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional(),
});

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Give the event a title.").max(120),
    description: z.string().trim().min(20, "Describe the event in at least 20 characters.").max(6000),
    coverImage: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "Use a full image URL or a /path.")
      .optional(),
    category: z.enum([
      "COMMUNITY",
      "ENVIRONMENT",
      "EDUCATION",
      "HEALTH_AWARENESS",
      "FOOD_DISTRIBUTION",
      "VOLUNTEERING",
      "FUNDRAISING",
      "SKILL_DEVELOPMENT",
      "OTHER",
    ]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the event date."),
    startTime: z.string().regex(HHMM, "Choose a start time."),
    endTime: z.string().regex(HHMM, "Choose an end time."),
    location: z.string().trim().min(2, "Enter the venue name.").max(160),
    address: optionalText(300),
    capacity: z.coerce.number().int("Whole numbers only.").min(1, "Capacity must be at least 1.").max(100000),
    registrationDeadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use a valid deadline.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    status: z
      .enum(["DRAFT", "PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "FULL", "COMPLETED", "CANCELLED"])
      .optional(),
    organizer: z.string().trim().min(2, "Enter the organizer.").max(120),
    contactEmail: z.string().trim().email("Enter a valid email.").optional().or(z.literal("").transform(() => undefined)),
    contactPhone: optionalText(30),
    volunteerRequirements: optionalText(1500),
    agenda: z.array(agendaItem).max(30).default([]),
    partnerIds: z.array(z.string()).default([]),
    sdgIds: z.array(z.string()).default([]),
    intent: z.enum(["draft", "publish", "save"]).default("save"),
  })
  .refine((v) => v.endTime > v.startTime, { path: ["endTime"], message: "End time must be after the start time." })
  .refine((v) => !v.registrationDeadline || v.registrationDeadline.slice(0, 10) <= v.date, {
    path: ["registrationDeadline"],
    message: "The deadline can't be after the event date.",
  });

export const partnerSchema = z.object({
  name: z.string().trim().min(2, "Enter the partner's name.").max(120),
  type: z.enum(["NGO", "COMPANY", "EDUCATIONAL", "COMMUNITY", "GOVERNMENT"]),
  logo: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "Use a full image URL or a /path.")
    .optional(),
  description: optionalText(600),
  website: z.string().trim().url("Enter a full URL, including https://").optional().or(z.literal("").transform(() => undefined)),
  contactPerson: optionalText(100),
  contactEmail: z.string().trim().email("Enter a valid email.").optional().or(z.literal("").transform(() => undefined)),
});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1F5D45.");
const url = z.string().trim().url("Enter a full URL, including https://").optional().or(z.literal("").transform(() => undefined));

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  shortName: z.string().trim().min(2).max(40),
  ticketPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/, "2–6 letters or numbers."),
  tagline: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(""),
  logoUrl: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  heroImageUrl: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  contactEmail: z.string().trim().email("Enter a valid email.").optional().or(z.literal("").transform(() => undefined)),
  contactPhone: optionalText(30),
  address: optionalText(300),
  website: url,
  facebookUrl: url,
  instagramUrl: url,
  linkedinUrl: url,
  twitterUrl: url,
  checkInWindowHours: z.coerce.number().int().min(0, "Use 0 or more.").max(240, "Use 240 hours or fewer."),
  primaryColor: hexColor,
  accentColor: hexColor,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword: password,
});
