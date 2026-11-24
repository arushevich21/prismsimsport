-- Driver social accounts, shown as icons on their driver card.
--
-- Each column holds just the handle (no @, no link); YouTube keeps "@name" or
-- "channel/UC…". Drivers set their own from /profile (saved to their linked
-- roster entry by the server), and admins can set anyone's in the roster editor.
-- They're public like the rest of the driver card, so the existing read policy
-- covers them.

alter table public.drivers add column if not exists social_instagram text;
alter table public.drivers add column if not exists social_twitch text;
alter table public.drivers add column if not exists social_youtube text;
alter table public.drivers add column if not exists social_tiktok text;
alter table public.drivers add column if not exists social_x text;

do $$ begin
  alter table public.drivers add constraint drivers_socials_length_check check (
    coalesce(length(social_instagram), 0) <= 64
    and coalesce(length(social_twitch), 0) <= 64
    and coalesce(length(social_youtube), 0) <= 64
    and coalesce(length(social_tiktok), 0) <= 64
    and coalesce(length(social_x), 0) <= 64
  );
exception when duplicate_object then null; end $$;
