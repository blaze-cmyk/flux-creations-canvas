drop policy if exists "ms_avatars view builtin or own" on public.ms_avatars;

create policy "ms_avatars view builtin own or anonymous uploads"
on public.ms_avatars
for select
to public
using (
  is_builtin = true
  or user_id is null
  or auth.uid() = user_id
);