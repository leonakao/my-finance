create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  type text not null check (type in ('Despesa', 'Receita', 'Transferência')),
  category text not null check (
    category in (
      'Alimentação',
      'Transporte',
      'Moradia',
      'Saúde',
      'Educação',
      'Lazer',
      'Compras',
      'Assinaturas',
      'Investimentos',
      'Salário',
      'Telefone',
      'Outros'
    )
  ),
  budget_group text not null check (
    budget_group in (
      'Necessidades',
      'Desejos',
      'Futuro',
      'Receita',
      'Transferência',
      'Ignorar'
    )
  ),
  account text not null default '',
  institution text not null default '',
  notes text not null default '',
  invoice text not null default '',
  installment text not null default '',
  external_id text,
  source text not null default 'Manual',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists transactions_user_external_id_key
on public.transactions (user_id, external_id)
where external_id is not null;

create index if not exists transactions_user_date_idx
on public.transactions (user_id, date desc);

create index if not exists transactions_user_group_idx
on public.transactions (user_id, budget_group);

create index if not exists transactions_user_category_idx
on public.transactions (user_id, category);

create trigger set_transactions_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "transactions_select_own"
on public.transactions
for select
to authenticated
using (auth.uid() = user_id);

create policy "transactions_insert_own"
on public.transactions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "transactions_update_own"
on public.transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "transactions_delete_own"
on public.transactions
for delete
to authenticated
using (auth.uid() = user_id);
