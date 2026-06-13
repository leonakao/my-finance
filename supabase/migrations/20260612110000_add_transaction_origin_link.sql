alter table public.transactions
add column origin_transaction_id uuid references public.transactions(id) on delete cascade;

alter table public.transactions
add column is_ignored boolean not null default false;

alter table public.transactions
add column source_kind text not null default 'manual';

alter table public.transactions
add constraint transactions_source_kind_check
check (
  source_kind in (
    'manual',
    'manual_recurring',
    'imported_installment',
    'imported_statement',
    'imported_card'
  )
);

create or replace function public.ensure_transaction_origin_is_valid()
returns trigger
language plpgsql
as $$
begin
  if new.origin_transaction_id is null then
    return new;
  end if;

  if new.origin_transaction_id = new.id then
    raise exception 'origin_transaction_id cannot reference the same transaction';
  end if;

  if exists (
    select 1
    from public.transactions as origin
    where origin.id = new.origin_transaction_id
      and origin.user_id = new.user_id
      and origin.origin_transaction_id is null
  ) then
    return new;
  end if;

  raise exception 'origin_transaction_id must reference a principal transaction owned by the same user';
end;
$$;

create trigger ensure_transactions_origin_user_match
before insert or update of user_id, origin_transaction_id on public.transactions
for each row
execute function public.ensure_transaction_origin_is_valid();

create index if not exists transactions_origin_transaction_id_idx
on public.transactions (origin_transaction_id);

create index if not exists transactions_user_is_ignored_date_idx
on public.transactions (user_id, is_ignored, date desc);

create index if not exists transactions_user_source_kind_date_idx
on public.transactions (user_id, source_kind, date desc);
