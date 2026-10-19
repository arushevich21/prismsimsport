-- Discord sync (Phase 5): each race remembers its announcement message and
-- scheduled event so edits update them in place instead of posting again.

alter table public.races
  add column if not exists discord_message_id text,
  add column if not exists discord_event_id text;

-- Results already announced, so saving a season again doesn't repost them.
alter table public.results
  add column if not exists announced_at timestamptz;

-- Look up accounts by Discord user id (interaction replies, role sync).
create index if not exists profiles_discord_id_idx on public.profiles (discord_id);
