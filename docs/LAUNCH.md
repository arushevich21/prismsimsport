# Go-live checklist

Work top to bottom. Steps marked **before merge** can be done while the old site is still live.

## Before merge

1. **Database**: run every file in `supabase/migrations/` in order (Supabase → SQL Editor). All are additive and safe to re-run. *(Do **not** run `supabase/cutover/` yet.)*
2. **Supabase auth**: Authentication → URL Configuration → add `https://prismsimsport.app/auth/callback` (and your Vercel preview domain's `/auth/callback` if you test on a preview).
3. **Vercel env vars** (Production, plus Preview if you'll test there). See `.env.example` for the full list:
   - already set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_WEBHOOK_URL`, `DISCORD_QA_WEBHOOK_URL`, `NEXT_PUBLIC_DISCORD_INVITE_URL`
   - new: `CAL_WEBHOOK_SECRET`
   - Discord bot (optional at launch; webhooks are the fallback): see `docs/DISCORD_SETUP.md`
4. **Cal.com**: webhook to `https://www.prismsimsport.app/api/cal/webhook` with the secret above and the Booking created / rescheduled / cancelled triggers. Event types `coaching-30`, `coaching-60`, `coaching-90` on each coach's account.
5. **Preview test** (recommended): push the `overhaul` branch, open the Vercel preview, sign in, and click through: Home, Team (LMU/ACC), edit mode (save a race, a result, a roster change), Academy pages, coach queue. Make one test Cal.com booking to confirm it appears in the queue.

## Launch

6. Merge `overhaul` into `main` (Vercel deploys production).
7. **Lock down the old tables**: run `supabase/cutover/lockdown_legacy.sql`. The old DTS pages are gone after the deploy, so nothing relies on the open rules any more.
8. Everyone signs in once more (the login moved from browser storage to cookies).

## Right after launch

9. Coaches: Adam signs in once → you add him in **Coach → Settings → Add a coach** → he fills in Cal.com, PayPal.me and Zelle.
10. You: fill in your own PayPal.me / Zelle in **Coach → Settings**.
11. Roster: upload driver photos and link drivers to their accounts (edit mode on the Team page).
12. Discord bot: follow `docs/DISCORD_SETUP.md`, then set the Interactions Endpoint URL once the deploy with `DISCORD_PUBLIC_KEY` is live.

## If something goes wrong

- Vercel → Deployments → promote the previous deployment to roll back the site instantly.
- The migrations only add things; rolling the site back doesn't need a database rollback. The one exception is the lockdown file: if you roll back to the old DTS site, its admin page will no longer be able to write until you re-open those rules.
