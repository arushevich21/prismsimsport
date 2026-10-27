-- The main lineups follow the LMU / ACC Driver roles in Discord. Roster entries
-- for people who've never signed in to the site are matched to them by their
-- Discord user id (signed-in people are matched through profile_id instead).

alter table public.drivers add column if not exists discord_id text;
create unique index if not exists drivers_discord_id_key on public.drivers (discord_id);
