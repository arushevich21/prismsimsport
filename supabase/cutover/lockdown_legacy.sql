-- !! Run this only when the new Academy pages replace the old DTS ones. !!
--
-- The old site writes to these tables straight from the browser (admin page,
-- telemetry uploads), so it relies on permissive rules. This migration replaces
-- every existing policy on the legacy tables with strict ones. The old pages
-- will stop working once it runs; the new pages do their writes server side.

create or replace function pg_temp.reset_policies(tbl text)
returns void
language plpgsql
as $$
declare pol record;
begin
  if to_regclass('public.' || tbl) is null then
    return;
  end if;
  execute format('alter table public.%I enable row level security', tbl);
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
    execute format('drop policy %I on public.%I', pol.policyname, tbl);
  end loop;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['members', 'inquiries', 'questions', 'telemetry_uploads', 'videos', 'setups', 'session_videos'] loop
    perform pg_temp.reset_policies(t);
  end loop;
end $$;

-- members (legacy approval flag): read own or staff; writes are server only.
do $$ begin
  if to_regclass('public.members') is not null then
    create policy "members: read own or staff" on public.members
      for select to authenticated using (user_id = auth.uid() or public.is_staff());
  end if;
end $$;

-- inquiries (coaching applications): applicant inserts and reads own; staff read all.
do $$ begin
  if to_regclass('public.inquiries') is not null then
    create policy "inquiries: read own or staff" on public.inquiries
      for select to authenticated using (user_id = auth.uid() or public.is_staff());
    create policy "inquiries: insert own" on public.inquiries
      for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;

-- questions (replaced by messages): read own or staff.
do $$ begin
  if to_regclass('public.questions') is not null then
    create policy "questions: read own or staff" on public.questions
      for select to authenticated using (user_id = auth.uid() or public.is_staff());
  end if;
end $$;

-- telemetry_uploads: students upload and read their own; staff review.
do $$ begin
  if to_regclass('public.telemetry_uploads') is not null then
    create policy "telemetry: read own or staff" on public.telemetry_uploads
      for select to authenticated using (user_id = auth.uid() or public.is_staff());
    create policy "telemetry: students insert own" on public.telemetry_uploads
      for insert to authenticated with check (user_id = auth.uid() and public.is_student());
    create policy "telemetry: staff review" on public.telemetry_uploads
      for update to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
end $$;

-- videos and setups (library): students and staff read; admins write.
do $$
declare t text;
begin
  foreach t in array array['videos', 'setups'] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'create policy "%1$s: students read" on public.%1$I for select to authenticated using (public.is_student() or public.is_staff())',
        t
      );
      execute format(
        'create policy "%1$s: admin write" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        t
      );
    end if;
  end loop;
end $$;

-- session_videos (legacy recordings): student reads own; staff manage.
do $$ begin
  if to_regclass('public.session_videos') is not null then
    create policy "session_videos: read own or staff" on public.session_videos
      for select to authenticated using (user_id = auth.uid() or public.is_staff());
    create policy "session_videos: staff write" on public.session_videos
      for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
end $$;

-- Storage: replace any policy that mentions the telemetry or setups buckets.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || coalesce(with_check, '')) ~ '(telemetry|setups)'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "telemetry files: student uploads to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'telemetry'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_student()
  );

create policy "telemetry files: owner or staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'telemetry'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

create policy "setup files: students read" on storage.objects
  for select to authenticated
  using (bucket_id = 'setups' and (public.is_student() or public.is_staff()));

create policy "setup files: admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'setups' and public.is_admin())
  with check (bucket_id = 'setups' and public.is_admin());
