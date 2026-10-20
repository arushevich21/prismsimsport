-- Academy drivers and LMU Driver Rank.
--
-- academy: the driver races for PRISM through the driver academy. When they're
-- in a race lineup but not on that sim's main lineup, the site labels them
-- ACADEMY instead of GUEST.
--
-- lmu_dr_*: the driver's LMU Driver Rank, copied by hand from their in-game /
-- RaceControl profile (there's no public API to read it from). Tiers are
-- Bronze, Silver, Gold and Platinum, each with levels 1-3.

alter table public.drivers add column if not exists academy boolean not null default false;
alter table public.drivers add column if not exists lmu_dr_tier text;
alter table public.drivers add column if not exists lmu_dr_level smallint;
alter table public.drivers add column if not exists lmu_dr_updated_on date;

do $$ begin
  alter table public.drivers add constraint drivers_lmu_dr_tier_check
    check (lmu_dr_tier in ('bronze', 'silver', 'gold', 'platinum'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.drivers add constraint drivers_lmu_dr_level_check
    check (lmu_dr_level is null or (lmu_dr_level between 1 and 3 and lmu_dr_tier is not null));
exception when duplicate_object then null; end $$;

-- academy_class: the class an academy driver is developing in (Hypercar,
-- LMP2, GT3…), used to group them on the team page.
alter table public.drivers add column if not exists academy_class text;

-- Academy drivers are listed on the team page, so visitors can see them even
-- before they've been in a published race lineup.
drop policy if exists "drivers: public read lineup drivers" on public.drivers;
create policy "drivers: public read lineup drivers" on public.drivers
  for select using (
    public.is_admin()
    or (
      not archived
      and (
        cardinality(main_lineup) > 0
        or academy
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
