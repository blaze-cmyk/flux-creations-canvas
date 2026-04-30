
-- shared updated_at trigger (re-create safely)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- ms_products
create table public.ms_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null default 'Untitled product',
  source_url text,
  brand_color text,
  description text,
  status text not null default 'ready', -- ready | failed | pending
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ms_products enable row level security;
create policy "ms_products owner select" on public.ms_products for select using (auth.uid() = user_id);
create policy "ms_products owner insert" on public.ms_products for insert with check (auth.uid() = user_id);
create policy "ms_products owner update" on public.ms_products for update using (auth.uid() = user_id);
create policy "ms_products owner delete" on public.ms_products for delete using (auth.uid() = user_id);
create trigger ms_products_updated before update on public.ms_products for each row execute function public.update_updated_at_column();
create index ms_products_user_idx on public.ms_products(user_id, created_at desc);

-- ms_product_images
create table public.ms_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.ms_products(id) on delete cascade,
  user_id uuid not null,
  storage_path text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ms_product_images enable row level security;
create policy "ms_product_images owner select" on public.ms_product_images for select using (auth.uid() = user_id);
create policy "ms_product_images owner insert" on public.ms_product_images for insert with check (auth.uid() = user_id);
create policy "ms_product_images owner update" on public.ms_product_images for update using (auth.uid() = user_id);
create policy "ms_product_images owner delete" on public.ms_product_images for delete using (auth.uid() = user_id);
create index ms_product_images_product_idx on public.ms_product_images(product_id);

-- ms_avatars
create table public.ms_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, -- null for built-in
  name text not null,
  gender text, -- male | female | other | null
  storage_path text, -- path within ms-avatars bucket (when user-uploaded)
  public_url text,   -- absolute URL for built-in avatars
  is_builtin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ms_avatars enable row level security;
create policy "ms_avatars view builtin or own" on public.ms_avatars for select using (is_builtin = true or auth.uid() = user_id);
create policy "ms_avatars owner insert" on public.ms_avatars for insert with check (auth.uid() = user_id and is_builtin = false);
create policy "ms_avatars owner update" on public.ms_avatars for update using (auth.uid() = user_id and is_builtin = false);
create policy "ms_avatars owner delete" on public.ms_avatars for delete using (auth.uid() = user_id and is_builtin = false);
create index ms_avatars_user_idx on public.ms_avatars(user_id);
create index ms_avatars_builtin_idx on public.ms_avatars(is_builtin);

-- ms_generations
create table public.ms_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid references public.ms_products(id) on delete set null,
  avatar_id uuid references public.ms_avatars(id) on delete set null,
  format text,        -- ugc | unboxing | tutorial | hyper | review | tv | wildcard | tryon | pro_tryon
  surface text,       -- product | app
  aspect text,
  duration_seconds int,
  resolution text,
  prompt text not null,
  script jsonb,       -- {scene, voiceover, camera_notes, beats}
  reference_paths text[] default '{}',
  fal_request_id text,
  status text not null default 'queued', -- queued | processing | done | failed
  video_url text,
  thumb_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ms_generations enable row level security;
create policy "ms_generations owner select" on public.ms_generations for select using (auth.uid() = user_id);
create policy "ms_generations owner insert" on public.ms_generations for insert with check (auth.uid() = user_id);
create policy "ms_generations owner update" on public.ms_generations for update using (auth.uid() = user_id);
create policy "ms_generations owner delete" on public.ms_generations for delete using (auth.uid() = user_id);
create trigger ms_generations_updated before update on public.ms_generations for each row execute function public.update_updated_at_column();
create index ms_generations_user_idx on public.ms_generations(user_id, created_at desc);

-- storage buckets (private)
insert into storage.buckets (id, name, public) values ('ms-products', 'ms-products', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('ms-avatars', 'ms-avatars', false) on conflict (id) do nothing;

-- storage policies: user folder convention {user_id}/...
create policy "ms-products user read" on storage.objects for select
  using (bucket_id = 'ms-products' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "ms-products user write" on storage.objects for insert
  with check (bucket_id = 'ms-products' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "ms-products user update" on storage.objects for update
  using (bucket_id = 'ms-products' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "ms-products user delete" on storage.objects for delete
  using (bucket_id = 'ms-products' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "ms-avatars public read builtin" on storage.objects for select
  using (bucket_id = 'ms-avatars' and (storage.foldername(name))[1] = 'builtin');
create policy "ms-avatars user read" on storage.objects for select
  using (bucket_id = 'ms-avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "ms-avatars user write" on storage.objects for insert
  with check (bucket_id = 'ms-avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "ms-avatars user update" on storage.objects for update
  using (bucket_id = 'ms-avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "ms-avatars user delete" on storage.objects for delete
  using (bucket_id = 'ms-avatars' and auth.uid()::text = (storage.foldername(name))[1]);
