-- First and last name, set on the profile page. Together they become the
-- person's display name on the site and their nickname in the PRISM Discord.
-- Saved by a server action with the service role, like main_classes.

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
