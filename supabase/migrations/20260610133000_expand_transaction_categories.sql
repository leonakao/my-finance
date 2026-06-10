create or replace function public.is_valid_transaction_category(category_value text)
returns boolean
language sql
immutable
as $$
  select category_value in (
    'Alimentação',
    'Moradia',
    'Transporte',
    'Saúde',
    'Seguros',
    'Educação',
    'Lazer',
    'Compras',
    'Assinaturas',
    'Telefone',
    'Trabalho',
    'Impostos e taxas',
    'Serviços financeiros',
    'Salário',
    'Freelance',
    'Reembolso',
    'Rendimentos',
    'Venda',
    'Benefícios',
    'Investimentos',
    'Pagamento de fatura',
    'Transferência entre contas',
    'Reserva',
    'Outros'
  );
$$;

alter table public.transactions
drop constraint if exists transactions_category_check;

alter table public.transaction_classification_rules
drop constraint if exists transaction_classification_rules_category_check;

update public.transactions
set
  type = case
    when upper(description) like '%PAGAMENTO CARTAO CREDITO%' or upper(description) like '%PAGAMENTO DE FATURA%' then 'Transferência'
    when upper(description) like '%REMUNERACAO APLICACAO AUTOMATICA%' then 'Receita'
    when upper(description) like '%APLICAÇÃO RDB%'
      or upper(description) like '%RESGATE RDB%'
      or upper(description) like '%AVENUE SECURITIES%'
      or upper(description) like '%BANCO INTER%'
      or upper(description) like '%BCO INTER%'
      or upper(description) like '% CDB%'
      or upper(description) like '%TESOURO%'
      or upper(description) like '%CORRETORA%'
      or upper(description) like '%INVEST%'
    then 'Transferência'
    else type
  end,
  category = case
    when upper(description) like '%PAGAMENTO CARTAO CREDITO%' or upper(description) like '%PAGAMENTO DE FATURA%' then 'Pagamento de fatura'
    when upper(description) like '%REMUNERACAO APLICACAO AUTOMATICA%' then 'Rendimentos'
    when type = 'Despesa' and upper(description) like '%SEGURO%' then 'Seguros'
    when upper(description) like '%APLICAÇÃO RDB%'
      or upper(description) like '%RESGATE RDB%'
      or upper(description) like '%AVENUE SECURITIES%'
      or upper(description) like '%BANCO INTER%'
      or upper(description) like '%BCO INTER%'
      or upper(description) like '% CDB%'
      or upper(description) like '%TESOURO%'
      or upper(description) like '%CORRETORA%'
      or upper(description) like '%INVEST%'
    then 'Investimentos'
    when type = 'Receita' and (upper(description) like '%SALARIO%' or upper(description) like '%SALÁRIO%' or upper(description) like '%FOLHA%' or upper(description) like '%PROVENTO%')
    then 'Salário'
    when type = 'Receita' and not public.is_valid_transaction_category(category) then 'Outros'
    when type = 'Transferência' and category not in ('Investimentos', 'Pagamento de fatura', 'Transferência entre contas', 'Reserva', 'Outros')
    then 'Transferência entre contas'
    when type = 'Despesa' and category not in (
      'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Seguros', 'Educação', 'Lazer',
      'Compras', 'Assinaturas', 'Telefone', 'Trabalho', 'Impostos e taxas', 'Serviços financeiros', 'Outros'
    ) then 'Outros'
    else category
  end;

update public.transaction_classification_rules
set
  type = case
    when upper(match_description) like '%PAGAMENTO CARTAO CREDITO%' or upper(match_description) like '%PAGAMENTO DE FATURA%' then 'Transferência'
    when upper(match_description) like '%REMUNERACAO APLICACAO AUTOMATICA%' then 'Receita'
    when upper(match_description) like '%APLICAÇÃO RDB%'
      or upper(match_description) like '%RESGATE RDB%'
      or upper(match_description) like '%AVENUE SECURITIES%'
      or upper(match_description) like '%BANCO INTER%'
      or upper(match_description) like '%BCO INTER%'
      or upper(match_description) like '% CDB%'
      or upper(match_description) like '%TESOURO%'
      or upper(match_description) like '%CORRETORA%'
      or upper(match_description) like '%INVEST%'
    then 'Transferência'
    else type
  end,
  category = case
    when upper(match_description) like '%PAGAMENTO CARTAO CREDITO%' or upper(match_description) like '%PAGAMENTO DE FATURA%' then 'Pagamento de fatura'
    when upper(match_description) like '%REMUNERACAO APLICACAO AUTOMATICA%' then 'Rendimentos'
    when type = 'Despesa' and upper(match_description) like '%SEGURO%' then 'Seguros'
    when upper(match_description) like '%APLICAÇÃO RDB%'
      or upper(match_description) like '%RESGATE RDB%'
      or upper(match_description) like '%AVENUE SECURITIES%'
      or upper(match_description) like '%BANCO INTER%'
      or upper(match_description) like '%BCO INTER%'
      or upper(match_description) like '% CDB%'
      or upper(match_description) like '%TESOURO%'
      or upper(match_description) like '%CORRETORA%'
      or upper(match_description) like '%INVEST%'
    then 'Investimentos'
    when type = 'Receita' and (upper(match_description) like '%SALARIO%' or upper(match_description) like '%SALÁRIO%' or upper(match_description) like '%FOLHA%' or upper(match_description) like '%PROVENTO%')
    then 'Salário'
    when type = 'Receita' and category not in ('Salário', 'Freelance', 'Reembolso', 'Rendimentos', 'Venda', 'Benefícios', 'Outros')
    then 'Outros'
    when type = 'Transferência' and category not in ('Investimentos', 'Pagamento de fatura', 'Transferência entre contas', 'Reserva', 'Outros')
    then 'Transferência entre contas'
    when type = 'Despesa' and category not in (
      'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Seguros', 'Educação', 'Lazer',
      'Compras', 'Assinaturas', 'Telefone', 'Trabalho', 'Impostos e taxas', 'Serviços financeiros', 'Outros'
    ) then 'Outros'
    else category
  end;

alter table public.transactions
add constraint transactions_category_check
check (public.is_valid_transaction_category(category));

alter table public.transaction_classification_rules
add constraint transaction_classification_rules_category_check
check (public.is_valid_transaction_category(category));
