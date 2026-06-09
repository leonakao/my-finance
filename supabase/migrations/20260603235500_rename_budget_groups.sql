alter table public.transactions
drop constraint if exists transactions_budget_group_check;

update public.transactions
set budget_group = case budget_group
  when '50 Necessidades' then 'Necessidades'
  when '30 Desejos' then 'Desejos'
  when '20 Futuro' then 'Futuro'
  else budget_group
end
where budget_group in ('50 Necessidades', '30 Desejos', '20 Futuro');

alter table public.transactions
add constraint transactions_budget_group_check
check (
  budget_group in (
    'Necessidades',
    'Desejos',
    'Futuro',
    'Receita',
    'Transferência',
    'Ignorar'
  )
);
