/**
 * Production bootstrap. Safe to run more than once.
 *
 *   ADMIN_EMAIL=you@org.org ADMIN_NAME="Your Name" ADMIN_PASSWORD='a-strong-password' npm run db:bootstrap
 *
 * Ensures the 17 SDG goals, the organisation settings row, and a first super admin exist. It never touches events,
 * registrations or other users.
 *
 * To clear out demo content and start clean (DESTRUCTIVE: removes ALL events, registrations, attendance, partners and
 * users, then recreates the super admin):
 *
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:go-live
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { SDG17_DESCRIPTION, SDG_TITLES } from "../prisma/sdgs";

const prisma = new PrismaClient();

function need(name: string) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing ${name}. See the header of scripts/bootstrap.ts.`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const wipe = process.argv.includes("--wipe-demo");
  const confirmed = process.argv.includes("--yes");
  const email = need("ADMIN_EMAIL").toLowerCase();
  const password = need("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";
  if (password.length < 10) {
    console.error("ADMIN_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  if (wipe) {
    if (!confirmed) {
      console.error("Refusing to erase data without --yes. This removes ALL events, registrations, attendance, partners and users.");
      process.exit(1);
    }
    const host = (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/[/?].*$/, "");
    console.log(`Erasing all content on ${host || "the configured database"}…`);
    await prisma.$transaction([
      prisma.attendance.deleteMany(),
      prisma.registration.deleteMany(),
      prisma.event.deleteMany(), // cascades event↔partner and event↔SDG links
      prisma.partner.deleteMany(),
      prisma.upload.deleteMany(),
      prisma.user.deleteMany(), // cascades volunteer profiles and tokens
      prisma.rateLimit.deleteMany(),
    ]);
  }

  // SDG reference data
  for (const [i, title] of SDG_TITLES.entries()) {
    await prisma.sDGGoal.upsert({
      where: { number: i + 1 },
      update: { title },
      create: { number: i + 1, title, description: i === 16 ? SDG17_DESCRIPTION : null },
    });
  }

  // Organisation settings (branding is edited later in Admin → Settings)
  await prisma.orgSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

  // First super admin
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`${email} already exists (role ${existing.role}); leaving it unchanged.`);
  } else {
    await prisma.user.create({
      data: { email, name, passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN", emailVerifiedAt: new Date() },
    });
    console.log(`Created super admin ${email}.`);
  }
  console.log("Done. Sign in at /admin/login, then set your organisation's name, logo and colours in Settings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
