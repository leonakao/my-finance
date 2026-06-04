drop index if exists public.transactions_user_external_id_key;

create unique index if not exists transactions_user_external_id_key
on public.transactions (user_id, external_id);
