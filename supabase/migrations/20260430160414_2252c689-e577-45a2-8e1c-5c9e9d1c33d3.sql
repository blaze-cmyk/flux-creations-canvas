drop policy if exists "ms-products user read" on storage.objects;
drop policy if exists "ms-products user write" on storage.objects;
drop policy if exists "ms-products user update" on storage.objects;
drop policy if exists "ms-products user delete" on storage.objects;
drop policy if exists "ms-avatars user read" on storage.objects;
drop policy if exists "ms-avatars user write" on storage.objects;
drop policy if exists "ms-avatars user update" on storage.objects;
drop policy if exists "ms-avatars user delete" on storage.objects;

create policy "ms-products public all" on storage.objects for all
  using (bucket_id = 'ms-products') with check (bucket_id = 'ms-products');
create policy "ms-avatars public all" on storage.objects for all
  using (bucket_id = 'ms-avatars') with check (bucket_id = 'ms-avatars');