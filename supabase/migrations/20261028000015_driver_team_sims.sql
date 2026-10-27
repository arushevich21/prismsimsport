-- The sims a driver races in as part of the team without being on that sim's
-- main lineup, e.g. ACC for anyone with the Falcon Motorsport role in Discord.
-- Synced from their roles; race lineups don't label them GUEST there.

alter table public.drivers add column if not exists team_sims public.sim[] not null default '{}';
