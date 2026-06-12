create extension if not exists pg_trgm;

alter table public.transaction_classification_rules
add column if not exists match_institution text;

alter table public.transaction_classification_rules
add column if not exists match_account text;

create or replace function public.normalize_transaction_classification_rule_match_context()
returns trigger
language plpgsql
as $$
begin
  new.match_institution := nullif(btrim(new.match_institution), '');
  new.match_account := nullif(btrim(new.match_account), '');
  return new;
end;
$$;

drop trigger if exists normalize_transaction_classification_rule_match_context on public.transaction_classification_rules;
create trigger normalize_transaction_classification_rule_match_context
before insert or update of match_institution, match_account on public.transaction_classification_rules
for each row
execute function public.normalize_transaction_classification_rule_match_context();

alter table public.transactions
add column if not exists description_normalized text generated always as (
  lower(
    regexp_replace(
      translate(
        btrim(description),
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
      ),
      '\s+',
      ' ',
      'g'
    )
  )
) stored;

drop index if exists public.transaction_classification_rules_user_description_key;
create unique index if not exists transaction_classification_rules_user_description_key
on public.transaction_classification_rules (user_id, match_mode, match_description_normalized, match_institution, match_account)
where match_mode = 'description';

drop index if exists public.transaction_classification_rules_user_description_amount_key;
create unique index if not exists transaction_classification_rules_user_description_amount_key
on public.transaction_classification_rules (user_id, match_mode, match_description_normalized, match_amount, match_institution, match_account)
where match_mode = 'description_amount';

create index if not exists transaction_classification_rules_user_description_context_idx
on public.transaction_classification_rules (user_id, match_description_normalized, match_institution, match_account);

create index if not exists transactions_description_normalized_trgm_idx
on public.transactions using gin (description_normalized gin_trgm_ops);

