/* Demo data for GreenBridge Foundation. Safe to re-run: it wipes and recreates everything. */
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, type EventCategory, type EventStatus, type PartnerType } from "@prisma/client";
import { formatRegistrationNumber, generateTicketToken } from "../lib/qr";
import { SDG_TITLES } from "./sdgs";

const prisma = new PrismaClient();

// Local development default. For a public deployment set SEED_PASSWORD to a strong random value.
export const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "Demo@12345";

const SDGS = SDG_TITLES;

const FIRST = ["Aarav","Ananya","Vihaan","Diya","Aditya","Ishita","Kabir","Meera","Rohan","Saanvi","Arjun","Navya","Karan","Tara","Neha","Rahul","Priya","Siddharth","Kavya","Manav","Riya","Yash","Pooja","Dev","Aisha","Nikhil","Sneha","Harsh","Anika","Tanvi"];
const LAST = ["Sharma","Verma","Iyer","Nair","Patel","Gupta","Mehta","Reddy","Khan","Singh","Das","Joshi","Kulkarni","Bose","Malhotra","Chopra"];
const CITIES = ["Pune", "Mumbai", "Nashik", "Thane", "Navi Mumbai"];
const ORGS = ["Riverside University", "Meridian Group", "Self-employed", "Shanti Nagar RWA", "Greenfield College", "Independent volunteer", "Sunrise High School"];
const INTERESTS = ["On-ground support", "Registration desk", "Logistics & setup", "Teaching & mentoring", "Photography & media", "First aid & health"];

type Person = { id: string; name: string; email: string; phone: string; org: string; city: string };
const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];
// Deterministic pseudo-random so the demo data is stable between runs.
let s = 42;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const rint = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

/** Today's date in India (the demo NGO's timezone) as yyyy-mm-dd. */
const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const plusDays = (days: number) => new Date(new Date(`${todayIso()}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
/** Event date: relative to today by default, or the original fixed date when SEED_FIXED_DATES is set. */
const when = (fixed: string, offsetDays: number) => (process.env.SEED_FIXED_DATES ? fixed : plusDays(offsetDays));
const deadline = (fixed: string, offsetDays: number) => (process.env.SEED_FIXED_DATES ? fixed : `${plusDays(offsetDays)}T18:00`);
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
/** Wall-clock (Asia/Kolkata) date+time -> real instant. */
const ist = (iso: string, hhmm: string) => new Date(new Date(`${iso}T${hhmm}:00Z`).getTime() - 330 * 60000);

async function main() {
  console.log("Clearing existing data…");
  await prisma.$transaction([
    prisma.attendance.deleteMany(),
    prisma.registration.deleteMany(),
    prisma.eventPartner.deleteMany(),
    prisma.eventSDG.deleteMany(),
    prisma.event.deleteMany(),
    prisma.partner.deleteMany(),
    prisma.sDGGoal.deleteMany(),
    prisma.volunteerProfile.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.rateLimit.deleteMany(),
    prisma.orgSettings.deleteMany(),
  ]);

  const settings = await prisma.orgSettings.create({
    data: {
      id: "default",
      name: "GreenBridge Foundation",
      shortName: "GreenBridge",
      ticketPrefix: "GBF",
      // Demo events are scattered across past and future dates, so the demo leaves check-in unrestricted.
      // Real deployments keep the default (24 hours around the event) or choose their own in Admin → Settings.
      checkInWindowHours: 0,
      tagline: "Small actions. Stronger communities.",
      description:
        "GreenBridge Foundation brings neighbours, students, businesses and local bodies together to run practical, community-led initiatives — from clean-ups and tree plantations to digital-literacy classes and food drives. Every event is free to join and built with local partners.",
      heroImageUrl: "/photos/hero.jpg",
      contactEmail: "hello@greenbridge.example",
      contactPhone: "+91 20 5550 0142",
      address: "12 Lakeview Road, Pune 411001",
      website: "https://greenbridge.example",
      instagramUrl: "https://instagram.com/greenbridge",
      linkedinUrl: "https://linkedin.com/company/greenbridge",
    },
  });

  // ---- SDGs -----------------------------------------------------------
  await prisma.sDGGoal.createMany({
    data: SDGS.map((title, i) => ({
      number: i + 1,
      title,
      description: i === 16 ? "Strengthen the means of implementation and revitalise the global partnership for sustainable development." : null,
    })),
  });
  const sdg = Object.fromEntries((await prisma.sDGGoal.findMany()).map((g) => [g.number, g.id]));

  // ---- Users ----------------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const staffUsers = [
    { email: "superadmin@greenbridge.example", name: "Meenal Kapoor", role: "SUPER_ADMIN" as const },
    { email: "admin@greenbridge.example", name: "Rajiv Menon", role: "ADMIN" as const },
    { email: "staff@greenbridge.example", name: "Farah Sheikh", role: "CHECKIN_STAFF" as const },
  ];
  const created: Record<string, string> = {};
  for (const u of staffUsers) {
    const row = await prisma.user.create({ data: { ...u, passwordHash, emailVerifiedAt: new Date(), phone: "+91 98765 00000", organization: settings.name, city: "Pune" } });
    created[u.role] = row.id;
  }
  const sonal = await prisma.user.create({
    data: {
      email: "sonal.sharma@example.com",
      name: "Sonal Sharma",
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: "+91 98220 41822",
      organization: "Riverside University",
      city: "Pune",
      volunteerProfile: { create: { interests: ["On-ground support", "Photography & media"] } },
    },
  });

  const people: Person[] = [];
  const userRows: Prisma.UserCreateManyInput[] = [];
  for (let i = 0; i < 130; i++) {
    const name = `${pick(FIRST, i * 7 + 3)} ${pick(LAST, i * 5 + 1)}`;
    const email = `${name.toLowerCase().replace(/ /g, ".")}${i}@example.com`;
    const p = { id: randomUUID(), name, email, phone: `+91 9${rint(100, 999)}${rint(10000, 99999)}`, org: pick(ORGS, i), city: pick(CITIES, i) };
    people.push(p);
    userRows.push({ id: p.id, name, email, passwordHash, emailVerifiedAt: new Date(), phone: p.phone, organization: p.org, city: p.city });
  }
  await prisma.user.createMany({ data: userRows });
  await prisma.volunteerProfile.createMany({
    data: people.filter((_, i) => i % 4 === 0).map((p, i) => ({ userId: p.id, interests: [pick(INTERESTS, i), pick(INTERESTS, i + 2)] })),
  });

  // ---- Partners -------------------------------------------------------
  const partnerDefs: { name: string; type: PartnerType; description: string; website: string; contactPerson: string }[] = [
    { name: "GreenBridge Foundation", type: "NGO", description: "Lead organiser and community convenor.", website: "https://greenbridge.example", contactPerson: "Rajiv Menon" },
    { name: "Riverside University", type: "EDUCATIONAL", description: "Student volunteers, venues and faculty mentors.", website: "https://riverside.example.edu", contactPerson: "Dr. Anita Deshpande" },
    { name: "Meridian Group CSR", type: "COMPANY", description: "Corporate CSR partner funding supplies and employee volunteering.", website: "https://meridian.example.com", contactPerson: "Vikram Rao" },
    { name: "Shanti Nagar Residents' Association", type: "COMMUNITY", description: "Neighbourhood association mobilising local households.", website: "https://shantinagar.example.org", contactPerson: "Kiran Bhosale" },
    { name: "Municipal Parks Department", type: "GOVERNMENT", description: "Permissions, waste collection and park access.", website: "https://parks.example.gov", contactPerson: "S. Kulkarni" },
  ];
  const partners: Record<string, string> = {};
  for (const p of partnerDefs) partners[p.name] = (await prisma.partner.create({ data: p })).id;
  const P = (n: string) => partners[n];

  // ---- Events ---------------------------------------------------------
  type EventDef = {
    title: string; slug: string; category: EventCategory; date: string; start: string; end: string; location: string; address: string;
    capacity: number; status: EventStatus; cover: string; registrations: number; attendanceRate: number; deadline?: string;
    description: string; agenda: { time: string; title: string; description?: string }[]; volunteer: string;
    partners: string[]; sdgs: number[];
  };
  const events: EventDef[] = [
    {
      title: "Community Clean-Up Drive", slug: "community-clean-up-drive", category: "ENVIRONMENT", date: when("2026-10-22", 14), start: "07:30", end: "11:30",
      location: "Central Community Park", address: "Central Community Park, Gate 2, Lakeview Road, Pune", capacity: 100, status: "REGISTRATION_OPEN",
      cover: "/photos/cleanup.jpg", registrations: 62, attendanceRate: 0, deadline: deadline("2026-10-21T18:00", 13),
      description: "Join neighbours, students and local businesses for a morning of cleaning up Central Community Park and the lakeside path.\n\nGloves, bags and refreshments are provided. We will sort waste on site so that recyclables reach local recycling partners rather than the landfill. All ages are welcome; children must come with an adult.",
      agenda: [
        { time: "7:30 AM", title: "Check-in & briefing", description: "Show your QR ticket at the registration desk." },
        { time: "8:00 AM", title: "Zones assigned & clean-up begins" },
        { time: "10:30 AM", title: "Waste sorting and weigh-in" },
        { time: "11:00 AM", title: "Refreshments & group photo" },
      ],
      volunteer: "20 zone leads (experience leading small groups), 6 first-aid volunteers and 4 people for the registration desk. Volunteers arrive at 6:45 AM.",
      partners: ["GreenBridge Foundation", "Municipal Parks Department", "Shanti Nagar Residents' Association", "Meridian Group CSR"], sdgs: [11, 13, 17],
    },
    {
      title: "Digital Literacy Workshop", slug: "digital-literacy-workshop", category: "EDUCATION", date: when("2026-11-07", 21), start: "10:00", end: "14:00",
      location: "Riverside University, Room B-204", address: "Riverside University, Block B, Baner Road, Pune", capacity: 40, status: "REGISTRATION_OPEN",
      cover: "/photos/literacy.jpg", registrations: 28, attendanceRate: 0, deadline: deadline("2026-11-05T18:00", 19),
      description: "A hands-on, beginner-friendly workshop for adults and seniors: using a smartphone safely, digital payments, spotting scams, booking public services online and video calls with family.\n\nStudent mentors sit one-to-one with participants. Bring your own phone if you have one; loan devices are available.",
      agenda: [
        { time: "10:00 AM", title: "Welcome & device set-up" },
        { time: "10:45 AM", title: "Safe payments and spotting scams" },
        { time: "12:15 PM", title: "Lunch break" },
        { time: "1:00 PM", title: "Government services online — practice" },
      ],
      volunteer: "15 student mentors comfortable explaining smartphones patiently; a short training is provided the week before.",
      partners: ["GreenBridge Foundation", "Riverside University"], sdgs: [4, 17],
    },
    {
      title: "Tree Plantation Initiative", slug: "tree-plantation-initiative", category: "ENVIRONMENT", date: when("2026-11-15", 30), start: "07:00", end: "11:00",
      location: "Vetal Hill Foothills", address: "Vetal Hill Foothills, Trailhead B, Pune", capacity: 150, status: "REGISTRATION_OPEN",
      cover: "/photos/trees.jpg", registrations: 45, attendanceRate: 0, deadline: deadline("2026-11-13T18:00", 28),
      description: "Plant native saplings on degraded hill-slope land and commit to a 12-month watering rota with your neighbourhood group.\n\nWe provide saplings, tools and guidance from the forest department. Wear closed shoes and bring a water bottle.",
      agenda: [
        { time: "7:00 AM", title: "Arrival, check-in and safety talk" },
        { time: "7:30 AM", title: "Planting in teams of ten" },
        { time: "10:30 AM", title: "Tagging saplings & adoption sign-up" },
      ],
      volunteer: "12 team leads and 5 people to manage sapling transport from the nursery.",
      partners: ["GreenBridge Foundation", "Municipal Parks Department", "Meridian Group CSR"], sdgs: [13, 15, 17],
    },
    {
      title: "Community Food Distribution", slug: "community-food-distribution", category: "FOOD_DISTRIBUTION", date: when("2026-10-04", 6), start: "09:00", end: "13:00",
      location: "Shanti Nagar Community Hall", address: "Shanti Nagar Community Hall, Sector 4, Pune", capacity: 30, status: "FULL",
      cover: "/photos/food.jpg", registrations: 30, attendanceRate: 0,
      description: "Help pack and distribute dry-ration kits to 300 households identified with the residents' association. Volunteers pack, load and deliver door-to-door in small groups.\n\nThis event is now full — watch for the next distribution date.",
      agenda: [
        { time: "9:00 AM", title: "Briefing & packing stations" },
        { time: "10:30 AM", title: "Delivery teams depart" },
        { time: "12:30 PM", title: "Return and debrief" },
      ],
      volunteer: "All participants act as packers or delivery volunteers.",
      partners: ["GreenBridge Foundation", "Shanti Nagar Residents' Association"], sdgs: [2, 17],
    },
    {
      title: "Riverbank Clean-Up: Monsoon Edition", slug: "riverbank-clean-up-monsoon-edition", category: "ENVIRONMENT", date: when("2026-09-06", -50), start: "07:30", end: "11:00",
      location: "Mula River Bank, Sangam Ghat", address: "Sangam Ghat, Pune", capacity: 90, status: "COMPLETED", cover: "/photos/cleanup.jpg",
      registrations: 78, attendanceRate: 0.83, description: "A post-monsoon clean-up along the Mula riverbank that removed 1.4 tonnes of waste. Thank you to everyone who came.",
      agenda: [], volunteer: "Completed.", partners: ["GreenBridge Foundation", "Municipal Parks Department"], sdgs: [11, 13, 17],
    },
    {
      title: "Community Health & Wellness Camp", slug: "community-health-wellness-camp", category: "HEALTH_AWARENESS", date: when("2026-08-16", -70), start: "09:00", end: "15:00",
      location: "Shanti Nagar Community Hall", address: "Shanti Nagar Community Hall, Sector 4, Pune", capacity: 80, status: "COMPLETED", cover: "/photos/health.jpg",
      registrations: 71, attendanceRate: 0.79, description: "Free health screenings, eye checks and nutrition counselling delivered with volunteer doctors.",
      agenda: [], volunteer: "Completed.", partners: ["GreenBridge Foundation", "Shanti Nagar Residents' Association", "Riverside University"], sdgs: [3, 17],
    },
    {
      title: "School Supplies Fundraiser Walk", slug: "school-supplies-fundraiser-walk", category: "FUNDRAISING", date: when("2026-07-19", -100), start: "06:30", end: "09:30",
      location: "Lakeview Promenade", address: "Lakeview Promenade, Pune", capacity: 120, status: "COMPLETED", cover: "/photos/walk.jpg",
      registrations: 96, attendanceRate: 0.74, description: "A 5 km sponsored walk that raised funds for school kits for 400 children.",
      agenda: [], volunteer: "Completed.", partners: ["GreenBridge Foundation", "Meridian Group CSR", "Riverside University"], sdgs: [4, 17],
    },
    {
      title: "Winter Warm-Clothes Drive", slug: "winter-warm-clothes-drive", category: "COMMUNITY", date: when("2026-12-12", 60), start: "10:00", end: "16:00",
      location: "Central Community Park", address: "Central Community Park, Pune", capacity: 60, status: "DRAFT", cover: "/photos/volunteer.jpg",
      registrations: 0, attendanceRate: 0, description: "Collect, sort and distribute warm clothing ahead of winter. (Draft — not yet published.)",
      agenda: [], volunteer: "To be confirmed.", partners: ["GreenBridge Foundation"], sdgs: [1, 17],
    },
  ];

  let seq = 0;
  const now = Date.now();
  let personCursor = 0;

  for (const def of events) {
    const event = await prisma.event.create({
      data: {
        title: def.title, slug: def.slug, description: def.description, coverImage: def.cover, category: def.category,
        date: day(def.date), startTime: def.start, endTime: def.end, location: def.location, address: def.address,
        capacity: def.capacity, registrationDeadline: def.deadline ? new Date(`${def.deadline}:00Z`) : null, status: def.status,
        organizer: settings.name, contactEmail: settings.contactEmail, contactPhone: settings.contactPhone,
        agenda: def.agenda, volunteerRequirements: def.volunteer, createdById: created.ADMIN,
        partners: { create: def.partners.map((n) => ({ partnerId: P(n) })) },
        sdgs: { create: def.sdgs.map((n) => ({ sdgId: sdg[n] })) },
      },
    });

    // Sonal is registered for the Clean-Up Drive (the headline demo journey).
    const attendees: Person[] = def.slug === "community-clean-up-drive"
      ? [{ id: sonal.id, name: sonal.name, email: sonal.email, phone: sonal.phone ?? "", org: "Riverside University", city: "Pune" }]
      : [];
    while (attendees.length < def.registrations) {
      const p = people[personCursor++ % people.length];
      if (!attendees.find((a) => a.id === p.id)) attendees.push(p);
    }

    const isPast = def.status === "COMPLETED";
    const eventMs = day(def.date).getTime();
    for (const p of attendees) {
      seq++;
      const regAt = isPast
        ? new Date(eventMs - rint(3, 28) * 86400000 + rint(0, 80000) * 1000)
        : new Date(now - rint(0, 29) * 86400000 - rint(0, 80000) * 1000);
      const isVolunteer = rnd() < 0.25;
      const reg = await prisma.registration.create({
        data: {
          userId: p.id, eventId: event.id, seq,
          ticketToken: generateTicketToken(settings.ticketPrefix),
          registrationNumber: formatRegistrationNumber(settings.ticketPrefix, seq, day(def.date).getUTCFullYear()),
          fullName: p.name, email: p.email, phone: p.phone, organization: p.org, city: p.city,
          isVolunteer, volunteerInterest: isVolunteer ? pick(INTERESTS, seq) : null, registeredAt: regAt,
        },
      });
      if (isPast && rnd() < def.attendanceRate) {
        const minutes = rint(0, 60);
        const [sh, sm] = def.start.split(":").map(Number);
        const total = sh * 60 + sm - 15 + minutes;
        await prisma.attendance.create({
          data: {
            registrationId: reg.id, eventId: event.id, checkedInById: rnd() < 0.7 ? created.CHECKIN_STAFF : created.ADMIN,
            method: rnd() < 0.9 ? "QR_SCAN" : "MANUAL_ID",
            checkedInAt: ist(def.date, `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`),
          },
        });
      }
    }
  }

  // Keep the serial in step with the explicit sequence numbers used above.
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Registration"', 'seq'), ${seq})`;

  console.log(`Seeded ${events.length} events, ${seq} registrations.`);
  console.log(process.env.SEED_PASSWORD ? "Seeded accounts use the password from SEED_PASSWORD." : `Demo password for every account: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
