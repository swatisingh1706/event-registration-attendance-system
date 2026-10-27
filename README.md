# GreenBridge Events — NGO event registration, QR ticketing & attendance

A Next.js (App Router) + TypeScript + PostgreSQL + Prisma platform with two integrated sides:

- **Participant portal** — browse events, register, hold a secure QR ticket, track attendance and volunteer hours.
- **NGO admin portal** — create/publish events, manage partners and SDGs, scan tickets at the door, manage attendance, run reports, export to Excel/CSV.

PostgreSQL is the source of truth. The scanner only sends a ticket token to the server; the server validates it and writes attendance. Nothing on the dashboards is hardcoded. The organisation's name, logo, colours and contact details live in the database and are edited at **Admin → Settings** — "GreenBridge Foundation" is only seed data.

## Contents
[Quick start](#quick-start-local) · [Environment variables](#environment-variables) · [Demo accounts](#demo-accounts-development-only) · [How it works](#how-it-works) · [Going live](#going-live-vercel--neon-free) · [Running it day to day](#running-it-day-to-day) · [Security](#security) · [Testing](#testing) · [Credits & legal](#credits--legal)

## Quick start (local)

Prerequisites: Node.js 20.9+, npm, PostgreSQL 14+.

```bash
npm install
cp .env.example .env            # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate              # creates the tables
npm run db:seed                 # demo NGO: 8 events, ~400 registrations, attendance
npm run dev                     # http://localhost:3000
```

The seed **wipes and recreates** all data — never run it against a database that holds real data. Demo event dates are relative to today so there are always upcoming events (set `SEED_FIXED_DATES=1` for the original fixed dates).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. On Neon/Supabase use the pooled URL. |
| `AUTH_SECRET` | yes | ≥32 random characters; signs session cookies. |
| `NEXTAUTH_URL` | yes | Public site URL; used in links inside emails. |
| `APP_TIMEZONE` | yes | IANA timezone of your events (default `Asia/Kolkata`). |
| `RESEND_API_KEY`, `MAIL_FROM` | no | Turns on email (see [Email](#email)). |
| `SEED_PASSWORD` | no | Password for seeded demo accounts (default `Demo@12345`). |

## Demo accounts (development only)

After `npm run db:seed` every account uses `Demo@12345` unless you set `SEED_PASSWORD`. **Do not use these on a public site.**

| Role | Sign in at | Email |
| --- | --- | --- |
| Participant | `/login` | `sonal.sharma@example.com` |
| Check-in staff | `/admin/login` | `staff@greenbridge.example` |
| Admin | `/admin/login` | `admin@greenbridge.example` |
| Super admin | `/admin/login` | `superadmin@greenbridge.example` |

Participants and staff have **separate sign-in pages** and each refuses the other's accounts.

## How it works

**Participant:** Events → Register (free account; email confirmation if email is on) → QR ticket in *My Portal → My Tickets*, also emailed. Tickets can be downloaded as an image, and events added to a calendar (`.ics`). Participants can cancel a registration (frees the seat), change their password (signs out other devices) and delete their account.

**Admin:** create events (*Save Draft* keeps them private, *Publish* makes them public immediately), upload cover photos, manage partners and SDGs, watch the dashboard, export participants/attendance/reports to **Excel or CSV**. Roles: check-in staff (scanner + attendance only), admin, super admin (also manages roles and can issue a temporary password).

**QR check-in:** *Admin → QR Scanner* → choose the event → **Start Scanner**. The camera reads a QR that contains only a random token; the server validates it (valid? right event? cancelled? already used? within the check-in window?) and PostgreSQL's unique constraint guarantees one check-in per ticket even if two scanners race. No camera? Enter the ticket ID manually — same validation. Camera access needs HTTPS (or `localhost`).

**Check-in window:** by default tickets can only be scanned from 24 h before an event starts until 24 h after it ends (*Admin → Settings → Check-in*; `0` = no limit). Manual check-ins by an admin from the attendance page are exempt.

## Going live (Vercel + Neon, free)

1. **Database:** create a free Postgres at [neon.tech](https://neon.tech) (or add Neon from the Vercel dashboard → Storage). Copy the *pooled* connection string.
2. **Vercel:** import the repo (or run `npx vercel` in this folder). Set the environment variables above for *Production*. `npm run build` already runs `prisma generate`.
3. **Create the tables** (once, and after every release that adds migrations), from your computer with the *direct* (non-pooled) URL:
   ```bash
   DATABASE_URL="<direct connection string>" npm run db:deploy
   ```
4. **Create your first admin** — no demo data:
   ```bash
   DATABASE_URL="<direct connection string>" ADMIN_EMAIL="you@org.org" ADMIN_NAME="Your Name" ADMIN_PASSWORD="a-strong-password" npm run db:bootstrap
   ```
   This adds the 17 SDG goals, a settings row and your super admin, and touches nothing else. Sign in at `/admin/login`, then set the organisation name, logo, colours and contact details under **Settings**.
5. **Deploy:** `vercel deploy --prod`, and set `NEXTAUTH_URL` to the final address (add a custom domain in Vercel if you have one).

**Starting clean after a demo:** `npm run db:go-live` (needs the same `ADMIN_*` variables) **erases all events, registrations, attendance, partners and users** and recreates your super admin. It refuses to run without `--yes`, which the npm script supplies, so double-check `DATABASE_URL` first.

### Email
Without email the site works, but password-reset links are only written to the server log, sign-ups are not asked to confirm their address, and registration confirmations are not sent. Super admins can issue temporary passwords (*Settings → Team roles → Reset password*). To turn email on, create a free [Resend](https://resend.com) account (3,000 emails/month), verify your sending domain, and set `RESEND_API_KEY` and `MAIL_FROM`. With email on, new accounts must confirm their address before registering for events.

### Hosting notes
- The free Neon database sleeps when idle; the first request after a quiet period can take a couple of seconds.
- Vercel's free *Hobby* plan is for personal, non-commercial use. If your organisation's use counts as commercial, use their paid plan or another host (any Node.js host works: `npm run build && npm start`).
- Uploaded images are stored in PostgreSQL (≈ a few hundred KB each after automatic resizing), so no extra storage service is needed.

## Running it day to day
- **Monitoring:** point a free uptime monitor (UptimeRobot, Better Stack) at `https://your-site/api/health` — it returns `200` when the app can reach the database and `503` when it can't. Runtime errors appear in Vercel → Logs.
- **Backups:** Neon keeps point-in-time history (length depends on your plan). For something you control, export regularly: Participants → *Export Excel*, plus `pg_dump "$DATABASE_URL" > backup.sql`.
- **Releases:** run `npm run lint` (type-check), `npm run build` and `npm run test:flow` before deploying; CI does the same on every push.
- **Dependencies:** `npm run audit` fails on critical advisories. One build-time advisory in Prisma's own CLI (not part of the running app) is known and waits on an upstream release.

## Security
- Passwords are bcrypt-hashed (cost 12). Sessions are signed, httpOnly, SameSite=Lax cookies; the role is **re-read from the database on every request**, and changing or resetting a password signs out every other device.
- Every admin page, server action and API route checks the signed-in user's permission server-side; hiding buttons is never the only protection.
- Zod validation on all input, Prisma parameterised queries, CSV/Excel export formula-injection protection, uploads accept only real JPG/PNG/WebP/GIF files (checked by content, never SVG).
- Rate limiting (stored in PostgreSQL, so it works on serverless) on login, sign-up, password reset, e-mail confirmation, uploads and check-in. Sign-up also uses a honeypot and a minimum-time check against bots.
- Security headers: HSTS, `nosniff`, no framing, `form-action`/`base-uri` locked to the site. QR tickets contain only a 192-bit random token, never personal data.

## Testing
```bash
npm run lint        # TypeScript
npm run test:flow   # against a real PostgreSQL: seat races, duplicate registration, every check-in outcome,
                    # simultaneous scans, check-in window, email-verification tokens (cleans up after itself)
```
GitHub Actions (`.github/workflows/ci.yml`) runs type-check, build, the test above and a dependency audit on every push.
Accessibility was audited automatically (axe-core, WCAG 2.1 AA + best practice) on every page; there are no findings. Please also try the scanner on a real phone before a live event.

## Credits & legal
- Photos in `public/photos/` are free-to-use images from [Unsplash](https://unsplash.com/license), included as demo content — replace them with your own from the admin forms.
- `/privacy` and `/terms` are plain-language pages that describe what this application actually does. They are a starting point, **not legal advice**: have them reviewed for your jurisdiction (for example India's DPDP Act or GDPR) and adjust the contact details in Settings.
