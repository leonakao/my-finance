alter table public.transactions
add column budget_group_id uuid;

alter table public.transactions
add constraint transactions_budget_group_id_fkey
foreign key (budget_group_id)
references public.budget_groups(id)
on delete set null;

create or replace function public.ensure_transaction_budget_group_belongs_to_user()
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

  raise exception 'budget_group_id does not belong to transaction user';
end;
$$;

create trigger ensure_transactions_budget_group_user_match
before insert or update of user_id, budget_group_id on public.transactions
for each row
execute function public.ensure_transaction_budget_group_belongs_to_user();

update public.transactions as transactions
set budget_group_id = budget_groups.id
from public.budget_groups as budget_groups
where budget_groups.user_id = transactions.user_id
  and budget_groups.name = case transactions.budget_group
    when '50 Necessidades' then 'Necessidades'
    when '30 Desejos' then 'Desejos'
    when '20 Futuro' then 'Futuro'
    when 'Necessidades' then 'Necessidades'
    when 'Desejos' then 'Desejos'
    when 'Futuro' then 'Futuro'
    else null
  end;

create index if not exists transactions_user_budget_group_id_idx
on public.transactions (user_id, budget_group_id);

drop index if exists public.transactions_user_group_idx;

alter table public.transactions
drop constraint if exists transactions_budget_group_check;

alter table public.transactions
drop column budget_group;
