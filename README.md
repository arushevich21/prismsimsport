# PRISM

Website for PRISM (prismsimsport.app): sim racing community, eSports team (LMU, and ACC with Falcon Motorsport) and PRISM Academy coaching.

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Discord login, storage, realtime) · Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values from Vercel → Settings → Environment Variables
npm run dev
```

Checks: `npm run typecheck`, `npm run lint`, `npm run build`.

## How access works

- Sign-in is Discord through Supabase. The OAuth redirect lands on `/auth/callback`, which sets the session cookies.
- Every account has a role in `profiles.role`: `member`, `student`, `coach` or `admin`.
- Gating happens on the server: `app/admin/layout.tsx` (admins) and `app/(academy)/layout.tsx` (students, coaches, admins). See `lib/auth.ts`.
- `proxy.ts` only keeps the session fresh. It does not decide access.
- Database rules (RLS) are the final line of defence. Never trust a user id sent by the browser; route handlers read the user from the session.

## Editing the site

Sign in as an admin and an indigo bar appears under the header on every public page. Switch it to **Edit** and the outlined blocks become editors: the next race and its lineup (Home and Team), the driver roster with photos, and results per sim and season. Each block saves on its own; saving refreshes the cached public pages straight away. The editor code only loads in edit mode.

## Academy

- Students: `/dashboard`, `/sessions` (book via Cal.com, pay by PayPal/Zelle), `/messages` (live chat with their coach), `/telemetry`, `/library`, `/setups`.
- Coaches: `/coach` queue (applications for admins, telemetry to review, unanswered messages, sessions to mark paid or wrap up), `/coach/students`, `/coach/messages`, `/coach/settings` (Cal.com username, PayPal.me, Zelle). Admins also get `/coach/library` for videos and setup files.
- Applying: `/apply` → `/pending` → approved in the coach queue (assign coach + tier).
- Cal.com: add a webhook to `https://prismsimsport.app/api/cal/webhook` with the `CAL_WEBHOOK_SECRET` secret and the Booking created / rescheduled / cancelled triggers. Each coach needs event types `coaching-30`, `coaching-60`, `coaching-90`.

## Discord

The bot runs inside the site (no separate server): DMs with a Reply button for coaching chat, Academy/Coach/driver roles, lineup posts with scheduled events, and results posts. Setup steps, environment variables and suggested roles/channels: [docs/DISCORD_SETUP.md](docs/DISCORD_SETUP.md).

## Database

SQL lives in `supabase/`:

| File | When to run |
|---|---|
| `migrations/20261019000001_prism_core.sql` | Now. Additive: new tables, roles, chat, sessions. Doesn't touch the legacy DTS tables. |
| `migrations/20261019000002_seed_team.sql` | Now. Makes Anton admin + coach, seeds the driver roster. |
| `migrations/20261019000003_driver_photos.sql` | Now. Public `driver-photos` bucket; only admins can upload. |
| `migrations/20261019000004_academy.sql` | Now. Application status, unlinked Cal.com bookings, students can see coach profiles. |
| `migrations/20261019000005_discord.sql` | Now. Remembers each race's Discord post/event and which results were announced. |
| `cutover/lockdown_legacy.sql` | **Only when the new Academy pages replace the old ones.** Replaces the permissive rules on the legacy tables; the old pages stop working after it runs. |

Run them in the Supabase dashboard → SQL Editor, in that order. All of them are safe to re-run.

Supabase → Authentication → URL Configuration must allow `https://prismsimsport.app/auth/callback` (and `http://localhost:3000/auth/callback` for local dev).
