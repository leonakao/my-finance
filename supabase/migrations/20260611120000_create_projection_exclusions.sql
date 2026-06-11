create table if not exists public.projection_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('Despesa', 'Receita')),
  description text not null check (length(trim(description)) > 0),
  normalized_description text not null check (length(trim(normalized_description)) > 0),
  scope text not null check (scope in ('month', 'from_month')),
  month_start date not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint projection_exclusions_month_start_check
    check (month_start = date_trunc('month', month_start)::date),
  constraint projection_exclusions_unique
    unique (user_id, type, normalized_description, scope, month_start)
);

create index if not exists projection_exclusions_user_month_idx
on public.projection_exclusions (user_id, month_start);

create index if not exists projection_exclusions_user_identity_idx
on public.projection_exclusions (user_id, type, normalized_description);

create trigger set_projection_exclusions_updated_at
before update on public.projection_exclusions
for each row
execute function public.set_updated_at();

alter table public.projection_exclusions enable row level security;

create policy "projection_exclusions_select_own"
on public.projection_exclusions
for select
to authenticated
using (auth.uid() = user_id);

create policy "projection_exclusions_insert_own"
on public.projection_exclusions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "projection_exclusions_update_own"
on public.projection_exclusions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "projection_exclusions_delete_own"
on public.projection_exclusions
for delete
to authenticated
using (auth.uid() = user_id);
