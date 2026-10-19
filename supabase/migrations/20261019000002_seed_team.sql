-- Initial PRISM data: admin role, coaches and the driver roster.
-- Safe to re-run.

-- Anton (the hardcoded admin in the old site) becomes the admin.
update public.profiles
set role = 'admin'
where id = 'eb1671b9-ea44-4681-8b7b-632344e16381';

insert into public.coaches (profile_id, title, sort_order)
select id, 'Founder · Head coach', 0
from public.profiles
where id = 'eb1671b9-ea44-4681-8b7b-632344e16381'
on conflict (profile_id) do nothing;

-- Adam gets his coach role once he has signed in once (so his profile exists):
--   update public.profiles set role = 'coach' where id = '<adam-user-id>';
--   insert into public.coaches (profile_id, title, sort_order) values ('<adam-user-id>', 'Coach', 1);

insert into public.drivers (name, nickname, country_code, role_tag, sims, main_lineup, sort_order)
select v.name, v.nickname, v.country_code, v.role_tag, v.sims::public.sim[], v.sims::public.sim[], v.sort_order
from (values
  ('Anton Rushevich',  null,        'US', 'PRISM Founder',           '{lmu}', 0),
  ('Aidan Burk',       null,        'CA', 'Prototypes Team Captain', '{lmu}', 1),
  ('Adam Krolikowski', null,        'US', null,                      '{lmu}', 2),
  ('Omar Escorcia',    null,        'CO', null,                      '{lmu}', 3),
  ('Michael Moening',  null,        'US', null,                      '{lmu}', 4),
  ('Kasra Arabi',      null,        'IR', 'Falcon Lead',             '{acc}', 10),
  ('Selena Boonstra',  null,        'CA', 'Falcon Co-Lead',          '{acc}', 11),
  ('Phil Muller',      null,        'US', null,                      '{acc}', 12),
  ('Chris Kewley',     'Dink Donk', 'AU', null,                      '{acc}', 13),
  ('Martin Smith',     null,        'CA', null,                      '{acc}', 14)
) as v(name, nickname, country_code, role_tag, sims, sort_order)
where not exists (select 1 from public.drivers d where d.name = v.name);

-- Link Anton's driver card to his account.
update public.drivers
set profile_id = 'eb1671b9-ea44-4681-8b7b-632344e16381'
where name = 'Anton Rushevich'
  and profile_id is null
  and exists (select 1 from public.profiles where id = 'eb1671b9-ea44-4681-8b7b-632344e16381');
