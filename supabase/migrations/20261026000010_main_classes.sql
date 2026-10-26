-- The classes someone mainly drives (Hypercar, GT3…), picked on their profile.
-- Two at most: it's what they mainly race, not everything they've tried. Each
-- class has a Discord role the site gives them to match.
--
-- Saved by a server action with the service role; members can't write it
-- directly (profiles only grants update on display_name).

alter table public.profiles add column if not exists main_classes text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_main_classes_check;
alter table public.profiles add constraint profiles_main_classes_check
  check (cardinality(main_classes) <= 2 and main_classes <@ array['hy', 'lmp2', 'lmp3', 'gt3']);
