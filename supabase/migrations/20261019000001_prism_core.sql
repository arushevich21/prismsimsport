-- PRISM core schema.
-- Additive only: creates new tables and functions, never alters the legacy DTS
-- tables (members, inquiries, questions, telemetry_uploads, videos, setups,
-- session_videos). Safe to run while the old site is still live.

-------------------------------------------------------------------------------
-- Accounts and roles
-------------------------------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('member', 'student', 'coach', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  discord_id text,
  discord_username text,
  avatar_url text,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now()
);

-- One profile per auth user, filled from the Discord login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, discord_id, discord_username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data -> 'custom_claims' ->> 'global_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'provider_id',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for everyone who has already signed in.
insert into public.profiles (id, display_name, discord_id, discord_username, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data -> 'custom_claims' ->> 'global_name',
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  u.raw_user_meta_data ->> 'provider_id',
  u.raw_user_meta_data ->> 'name',
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- Role helpers. SECURITY DEFINER so policies can call them without
-- recursing through the profiles policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('coach', 'admin') from public.profiles where id = auth.uid()), false);
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own, staff read all" on public.profiles;
create policy "profiles: read own, staff read all" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Users may only change their display name. Role changes go through
-- server actions that check for an admin and use the service role.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-------------------------------------------------------------------------------
-- Team: roster, race lineups, results
-------------------------------------------------------------------------------

do $$ begin
  create type public.sim as enum ('lmu', 'acc');
exception when duplicate_object then null; end $$;

-- Everyone who can be picked for a race. Only drivers on a main lineup, or in
-- a published race lineup, are visible to the public.
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  nickname text,
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  role_tag text,
  sims public.sim[] not null default '{}',
  main_lineup public.sim[] not null default '{}',
  photo_path text,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint main_lineup_within_sims check (main_lineup <@ sims)
);

create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  sim public.sim not null,
  event_name text,
  series text,
  track text,
  race_length text,
  starts_at timestamptz,
  stream_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists races_sim_starts_at_idx on public.races (sim, starts_at);

create table if not exists public.race_cars (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races (id) on delete cascade,
  car_name text,
  class text,
  sort_order integer not null default 0
);
create index if not exists race_cars_race_id_idx on public.race_cars (race_id);

create table if not exists public.race_car_drivers (
  car_id uuid not null references public.race_cars (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (car_id, driver_id)
);
create index if not exists race_car_drivers_driver_id_idx on public.race_car_drivers (driver_id);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  sim public.sim not null,
  season integer not null,
  raced_on date,
  championship text,
  track text,
  car text,
  class text,
  finish integer check (finish > 0),
  created_at timestamptz not null default now()
);
create index if not exists results_sim_season_idx on public.results (sim, season, raced_on desc);

create table if not exists public.season_summaries (
  sim public.sim not null,
  season integer not null,
  best_championship integer check (best_championship > 0),
  primary key (sim, season)
);

alter table public.drivers enable row level security;
alter table public.races enable row level security;
alter table public.race_cars enable row level security;
alter table public.race_car_drivers enable row level security;
alter table public.results enable row level security;
alter table public.season_summaries enable row level security;

drop policy if exists "races: public read published" on public.races;
create policy "races: public read published" on public.races
  for select using (published or public.is_admin());

drop policy if exists "race_cars: public read published" on public.race_cars;
create policy "race_cars: public read published" on public.race_cars
  for select using (
    public.is_admin()
    or exists (select 1 from public.races r where r.id = race_id and r.published)
  );

drop policy if exists "race_car_drivers: public read published" on public.race_car_drivers;
create policy "race_car_drivers: public read published" on public.race_car_drivers
  for select using (
    public.is_admin()
    or exists (
      select 1
      from public.race_cars c
      join public.races r on r.id = c.race_id
      where c.id = car_id and r.published
    )
  );

drop policy if exists "drivers: public read lineup drivers" on public.drivers;
create policy "drivers: public read lineup drivers" on public.drivers
  for select using (
    public.is_admin()
    or (
      not archived
      and (
        cardinality(main_lineup) > 0
        or exists (
          select 1
          from public.race_car_drivers d
          join public.race_cars c on c.id = d.car_id
          join public.races r on r.id = c.race_id
          where d.driver_id = drivers.id and r.published
        )
      )
    )
  );

drop policy if exists "results: public read" on public.results;
create policy "results: public read" on public.results for select using (true);

drop policy if exists "season_summaries: public read" on public.season_summaries;
create policy "season_summaries: public read" on public.season_summaries for select using (true);

-- Admin writes for every team table.
do $$
declare t text;
begin
  foreach t in array array['drivers', 'races', 'race_cars', 'race_car_drivers', 'results', 'season_summaries'] loop
    execute format('drop policy if exists "%1$s: admin write" on public.%1$I', t);
    execute format(
      'create policy "%1$s: admin write" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;

-------------------------------------------------------------------------------
-- Academy: coaches, students, chat, sessions
-------------------------------------------------------------------------------

create table if not exists public.coaches (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  title text,
  bio text,
  cal_username text,
  paypal_me text,
  zelle_handle text,
  accepting_students boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.students (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  coach_id uuid references public.profiles (id) on delete set null,
  tier text not null default 'student' check (tier in ('student', 'driver', 'elite')),
  team_ready boolean not null default false,
  approved_at timestamptz not null default now()
);
create index if not exists students_coach_id_idx on public.students (coach_id);

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.students where profile_id = auth.uid());
$$;

create or replace function public.is_coach_of(student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.students where profile_id = student and coach_id = auth.uid());
$$;

-- On-site coach chat. One thread per student; Discord is only a mirror.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  source text not null default 'site' check (source in ('site', 'discord')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_student_created_idx on public.messages (student_id, created_at);

-- 1-on-1 sessions. Rows are created from Cal.com bookings (server side);
-- payment is PayPal / Zelle, marked paid by the coach.
create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  length_minutes integer not null check (length_minutes in (30, 60, 90)),
  price_cents integer check (price_cents >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'waived')),
  payment_method text check (payment_method in ('paypal', 'zelle', 'other')),
  paid_at timestamptz,
  status text not null default 'booked' check (status in ('booked', 'completed', 'cancelled')),
  recording_url text,
  notes text,
  cal_booking_uid text unique,
  created_at timestamptz not null default now()
);
create index if not exists coaching_sessions_coach_idx on public.coaching_sessions (coach_id, starts_at);
create index if not exists coaching_sessions_student_idx on public.coaching_sessions (student_id, starts_at);

alter table public.coaches enable row level security;
alter table public.students enable row level security;
alter table public.messages enable row level security;
alter table public.coaching_sessions enable row level security;

-- Coaches: any signed-in user can read (students need payment details).
drop policy if exists "coaches: signed-in read" on public.coaches;
create policy "coaches: signed-in read" on public.coaches
  for select to authenticated using (true);

drop policy if exists "coaches: edit own or admin" on public.coaches;
create policy "coaches: edit own or admin" on public.coaches
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- Students: the student, their coach and admins can read.
drop policy if exists "students: read own, coach, admin" on public.students;
create policy "students: read own, coach, admin" on public.students
  for select to authenticated
  using (profile_id = auth.uid() or coach_id = auth.uid() or public.is_admin());

-- Coaches may flip team_ready for their own students; everything else
-- (approval, coach, tier) goes through admin server actions.
drop policy if exists "students: coach updates own students" on public.students;
create policy "students: coach updates own students" on public.students
  for update to authenticated
  using (coach_id = auth.uid() or public.is_admin())
  with check (coach_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.students from anon, authenticated;
grant update (team_ready) on public.students to authenticated;

-- Messages
drop policy if exists "messages: participants read" on public.messages;
create policy "messages: participants read" on public.messages
  for select to authenticated
  using (student_id = auth.uid() or public.is_coach_of(student_id) or public.is_admin());

drop policy if exists "messages: participants send" on public.messages;
create policy "messages: participants send" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and source = 'site'
    and (
      (student_id = auth.uid() and public.is_student())
      or public.is_coach_of(student_id)
      or public.is_admin()
    )
  );

drop policy if exists "messages: participants mark read" on public.messages;
create policy "messages: participants mark read" on public.messages
  for update to authenticated
  using (student_id = auth.uid() or public.is_coach_of(student_id) or public.is_admin());

revoke update, delete on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

-- Live updates for the chat.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Sessions
drop policy if exists "sessions: student, coach, admin read" on public.coaching_sessions;
create policy "sessions: student, coach, admin read" on public.coaching_sessions
  for select to authenticated
  using (student_id = auth.uid() or coach_id = auth.uid() or public.is_admin());

drop policy if exists "sessions: coach or admin update" on public.coaching_sessions;
create policy "sessions: coach or admin update" on public.coaching_sessions
  for update to authenticated
  using (coach_id = auth.uid() or public.is_admin())
  with check (coach_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.coaching_sessions from anon, authenticated;
grant update (payment_status, payment_method, paid_at, status, recording_url, notes)
  on public.coaching_sessions to authenticated;

-------------------------------------------------------------------------------
-- Carry over existing coaching members (legacy table, read only here)
-------------------------------------------------------------------------------

do $$ begin
  if to_regclass('public.members') is not null then
    execute $sql$
      insert into public.students (profile_id, tier)
      select m.user_id, case when m.tier in ('student', 'driver', 'elite') then m.tier else 'student' end
      from public.members m
      join public.profiles p on p.id = m.user_id
      where m.active
      on conflict (profile_id) do nothing
    $sql$;
  end if;
end $$;

update public.profiles p
set role = 'student'
from public.students s
where s.profile_id = p.id and p.role = 'member';
