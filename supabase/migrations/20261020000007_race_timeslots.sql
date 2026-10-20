-- Race timeslots: one race (e.g. the 24 Hours of Le Mans) where different
-- PRISM cars start in different splits.
--
-- race_cars.starts_at: this car's timeslot. Null means the race's green flag.
-- races.last_start_at: the latest timeslot in the race, so a race stays "next"
--   until its last split has started. The race editor keeps it up to date.
-- races.discord_slot_events: one Discord scheduled event per timeslot, as
--   { "<start time ISO>": "<event id>" }.

alter table public.race_cars add column if not exists starts_at timestamptz;

alter table public.races
  add column if not exists last_start_at timestamptz,
  add column if not exists discord_slot_events jsonb not null default '{}'::jsonb;

update public.races r
set last_start_at = greatest(r.starts_at, (select max(c.starts_at) from public.race_cars c where c.race_id = r.id))
where r.last_start_at is null;

create index if not exists races_sim_last_start_at_idx on public.races (sim, last_start_at);

-- Timeslot channels: a car can also have its lineup posted in its own Discord
-- channel (e.g. #friday-lm24). races.discord_channel_posts remembers those
-- posts as { "<channel id>": "<message id>" } so saves edit them in place.
alter table public.race_cars add column if not exists discord_channel_id text;
alter table public.races add column if not exists discord_channel_posts jsonb not null default '{}'::jsonb;

-- Application tickets: the private Discord channel the bot opened for an
-- applicant, so approving or declining can post the outcome there.
do $$ begin
  if to_regclass('public.inquiries') is not null then
    alter table public.inquiries add column if not exists discord_channel_id text;
  end if;
end $$;
