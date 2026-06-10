create table if not exists public.transaction_classification_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_mode text not null check (match_mode in ('description', 'description_amount')),
  match_description text not null,
  match_description_normalized text not null,
  match_amount numeric(12, 2),
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
  budget_group_id uuid references public.budget_groups(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint transaction_classification_rules_match_amount_check check (
    (match_mode = 'description' and match_amount is null)
    or (match_mode = 'description_amount' and match_amount is not null)
  )
);

create index if not exists transaction_classification_rules_user_description_idx
on public.transaction_classification_rules (user_id, match_description_normalized);

create index if not exists transaction_classification_rules_user_description_amount_idx
on public.transaction_classification_rules (user_id, match_description_normalized, match_amount);

create unique index if not exists transaction_classification_rules_user_description_key
on public.transaction_classification_rules (user_id, match_mode, match_description_normalized)
where match_mode = 'description';

create unique index if not exists transaction_classification_rules_user_description_amount_key
on public.transaction_classification_rules (user_id, match_mode, match_description_normalized, match_amount)
where match_mode = 'description_amount';

create trigger set_transaction_classification_rules_updated_at
before update on public.transaction_classification_rules
for each row
execute function public.set_updated_at();

create or replace function public.ensure_classification_rule_budget_group_belongs_to_user()
returns trigger
language plpgsql
as $$
begin
  if new.budget_group_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.budget_groups
    where id = new.budget_group_id
      and user_id = new.user_id
  ) then
    return new;
  end if;

  raise exception 'budget_group_id does not belong to classification rule user';
end;
$$;

create trigger ensure_classification_rule_budget_group_user_match
before insert or update of user_id, budget_group_id on public.transaction_classification_rules
for each row
execute function public.ensure_classification_rule_budget_group_belongs_to_user();

alter table public.transaction_classification_rules enable row level security;

create policy "transaction_classification_rules_select_own"
on public.transaction_classification_rules
for select
to authenticated
using (auth.uid() = user_id);

create policy "transaction_classification_rules_insert_own"
on public.transaction_classification_rules
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "transaction_classification_rules_update_own"
on public.transaction_classification_rules
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "transaction_classification_rules_delete_own"
on public.transaction_classification_rules
for delete
to authenticated
using (auth.uid() = user_id);
