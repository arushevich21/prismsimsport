-- Roster entries the site created for someone with a Driver role in Discord
-- who had no entry it could find. When a hand-made entry is later linked to
-- the same person, the auto-added one is a duplicate and gets removed.

alter table public.drivers add column if not exists auto_added boolean not null default false;

-- Until now, only those entries had a Discord ID.
update public.drivers set auto_added = true where discord_id is not null and not auto_added;
