-- Allow anonymous usage of marketing studio
alter table public.ms_generations alter column user_id drop not null;
alter table public.ms_products alter column user_id drop not null;
alter table public.ms_product_images alter column user_id drop not null;

-- Allow public access for anon usage (single-tenant prototype)
drop policy if exists "ms_generations owner select" on public.ms_generations;
drop policy if exists "ms_generations owner insert" on public.ms_generations;
drop policy if exists "ms_generations owner update" on public.ms_generations;
drop policy if exists "ms_generations owner delete" on public.ms_generations;
create policy "ms_generations public" on public.ms_generations for all using (true) with check (true);

drop policy if exists "ms_products owner select" on public.ms_products;
drop policy if exists "ms_products owner insert" on public.ms_products;
drop policy if exists "ms_products owner update" on public.ms_products;
drop policy if exists "ms_products owner delete" on public.ms_products;
create policy "ms_products public" on public.ms_products for all using (true) with check (true);

drop policy if exists "ms_product_images owner select" on public.ms_product_images;
drop policy if exists "ms_product_images owner insert" on public.ms_product_images;
drop policy if exists "ms_product_images owner update" on public.ms_product_images;
drop policy if exists "ms_product_images owner delete" on public.ms_product_images;
create policy "ms_product_images public" on public.ms_product_images for all using (true) with check (true);

drop policy if exists "ms_avatars owner insert" on public.ms_avatars;
drop policy if exists "ms_avatars owner update" on public.ms_avatars;
drop policy if exists "ms_avatars owner delete" on public.ms_avatars;
create policy "ms_avatars public insert" on public.ms_avatars for insert with check (is_builtin = false);
create policy "ms_avatars public update" on public.ms_avatars for update using (is_builtin = false);
create policy "ms_avatars public delete" on public.ms_avatars for delete using (is_builtin = false);