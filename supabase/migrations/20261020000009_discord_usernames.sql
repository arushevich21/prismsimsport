-- Discord sign-in (via Supabase) stores usernames as "name#0", a leftover of
-- Discord's old four-digit tags. Store and show them as plain "name".

update public.profiles
set discord_username = regexp_replace(discord_username, '#0$', '')
where discord_username like '%#0';

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
    regexp_replace(new.raw_user_meta_data ->> 'name', '#0$', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
