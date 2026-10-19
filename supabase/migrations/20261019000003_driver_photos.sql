-- Public bucket for driver photos. Anyone can view them; only admins upload.
-- The admin roster resizes photos in the browser before uploading.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-photos', 'driver-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "driver photos: admin write" on storage.objects;
create policy "driver photos: admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'driver-photos' and public.is_admin())
  with check (bucket_id = 'driver-photos' and public.is_admin());
