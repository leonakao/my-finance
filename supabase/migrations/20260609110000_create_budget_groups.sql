create table if not exists public.budget_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_percentage numeric(5, 2) not null check (target_percentage >= 0 and target_percentage <= 100),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint budget_groups_user_name_key unique (user_id, name)
);

create index if not exists budget_groups_user_id_idx
on public.budget_groups (user_id);

create trigger set_budget_groups_updated_at
before update on public.budget_groups
for each row
execute function public.set_updated_at();

alter table public.budget_groups enable row level security;

create policy "budget_groups_select_own"
on public.budget_groups
for select
to authenticated
using (auth.uid() = user_id);

create policy "budget_groups_insert_own"
on public.budget_groups
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "budget_groups_update_own"
on public.budget_groups
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "budget_groups_delete_own"
on public.budget_groups
for delete
to authenticated
using (auth.uid() = user_id);

insert into public.budget_groups (user_id, name, target_percentage)
select
  users.id,
  defaults.name,
  defaults.target_percentage
from auth.users as users
cross join (
  values
    ('Necessidades', 50.00::numeric),
    ('Desejos', 30.00::numeric),
    ('Futuro', 20.00::numeric)
) as defaults(name, target_percentage)
on conflict (user_id, name) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      updated_at = timezone('utc'::text, now());

  insert into public.budget_groups (user_id, name, target_percentage)
  values
    (new.id, 'Necessidades', 50.00),
    (new.id, 'Desejos', 30.00),
    (new.id, 'Futuro', 20.00)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;
