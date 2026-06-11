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
    'Pets',
    'Seguros',
    'Educação',
    'Lazer',
    'Compras',
    'Assinaturas',
    'Telefone',
    'Cuidados pessoais',
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
