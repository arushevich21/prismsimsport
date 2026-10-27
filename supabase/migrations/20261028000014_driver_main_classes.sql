-- The classes a driver mainly drives, set in the roster editor for drivers not
-- linked to anyone (linked drivers' classes live on their profile or in their
-- Discord class roles). Same values as profiles.main_classes. Replaces
-- academy_class, which held a single class and only for academy drivers.

alter table public.drivers add column if not exists main_classes text[] not null default '{}';

alter table public.drivers drop constraint if exists drivers_main_classes_check;
alter table public.drivers add constraint drivers_main_classes_check
  check (cardinality(main_classes) <= 2 and main_classes <@ array['hy', 'lmp2', 'lmp3', 'gt3']);

update public.drivers
set main_classes = array[case academy_class
  when 'Hypercar' then 'hy'
  when 'LMP2' then 'lmp2'
  when 'LMP3' then 'lmp3'
  else 'gt3'
end]
where academy_class is not null and main_classes = '{}';
