-- Academy app (Phase 4). Additive: new columns on the legacy inquiries table
-- are optional with defaults, so the old pages keep working until cutover.

-- Application status, so the coach queue can tell new ones from handled ones.
do $$ begin
  if to_regclass('public.inquiries') is not null then
    alter table public.inquiries
      add column if not exists status text,
      add column if not exists decided_at timestamptz,
      add column if not exists created_at timestamptz not null default now();

    -- The table may already have had a status column with its own values.
    -- Map the obvious ones; anything else goes back to pending so it shows
    -- up in the coach queue. (Access comes from the students table, never
    -- from this column, so nobody gains access through this mapping.)
    update public.inquiries
    set status = case
      when lower(trim(status)) in ('approved', 'accepted', 'active') then 'approved'
      when lower(trim(status)) in ('declined', 'rejected', 'denied') then 'declined'
      else 'pending'
    end
    where status is null or status not in ('pending', 'approved', 'declined');

    alter table public.inquiries alter column status set default 'pending';
    alter table public.inquiries alter column status set not null;

    alter table public.inquiries drop constraint if exists inquiries_status_check;
    alter table public.inquiries
      add constraint inquiries_status_check check (status in ('pending', 'approved', 'declined'));
    -- Anyone already approved (now a student) is marked approved.
    update public.inquiries i
    set status = 'approved'
    where status = 'pending'
      and exists (select 1 from public.students s where s.profile_id = i.user_id);
  end if;
end $$;

-- Cal.com bookings can arrive before we know who the student is (e.g. they
-- booked with another email). Keep the attendee details so a coach can link it.
alter table public.coaching_sessions alter column student_id drop not null;
alter table public.coaching_sessions
  add column if not exists attendee_name text,
  add column if not exists attendee_email text;

-- Students need their coach's name and avatar; coach profiles are not secret.
drop policy if exists "profiles: signed-in read coaches" on public.profiles;
create policy "profiles: signed-in read coaches" on public.profiles
  for select to authenticated
  using (role in ('coach', 'admin'));

-- Anton's existing Cal.com username from the old booking page.
update public.coaches
set cal_username = 'dts-anton'
where profile_id = 'eb1671b9-ea44-4681-8b7b-632344e16381' and cal_username is null;
